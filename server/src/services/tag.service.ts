import { PrismaClient } from '@prisma/client';
import {
  Tag,
  TagResponseDto,
  CreateTagDto,
  UpdateTagDto,
  TagQueryParams,
  TagListResponse,
  TagDetailResponse,
  TagErrorCode,
  TagErrorMessages,
  TagValidation,
  TagSuggestionsQuery,
  TagSuggestionsResponse,
} from '../models/tag.model';

const prisma = new PrismaClient();

export class TagService {
  /**
   * 获取账本的标签列表
   */
  async getTagsByAccountBook(params: TagQueryParams): Promise<TagListResponse> {
    const {
      accountBookId,
      search,
      isActive = true,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = params;

    // 构建查询条件
    const where: any = {
      accountBookId,
      isActive,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // 构建排序条件
    const orderBy: any = {};
    switch (sortBy) {
      case 'usage':
        orderBy.usageCount = sortOrder;
        break;
      case 'created':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.name = sortOrder;
    }

    // 计算分页
    const skip = (page - 1) * limit;

    try {
      // 获取总数
      const total = await prisma.tag.count({ where });

      // 获取标签列表
      const tags = await prisma.tag.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          tags: tags.map(this.formatTagResponse),
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      };
    } catch (error) {
      console.error('获取标签列表失败:', error);
      throw new Error('获取标签列表失败');
    }
  }

  /**
   * 根据ID获取标签详情
   */
  async getTagById(tagId: string): Promise<TagDetailResponse> {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id: tagId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          transactionTags: {
            include: {
              transaction: {
                include: {
                  category: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10, // 最近10条交易记录
          },
        },
      });

      if (!tag) {
        throw new Error(TagErrorMessages[TagErrorCode.TAG_NOT_FOUND]);
      }

      // 计算统计信息
      const statistics = await this.calculateTagStatistics(tagId);

      // 格式化最近交易记录
      const recentTransactions = tag.transactionTags.map((tt: any) => ({
        id: tt.transaction.id,
        amount: Number(tt.transaction.amount),
        type: tt.transaction.type,
        description: tt.transaction.description || undefined,
        date: tt.transaction.date,
        categoryName: tt.transaction.category.name,
      }));

      return {
        success: true,
        data: {
          ...this.formatTagResponse(tag),
          recentTransactions,
          statistics,
        },
      };
    } catch (error) {
      console.error('获取标签详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建标签
   */
  async createTag(userId: string, data: CreateTagDto): Promise<TagResponseDto> {
    // 验证数据
    this.validateTagData(data);

    // 检查账本权限
    await this.checkAccountBookPermission(userId, data.accountBookId);

    // 检查标签名称是否已存在
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: data.name,
        accountBookId: data.accountBookId,
        isActive: true,
      },
    });

    if (existingTag) {
      throw new Error(TagErrorMessages[TagErrorCode.TAG_NAME_EXISTS]);
    }

    try {
      const tag = await prisma.tag.create({
        data: {
          ...data,
          createdBy: userId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.formatTagResponse(tag);
    } catch (error) {
      console.error('创建标签失败:', error);
      throw new Error('创建标签失败');
    }
  }

  /**
   * 更新标签
   */
  async updateTag(userId: string, tagId: string, data: UpdateTagDto): Promise<TagResponseDto> {
    // 验证数据
    if (data.name) {
      this.validateTagData({ name: data.name } as CreateTagDto);
    }

    // 检查标签权限
    await this.checkTagPermission(userId, tagId);

    // 如果更新名称，检查是否重复
    if (data.name) {
      const tag = await prisma.tag.findUnique({ where: { id: tagId } });
      if (!tag) {
        throw new Error(TagErrorMessages[TagErrorCode.TAG_NOT_FOUND]);
      }

      const existingTag = await prisma.tag.findFirst({
        where: {
          name: data.name,
          accountBookId: tag.accountBookId,
          isActive: true,
          id: { not: tagId },
        },
      });

      if (existingTag) {
        throw new Error(TagErrorMessages[TagErrorCode.TAG_NAME_EXISTS]);
      }
    }

    try {
      const tag = await prisma.tag.update({
        where: { id: tagId },
        data,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.formatTagResponse(tag);
    } catch (error) {
      console.error('更新标签失败:', error);
      throw new Error('更新标签失败');
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(userId: string, tagId: string): Promise<void> {
    // 检查标签权限
    await this.checkTagPermission(userId, tagId);

    // 检查标签是否正在使用
    const usageCount = await prisma.transactionTag.count({
      where: { tagId },
    });

    if (usageCount > 0) {
      throw new Error(TagErrorMessages[TagErrorCode.TAG_IN_USE]);
    }

    try {
      await prisma.tag.delete({
        where: { id: tagId },
      });
    } catch (error) {
      console.error('删除标签失败:', error);
      throw new Error('删除标签失败');
    }
  }

  /**
   * 验证标签数据
   */
  private validateTagData(data: Partial<CreateTagDto>): void {
    if (data.name) {
      if (data.name.length < TagValidation.name.minLength || 
          data.name.length > TagValidation.name.maxLength) {
        throw new Error(TagErrorMessages[TagErrorCode.INVALID_TAG_NAME]);
      }

      if (!TagValidation.name.pattern.test(data.name)) {
        throw new Error(TagErrorMessages[TagErrorCode.INVALID_TAG_NAME]);
      }
    }

    if (data.color && !TagValidation.color.pattern.test(data.color)) {
      throw new Error(TagErrorMessages[TagErrorCode.INVALID_COLOR_FORMAT]);
    }

    if (data.description && data.description.length > TagValidation.description.maxLength) {
      throw new Error('标签描述过长');
    }
  }

  /**
   * 检查账本权限
   */
  private async checkAccountBookPermission(userId: string, accountBookId: string): Promise<void> {
    const accountBook = await prisma.accountBook.findFirst({
      where: {
        id: accountBookId,
        OR: [
          { userId },
          {
            family: {
              members: {
                some: { userId },
              },
            },
          },
        ],
      },
    });

    if (!accountBook) {
      throw new Error(TagErrorMessages[TagErrorCode.ACCOUNT_BOOK_NOT_FOUND]);
    }
  }

  /**
   * 检查标签权限
   */
  private async checkTagPermission(userId: string, tagId: string): Promise<void> {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        accountBook: {
          include: {
            family: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!tag) {
      throw new Error(TagErrorMessages[TagErrorCode.TAG_NOT_FOUND]);
    }

    // 检查是否为创建者或账本所有者
    const isCreator = tag.createdBy === userId;
    const isAccountBookOwner = tag.accountBook.userId === userId;
    const isFamilyMember = tag.accountBook.family?.members.some(m => m.userId === userId);

    if (!isCreator && !isAccountBookOwner && !isFamilyMember) {
      throw new Error(TagErrorMessages[TagErrorCode.INSUFFICIENT_PERMISSION]);
    }
  }

  /**
   * 计算标签统计信息
   */
  private async calculateTagStatistics(tagId: string) {
    const transactions = await prisma.transactionTag.findMany({
      where: { tagId },
      include: {
        transaction: {
          include: {
            category: true,
          },
        },
      },
    });

    const totalAmount = transactions.reduce((sum, tt) => {
      return sum + Number(tt.transaction.amount);
    }, 0);

    const transactionCount = transactions.length;

    // 按分类统计
    const categoryMap = new Map();
    transactions.forEach((tt) => {
      const category = tt.transaction.category;
      const key = category.id;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: category.id,
          categoryName: category.name,
          count: 0,
          amount: 0,
        });
      }
      const stat = categoryMap.get(key);
      stat.count++;
      stat.amount += Number(tt.transaction.amount);
    });

    return {
      totalAmount,
      transactionCount,
      categoryDistribution: Array.from(categoryMap.values()),
    };
  }

  /**
   * 获取标签建议
   */
  async getTagSuggestions(userId: string, params: TagSuggestionsQuery): Promise<TagSuggestionsResponse> {
    const { accountBookId, transactionId, categoryId, description, limit = 5 } = params;

    // 检查账本权限
    await this.checkAccountBookPermission(userId, accountBookId);

    try {
      // 获取账本中的所有活跃标签
      const allTags = await prisma.tag.findMany({
        where: {
          accountBookId,
          isActive: true,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          transactionTags: {
            include: {
              transaction: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      // 计算每个标签的推荐分数
      const suggestions = allTags.map(tag => {
        let confidence = 0;
        let reason = '基于历史使用频率';

        // 基于使用频率的基础分数
        const usageScore = Math.min(tag.usageCount / 10, 0.3); // 最高0.3分
        confidence += usageScore;

        // 基于分类的推荐
        if (categoryId) {
          const categoryUsage = tag.transactionTags.filter(
            tt => tt.transaction.categoryId === categoryId
          ).length;

          if (categoryUsage > 0) {
            const categoryScore = Math.min(categoryUsage / 5, 0.4); // 最高0.4分
            confidence += categoryScore;
            reason = `在"${tag.transactionTags.find(tt => tt.transaction.categoryId === categoryId)?.transaction.category.name}"分类中常用`;
          }
        }

        // 基于描述的推荐
        if (description && description.trim()) {
          const descriptionLower = description.toLowerCase();
          const tagNameLower = tag.name.toLowerCase();

          // 简单的文本匹配
          if (tagNameLower.includes(descriptionLower) || descriptionLower.includes(tagNameLower)) {
            confidence += 0.3;
            reason = '与交易描述相关';
          }
        }

        // 基于特定交易的推荐
        if (transactionId) {
          // 这里可以添加基于特定交易的推荐逻辑
          // 例如查找相似的交易记录使用的标签
        }

        return {
          tag: this.formatTagResponse(tag),
          confidence: Math.min(confidence, 1), // 确保不超过1
          reason,
        };
      })
      .filter(suggestion => suggestion.confidence > 0.1) // 过滤掉置信度太低的
      .sort((a, b) => b.confidence - a.confidence) // 按置信度降序排列
      .slice(0, limit); // 限制返回数量

      return {
        success: true,
        data: suggestions,
      };
    } catch (error) {
      console.error('获取标签建议失败:', error);
      throw new Error('获取标签建议失败');
    }
  }

  /**
   * 获取标签统计数据
   */
  async getTagStatistics(params: {
    accountBookId: string;
    startDate: string;
    endDate: string;
    tagIds?: string[];
    transactionType?: 'income' | 'expense';
    categoryIds?: string[];
  }): Promise<any> {
    const { accountBookId, startDate, endDate, tagIds, transactionType, categoryIds } = params;

    try {
      // 构建查询条件
      const whereConditions: any = {
        transaction: {
          accountBookId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      };

      // 添加交易类型筛选
      if (transactionType) {
        whereConditions.transaction.type = transactionType.toUpperCase();
      }

      // 添加分类筛选
      if (categoryIds && categoryIds.length > 0) {
        whereConditions.transaction.categoryId = {
          in: categoryIds,
        };
      }

      // 添加标签筛选
      if (tagIds && tagIds.length > 0) {
        whereConditions.tagId = {
          in: tagIds,
        };
      }

      // 获取交易标签关联数据
      const transactionTags = await prisma.transactionTag.findMany({
        where: whereConditions,
        include: {
          tag: true,
          transaction: {
            include: {
              category: true,
            },
          },
        },
      });

      // 按标签分组统计
      const tagStatsMap = new Map();

      transactionTags.forEach((tt) => {
        const tagId = tt.tag.id;
        const amount = Number(tt.transaction.amount);
        const categoryId = tt.transaction.categoryId;
        const categoryName = tt.transaction.category.name;

        if (!tagStatsMap.has(tagId)) {
          tagStatsMap.set(tagId, {
            tag: tt.tag,
            statistics: {
              totalAmount: 0,
              transactionCount: 0,
              categoryBreakdown: new Map(),
            },
          });
        }

        const tagStats = tagStatsMap.get(tagId);
        tagStats.statistics.totalAmount += amount;
        tagStats.statistics.transactionCount += 1;

        // 分类分布统计
        if (!tagStats.statistics.categoryBreakdown.has(categoryId)) {
          tagStats.statistics.categoryBreakdown.set(categoryId, {
            categoryId,
            categoryName,
            amount: 0,
            count: 0,
          });
        }

        const categoryStats = tagStats.statistics.categoryBreakdown.get(categoryId);
        categoryStats.amount += amount;
        categoryStats.count += 1;
      });

      // 转换为响应格式
      const tagStatistics = Array.from(tagStatsMap.values()).map((item) => ({
        tag: this.formatTagResponse(item.tag),
        statistics: {
          totalAmount: item.statistics.totalAmount,
          transactionCount: item.statistics.transactionCount,
          categoryBreakdown: Array.from(item.statistics.categoryBreakdown.values()),
        },
      }));

      // 计算概览数据
      const overview = {
        totalAmount: tagStatistics.reduce((sum, item) => sum + item.statistics.totalAmount, 0),
        transactionCount: tagStatistics.reduce((sum, item) => sum + item.statistics.transactionCount, 0),
        tagCount: tagStatistics.length,
      };

      return {
        success: true,
        data: {
          overview,
          tagStatistics: tagStatistics.sort((a, b) => Math.abs(b.statistics.totalAmount) - Math.abs(a.statistics.totalAmount)),
        },
      };
    } catch (error) {
      console.error('获取标签统计失败:', error);
      throw new Error('获取标签统计失败');
    }
  }

  /**
   * 格式化标签响应
   */
  private formatTagResponse(tag: any): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      accountBookId: tag.accountBookId,
      createdBy: tag.createdBy,
      isActive: tag.isActive,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      creator: tag.creator,
    };
  }
}
