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
   * 确保统一视图存在
   */
  private async ensureUnifiedViewExists() {
    try {
      // 检查视图是否存在
      const viewExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.views
          WHERE table_schema = 'public'
          AND table_name = 'ai_call_logs_unified'
        );
      `;

      if (!(viewExists as any)[0].exists) {
        console.log('统一视图不存在，正在创建...');

        // 创建统一视图，包含用户邮箱信息
        await prisma.$executeRaw`
          CREATE OR REPLACE VIEW ai_call_logs_unified AS
          SELECT
              l.id,
              l.user_id,
              l.user_name,
              u.email as user_email,
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
              NULL::TEXT as output_text,
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
              m.output_text,
              m.confidence_score,
              'multimodal' as log_type
          FROM multimodal_ai_call_logs m
          LEFT JOIN users u ON m.user_id = u.id;
        `;

        console.log('统一视图创建成功');
      }
    } catch (error) {
      console.error('检查或创建统一视图时出错:', error);
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

      // 使用统一视图查询
      const query = `
        SELECT * FROM ai_call_logs_unified
        WHERE 1=1
        ${userEmail ? `AND user_email ILIKE '%${userEmail}%'` : ''}
        ${provider ? `AND provider ILIKE '%${provider}%'` : ''}
        ${model ? `AND model ILIKE '%${model}%'` : ''}
        ${isSuccess !== undefined ? `AND is_success = ${isSuccess}` : ''}
        ${accountBookId ? `AND account_book_id = '${accountBookId}'` : ''}
        ${aiServiceType ? `AND ai_service_type = '${aiServiceType}'` : ''}
        ${source ? `AND source = '${source}'` : ''}
        ${startDate && endDate ? `AND created_at BETWEEN '${startDate}' AND '${endDate}'` : ''}
        ${search ? `AND (user_name ILIKE '%${search}%' OR user_email ILIKE '%${search}%' OR account_book_name ILIKE '%${search}%' OR provider ILIKE '%${search}%' OR model ILIKE '%${search}%')` : ''}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${skip}
      `;

      const countQuery = `
        SELECT COUNT(*) as total FROM ai_call_logs_unified
        WHERE 1=1
        ${userEmail ? `AND user_email ILIKE '%${userEmail}%'` : ''}
        ${provider ? `AND provider ILIKE '%${provider}%'` : ''}
        ${model ? `AND model ILIKE '%${model}%'` : ''}
        ${isSuccess !== undefined ? `AND is_success = ${isSuccess}` : ''}
        ${accountBookId ? `AND account_book_id = '${accountBookId}'` : ''}
        ${aiServiceType ? `AND ai_service_type = '${aiServiceType}'` : ''}
        ${source ? `AND source = '${source}'` : ''}
        ${startDate && endDate ? `AND created_at BETWEEN '${startDate}' AND '${endDate}'` : ''}
        ${search ? `AND (user_name ILIKE '%${search}%' OR user_email ILIKE '%${search}%' OR account_book_name ILIKE '%${search}%' OR provider ILIKE '%${search}%' OR model ILIKE '%${search}%')` : ''}
      `;

      console.log('🔍 [AI调用日志] 执行查询SQL:', query);
      console.log('🔍 [AI调用日志] 执行计数SQL:', countQuery);

      const [logs, countResult] = await Promise.all([
        prisma.$queryRawUnsafe(query),
        prisma.$queryRawUnsafe(countQuery),
      ]);

      console.log('🔍 [AI调用日志] 查询结果数量:', (logs as any[]).length);
      console.log('🔍 [AI调用日志] 总记录数:', (countResult as any)[0]?.total);
      console.log('🔍 [AI调用日志] 前3条记录样本:', JSON.stringify((logs as any[]).slice(0, 3), null, 2));

      const total = Number((countResult as any)[0].total);
      const totalPages = Math.ceil(total / pageSize);

      return {
        logs,
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
        prisma.llmCallLog.count({ where: { ...where, aiServiceType: 'llm' } }),
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
