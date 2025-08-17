import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AICallLogListParams {
  page?: number;
  pageSize?: number;
  userEmail?: string;
  provider?: string;
  model?: string;
  isSuccess?: boolean;
  accountBookId?: string;
  aiServiceType?: 'llm' | 'speech' | 'vision';
  source?: 'App' | 'WeChat' | 'API';
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AICallLogStatisticsParams {
  startDate?: string;
  endDate?: string;
}

/**
 * 统一的AI调用日志管理服务
 * 支持LLM和多模态AI调用日志的统一查询和管理
 */
export class AICallLogAdminService {
  /**
   * 初始化服务 - 强制重新创建统一视图
   */
  async initialize() {
    await this.ensureUnifiedViewExists();
  }

  /**
   * 确保统一视图存在
   */
  private async ensureUnifiedViewExists() {
    try {
      // 首先检查视图是否已存在
      try {
        await prisma.$queryRaw`SELECT 1 FROM ai_call_logs_unified LIMIT 1;`;
        console.log('✅ [统一视图] 统一视图已存在，跳过创建');
        return;
      } catch (error) {
        console.log('🔍 [统一视图] 统一视图不存在，开始创建...');
      }

      // 先删除现有视图（如果存在）
      await prisma.$executeRaw`DROP VIEW IF EXISTS ai_call_logs_unified;`;
      console.log('🗑️ [统一视图] 已删除现有视图');

      // 重新创建统一视图，包含用户邮箱信息
      await prisma.$executeRaw`
        CREATE VIEW ai_call_logs_unified AS
        SELECT
            l.id,
            l.user_id,
            l.user_name,
            u.email as user_email,
            u.name as user_real_name,
            l.account_book_id,
            l.account_book_name,
            l.ai_service_type,
            l.provider,
            l.model,
            l.source,
            l.is_success,
            l.error_message,
            l.duration,
            l.cost,
            l.created_at,
            -- LLM特有字段
            l.prompt_tokens,
            l.completion_tokens,
            l.total_tokens,
            l.user_message,
            l.assistant_message,
            l.system_prompt,
            -- 多模态AI字段设为NULL
            NULL::INTEGER as input_size,
            NULL::VARCHAR(20) as input_format,
            NULL::TEXT as multimodal_output_text,
            NULL::DECIMAL(5,4) as confidence_score,
            'llm' as log_type
        FROM llm_call_logs l
        LEFT JOIN users u ON l.user_id = u.id

        UNION ALL

        SELECT
            m.id,
            m.user_id,
            m.user_name,
            u.email as user_email,
            u.name as user_real_name,
            m.account_book_id,
            m.account_book_name,
            m.ai_service_type,
            m.provider,
            m.model,
            m.source,
            m.is_success,
            m.error_message,
            m.duration,
            m.cost,
            m.created_at,
            -- LLM字段设为NULL或默认值
            NULL::INTEGER as prompt_tokens,
            NULL::INTEGER as completion_tokens,
            m.tokens as total_tokens,
            NULL::TEXT as user_message,
            m.output_text as assistant_message,
            NULL::TEXT as system_prompt,
            -- 多模态AI特有字段
            m.input_size,
            m.input_format,
            m.output_text as multimodal_output_text,
            m.confidence_score,
            'multimodal' as log_type
        FROM multimodal_ai_call_logs m
        LEFT JOIN users u ON m.user_id = u.id;
      `;

      console.log('✅ [统一视图] 统一视图重新创建成功');

      // 测试查询一条记录验证视图
      const testRecord = await prisma.$queryRaw`
        SELECT id, user_id, user_name, user_email, user_real_name
        FROM ai_call_logs_unified
        LIMIT 1;
      `;
      console.log('🔍 [统一视图] 测试记录:', JSON.stringify(testRecord, null, 2));

    } catch (error) {
      console.error('❌ [统一视图] 检查或创建统一视图时出错:', error);
      // 不抛出错误，继续执行
    }
  }
  /**
   * 获取统一的AI调用日志列表
   */
  async getAICallLogs(params: AICallLogListParams) {
    try {
      console.log('🔍 [AI调用日志] 开始获取日志列表，参数:', JSON.stringify(params, null, 2));

      // 首先检查统一视图是否存在，如果不存在则创建
      await this.ensureUnifiedViewExists();

      const {
        page = 1,
        pageSize = 20,
        userEmail,
        provider,
        model,
        isSuccess,
        accountBookId,
        aiServiceType,
        source,
        startDate,
        endDate,
        search,
      } = params;

      const skip = (page - 1) * pageSize;

      // 构建查询条件
      const where: any = {};

      if (provider) {
        where.provider = { contains: provider, mode: 'insensitive' };
      }

      if (model) {
        where.model = { contains: model, mode: 'insensitive' };
      }

      if (isSuccess !== undefined) {
        where.isSuccess = isSuccess;
      }

      if (accountBookId) {
        where.accountBookId = accountBookId;
      }

      if (aiServiceType) {
        where.aiServiceType = aiServiceType;
      }

      if (source) {
        where.source = source;
      }

      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      if (search) {
        where.OR = [
          { userName: { contains: search, mode: 'insensitive' } },
          { accountBookName: { contains: search, mode: 'insensitive' } },
          { provider: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ];
      }

      // 使用参数化查询避免SQL注入
      const queryParams: any[] = [];
      const countParams: any[] = [];
      let paramIndex = 1;

      let whereConditions = 'WHERE 1=1';

      if (isSuccess !== undefined) {
        whereConditions += ` AND is_success = $${paramIndex}`;
        queryParams.push(isSuccess);
        countParams.push(isSuccess);
        paramIndex++;
      }

      if (accountBookId) {
        whereConditions += ` AND account_book_id = $${paramIndex}`;
        queryParams.push(accountBookId);
        countParams.push(accountBookId);
        paramIndex++;
      }

      if (aiServiceType) {
        whereConditions += ` AND ai_service_type = $${paramIndex}`;
        queryParams.push(aiServiceType);
        countParams.push(aiServiceType);
        paramIndex++;
      }

      if (source) {
        whereConditions += ` AND source = $${paramIndex}`;
        queryParams.push(source);
        countParams.push(source);
        paramIndex++;
      }

      if (startDate && endDate) {
        whereConditions += ` AND created_at BETWEEN $${paramIndex}::timestamp AND $${paramIndex + 1}::timestamp`;
        queryParams.push(startDate, endDate);
        countParams.push(startDate, endDate);
        paramIndex += 2;
      }

      if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        whereConditions += ` AND (user_name ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex + 1} OR account_book_name ILIKE $${paramIndex + 2} OR provider ILIKE $${paramIndex + 3} OR model ILIKE $${paramIndex + 4})`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        paramIndex += 5;
      }

      const query = `
        SELECT * FROM ai_call_logs_unified
        ${whereConditions}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(pageSize, skip);

      const countQuery = `
        SELECT COUNT(*) as total FROM ai_call_logs_unified
        ${whereConditions}
      `;

      console.log('🔍 [AI调用日志] 执行查询SQL:', query);
      console.log('🔍 [AI调用日志] 查询参数:', queryParams);
      console.log('🔍 [AI调用日志] 执行计数SQL:', countQuery);
      console.log('🔍 [AI调用日志] 计数参数:', countParams);

      const [logs, countResult] = await Promise.all([
        prisma.$queryRawUnsafe(query, ...queryParams),
        prisma.$queryRawUnsafe(countQuery, ...countParams),
      ]);

      console.log('🔍 [AI调用日志] 查询结果数量:', (logs as any[]).length);
      console.log('🔍 [AI调用日志] 总记录数:', (countResult as any)[0]?.total);
      console.log('🔍 [AI调用日志] 前3条记录样本:', JSON.stringify((logs as any[]).slice(0, 3), null, 2));

      const total = Number((countResult as any)[0].total);
      const totalPages = Math.ceil(total / pageSize);

      // 转换字段名为camelCase格式
      const formattedLogs = (logs as any[]).map((log) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_real_name || log.user_name || 'Unknown User',
        userEmail: log.user_email || 'N/A',
        accountBookId: log.account_book_id,
        accountBookName: log.account_book_name,
        aiServiceType: log.ai_service_type,
        provider: log.provider,
        model: log.model,
        source: log.source,
        isSuccess: log.is_success,
        errorMessage: log.error_message,
        duration: log.duration,
        cost: log.cost ? Number(log.cost) : null,
        createdAt: log.created_at,
        // LLM特有字段
        promptTokens: log.prompt_tokens,
        completionTokens: log.completion_tokens,
        totalTokens: log.total_tokens,
        userMessage: log.user_message,
        assistantMessage: log.assistant_message,
        systemPrompt: log.system_prompt,
        // 多模态AI特有字段
        inputSize: log.input_size,
        inputFormat: log.input_format,
        outputText: log.multimodal_output_text,
        confidenceScore: log.confidence_score ? Number(log.confidence_score) : null,
        logType: log.log_type,
      }));

      return {
        logs: formattedLogs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('获取AI调用日志列表错误:', error);
      throw new Error('获取AI调用日志列表失败');
    }
  }

  /**
   * 获取AI调用统计数据
   */
  async getAICallLogStatistics(params: AICallLogStatisticsParams) {
    try {
      const { startDate, endDate } = params;

      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      // 获取LLM调用统计
      const llmStats = await prisma.llmCallLog.aggregate({
        where: { ...where, aiServiceType: 'llm' },
        _count: { id: true },
        _sum: { totalTokens: true, cost: true },
        _avg: { duration: true },
      });

      const llmSuccessCount = await prisma.llmCallLog.count({
        where: { ...where, aiServiceType: 'llm', isSuccess: true },
      });

      // 获取多模态AI调用统计
      const multimodalStats = await prisma.multimodalAiCallLog.aggregate({
        where,
        _count: { id: true },
        _sum: { tokens: true, cost: true },
        _avg: { duration: true },
      });

      const multimodalSuccessCount = await prisma.multimodalAiCallLog.count({
        where: { ...where, isSuccess: true },
      });

      // 按来源统计
      const sourceStats = await Promise.all([
        prisma.llmCallLog.groupBy({
          by: ['source'],
          where,
          _count: { id: true },
        }),
        prisma.multimodalAiCallLog.groupBy({
          by: ['source'],
          where,
          _count: { id: true },
        }),
      ]);

      // 按AI服务类型统计
      const serviceTypeStats = await Promise.all([
        prisma.llmCallLog.count({ where }),
        prisma.multimodalAiCallLog.count({ where: { ...where, aiServiceType: 'speech' } }),
        prisma.multimodalAiCallLog.count({ where: { ...where, aiServiceType: 'vision' } }),
      ]);

      return {
        overview: {
          totalCalls: (llmStats._count.id || 0) + (multimodalStats._count.id || 0),
          successCalls: llmSuccessCount + multimodalSuccessCount,
          failedCalls: (llmStats._count.id || 0) + (multimodalStats._count.id || 0) - llmSuccessCount - multimodalSuccessCount,
          totalTokens: (llmStats._sum.totalTokens || 0) + (multimodalStats._sum.tokens || 0),
          totalCost: Number(llmStats._sum.cost || 0) + Number(multimodalStats._sum.cost || 0),
          avgDuration: Math.round(((llmStats._avg.duration || 0) + (multimodalStats._avg.duration || 0)) / 2),
        },
        byServiceType: {
          llm: serviceTypeStats[0],
          speech: serviceTypeStats[1],
          vision: serviceTypeStats[2],
        },
        bySource: {
          App: (sourceStats[0].find(s => s.source === 'App')?._count.id || 0) + (sourceStats[1].find(s => s.source === 'App')?._count.id || 0),
          WeChat: (sourceStats[0].find(s => s.source === 'WeChat')?._count.id || 0) + (sourceStats[1].find(s => s.source === 'WeChat')?._count.id || 0),
          API: (sourceStats[0].find(s => s.source === 'API')?._count.id || 0) + (sourceStats[1].find(s => s.source === 'API')?._count.id || 0),
        },
      };
    } catch (error) {
      console.error('获取AI调用统计错误:', error);
      throw new Error('获取AI调用统计失败');
    }
  }

  /**
   * 获取单个AI调用日志详情
   */
  async getAICallLogById(id: string, logType: 'llm' | 'multimodal') {
    try {
      if (logType === 'llm') {
        return await prisma.llmCallLog.findUnique({
          where: { id },
        });
      } else {
        return await prisma.multimodalAiCallLog.findUnique({
          where: { id },
        });
      }
    } catch (error) {
      console.error('获取AI调用日志详情错误:', error);
      throw new Error('获取AI调用日志详情失败');
    }
  }
}
