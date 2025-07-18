import { FileStorage as PrismaFileStorage, FileStorageType, FileStatus, AttachmentType } from '@prisma/client';

/**
 * 文件存储创建DTO
 */
export interface CreateFileStorageDto {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  key: string;
  url?: string;
  storageType?: FileStorageType;
  expiresAt?: Date;
  metadata?: any;
}

/**
 * 文件存储更新DTO
 */
export interface UpdateFileStorageDto {
  filename?: string;
  url?: string;
  status?: FileStatus;
  expiresAt?: Date;
  metadata?: any;
}

/**
 * 文件存储查询参数
 */
export interface FileStorageQueryParams {
  uploadedBy?: string;
  bucket?: string;
  storageType?: FileStorageType;
  status?: FileStatus;
  mimeType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 文件存储响应DTO
 */
export interface FileStorageResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  key: string;
  url?: string;
  storageType: FileStorageType;
  status: FileStatus;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: any;
}

/**
 * 记账附件创建DTO
 */
export interface CreateTransactionAttachmentDto {
  transactionId: string;
  fileId: string;
  attachmentType?: AttachmentType;
  description?: string;
}

/**
 * 记账附件响应DTO
 */
export interface TransactionAttachmentResponseDto {
  id: string;
  transactionId: string;
  fileId: string;
  attachmentType: AttachmentType;
  description?: string;
  createdAt: Date;
  file?: FileStorageResponseDto;
}

/**
 * 文件上传请求DTO
 */
export interface FileUploadRequestDto {
  bucket: string;
  category?: string;
  description?: string;
  expiresIn?: number; // 过期时间（秒）
  metadata?: any;
}

/**
 * 文件上传响应DTO
 */
export interface FileUploadResponseDto {
  fileId: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
}

/**
 * 预签名URL请求DTO
 */
export interface PresignedUrlRequestDto {
  bucket: string;
  key: string;
  operation: 'GET' | 'PUT' | 'DELETE';
  expiresIn?: number; // 过期时间（秒），默认3600
  contentType?: string; // PUT操作时需要
}

/**
 * 预签名URL响应DTO
 */
export interface PresignedUrlResponseDto {
  url: string;
  expiresAt: Date;
  fields?: Record<string, string>; // POST表单上传时的额外字段
}

/**
 * 图片压缩配置
 */
export interface ImageCompressionConfig {
  enabled: boolean;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format: 'jpeg' | 'png' | 'webp' | 'auto';
}

/**
 * 文件存储配置DTO
 */
export interface FileStorageConfigDto {
  enabled: boolean;
  storageType: FileStorageType;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  buckets: {
    avatars: string;
    attachments: string;
    temp: string;
    system: string;
  };
  maxFileSize: number;
  allowedTypes: string[];
  imageCompression?: {
    globalEnabled: boolean;
    globalQuality: number;
    avatar: ImageCompressionConfig;
    attachment: ImageCompressionConfig;
    multimodal: ImageCompressionConfig;
    general: ImageCompressionConfig;
    mobileOptimization: boolean;
    progressiveJpeg: boolean;
    preserveMetadata: boolean;
  };
}

/**
 * 文件存储统计DTO
 */
export interface FileStorageStatsDto {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  filesByBucket: Record<string, number>;
  filesByStatus: Record<FileStatus, number>;
}

/**
 * 将文件存储实体转换为响应DTO
 */
export function toFileStorageResponseDto(fileStorage: PrismaFileStorage): FileStorageResponseDto {
  return {
    id: fileStorage.id,
    filename: fileStorage.filename,
    originalName: fileStorage.originalName,
    mimeType: fileStorage.mimeType,
    size: fileStorage.size,
    bucket: fileStorage.bucket,
    key: fileStorage.key,
    url: fileStorage.url || undefined,
    storageType: fileStorage.storageType,
    status: fileStorage.status,
    uploadedBy: fileStorage.uploadedBy,
    createdAt: fileStorage.createdAt,
    updatedAt: fileStorage.updatedAt,
    expiresAt: fileStorage.expiresAt || undefined,
    metadata: fileStorage.metadata || undefined,
  };
}

/**
 * 文件类型验证
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

/**
 * 文件大小限制（字节）
 */
export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024, // 5MB
  ATTACHMENT: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 20 * 1024 * 1024, // 20MB
  DEFAULT: 10 * 1024 * 1024, // 10MB
};

/**
 * 存储桶配置
 */
export const BUCKET_CONFIG = {
  AVATARS: 'avatars',
  ATTACHMENTS: 'transaction-attachments',
  TEMP: 'temp-files',
  SYSTEM: 'system-files',
};

export { FileStorageType, FileStatus, AttachmentType };
