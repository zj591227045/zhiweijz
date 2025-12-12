import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { LLMProviderService } from '../ai/llm/llm-provider-service';
import { SmartAccounting } from '../ai/langgraph/smart-accounting';
import { PrismaClient, TransactionType } from '@prisma/client';
import { SmartAccountingResult, SmartAccountingError } from '../types/smart-accounting';
import AccountingPointsService from '../services/accounting-points.service';
import { SourceDetectionUtil } from '../utils/source-detection.util';
import { TransactionService } from '../services/transaction.service';
import { MembershipService } from '../services/membership.service';
import { TransactionDuplicateDetectionService } from '../services/transaction-duplicate-detection.service';
import { TransactionAttachmentRepository } from '../repositories/file-storage.repository';
import { AttachmentType } from '../models/file-storage.model';
import { DateCorrectionMiddleware, SmartAccountingResultWithValidation } from '../middleware/date-correction.middleware';

/**
 * AI功能控制器
 * 处理AI相关的API请求
 */
export class AIController {
  private llmProviderService: LLMProviderService;
  private smartAccounting: SmartAccounting;
  private prisma: PrismaClient;
  private transactionService: TransactionService;
  private membershipService: MembershipService;
  private attachmentRepository: TransactionAttachmentRepository;
  private dateCorrectionMiddleware: DateCorrectionMiddleware;

  /**
   * 构造函数
   */
  constructor() {
    this.llmProviderService = new LLMProviderService();
    this.smartAccounting = new SmartAccounting(this.llmProviderService);
    this.prisma = new PrismaClient();
    this.transactionService = new TransactionService();
    this.membershipService = new MembershipService();
    this.attachmentRepository = new TransactionAttachmentRepository();
    this.dateCorrectionMiddleware = new DateCorrectionMiddleware();
  }

  /**
   * 获取可用的AI提供商列表
   * @param req 请求
   * @param res 响应
   */
  public async getProviders(req: Request, res: Response) {
    try {
      // 获取所有注册的提供商名称
      const providers = Array.from(this.llmProviderService.getProviderNames());
      res.json(providers);
    } catch (error) {
      logger.error('获取AI提供商列表错误:', error);
      res.status(500).json({ error: '获取AI提供商列表失败' });
    }
  }

