import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import {
  TagResponseDto,
  AddTransactionTagsDto,
  BatchTransactionTagsDto,
  BatchTransactionTagsResponse,
  TagErrorCode,
  TagErrorMessages,
} from '../models/tag.model';

const prisma = new PrismaClient();

export class TransactionTagService {
  /**
   * 获取记账记录的标签
   */
  async getTransactionTags(transactionId: string): Promise<TagResponseDto[]> {
    try {
      const transactionTags = await prisma.transactionTag.findMany({
        where: { transactionId },
        include: {
          tag: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          tag: {
            name: 'asc',
          },
        },
      });

      return transactionTags.map((tt) => this.formatTagResponse(tt.tag));
    } catch (error) {
      logger.error('获取记账标签失败:', error);
      throw new Error('获取记账标签失败');
    }
  }

  /**
   * 为记账记录添加标签
   */
  async addTransactionTags(
    userId: string,
    transactionId: string,
    data: AddTransactionTagsDto,
  ): Promise<{ addedTags: TagResponseDto[]; skippedTags: string[] }> {
    // 检查记账记录权限
    await this.checkTransactionPermission(userId, transactionId);

    // 检查标签是否存在且属于同一账本
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { accountBookId: true },
    });

    if (!transaction) {
      throw new Error(TagErrorMessages[TagErrorCode.TRANSACTION_NOT_FOUND]);
    }

    const tags = await prisma.tag.findMany({
      where: {
        id: { in: data.tagIds },
        accountBookId: transaction.accountBookId || undefined,
        isActive: true,
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

    if (tags.length !== data.tagIds.length) {
      throw new Error('部分标签不存在或不属于当前账本');
    }

    // 检查已存在的关联
    const existingTags = await prisma.transactionTag.findMany({
      where: {
        transactionId,
        tagId: { in: data.tagIds },
      },
      select: { tagId: true },
    });

    const existingTagIds = existingTags.map((et) => et.tagId);
    const newTagIds = data.tagIds.filter((id) => !existingTagIds.includes(id));

    try {
      // 批量创建新的关联
      if (newTagIds.length > 0) {
        await prisma.transactionTag.createMany({
          data: newTagIds.map((tagId) => ({
            transactionId,
            tagId,
          })),
        });
      }

      const addedTags = tags.filter((tag) => newTagIds.includes(tag.id));

      return {
        addedTags: addedTags.map(this.formatTagResponse),
        skippedTags: existingTagIds,
      };
    } catch (error) {
      logger.error('添加记账标签失败:', error);
      throw new Error('添加记账标签失败');
    }
  }

  /**
   * 移除记账记录的标签
   */
  async removeTransactionTag(userId: string, transactionId: string, tagId: string): Promise<void> {
    // 检查记账记录权限
    await this.checkTransactionPermission(userId, transactionId);

    try {
      await prisma.transactionTag.deleteMany({
        where: {
          transactionId,
          tagId,
        },
      });
    } catch (error) {
      logger.error('移除记账标签失败:', error);
      throw new Error('移除记账标签失败');
    }
  }

  /**
   * 批量操作记账标签
   */
  async batchOperateTransactionTags(
    userId: string,
    data: BatchTransactionTagsDto,
  ): Promise<BatchTransactionTagsResponse> {
    const { transactionIds, action, tagIds } = data;

    // 检查记账记录权限
    for (const transactionId of transactionIds) {
      await this.checkTransactionPermission(userId, transactionId);
    }

    let processedTransactions = 0;
    const failedTransactions: string[] = [];
    let added = 0;
    let removed = 0;
    let skipped = 0;

    try {
      for (const transactionId of transactionIds) {
        try {
          switch (action) {
            case 'add':
              const addResult = await this.addTransactionTags(userId, transactionId, { tagIds });
              added += addResult.addedTags.length;
              skipped += addResult.skippedTags.length;
              break;

            case 'remove':
              for (const tagId of tagIds) {
                await this.removeTransactionTag(userId, transactionId, tagId);
                removed++;
              }
              break;

            case 'replace':
              // 先移除所有现有标签
              await prisma.transactionTag.deleteMany({
                where: { transactionId },
              });
              // 再添加新标签
              const replaceResult = await this.addTransactionTags(userId, transactionId, {
                tagIds,
              });
              added += replaceResult.addedTags.length;
              break;
          }
          processedTransactions++;
        } catch (error) {
          logger.error(`处理记账 ${transactionId} 失败:`, error);
          failedTransactions.push(transactionId);
        }
      }

      return {
        success: true,
        data: {
          processedTransactions,
          failedTransactions,
          summary: {
            added,
            removed,
            skipped,
          },
        },
        message: `成功处理 ${processedTransactions} 条记账记录`,
      };
    } catch (error) {
      logger.error('批量操作记账标签失败:', error);
      throw new Error('批量操作记账标签失败');
    }
  }

  /**
   * 检查记账记录权限
   */
  private async checkTransactionPermission(userId: string, transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          { userId },
          {
            accountBook: {
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
          },
        ],
      },
    });

    if (!transaction) {
      throw new Error(TagErrorMessages[TagErrorCode.TRANSACTION_NOT_FOUND]);
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
