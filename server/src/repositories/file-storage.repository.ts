import { PrismaClient, FileStorage, TransactionAttachment, Prisma } from '@prisma/client';
import {
  CreateFileStorageDto,
  UpdateFileStorageDto,
  FileStorageQueryParams,
  CreateTransactionAttachmentDto,
  FileStatus,
} from '../models/file-storage.model';

const prisma = new PrismaClient();

export class FileStorageRepository {
  /**
   * 创建文件存储记录
   */
  async create(data: CreateFileStorageDto, uploadedBy: string): Promise<FileStorage> {
    return prisma.fileStorage.create({
      data: {
        ...data,
        uploadedBy,
      },
    });
  }

  /**
   * 根据ID查找文件
   */
  async findById(id: string): Promise<FileStorage | null> {
    return prisma.fileStorage.findUnique({
      where: { id },
    });
  }

  /**
   * 根据bucket和key查找文件
   */
  async findByBucketAndKey(bucket: string, key: string): Promise<FileStorage | null> {
    return prisma.fileStorage.findFirst({
      where: {
        bucket,
        key,
      },
    });
  }

  /**
   * 更新文件存储记录
   */
  async update(id: string, data: UpdateFileStorageDto): Promise<FileStorage> {
    return prisma.fileStorage.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除文件存储记录（软删除）
   */
  async softDelete(id: string): Promise<FileStorage> {
    return prisma.fileStorage.update({
      where: { id },
      data: {
        status: FileStatus.DELETED,
      },
    });
  }

  /**
   * 物理删除文件存储记录
   */
  async delete(id: string): Promise<void> {
    await prisma.fileStorage.delete({
      where: { id },
    });
  }

  /**
   * 查询文件列表
   */
  async findMany(params: FileStorageQueryParams): Promise<{
    files: FileStorage[];
    total: number;
  }> {
    const {
      uploadedBy,
      bucket,
      storageType,
      status = FileStatus.ACTIVE,
      mimeType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.FileStorageWhereInput = {
      status,
      ...(uploadedBy && { uploadedBy }),
      ...(bucket && { bucket }),
      ...(storageType && { storageType }),
      ...(mimeType && { mimeType: { contains: mimeType } }),
    };

    const [files, total] = await Promise.all([
      prisma.fileStorage.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.fileStorage.count({ where }),
    ]);

    return { files, total };
  }

  /**
   * 根据用户ID查找文件
   */
  async findByUserId(
    userId: string,
    options?: {
      bucket?: string;
      status?: FileStatus;
      limit?: number;
    },
  ): Promise<FileStorage[]> {
    return prisma.fileStorage.findMany({
      where: {
        uploadedBy: userId,
        ...(options?.bucket && { bucket: options.bucket }),
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      ...(options?.limit && { take: options.limit }),
    });
  }

  /**
   * 查找过期文件
   */
  async findExpiredFiles(): Promise<FileStorage[]> {
    return prisma.fileStorage.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: FileStatus.ACTIVE,
      },
    });
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(uploadedBy?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByBucket: Record<string, number>;
    filesByType: Record<string, number>;
  }> {
    const where: Prisma.FileStorageWhereInput = {
      status: FileStatus.ACTIVE,
      ...(uploadedBy && { uploadedBy }),
    };

    // 总文件数和总大小
    const [totalFiles, sizeResult] = await Promise.all([
      prisma.fileStorage.count({ where }),
      prisma.fileStorage.aggregate({
        where,
        _sum: { size: true },
      }),
    ]);

    // 按存储桶分组
    const bucketStats = await prisma.fileStorage.groupBy({
      by: ['bucket'],
      where,
      _count: { id: true },
    });

    // 按文件类型分组
    const typeStats = await prisma.fileStorage.groupBy({
      by: ['mimeType'],
      where,
      _count: { id: true },
    });

    return {
      totalFiles,
      totalSize: sizeResult._sum.size || 0,
      filesByBucket: bucketStats.reduce((acc, stat) => {
        acc[stat.bucket] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      filesByType: typeStats.reduce((acc, stat) => {
        acc[stat.mimeType] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export class TransactionAttachmentRepository {
  /**
   * 创建记账附件
   */
  async create(data: CreateTransactionAttachmentDto): Promise<TransactionAttachment> {
    return prisma.transactionAttachment.create({
      data,
    });
  }

  /**
   * 根据记账ID查找附件
   */
  async findByTransactionId(transactionId: string): Promise<TransactionAttachment[]> {
    return prisma.transactionAttachment.findMany({
      where: { transactionId },
      include: {
        file: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 根据附件ID查找附件
   */
  async findById(id: string): Promise<(TransactionAttachment & { transaction: { userId: string } }) | null> {
    return prisma.transactionAttachment.findUnique({
      where: { id },
      include: {
        transaction: {
          select: {
            userId: true,
          },
        },
      },
    }) as any;
  }

  /**
   * 根据文件ID查找附件
   */
  async findByFileId(fileId: string): Promise<(TransactionAttachment & { transaction: { userId: string } })[]> {
    return prisma.transactionAttachment.findMany({
      where: { fileId },
      include: {
        transaction: {
          select: {
            userId: true,
          },
        },
      },
    }) as any;
  }

  /**
   * 删除记账附件
   */
  async delete(id: string): Promise<void> {
    await prisma.transactionAttachment.delete({
      where: { id },
    });
  }

  /**
   * 根据记账ID和文件ID删除附件
   */
  async deleteByTransactionAndFile(transactionId: string, fileId: string): Promise<void> {
    await prisma.transactionAttachment.deleteMany({
      where: {
        transactionId,
        fileId,
      },
    });
  }

  /**
   * 批量创建记账附件
   */
  async createMany(attachments: CreateTransactionAttachmentDto[]): Promise<number> {
    const result = await prisma.transactionAttachment.createMany({
      data: attachments,
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * 获取用户的附件统计
   */
  async getAttachmentStats(userId: string): Promise<{
    totalAttachments: number;
    attachmentsByType: Record<string, number>;
  }> {
    // 通过记账记录关联查找用户的附件
    const attachments = await prisma.transactionAttachment.findMany({
      where: {
        transaction: {
          userId,
        },
      },
      include: {
        file: true,
      },
    });

    const attachmentsByType = attachments.reduce((acc, attachment) => {
      const type = attachment.attachmentType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAttachments: attachments.length,
      attachmentsByType,
    };
  }
}