  /**
   * 智能记账API处理方法
   * @param req 请求
   * @param res 响应
   */
  public async handleSmartAccounting(req: Request, res: Response) {
    try {
      const { description, source: requestSource, isFromImageRecognition } = req.body;
      const { accountId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检测请求来源并设置到LLM服务中
      const source = SourceDetectionUtil.detectSource(req);
      this.llmProviderService.setRequestContext({ source });

      if (!description) {
        return res.status(400).json({ error: '描述不能为空' });
      }

      // 限制描述文本长度，避免过长的文本导致LLM处理超时
      const MAX_DESCRIPTION_LENGTH = 2000;
      let processedDescription = description;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        logger.info(`[智能记账] 描述过长(${description.length}字符)，截取前${MAX_DESCRIPTION_LENGTH}字符`);
        processedDescription = description.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
      }

      if (!accountId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      // 检查账本是否存在并且用户有权限访问
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null,
              },
              family: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 检查记账点余额（文字记账消费1点）- 仅在记账点系统启用时检查
      if (this.membershipService.isAccountingPointsEnabled()) {
        const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.text);
        if (!canUsePoints) {
          return res.status(402).json({
            error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员，每天登录App以及签到总计可获得10点赠送记账点',
            type: 'INSUFFICIENT_POINTS',
            required: AccountingPointsService.POINT_COSTS.text
          });
        }
      }

      // 处理描述
      const result = await this.smartAccounting.processDescription(
        processedDescription,
        userId,
        accountId,
        accountBook.type,
      );

      if (!result) {
        return res.status(500).json({ error: '智能记账处理失败' });
      }

      // 检查是否有错误信息（如内容与记账无关）
      if ('error' in result) {
        // 检查是否是网络连接错误
        if (result.error.includes('ECONNRESET') || result.error.includes('socket hang up')) {
          return res.status(503).json({
            error: 'AI服务暂时不可用，请稍后重试',
            type: 'SERVICE_UNAVAILABLE',
          });
        }
        // 其他错误（如内容与记账无关）
        return res.status(400).json({ info: result.error });
      }

      // 日期校验和修正 - App端
      const isMultipleRecords = Array.isArray(result);
      const recordsToCheck = isMultipleRecords ? result : [result];
      
      // 对所有记录进行日期校验
      const recordsWithDateValidation = this.dateCorrectionMiddleware.processBatchRecords(
        recordsToCheck,
        'app',
        { userId, accountBookId: accountId }
      );

      // 检查是否有日期异常需要用户修正
      const hasDateAnomalies = this.dateCorrectionMiddleware.hasDateAnomalies(recordsWithDateValidation);
      
      logger.info(`📅 [日期校验] 记录数: ${recordsWithDateValidation.length}, 有异常: ${hasDateAnomalies}`);

      // 检查是否来自图片识别且有多条记录
      if (isFromImageRecognition && recordsToCheck.length > 1) {
        // 来自图片识别且有多条记录，进行重复检测并返回记录列表供用户选择
        logger.info(`📝 [智能记账] 检测到来自图片识别的${recordsToCheck.length}条记录，进行重复检测`);

        try {
          // 进行重复检测
          const duplicateResults = await TransactionDuplicateDetectionService.detectBatchDuplicates(
            userId,
            accountId,
            recordsWithDateValidation
          );

          // 将重复检测结果附加到记录中
          const recordsWithDuplicateInfo = recordsWithDateValidation.map((record, index) => {
            const duplicateInfo = duplicateResults.find(r => r.recordIndex === index);
            return {
              ...record,
              duplicateDetection: duplicateInfo || {
                isDuplicate: false,
                confidence: 0,
                matchedTransactions: [],
              },
            };
          });

          // 返回记录列表供用户选择，不扣除记账点
          return res.json({
            success: true,
            requiresUserSelection: true,
            records: recordsWithDuplicateInfo,
            message: '检测到多条记账记录，请选择需要导入的记录',
          });
        } catch (duplicateError) {
          logger.error('重复检测失败:', duplicateError);
          // 重复检测失败时，仍然返回记录列表，但不包含重复信息
          const recordsWithoutDuplicateInfo = recordsWithDateValidation.map(record => ({
            ...record,
            duplicateDetection: {
              isDuplicate: false,
              confidence: 0,
              matchedTransactions: [],
            },
          }));

          return res.json({
            success: true,
            requiresUserSelection: true,
            records: recordsWithoutDuplicateInfo,
            message: '检测到多条记账记录，请选择需要导入的记录',
          });
        }
      }

      // 如果有日期异常且不是多条记录选择流程，返回日期修正提示
      if (hasDateAnomalies && !isFromImageRecognition) {
        logger.info(`⚠️ [日期校验] 检测到日期异常，返回修正提示`);
        return res.json({
          requiresDateCorrection: true,
          records: recordsWithDateValidation,
          message: '检测到日期异常，请确认修正',
        });
      }

      // 智能记账成功，扣除记账点（仅在记账点系统启用时）
      if (this.membershipService.isAccountingPointsEnabled()) {
        try {
          await AccountingPointsService.deductPoints(userId, 'text', AccountingPointsService.POINT_COSTS.text);
        } catch (pointsError) {
          logger.error('扣除记账点失败:', pointsError);
          // 记账点扣除失败不影响返回结果，但需要记录日志
        }
      }

      // 返回带日期校验信息的结果
      const finalResult = isMultipleRecords ? recordsWithDateValidation : recordsWithDateValidation[0];
      res.json(finalResult);
    } catch (error) {
      logger.error('智能记账错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 创建用户选择的记账记录
   * @param req 请求
   * @param res 响应
   */
  public async createSelectedTransactions(req: Request, res: Response) {
    try {
      const { selectedRecords, imageFileInfo } = req.body;
      const { accountId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!accountId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      if (!selectedRecords || !Array.isArray(selectedRecords) || selectedRecords.length === 0) {
        return res.status(400).json({ error: '请选择至少一条记录' });
      }

      // 检查账本权限
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              familyId: { not: null },
              family: {
                members: { some: { userId } },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 扣除记账点（仅在记账点系统启用时）
      if (this.membershipService.isAccountingPointsEnabled()) {
        try {
          await AccountingPointsService.deductPoints(userId, 'text', AccountingPointsService.POINT_COSTS.text);
        } catch (pointsError) {
          logger.error('扣除记账点失败:', pointsError);
          return res.status(402).json({
            error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员',
            type: 'INSUFFICIENT_POINTS',
          });
        }
      }

      // 创建选中的记账记录
      const createdTransactions = [];
      const errors = [];

      for (let i = 0; i < selectedRecords.length; i++) {
        const record = selectedRecords[i];
        try {
          const transaction = await this.transactionService.createTransaction(userId, {
            amount: record.amount,
            type: record.type,
            description: record.note || record.description,
            date: new Date(record.date),
            categoryId: record.categoryId,
            accountBookId: accountId,
            budgetId: record.budgetId || null,
          });

          // 如果有图片文件信息，关联图片附件
          if (imageFileInfo && imageFileInfo.id) {
            try {
              await this.linkImageToTransaction(transaction.id, imageFileInfo.id, userId);
              logger.info(`✅ [选择记账] 第 ${i + 1} 条记账记录图片附件关联成功: ${transaction.id}`);
            } catch (attachmentError) {
              logger.error(`⚠️ [选择记账] 第 ${i + 1} 条记账记录图片附件关联失败:`, attachmentError);
              // 附件关联失败不影响记账记录创建
            }
          }

          createdTransactions.push(transaction);
          logger.info(`✅ [选择记账] 第 ${i + 1} 条记账记录创建成功: ${transaction.id}`);
        } catch (error) {
          logger.error(`❌ [选择记账] 第 ${i + 1} 条记账记录创建失败:`, error);
          errors.push({
            index: i,
            record: record,
            error: error instanceof Error ? error.message : '创建失败',
          });
        }
      }

      if (createdTransactions.length > 0) {
        res.status(201).json({
          success: true,
          transactions: createdTransactions,
          count: createdTransactions.length,
          errors: errors.length > 0 ? errors : undefined,
          message: `成功创建 ${createdTransactions.length} 条记账记录${errors.length > 0 ? `，${errors.length} 条失败` : ''}`,
        });
      } else {
        res.status(400).json({
          success: false,
          error: '所有记账记录创建失败',
          errors,
        });
      }
    } catch (error) {
      logger.error('创建选择记账记录错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 关联图片文件到记账记录
   * @param transactionId 记账记录ID
   * @param fileId 文件ID
   * @param userId 用户ID
   */
  private async linkImageToTransaction(transactionId: string, fileId: string, userId: string): Promise<void> {
    try {
      // 验证文件是否存在且属于当前用户
      const file = await this.prisma.fileStorage.findFirst({
        where: {
          id: fileId,
          uploadedBy: userId,
        },
      });

      if (!file) {
        throw new Error('文件不存在或无权限访问');
      }

      // 创建附件关联
      await this.prisma.transactionAttachment.create({
        data: {
          transactionId,
          fileId,
          attachmentType: 'RECEIPT', // 图片记账的附件类型为收据
          description: '智能记账上传图片',
        },
      });

      logger.info(`图片附件关联成功: 记账ID=${transactionId}, 文件ID=${fileId}`);
    } catch (error) {
      logger.error('关联图片附件失败:', error);
      throw error;
    }
  }

  /**
   * 获取全局LLM配置（供普通用户查看）
   * 注意：此方法现在会检查多提供商配置的优先级
   * @param req 请求
   * @param res 响应
   */
  public async getGlobalLLMConfig(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      // 如果有用户信息，使用多提供商优先级逻辑
      if (userId) {
        const settings = await this.llmProviderService.getLLMSettings(userId);

        // 如果是多提供商模式，返回多提供商配置信息
        if (settings.isMultiProvider) {
          // 获取多提供商配置概览
          const multiProviderConfig =
            await this.llmProviderService.multiProviderService.loadMultiProviderConfig();

          if (multiProviderConfig?.enabled) {
            const activeProviders = multiProviderConfig.providers.filter((p) => p.enabled);

            res.json({
              success: true,
              data: {
                enabled: true,
                provider: 'multi-provider',
                model: `${activeProviders.length} 个提供商`,
                baseUrl: 'Multi-Provider Mode',
                temperature: 0.7,
                maxTokens: 1000,
                isMultiProvider: true,
                providersCount: activeProviders.length,
                primaryProvider: activeProviders.length > 0 ? activeProviders[0].name : null,
              },
            });
            return;
          }
        }

        // 否则返回实际的LLM设置（移除敏感信息）
        res.json({
          success: true,
          data: {
            enabled: true,
            provider: settings.provider,
            model: settings.model,
            baseUrl: settings.baseUrl,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
          },
        });
        return;
      }

      // 如果没有用户信息，回退到原有逻辑
      const globalConfig = await this.llmProviderService.getGlobalLLMConfig();

      res.json({
        success: true,
        data: globalConfig,
      });
    } catch (error) {
      logger.error('获取全局LLM配置错误:', error);
      res.status(500).json({
        success: false,
        error: '获取全局LLM配置失败',
        data: { enabled: false },
      });
    }
  }

  /**
   * 获取用户LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async getUserLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 获取用户LLM设置
      const settings = await this.llmProviderService.getLLMSettings(userId);

      // 移除敏感信息
      const safeSettings = {
        ...settings,
        apiKey: settings.apiKey ? '******' : null,
      };

      res.json(safeSettings);
    } catch (error) {
      logger.error('获取用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 创建用户LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async createUserLLMSettings(req: Request, res: Response) {
    try {
      logger.info('收到创建用户LLM设置请求');
      logger.info('请求体:', req.body);
      logger.info('用户信息:', req.user);

      const userId = req.user?.id;
      const { name, provider, model, apiKey, temperature, maxTokens, baseUrl, description } =
        req.body;

      logger.info('解析的参数:', {
        userId,
        name,
        provider,
        model,
        hasApiKey: !!apiKey,
        temperature,
        maxTokens,
        baseUrl,
        description,
      });

      if (!userId) {
        logger.info('用户未授权');
        return res.status(401).json({ error: '未授权' });
      }

      if (!name || !provider || !model) {
        logger.info('缺少必要参数:', { name, provider, model });
        return res.status(400).json({ error: '名称、提供商和模型不能为空' });
      }

      logger.info('开始创建用户LLM设置...');

      // 创建用户LLM设置
      const settingId = await this.llmProviderService.createUserLLMSetting(userId, {
        name,
        provider,
        model,
        apiKey,
        temperature,
        maxTokens,
        baseUrl,
        description,
      });

      logger.info('成功创建用户LLM设置，ID:', settingId);
      res.json({ success: true, id: settingId });
    } catch (error) {
      logger.error('创建用户LLM设置错误:', error);
      logger.error('错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取账本LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async getAccountLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检查用户是否有权限访问该账本
      const hasAccess = await this.checkAccountAccess(userId, accountId);
      if (!hasAccess) {
        return res.status(403).json({ error: '无权访问该账本' });
      }

      // 首先检查账本是否真的绑定了LLM服务
      try {
        // 查找账本
        const accountBook = await this.prisma.accountBook.findUnique({
          where: { id: accountId },
        });

        // 如果账本不存在
        if (!accountBook) {
          return res.status(404).json({
            bound: false,
            error: '账本不存在',
          });
        }

        // 检查账本是否绑定了LLM服务
        if (!accountBook.userLLMSettingId) {
          logger.info(`账本 ${accountId} 未绑定LLM服务`);
          return res.status(200).json({
            bound: false,
            message: '账本未绑定LLM服务',
          });
        }

        // 查找关联的UserLLMSetting
        const userLLMSetting = await this.prisma.userLLMSetting.findUnique({
          where: { id: accountBook.userLLMSettingId },
        });

        // 如果找不到关联的UserLLMSetting
        if (!userLLMSetting) {
          logger.info(`账本 ${accountId} 绑定的LLM服务 ${accountBook.userLLMSettingId} 不存在`);
          return res.status(200).json({
            bound: false,
            message: '账本绑定的LLM服务不存在',
          });
        }

        // 找到了关联的UserLLMSetting，返回设置信息
        logger.info(`账本 ${accountId} 已绑定LLM服务 ${userLLMSetting.id}`);

        // 获取账本LLM设置
        const settings = await this.llmProviderService.getLLMSettings(userId, accountId);

        // 移除敏感信息
        const safeSettings = {
          bound: true,
          id: userLLMSetting.id,
          name: userLLMSetting.name,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey ? '******' : null,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          baseUrl: settings.baseUrl,
          description: userLLMSetting.description,
        };

        return res.json(safeSettings);
      } catch (error) {
        logger.error('检查账本LLM服务绑定错误:', error);
        return res.status(500).json({
          bound: false,
          error: '处理请求时出错',
        });
      }
    } catch (error) {
      logger.error('获取账本LLM设置错误:', error);
      return res.status(500).json({
        bound: false,
        error: '处理请求时出错',
      });
    }
  }

  /**
   * 更新账本LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async updateAccountLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;
      const { userLLMSettingId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!userLLMSettingId) {
        return res.status(400).json({ error: '用户LLM设置ID不能为空' });
      }

      // 检查用户是否有权限访问该账本
      const hasAccess = await this.checkAccountAccess(userId, accountId);
      if (!hasAccess) {
        return res.status(403).json({ error: '无权访问该账本' });
      }

      // 验证LLM设置是否可访问（对于家庭账本，允许使用家庭成员的LLM设置）
      const canAccessLLMSetting = await this.checkLLMSettingAccess(
        userId,
        accountId,
        userLLMSettingId,
      );
      if (!canAccessLLMSetting) {
        return res.status(403).json({ error: '无权使用该LLM设置' });
      }

      // 更新账本LLM设置
      await this.llmProviderService.updateAccountLLMSettings(accountId, userLLMSettingId);

      res.json({ success: true });
    } catch (error) {
      logger.error('更新账本LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取用户所有LLM设置（包括家庭成员可访问的设置）
   * @param req 请求
   * @param res 响应
   */
  public async getUserLLMSettingsList(req: Request, res: Response) {
    try {
      logger.info('收到获取用户LLM设置列表请求');
      logger.info('请求头:', req.headers);

      const userId = req.user?.id;
      const accountBookId = req.query.accountBookId as string | undefined;
      logger.info('用户ID:', userId, '账本ID:', accountBookId);

      if (!userId) {
        logger.info('未授权: 用户ID不存在');
        return res.status(401).json({ error: '未授权' });
      }

      logger.debug(`正在查询用户 ${userId} 的LLM设置列表`);

      try {
        let settings: any[] = [];

        if (accountBookId) {
          // 如果指定了账本ID，查询该账本可访问的所有LLM设置
          logger.debug(`查询账本 ${accountBookId} 可访问的LLM设置`);

          // 首先验证用户是否有权限访问该账本
          const hasAccess = await this.checkAccountAccess(userId, accountBookId);
          if (!hasAccess) {
            return res.status(403).json({ error: '无权访问该账本' });
          }

          // 查询账本信息
          const accountBook = await this.prisma.accountBook.findUnique({
            where: { id: accountBookId },
            include: {
              family: {
                include: {
                  members: {
                    where: { userId: { not: null } },
                    include: {
                      user: {
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          });

          if (accountBook) {
            let userIds = [userId]; // 默认包含当前用户

            // 如果是家庭账本，包含所有家庭成员的LLM设置
            if (accountBook.type === 'FAMILY' && accountBook.family) {
              const familyUserIds = accountBook.family.members
                .filter((member) => member.user)
                .map((member) => member.user!.id);
              userIds = [...new Set([...userIds, ...familyUserIds])];
              logger.info(`家庭账本，包含家庭成员用户IDs:`, familyUserIds);
            }

            // 查询所有相关用户的LLM设置
            settings = await this.prisma.$queryRaw`
              SELECT id, name, provider, model, temperature, max_tokens, created_at, updated_at, description, base_url, user_id
              FROM "user_llm_settings"
              WHERE "user_id" = ANY(${userIds})
              ORDER BY "created_at" DESC
            `;
          }
        } else {
          // 如果没有指定账本ID，只查询用户自己的LLM设置
          settings = await this.prisma.$queryRaw`
            SELECT id, name, provider, model, temperature, max_tokens, created_at, updated_at, description, base_url, user_id
            FROM "user_llm_settings"
            WHERE "user_id" = ${userId}
            ORDER BY "created_at" DESC
          `;
        }

        logger.debug(`查询结果: 找到 ${Array.isArray(settings) ? settings.length : 0} 条记录`);
        if (Array.isArray(settings) && settings.length > 0) {
          logger.debug('第一条记录示例:', settings[0]);
        }

        // 如果没有找到记录，返回空数组
        if (!settings || (Array.isArray(settings) && settings.length === 0)) {
          logger.info('没有找到LLM设置记录，返回空数组');

          // 设置CORS头
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          return res.json([]);
        }

        // 转换字段名称为驼峰命名，并添加所有者信息
        const formattedSettings = Array.isArray(settings)
          ? settings.map((setting) => ({
              id: setting.id,
              name: setting.name,
              provider: setting.provider,
              model: setting.model,
              temperature: setting.temperature,
              maxTokens: setting.max_tokens,
              createdAt: setting.created_at,
              updatedAt: setting.updated_at,
              description: setting.description,
              baseUrl: setting.base_url,
              userId: setting.user_id,
              isOwner: setting.user_id === userId, // 标记是否为当前用户创建的设置
            }))
          : [];

        logger.info('返回格式化后的LLM设置列表');
        logger.info('响应数据:', formattedSettings);

        // 设置CORS头
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        res.json(formattedSettings);
      } catch (queryError) {
        logger.error('数据库查询错误:', queryError);
        // 如果数据库查询出错，返回空数组

        // 设置CORS头
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        res.json([]);
      }
    } catch (error) {
      logger.error('获取用户LLM设置列表错误:', error);

      // 设置CORS头
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取用户LLM设置详情
   * @param req 请求
   * @param res 响应
   */
  public async getUserLLMSettingsById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!id) {
        return res.status(400).json({ error: 'LLM设置ID不能为空' });
      }

      logger.debug(`正在查询用户 ${userId} 的LLM设置 ${id}`);

      try {
        // 查询指定的LLM设置
        const settings = await this.prisma.$queryRaw`
          SELECT id, name, provider, model, temperature, max_tokens, created_at, updated_at, description, base_url
          FROM "user_llm_settings"
          WHERE "id" = ${id} AND "user_id" = ${userId}
        `;

        if (!settings || (Array.isArray(settings) && settings.length === 0)) {
          return res.status(404).json({ error: 'LLM设置不存在' });
        }

        const setting = Array.isArray(settings) ? settings[0] : settings;

        // 转换字段名称为驼峰命名
        const formattedSetting = {
          id: setting.id,
          name: setting.name,
          provider: setting.provider,
          model: setting.model,
          temperature: setting.temperature,
          maxTokens: setting.max_tokens,
          createdAt: setting.created_at,
          updatedAt: setting.updated_at,
          description: setting.description,
          baseUrl: setting.base_url,
        };

        logger.info('返回LLM设置详情:', formattedSetting);
        res.json(formattedSetting);
      } catch (queryError) {
        logger.error('数据库查询错误:', queryError);
        res.status(500).json({ error: '查询LLM设置失败' });
      }
    } catch (error) {
      logger.error('获取用户LLM设置详情错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 更新用户LLM设置（通过ID）
   * @param req 请求
   * @param res 响应
   */
  public async updateUserLLMSettingsById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, provider, model, apiKey, temperature, maxTokens, baseUrl, description } =
        req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检查设置是否存在且属于该用户
      const setting = await this.prisma.userLLMSetting.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!setting) {
        return res.status(404).json({ error: '未找到LLM设置或无权访问' });
      }

      // 准备更新数据
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (provider !== undefined) updateData.provider = provider;
      if (model !== undefined) updateData.model = model;
      if (apiKey !== undefined) updateData.apiKey = apiKey;
      if (temperature !== undefined) updateData.temperature = temperature;
      if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
      if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
      if (description !== undefined) updateData.description = description;

      // 更新设置
      await this.prisma.userLLMSetting.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('更新用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 删除用户LLM设置
   * @param req 请求
   * @param res 响应
   */
  public async deleteUserLLMSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检查设置是否存在且属于该用户
      const setting = await this.prisma.userLLMSetting.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!setting) {
        return res.status(404).json({ error: '未找到LLM设置或无权访问' });
      }

      // 删除设置
      await this.prisma.userLLMSetting.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('删除用户LLM设置错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 测试LLM连接
   * @param req 请求
   * @param res 响应
   */
  public async testLLMConnection(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { provider, model, apiKey, baseUrl, useExistingKey } = req.body;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      if (!provider || !model) {
        return res.status(400).json({ error: '提供商和模型不能为空' });
      }

      // 如果使用现有密钥，获取用户的API密钥
      let testApiKey = apiKey;
      if (useExistingKey) {
        // 获取用户现有的API密钥
        const userSettings = await this.prisma.userLLMSetting.findFirst({
          where: {
            userId,
            provider,
          },
          select: {
            apiKey: true,
          },
        });

        if (!userSettings || !userSettings.apiKey) {
          return res.status(400).json({
            success: false,
            message: '未找到现有API密钥，请提供新的API密钥',
          });
        }

        testApiKey = userSettings.apiKey;
      } else if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API密钥不能为空',
        });
      }

      // 测试连接
      const result = await this.llmProviderService.testConnection({
        provider,
        model,
        apiKey: testApiKey,
        baseUrl,
      });

      res.json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      logger.error('测试LLM连接错误:', error);
      res.status(500).json({
        success: false,
        message: '测试连接时出错',
      });
    }
  }

  /**
   * 智能记账并直接创建记账记录 - 支持请求体中包含账本ID和用户名称
   * @param req 请求
   * @param res 响应
   */
  public async handleSmartAccountingDirectWithBody(req: Request, res: Response) {
    try {
      const { description, accountBookId, userName, includeDebugInfo } = req.body;
      const requestUserId = req.user?.id; // API调用者（如A账号）

      if (!requestUserId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检测请求来源并设置到LLM服务中
      const source = SourceDetectionUtil.detectSource(req);
      this.llmProviderService.setRequestContext({ source });

      if (!description) {
        return res.status(400).json({ error: '描述不能为空' });
      }

      if (!accountBookId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      // 限制描述文本长度，避免过长的文本导致LLM处理超时
      const MAX_DESCRIPTION_LENGTH = 2000;
      let processedDescription = description;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        logger.info(`[智能记账] 描述过长(${description.length}字符)，截取前${MAX_DESCRIPTION_LENGTH}字符`);
        processedDescription = description.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
      }

      // 检查账本是否存在并且请求者有权限访问
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId: requestUserId },
            {
              type: 'FAMILY',
              familyId: {
                not: null,
              },
              family: {
                members: {
                  some: {
                    userId: requestUserId,
                  },
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 确定实际的记账用户ID（支持家庭成员代记账场景）
      let actualUserId = requestUserId; // 默认使用请求发起人的ID
      let actualUserName = 'Unknown';

      // 如果提供了用户名称且是家庭账本，查找对应的家庭成员
      if (userName && accountBook.type === 'FAMILY' && accountBook.familyId) {
        logger.info(`🔍 [用户识别] 查找家庭成员: ${userName}`);

        // 查找家庭成员
        const familyMember = await this.prisma.familyMember.findFirst({
          where: {
            familyId: accountBook.familyId,
            OR: [
              { name: userName },
              {
                user: {
                  name: userName,
                },
              },
            ],
          },
          include: {
            user: true,
          },
        });

        if (familyMember && familyMember.userId) {
          actualUserId = familyMember.userId;
          actualUserName = familyMember.user?.name || familyMember.name;
          logger.info(`✅ [用户识别] 找到家庭成员: ${actualUserName} (ID: ${actualUserId})`);
        } else {
          logger.info(`⚠️ [用户识别] 未找到家庭成员: ${userName}, 使用请求发起人`);
          // 获取请求发起人的名称
          const requestUser = await this.prisma.user.findUnique({
            where: { id: requestUserId },
            select: { name: true },
          });
          actualUserName = requestUser?.name || 'Unknown';
        }
      } else {
        // 个人账本或未提供用户名，使用请求发起人
        const requestUser = await this.prisma.user.findUnique({
          where: { id: requestUserId },
          select: { name: true },
        });
        actualUserName = requestUser?.name || 'Unknown';
      }

      logger.info(`📝 [记账处理] 实际记账用户: ${actualUserName} (ID: ${actualUserId})`);

      // 检查记账点余额（文字记账消费1点）- 使用请求发起者的记账点，仅在记账点系统启用时检查
      if (this.membershipService.isAccountingPointsEnabled()) {
        const canUsePoints = await AccountingPointsService.canUsePoints(requestUserId, AccountingPointsService.POINT_COSTS.text);
        if (!canUsePoints) {
          return res.status(402).json({
            error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员，每天登录App以及签到总计可获得10点赠送记账点',
            type: 'INSUFFICIENT_POINTS',
            required: AccountingPointsService.POINT_COSTS.text
          });
        }
      }

      // 使用实际用户ID进行智能记账分析
      const smartResult = await this.smartAccounting.processDescription(
        processedDescription,
        actualUserId, // 使用实际的记账用户ID，这样预算匹配会优先使用该用户的预算
        accountBookId,
        accountBook.type,
        includeDebugInfo || false,
      );

      if (!smartResult) {
        return res.status(500).json({ error: '智能记账处理失败' });
      }

      // 检查是否有错误信息（如内容与记账无关）
      if ('error' in smartResult) {
        // 其他错误（如内容与记账无关）
        return res.status(400).json({ info: smartResult.error });
      }

      // 从智能记账结果创建记账记录
      try {
        // 检查是否为数组格式（多条记录）
        const isMultipleRecords = Array.isArray(smartResult);
        const recordsToCreate = isMultipleRecords ? smartResult : [smartResult];
        
        logger.info(`📝 [记账处理] 检测到 ${recordsToCreate.length} 条记录需要创建`);

        // 日期校验和修正 - 微信端自动修正
        const recordsWithDateValidation = this.dateCorrectionMiddleware.processBatchRecords(
          recordsToCreate,
          'wechat',
          { userId: actualUserId, accountBookId: accountBookId }
        );

        // 检查是否有日期异常（微信端会自动修正，但需要记录日志）
        const hasDateAnomalies = this.dateCorrectionMiddleware.hasDateAnomalies(recordsWithDateValidation);
        
        logger.info(`📅 [日期校验-微信记账] 记录数: ${recordsWithDateValidation.length}, 有异常: ${hasDateAnomalies}`);
        
        const createdTransactions = [];
        const now = new Date();
        
        // 如果是家庭账本，确定家庭成员ID
        let familyMemberId = null;
        if (accountBook.type === 'FAMILY' && accountBook.familyId) {
          // 查找实际记账用户在家庭中的成员记录
          const familyMember = await this.prisma.familyMember.findFirst({
            where: {
              familyId: accountBook.familyId,
              userId: actualUserId,
            },
          });

          if (familyMember) {
            familyMemberId = familyMember.id;
            logger.info(`👨‍👩‍👧‍👦 [家庭成员] 设置家庭成员ID: ${familyMemberId}`);
          } else {
            logger.info(
              `⚠️ [家庭成员] 用户 ${actualUserId} 不是家庭 ${accountBook.familyId} 的成员`,
            );
          }
        }

        // 循环创建每条记录（使用校验后的记录）
        for (let i = 0; i < recordsWithDateValidation.length; i++) {
          const record = recordsWithDateValidation[i];
          
          // 处理日期，如果记录中有日期则使用该日期但保持当前时间，否则使用当前完整时间
          let dateObj;
          if (record.date) {
            // 如果有日期，解析日期但使用当前的时分秒
            const recordDate = new Date(record.date);
            dateObj = new Date(
              recordDate.getFullYear(),
              recordDate.getMonth(),
              recordDate.getDate(),
              now.getHours(),    // 使用当前小时
              now.getMinutes(),  // 使用当前分钟
              now.getSeconds(),  // 使用当前秒
              now.getMilliseconds() // 使用当前毫秒
            );
          } else {
            // 如果没有日期，使用完整的当前时间
            dateObj = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              now.getHours(),
              now.getMinutes(),
              now.getSeconds(),
              now.getMilliseconds(),
            );
          }

          const transactionData = {
            amount: record.amount,
            type: record.type as TransactionType,
            categoryId: record.categoryId,
            description: record.note || `${description} (${i + 1})`,
            date: dateObj,
            accountBookId: accountBookId,
            budgetId: record.budgetId || undefined,
          };

          logger.info(`💾 [记账创建] 创建第 ${i + 1} 条记账记录:`, {
            amount: transactionData.amount,
            userId: actualUserId,
            accountBookId: transactionData.accountBookId,
            budgetId: transactionData.budgetId,
          });

          // 使用记账服务创建记账记录（包含预算检查逻辑）
          const transaction = await this.transactionService.createTransaction(actualUserId, transactionData);
          createdTransactions.push(transaction);
          
          logger.info(`✅ [记账创建] 第 ${i + 1} 条记账记录创建成功: ${transaction.id}`);
        }

        // 记账创建成功，扣除记账点（使用请求发起者的记账点）- 仅在记账点系统启用时
        if (this.membershipService.isAccountingPointsEnabled()) {
          try {
            await AccountingPointsService.deductPoints(requestUserId, 'text', AccountingPointsService.POINT_COSTS.text);
          } catch (pointsError) {
            logger.error('扣除记账点失败:', pointsError);
            // 记账点扣除失败不影响返回结果，但需要记录日志
          }
        }

        // 准备返回结果，如果有日期异常需要添加警告信息
        let responseData: any;
        if (isMultipleRecords) {
          // 多条记录，返回数组
          responseData = {
            transactions: createdTransactions,
            count: createdTransactions.length,
            smartAccountingResult: smartResult,
          };
        } else {
          // 单条记录，保持原有格式
          responseData = {
            ...createdTransactions[0],
            smartAccountingResult: smartResult,
          };
        }

        // 如果有日期异常，添加警告信息（微信端）
        if (hasDateAnomalies) {
          const warningMessage = this.generateDateWarningMessage(recordsWithDateValidation);
          responseData.dateWarning = warningMessage;
          logger.info(`⚠️ [日期警告-微信记账] ${warningMessage}`);
        }

        res.status(201).json(responseData);
      } catch (createError) {
        logger.error('创建记账记录错误:', createError);
        // 即使创建失败，也返回智能记账结果
        res.status(500).json({
          error: '创建记账记录失败',
          smartAccountingResult: smartResult,
        });
      }
    } catch (error) {
      logger.error('智能记账直接创建错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 智能记账并直接创建记账记录
   * @param req 请求
   * @param res 响应
   */
  public async handleSmartAccountingDirect(req: Request, res: Response) {
    try {
      const { description, attachmentFileId, source: requestSource, isFromImageRecognition } = req.body;
      const { accountId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 检测请求来源并设置到LLM服务中
      const source = SourceDetectionUtil.detectSource(req);
      this.llmProviderService.setRequestContext({ source });

      if (!description) {
        return res.status(400).json({ error: '描述不能为空' });
      }

      if (!accountId) {
        return res.status(400).json({ error: '账本ID不能为空' });
      }

      // 限制描述文本长度，避免过长的文本导致LLM处理超时
      const MAX_DESCRIPTION_LENGTH = 2000;
      let processedDescription = description;
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        logger.info(`[智能记账] 描述过长(${description.length}字符)，截取前${MAX_DESCRIPTION_LENGTH}字符`);
        processedDescription = description.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
      }

      // 检查账本是否存在并且用户有权限访问
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              familyId: {
                not: null,
              },
              family: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        return res.status(404).json({ error: '账本不存在或无权访问' });
      }

      // 检查记账点余额（文字记账消费1点）- 仅在记账点系统启用时检查
      if (this.membershipService.isAccountingPointsEnabled()) {
        const canUsePoints = await AccountingPointsService.canUsePoints(userId, AccountingPointsService.POINT_COSTS.text);
        if (!canUsePoints) {
          return res.status(402).json({
            error: '记账点余额不足，请进行签到获取记账点或开通捐赠会员，每天登录App以及签到总计可获得10点赠送记账点',
            type: 'INSUFFICIENT_POINTS',
            required: AccountingPointsService.POINT_COSTS.text
          });
        }
      }

      // 处理描述，获取智能记账结果
      const result = await this.smartAccounting.processDescription(
        processedDescription,
        userId,
        accountId,
        accountBook.type,
      );

      if (!result) {
        return res.status(500).json({ error: '智能记账处理失败' });
      }

      // 检查是否有错误信息（如内容与记账无关）
      if ('error' in result) {
        // 其他错误（如内容与记账无关）
        return res.status(400).json({ info: result.error });
      }

      // 从智能记账结果创建记账记录
      try {
        // 检查是否为数组格式（多条记录）
        const isMultipleRecords = Array.isArray(result);
        const recordsToCreate = isMultipleRecords ? result : [result as SmartAccountingResult];
        
        logger.info(`📝 [记账处理] 检测到 ${recordsToCreate.length} 条记录需要创建`);

        // 日期校验和修正 - 直接记账也需要校验
        const recordsWithDateValidation = this.dateCorrectionMiddleware.processBatchRecords(
          recordsToCreate,
          'app',
          { userId, accountBookId: accountId }
        );

        // 检查是否有日期异常需要用户修正
        const hasDateAnomalies = this.dateCorrectionMiddleware.hasDateAnomalies(recordsWithDateValidation);
        
        logger.info(`📅 [日期校验-直接记账] 记录数: ${recordsWithDateValidation.length}, 有异常: ${hasDateAnomalies}`);

        // 如果有日期异常，返回修正提示（不直接创建）
        if (hasDateAnomalies) {
          logger.info(`⚠️ [日期校验-直接记账] 检测到日期异常，返回修正提示`);
          return res.json({
            requiresDateCorrection: true,
            records: recordsWithDateValidation,
            message: '检测到日期异常，请确认修正',
          });
        }

        // 检查是否来自图片识别且有多条记录
        if (isFromImageRecognition && recordsWithDateValidation.length > 1) {
          // 来自图片识别且有多条记录，进行重复检测并返回记录列表供用户选择
          logger.info(`📝 [直接记账] 检测到来自图片识别的${recordsWithDateValidation.length}条记录，进行重复检测`);

          try {
            // 进行重复检测
            const duplicateResults = await TransactionDuplicateDetectionService.detectBatchDuplicates(
              userId,
              accountId,
              recordsWithDateValidation
            );

            // 将重复检测结果附加到记录中
            const recordsWithDuplicateInfo = recordsWithDateValidation.map((record, index) => {
              const duplicateInfo = duplicateResults.find(r => r.recordIndex === index);
              return {
                ...record,
                duplicateDetection: duplicateInfo || {
                  isDuplicate: false,
                  confidence: 0,
                  matchedTransactions: [],
                },
              };
            });

            // 返回记录列表供用户选择，不扣除记账点
            return res.json({
              success: true,
              requiresUserSelection: true,
              records: recordsWithDuplicateInfo,
              message: '检测到多条记账记录，请选择需要导入的记录',
            });
          } catch (duplicateError) {
            logger.error('重复检测失败:', duplicateError);
            // 重复检测失败时，仍然返回记录列表，但不包含重复信息
            const recordsWithoutDuplicateInfo = recordsWithDateValidation.map(record => ({
              ...record,
              duplicateDetection: {
                isDuplicate: false,
                confidence: 0,
                matchedTransactions: [],
              },
            }));

            return res.json({
              success: true,
              requiresUserSelection: true,
              records: recordsWithoutDuplicateInfo,
              message: '检测到多条记账记录，请选择需要导入的记录',
            });
          }
        }

        const createdTransactions = [];
        const now = new Date();

        // 验证附件文件是否存在（如果有的话）
        let attachmentFileExists = false;
        if (attachmentFileId) {
          try {
            const fileInfo = await this.prisma.fileStorage.findUnique({
              where: {
                id: attachmentFileId,
                uploadedBy: userId, // 确保文件属于当前用户
              },
            });

            if (fileInfo) {
              attachmentFileExists = true;
              logger.info(`📎 [附件验证] 附件文件验证成功: ${attachmentFileId}`);
            } else {
              logger.warn(`⚠️ [附件验证] 文件不存在或无权访问: ${attachmentFileId}`);
            }
          } catch (error) {
            logger.error('验证附件文件失败:', error);
          }
        }

        // 循环创建每条记录（使用校验后的记录）
        for (let i = 0; i < recordsWithDateValidation.length; i++) {
          const smartResult = recordsWithDateValidation[i];
          
          // 处理日期，如果记录中有日期则使用该日期但保持当前时间，否则使用当前完整时间
          let dateObj;
          if (smartResult.date) {
            // 如果有日期，解析日期但使用当前的时分秒
            const recordDate = new Date(smartResult.date);
            dateObj = new Date(
              recordDate.getFullYear(),
              recordDate.getMonth(),
              recordDate.getDate(),
              now.getHours(),    // 使用当前小时
              now.getMinutes(),  // 使用当前分钟
              now.getSeconds(),  // 使用当前秒
              now.getMilliseconds() // 使用当前毫秒
            );
          } else {
            // 如果没有日期，使用完整的当前时间
            dateObj = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              now.getHours(),
              now.getMinutes(),
              now.getSeconds(),
              now.getMilliseconds(),
            );
          }

          // 如果是家庭账本，需要通过预算ID确定家庭成员ID
          let familyMemberId = null;
          if (accountBook.type === 'FAMILY' && accountBook.familyId) {
            const budgetId = smartResult.budgetId;

            if (budgetId) {
              // 通过预算ID查找预算记录
              const budget = await this.prisma.budget.findUnique({
                where: { id: budgetId },
                include: {
                  familyMember: true,
                  user: true,
                },
              });

              if (budget) {
                if (budget.familyMemberId) {
                  // 预算直接关联到家庭成员（旧架构的托管成员预算）
                  familyMemberId = budget.familyMemberId;
                } else if (budget.userId) {
                  // 预算关联到用户（包括普通用户和托管用户），需要查找该用户在家庭中的成员记录
                  // 这是统一的处理逻辑：无论是普通用户还是托管用户，都通过userId查找对应的familyMember.id
                  const familyMember = await this.prisma.familyMember.findFirst({
                    where: {
                      familyId: accountBook.familyId,
                      userId: budget.userId,
                    },
                  });

                  if (familyMember) {
                    familyMemberId = familyMember.id;
                  }
                }
              }
            }

            // 如果通过预算无法确定家庭成员ID，则使用当前用户作为备选方案
            if (!familyMemberId) {
              const familyMember = await this.prisma.familyMember.findFirst({
                where: {
                  familyId: accountBook.familyId,
                  userId: userId,
                },
              });

              if (familyMember) {
                familyMemberId = familyMember.id;
              }
            }
          }

          const transactionData = {
            amount: smartResult.amount,
            type: smartResult.type as TransactionType,
            categoryId: smartResult.categoryId,
            description: smartResult.note || `${description} (${i + 1})`,
            date: dateObj,
            accountBookId: accountId,
            userId,
            // 如果是家庭账本，添加家庭ID和家庭成员ID
            familyId: accountBook.type === 'FAMILY' ? accountBook.familyId : null,
            familyMemberId: familyMemberId,
            // 预算ID如果有的话
            budgetId: smartResult.budgetId || null,
          };

          logger.info(`💾 [记账创建] 创建第 ${i + 1} 条记账记录:`, {
            amount: transactionData.amount,
            userId: transactionData.userId,
            accountBookId: transactionData.accountBookId,
            budgetId: transactionData.budgetId,
          });

          // 创建记账记录
          const transaction = await this.prisma.transaction.create({
            data: transactionData,
          });

          createdTransactions.push(transaction);
          
          // 如果有附件文件ID且文件存在，将其关联到创建的交易记录（为每条记录都添加附件）
          if (attachmentFileId && attachmentFileExists) {
            try {
              logger.info(`📎 [附件关联] 正在为交易记录 ${transaction.id} 关联附件 ${attachmentFileId}`);

              // 为每条记录创建附件关联
              await this.attachmentRepository.create({
                transactionId: transaction.id,
                fileId: attachmentFileId,
                attachmentType: AttachmentType.RECEIPT,
                description: '智能记账上传图片',
              });

              logger.info(`✅ [附件关联] 交易记录 ${transaction.id} 附件关联成功`);
            } catch (attachmentError) {
              logger.error(`关联附件失败 (交易记录 ${transaction.id}):`, attachmentError);
              // 附件关联失败不影响记账创建的成功
            }
          }
          
          logger.info(`✅ [记账创建] 第 ${i + 1} 条记账记录创建成功: ${transaction.id}`);
        }

        // 记账创建成功，扣除记账点（仅在记账点系统启用时）
        if (this.membershipService.isAccountingPointsEnabled()) {
          try {
            await AccountingPointsService.deductPoints(userId, 'text', AccountingPointsService.POINT_COSTS.text);
          } catch (pointsError) {
            logger.error('扣除记账点失败:', pointsError);
            // 记账点扣除失败不影响返回结果，但需要记录日志
          }
        }

        // 返回创建的记账记录
        if (isMultipleRecords) {
          // 多条记录，返回数组
          res.status(201).json({
            transactions: createdTransactions,
            count: createdTransactions.length,
            smartAccountingResult: result,
          });
        } else {
          // 单条记录，保持原有格式
          res.status(201).json({
            ...createdTransactions[0],
            smartAccountingResult: result,
          });
        }
      } catch (createError) {
        logger.error('创建记账记录错误:', createError);
        // 即使创建失败，也返回智能记账结果
        res.status(500).json({
          error: '创建记账记录失败',
          smartAccountingResult: result,
        });
      }
    } catch (error) {
      logger.error('智能记账直接创建错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 检查用户是否有权限访问账本
   * @param userId 用户ID
   * @param accountId 账本ID
   * @returns 是否有权限
   */
  private async checkAccountAccess(userId: string, accountId: string): Promise<boolean> {
    try {
      logger.info('🔑 [权限检查] 开始检查账本访问权限:', { userId, accountId });

      const accountBook = await this.prisma.accountBook.findUnique({
        where: { id: accountId },
      });

      if (!accountBook) {
        logger.info('❌ [权限检查] 账本不存在');
        return false;
      }

      logger.info('📖 [权限检查] 账本信息:', {
        accountBookId: accountBook.id,
        accountBookUserId: accountBook.userId,
        accountBookType: accountBook.type,
        familyId: accountBook.familyId,
      });

      // 检查是否是用户自己的账本
      if (accountBook.userId === userId) {
        logger.info('✅ [权限检查] 用户是账本所有者，允许访问');
        return true;
      }

      // 检查是否是家庭账本且用户是家庭成员
      if (accountBook.type === 'FAMILY' && accountBook.familyId) {
        logger.info('👨‍👩‍👧‍👦 [权限检查] 检查家庭成员身份:', { familyId: accountBook.familyId });

        const familyMember = await this.prisma.familyMember.findFirst({
          where: {
            familyId: accountBook.familyId,
            userId,
          },
        });

        const isFamilyMember = !!familyMember;
        logger.info('👨‍👩‍👧‍👦 [权限检查] 家庭成员检查结果:', {
          isFamilyMember,
          familyMemberId: familyMember?.id,
        });

        return isFamilyMember;
      }

      logger.info('❌ [权限检查] 不是个人账本也不是家庭成员，拒绝访问');
      return false;
    } catch (error) {
      logger.error('❌ [权限检查] 检查账本访问权限错误:', error);
      return false;
    }
  }

  /**
   * 获取账本当前激活的AI服务详情
   * @param req 请求
   * @param res 响应
   */
  public async getAccountActiveAIService(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      logger.info('🔍 [AI服务] 获取账本激活AI服务:', { userId, accountId });

      if (!userId) {
        logger.info('❌ [AI服务] 用户未授权');
        return res.status(401).json({ error: '未授权' });
      }

      // 检查用户是否有权限访问该账本
      const hasAccess = await this.checkAccountAccess(userId, accountId);
      logger.info('🔑 [AI服务] 账本访问权限检查结果:', { hasAccess, userId, accountId });

      if (!hasAccess) {
        logger.info('❌ [AI服务] 用户无权访问该账本');
        return res.status(403).json({ error: '无权访问该账本' });
      }

      // 首先检查是否启用了全局AI服务
      const globalConfig = await this.llmProviderService.getGlobalLLMConfig();
      logger.info('⚙️ [AI服务] 全局配置:', { enabled: globalConfig.enabled });

      if (globalConfig.enabled) {
        // 检查用户的AI服务类型配置（从user_settings表读取）
        const serviceType = await this.getUserAIServiceType(userId);
        logger.info('🔍 [AI服务] 用户选择的服务类型:', serviceType);

        if (serviceType === 'official') {
          // 如果启用了官方服务，返回官方服务信息
          // 获取TOKEN使用量信息
          const tokenUsage = await this.getTokenUsageForUser(userId);

          // 使用TokenLimitService获取真实的Token限额
          const { TokenLimitService } = await import('../services/token-limit.service');
          const tokenLimitService = new TokenLimitService();
          const dailyTokenLimit = await tokenLimitService.getUserDailyTokenLimit(userId);

          const result = {
            enabled: true,
            type: 'official',
            maxTokens: globalConfig.maxTokens || 1000,
            dailyTokenLimit: dailyTokenLimit,
            usedTokens: tokenUsage.usedTokens || 0,
            provider: globalConfig.provider,
            model: globalConfig.model,
            baseUrl: globalConfig.baseUrl,
          };

          logger.info('✅ [AI服务] 返回官方服务信息:', result);
          return res.json(result);
        } else if (serviceType === 'custom') {
          // 如果是自定义服务类型，获取用户的默认自定义LLM设置
          try {
            const userLLMSetting = await this.getUserDefaultLLMSetting(userId);

            if (!userLLMSetting) {
              logger.info('❌ [AI服务] 用户没有默认的自定义LLM设置');
              const result = {
                enabled: false,
                type: null,
                maxTokens: 1000,
              };
              return res.json(result);
            }

            // 返回用户的自定义服务信息
            const result = {
              enabled: true,
              type: 'custom',
              maxTokens: userLLMSetting.maxTokens || 1000,
              provider: userLLMSetting.provider,
              model: userLLMSetting.model,
              baseUrl: userLLMSetting.baseUrl,
              name: userLLMSetting.name,
              description: userLLMSetting.description,
            };

            logger.info('✅ [AI服务] 返回用户自定义服务信息:', result);
            return res.json(result);
          } catch (error) {
            logger.error('❌ [AI服务] 获取用户自定义LLM设置失败:', error);
            const result = {
              enabled: false,
              type: null,
              maxTokens: 1000,
            };
            return res.json(result);
          }
        }
        // 如果服务类型不是official或custom，继续下面的逻辑检查账本绑定（兼容旧版本）
      }

      // 如果没有启用全局服务，检查账本是否绑定了自定义服务
      try {
        const accountBook = await this.prisma.accountBook.findUnique({
          where: { id: accountId },
        });

        logger.info('📖 [AI服务] 账本信息:', {
          found: !!accountBook,
          userLLMSettingId: accountBook?.userLLMSettingId,
        });

        if (!accountBook || !accountBook.userLLMSettingId) {
          const result = {
            enabled: false,
            type: null,
            maxTokens: 1000,
          };
          logger.info('✅ [AI服务] 返回未启用状态:', result);
          return res.json(result);
        }

        // 获取绑定的用户LLM设置
        const userLLMSetting = await this.prisma.userLLMSetting.findUnique({
          where: { id: accountBook.userLLMSettingId },
        });

        logger.info('🤖 [AI服务] LLM设置信息:', { found: !!userLLMSetting });

        if (!userLLMSetting) {
          const result = {
            enabled: false,
            type: null,
            maxTokens: 1000,
          };
          logger.info('✅ [AI服务] LLM设置不存在，返回未启用状态:', result);
          return res.json(result);
        }

        // 返回自定义服务信息
        const result = {
          enabled: true,
          type: 'custom',
          maxTokens: userLLMSetting.maxTokens || 1000,
          provider: userLLMSetting.provider,
          model: userLLMSetting.model,
          baseUrl: userLLMSetting.baseUrl,
          name: userLLMSetting.name,
          description: userLLMSetting.description,
        };

        logger.info('✅ [AI服务] 返回自定义服务信息:', result);
        return res.json(result);
      } catch (error) {
        logger.error('❌ [AI服务] 获取账本AI服务配置错误:', error);
        const result = {
          enabled: false,
          type: null,
          maxTokens: 1000,
        };
        return res.json(result);
      }
    } catch (error) {
      logger.error('❌ [AI服务] 获取账本激活AI服务错误:', error);
      res.status(500).json({ error: '处理请求时出错' });
    }
  }

  /**
   * 获取用户TOKEN使用量
   * @param userId 用户ID
   * @returns TOKEN使用量信息
   */
  private async getTokenUsageForUser(userId: string): Promise<{ usedTokens: number }> {
    try {
      // 获取今天的开始时间（北京时间00:00:00对应的UTC时间）
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      beijingTime.setUTCHours(0, 0, 0, 0);
      const today = new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);

      // 获取明天的开始时间（用于范围查询）
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      logger.info(
        `查询用户 ${userId} 今日官方AI服务token使用量，时间范围: ${today.toISOString()} - ${tomorrow.toISOString()}`,
      );

      // 查询今日该用户的官方AI服务LLM调用记录（全局LLM + 多提供商）
      const todayLogs = await this.prisma.llmCallLog.findMany({
        where: {
          userId: userId,
          serviceType: {
            in: ['official', 'multi-provider'], // 只统计官方AI服务（全局LLM + 多提供商）
          },
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          isSuccess: true, // 只统计成功的调用
        },
        select: {
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          provider: true,
          model: true,
          serviceType: true,
          createdAt: true,
        },
      });

      logger.debug(`找到 ${todayLogs.length} 条今日官方AI服务LLM调用记录`);

      // 计算总token使用量
      const usedTokens = todayLogs.reduce((total, log) => {
        return total + (log.totalTokens || 0);
      }, 0);

      logger.info(`用户 ${userId} 今日官方AI服务token使用量: ${usedTokens}`);

      // 如果需要调试，可以打印详细信息
      if (todayLogs.length > 0) {
        logger.info('今日官方AI服务LLM调用详情:');
        todayLogs.forEach((log, index) => {
          logger.info(
            `  ${index + 1}. ${log.provider}/${log.model} (${log.serviceType}): ${
              log.totalTokens
            } tokens (${log.promptTokens} + ${log.completionTokens}) at ${log.createdAt}`,
          );
        });
      }

      return { usedTokens };
    } catch (error) {
      logger.error('获取用户TOKEN使用量错误:', error);
      return { usedTokens: 0 };
    }
  }

  /**
   * 检查用户是否有权限使用指定的LLM设置
   * @param userId 用户ID
   * @param accountId 账本ID
   * @param llmSettingId LLM设置ID
   * @returns 是否有权限
   */
  private async checkLLMSettingAccess(
    userId: string,
    accountId: string,
    llmSettingId: string,
  ): Promise<boolean> {
    try {
      // 查询LLM设置
      const llmSetting = await this.prisma.userLLMSetting.findUnique({
        where: { id: llmSettingId },
      });

      if (!llmSetting) {
        return false;
      }

      // 如果是用户自己的LLM设置，直接允许
      if (llmSetting.userId === userId) {
        return true;
      }

      // 查询账本信息
      const accountBook = await this.prisma.accountBook.findUnique({
        where: { id: accountId },
        include: {
          family: {
            include: {
              members: {
                where: { userId: { not: null } },
                select: { userId: true },
              },
            },
          },
        },
      });

      if (!accountBook) {
        return false;
      }

      // 如果是家庭账本，检查LLM设置是否属于家庭成员
      if (accountBook.type === 'FAMILY' && accountBook.family) {
        const familyUserIds = accountBook.family.members
          .map((member) => member.userId)
          .filter((id) => id !== null);

        // 检查当前用户是否是家庭成员
        const isCurrentUserFamilyMember = familyUserIds.includes(userId);
        // 检查LLM设置所有者是否是家庭成员
        const isLLMOwnerFamilyMember = familyUserIds.includes(llmSetting.userId);

        return isCurrentUserFamilyMember && isLLMOwnerFamilyMember;
      }

      return false;
    } catch (error) {
      logger.error('检查LLM设置访问权限错误:', error);
      return false;
    }
  }

  /**
   * 获取系统配置值
   * @param key 配置键
   * @returns 配置值
   */
  private async getSystemConfigValue(key: string): Promise<string | null> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key },
      });
      return config?.value || null;
    } catch (error) {
      logger.error('获取系统配置值错误:', error);
      return null;
    }
  }

  /**
   * 获取用户的AI服务类型选择
   * @param userId 用户ID
   * @returns AI服务类型 ('official' 或 'custom')
   */
  private async getUserAIServiceType(userId: string): Promise<'official' | 'custom'> {
    try {
      const userSetting = await this.prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId: userId,
            key: 'ai_service_type',
          },
        },
      });

      if (userSetting && userSetting.value === 'custom') {
        return 'custom';
      }

      // 默认返回 'official'
      return 'official';
    } catch (error) {
      logger.error(`获取用户 ${userId} 的AI服务类型失败:`, error);
      return 'official';
    }
  }

  /**
   * 获取用户的默认自定义LLM设置
   * @param userId 用户ID
   * @returns 用户的默认LLM设置
   */
  private async getUserDefaultLLMSetting(userId: string): Promise<any | null> {
    try {
      // 查找用户的第一个LLM设置作为默认设置
      const userLLMSetting = await this.prisma.userLLMSetting.findFirst({
        where: {
          userId: userId,
        },
        orderBy: { createdAt: 'asc' },
      });

      return userLLMSetting;
    } catch (error) {
      logger.error(`获取用户 ${userId} 的默认LLM设置失败:`, error);
      return null;
    }
  }

  /**
   * 获取快捷指令临时上传token
   * @param req 请求
   * @param res 响应
   */
  async getShortcutsToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: '用户未认证' });
        return;
      }

      // 生成长期有效的token，包含用户ID和过期时间（72小时）
      const expirationTime = Date.now() + 72 * 60 * 60 * 1000; // 72小时过期
      const tempToken = Buffer.from(JSON.stringify({
        userId,
        exp: expirationTime,
        purpose: 'shortcuts-upload',
        iat: Date.now() // 签发时间
      })).toString('base64');

      // 动态确定API基础URL
      let apiBaseUrl = process.env.EXTERNAL_DOMAIN || process.env.API_BASE_URL;

      // 如果没有设置环境变量，根据NODE_ENV判断
      if (!apiBaseUrl) {
        if (process.env.NODE_ENV === 'development') {
          apiBaseUrl = 'https://jz-dev.jacksonz.cn:4443';
        } else {
          apiBaseUrl = 'https://app.zhiweijz.cn:1443';
        }
      }

      res.json({
        success: true,
        token: tempToken,
        uploadUrl: `${apiBaseUrl}/api/upload/shortcuts`,
        checkTokenUrl: `${apiBaseUrl}/api/ai/shortcuts/check-token`,
        expiresIn: 72 * 60 * 60, // 72小时（秒）
        expiresAt: expirationTime // 过期时间戳
      });
    } catch (error) {
      logger.error('获取快捷指令token错误:', error);
      res.status(500).json({
        error: '获取token失败',
        details: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  /**
   * 检查快捷指令token有效性
   * @param req 请求
   * @param res 响应
   */
  async checkShortcutsToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        // 返回快捷指令兼容的词典格式
        res.json({
          valid: 'false',
          error: '缺少token参数'
        });
        return;
      }

      // 验证token
      const tokenValidation = this.validateShortcutsToken(token);

      if (!tokenValidation.valid) {
        // 返回快捷指令兼容的词典格式
        res.json({
          valid: 'false',
          message: 'Token已过期或无效'
        });
        return;
      }

      // 计算剩余有效时间
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const remainingTime = Math.max(0, decoded.exp - Date.now());
      const remainingHours = Math.floor(remainingTime / (60 * 60 * 1000));

      // 返回快捷指令兼容的词典格式 - 所有值都转为字符串
      res.json({
        valid: 'true',
        remainingTime: remainingTime.toString(),
        remainingHours: remainingHours.toString(),
        message: `Token有效，剩余${remainingHours}小时`
      });

    } catch (error) {
      logger.error('检查快捷指令token错误:', error);
      // 返回快捷指令兼容的词典格式
      res.json({
        valid: 'false',
        error: '检查token失败',
        details: error instanceof Error ? error.message : '未知错误'
      });
    }
  }



