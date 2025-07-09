import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ALLOWED_IMAGE_TYPES, ALL_ALLOWED_TYPES, FILE_SIZE_LIMITS } from '../models/file-storage.model';

// 确保上传目录存在
const createUploadDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 头像存储配置
const avatarStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadDir = path.join(process.cwd(), '..', 'data', 'profile', 'avatar');
    createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // 使用UUID作为文件名，保留原始扩展名
    const userId = req.user?.id || 'unknown';
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${userId}_${uuidv4()}${fileExt}`;
    cb(null, fileName);
  },
});

// 文件过滤器 - 只允许图片文件
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // 允许的图片类型
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WEBP)'));
  }
};

// 头像上传中间件
export const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
  },
});

// 内存存储配置（用于S3上传）
const memoryStorage = multer.memoryStorage();

// 通用文件过滤器
const createFileFilter = (allowedTypes: string[]) => {
  return (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`只允许上传以下类型的文件: ${allowedTypes.join(', ')}`));
    }
  };
};

// S3文件上传中间件（使用内存存储）
export const s3FileUpload = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(ALL_ALLOWED_TYPES),
  limits: {
    fileSize: FILE_SIZE_LIMITS.DEFAULT,
  },
});

// S3头像上传中间件
export const s3AvatarUpload = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES),
  limits: {
    fileSize: FILE_SIZE_LIMITS.AVATAR,
  },
});

// S3附件上传中间件
export const s3AttachmentUpload = multer({
  storage: memoryStorage,
  fileFilter: createFileFilter(ALL_ALLOWED_TYPES),
  limits: {
    fileSize: FILE_SIZE_LIMITS.ATTACHMENT,
  },
  // 处理文件名编码
  preservePath: false,
});

// 获取文件URL
export const getFileUrl = (filename: string, type: 'avatar'): string => {
  // 在实际生产环境中，这里应该返回完整的URL，包括域名
  // 例如: `https://example.com/data/profile/avatar/${filename}`
  // 在开发环境中，我们可以使用相对路径
  return `/data/profile/${type}/${filename}`;
};

// 获取S3文件URL
export const getS3FileUrl = (bucket: string, key: string): string => {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  return `${endpoint}/${bucket}/${key}`;
};