  /**
   * Android MacroDroid截图记账（通过文件上传）
   * @param req 请求
   * @param res 响应
   */
  async androidScreenshotAccounting(req: Request, res: Response): Promise<void> {
    try {
      // 验证token认证
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: '缺少授权token',
          message: '请在MacroDroid中配置正确的Authorization头部'
        });
        return;
      }

      // 验证快捷指令token
      const tokenValidation = this.validateShortcutsToken(token);
      if (!tokenValidation.valid) {
        res.status(401).json({
          success: false,
          error: '无效或过期的token',
          message: '请重新获取token或检查token是否正确'
        });
        return;
      }

      const userId = tokenValidation.userId!;
      const { accountBookId } = req.body;

      // 检查是否有上传的文件
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '没有上传文件',
          message: '请确保MacroDroid正确配置了文件上传'
        });
        return;
      }

      // 验证文件类型
      if (!req.file.mimetype.startsWith('image/')) {
        res.status(400).json({
          success: false,
          error: '文件类型不支持',
          message: '只支持图片文件'
        });
        return;
      }

      logger.info(`🤖 [Android截图记账] 开始处理:`, {
        userId,
        accountBookId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      // 获取默认账本ID（如果没有指定）
      let targetAccountBookId = accountBookId;
      if (!targetAccountBookId) {
        const defaultAccountBook = await this.prisma.accountBook.findFirst({
          where: {
            OR: [
              { userId: userId },
              {
                family: {
                  members: {
                    some: {
                      userId: userId,
                    },
                  },
                },
              },
            ],
          },
          orderBy: { createdAt: 'desc' }
        });

        if (!defaultAccountBook) {
          res.status(400).json({
            success: false,
            error: '未找到可用的账本',
            message: '请先在App中创建账本'
          });
          return;
        }

        targetAccountBookId = defaultAccountBook.id;
        logger.info(`🤖 [Android截图记账] 使用默认账本: ${targetAccountBookId}`);
      }

      // 验证账本权限
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: targetAccountBookId,
          OR: [
            { userId: userId },
            {
              family: {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        res.status(403).json({
          success: false,
          error: '无权访问该账本',
          message: '请检查账本ID是否正确或您是否有权限访问'
        });
        return;
      }

      // 创建临时文件对象
      const tempFile = {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname || 'android-screenshot.jpg',
        size: req.file.size
      } as Express.Multer.File;

      // 调用现有的图片智能记账逻辑
      const { MultimodalAIController } = await import('./multimodal-ai.controller');
      const multimodalController = new MultimodalAIController();

      // 创建模拟请求对象
      const mockReq = {
        user: { id: userId },
        file: tempFile,
        body: { accountBookId: targetAccountBookId }
      } as any;

      // 创建响应拦截器
      let visionResult: any = null;
      let statusCode = 200;
      const mockRes = {
        json: (data: any) => { visionResult = data; },
        status: (code: number) => { statusCode = code; return mockRes; }
      } as any;

      await multimodalController.smartAccountingVision(mockReq, mockRes);

      if (statusCode === 200 && visionResult?.success) {
        logger.info(`🤖 [Android截图记账] 处理成功:`, {
          transactionId: visionResult.data?.id,
          text: visionResult.data?.text?.substring(0, 100) + '...'
        });

        res.status(201).json({
          success: true,
          message: 'Android截图记账成功！',
          data: {
            transactionId: visionResult.data?.id,
            text: visionResult.data?.text,
            confidence: visionResult.data?.confidence,
            accountBookId: targetAccountBookId
          }
        });
      } else {
        logger.error(`🤖 [Android截图记账] 处理失败:`, visionResult);
        res.status(statusCode || 400).json({
          success: false,
          error: '图片识别失败',
          message: visionResult?.error || '无法从图片中提取有效信息'
        });
      }

    } catch (error) {
      logger.error('🤖 [Android截图记账] 处理失败:', error);
      res.status(500).json({
        success: false,
        error: 'Android截图记账处理失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 验证快捷指令token的辅助方法
   */
  private validateShortcutsToken(token: string): { valid: boolean; userId?: string; error?: string } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

      if (!decoded.userId || !decoded.exp || !decoded.purpose) {
        return { valid: false, error: 'Token格式无效' };
      }

      if (decoded.purpose !== 'shortcuts-upload') {
        return { valid: false, error: 'Token用途不匹配' };
      }

      if (Date.now() > decoded.exp) {
        return { valid: false, error: 'Token已过期' };
      }

      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false, error: 'Token解析失败' };
    }
  }

  /**
   * 快捷指令图片记账（通过图片URL）
   * @param req 请求
   * @param res 响应
   */
  async shortcutsImageAccounting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: '用户未认证' });
        return;
      }

      const { imageUrl, accountBookId } = req.body;

      if (!imageUrl || !accountBookId) {
        res.status(400).json({
          error: '缺少必需参数',
          required: ['imageUrl', 'accountBookId']
        });
        return;
      }

      logger.info(`🚀 [快捷指令图片记账] 开始处理:`, {
        userId,
        accountBookId,
        imageUrl: imageUrl.substring(0, 100) + '...'
      });

      // 验证账本权限
      const accountBook = await this.prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId: userId },
            {
              family: {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
          ],
        },
      });

      if (!accountBook) {
        res.status(404).json({ error: '账本不存在或无权限访问' });
        return;
      }

      // 检查是否是代理URL，如果是则直接从S3下载
      let imageBuffer: Buffer;

      if (imageUrl.includes('/api/image-proxy/s3/')) {
        logger.info('🔄 [快捷指令图片记账] 检测到代理URL，直接从S3下载');

        // 解析代理URL，提取bucket和key
        const urlParts = imageUrl.split('/api/image-proxy/s3/')[1];
        const pathParts = urlParts.split('/');
        const bucket = pathParts[0];
        const key = pathParts.slice(1).join('/');

        logger.info('🔄 [快捷指令图片记账] S3参数:', { bucket, key });

        // 直接从S3下载 - 使用单例实例
        const { FileStorageService } = await import('../services/file-storage.service');
        const fileStorageService = FileStorageService.getInstance();

        // 确保存储服务已初始化
        if (!fileStorageService.isStorageAvailable()) {
          logger.info('🔄 [快捷指令图片记账] 存储服务未初始化，尝试重新加载配置...');
          await fileStorageService.reloadConfig();

          // 等待一段时间让服务初始化完成
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const s3Service = fileStorageService.getS3Service();

        if (!s3Service) {
          logger.error('🔄 [快捷指令图片记账] S3服务仍然不可用');
          res.status(503).json({ error: 'S3存储服务不可用' });
          return;
        }

        try {
          const fileStream = await s3Service.downloadFile(bucket, key);
          const chunks: Buffer[] = [];

          for await (const chunk of fileStream) {
            chunks.push(chunk);
          }

          imageBuffer = Buffer.concat(chunks);
          logger.info('🔄 [快捷指令图片记账] S3下载成功，大小:', imageBuffer.length);
        } catch (s3Error) {
          logger.error('🔄 [快捷指令图片记账] S3下载失败:', s3Error);
          res.status(400).json({ error: '无法从S3下载图片' });
          return;
        }
      } else {
        // 普通URL，使用fetch下载
        logger.info('🔄 [快捷指令图片记账] 普通URL，使用fetch下载');
        const fetch = (await import('node-fetch')).default;
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
          res.status(400).json({ error: '无法下载图片' });
          return;
        }

        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      }

      // 创建临时文件对象
      const tempFile = {
        buffer: imageBuffer,
        mimetype: 'image/jpeg',
        originalname: 'shortcuts-image.jpg',
        size: imageBuffer.length
      } as Express.Multer.File;

      // 调用现有的图片智能记账逻辑
      const { MultimodalAIController } = await import('./multimodal-ai.controller');
      const multimodalController = new MultimodalAIController();

      // 创建模拟请求对象
      const mockReq = {
        user: req.user,
        file: tempFile,
        body: { accountBookId }
      } as any;

      // 创建响应拦截器
      let visionResult: any = null;
      let statusCode = 200;
      const mockRes = {
        json: (data: any) => { visionResult = data; },
        status: (code: number) => { statusCode = code; return mockRes; }
      } as any;

      await multimodalController.smartAccountingVision(mockReq, mockRes);

      if (statusCode === 200 && visionResult?.success) {
        res.status(201).json(visionResult);
      } else {
        res.status(statusCode || 400).json({
          error: '图片识别失败',
          details: visionResult?.error || '无法从图片中提取有效信息'
        });
      }

    } catch (error) {
      logger.error('🚀 [快捷指令图片记账] 处理失败:', error);
      res.status(500).json({
        error: '快捷指令图片记账处理失败',
        details: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 生成日期警告消息（用于微信端）
   * @param records 带日期校验信息的记录
   * @returns 警告消息
   */
  private generateDateWarningMessage(records: SmartAccountingResultWithValidation[]): string {
    const anomalies = records.filter(r => r.dateValidation && !r.dateValidation.isValid);
    
    if (anomalies.length === 0) {
      return '';
    }

    const warnings = anomalies.map(record => {
      const validation = record.dateValidation!;
      const originalDate = validation.originalDate 
        ? new Date(validation.originalDate).toLocaleDateString('zh-CN')
        : '未知日期';
      const suggestedDate = validation.suggestedDate 
        ? new Date(validation.suggestedDate).toLocaleDateString('zh-CN')
        : '今天';
      return `识别日期"${originalDate}"不在合理范围内，已自动修正为今天(${suggestedDate})`;
    });

    return `⚠️ 日期修正提示:\n${warnings.join('\n')}`;
  }

}
