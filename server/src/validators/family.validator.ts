import Joi from 'joi';
import { Role } from '@prisma/client';
import {
  AcceptInvitationDto,
  CreateFamilyDto,
  CreateFamilyMemberDto,
  CreateCustodialMemberDto,
  CreateInvitationDto,
  UpdateFamilyDto,
  UpdateFamilyMemberDto,
} from '../models/family.model';

/**
 * 验证创建家庭输入
 */
export function validateCreateFamilyInput(data: any) {
  const schema = Joi.object<CreateFamilyDto>({
    name: Joi.string().required().min(1).max(50).messages({
      'string.base': '家庭名称必须是字符串',
      'string.empty': '家庭名称不能为空',
      'string.min': '家庭名称至少需要 {#limit} 个字符',
      'string.max': '家庭名称不能超过 {#limit} 个字符',
      'any.required': '家庭名称是必填项',
    }),
  });

  return schema.validate(data);
}

/**
 * 验证更新家庭输入
 */
export function validateUpdateFamilyInput(data: any) {
  const schema = Joi.object<UpdateFamilyDto>({
    name: Joi.string().min(1).max(50).messages({
      'string.base': '家庭名称必须是字符串',
      'string.empty': '家庭名称不能为空',
      'string.min': '家庭名称至少需要 {#limit} 个字符',
      'string.max': '家庭名称不能超过 {#limit} 个字符',
    }),
  });

  return schema.validate(data);
}

/**
 * 验证创建家庭成员输入
 */
export function validateCreateFamilyMemberInput(data: any) {
  const schema = Joi.object<CreateFamilyMemberDto>({
    name: Joi.string().required().min(1).max(50).messages({
      'string.base': '成员名称必须是字符串',
      'string.empty': '成员名称不能为空',
      'string.min': '成员名称至少需要 {#limit} 个字符',
      'string.max': '成员名称不能超过 {#limit} 个字符',
      'any.required': '成员名称是必填项',
    }),
    role: Joi.string().valid(Role.ADMIN, Role.MEMBER).messages({
      'string.base': '角色必须是字符串',
      'any.only': '角色必须是 ADMIN 或 MEMBER',
    }),
    isRegistered: Joi.boolean().messages({
      'boolean.base': '注册状态必须是布尔值',
    }),
    userId: Joi.string().uuid().messages({
      'string.base': '用户ID必须是字符串',
      'string.guid': '用户ID必须是有效的UUID',
    }),
  });

  return schema.validate(data);
}

/**
 * 验证更新家庭成员输入
 */
export function validateUpdateFamilyMemberInput(data: any) {
  const schema = Joi.object<UpdateFamilyMemberDto>({
    name: Joi.string().min(1).max(50).messages({
      'string.base': '成员名称必须是字符串',
      'string.empty': '成员名称不能为空',
      'string.min': '成员名称至少需要 {#limit} 个字符',
      'string.max': '成员名称不能超过 {#limit} 个字符',
    }),
    role: Joi.string().valid(Role.ADMIN, Role.MEMBER).messages({
      'string.base': '角色必须是字符串',
      'any.only': '角色必须是 ADMIN 或 MEMBER',
    }),
  });

  return schema.validate(data);
}

/**
 * 验证创建邀请输入
 */
export function validateCreateInvitationInput(data: any) {
  const schema = Joi.object<CreateInvitationDto>({
    expiresInDays: Joi.number().min(0.1).max(30).messages({
      'number.base': '过期天数必须是数字',
      'number.min': '过期天数至少为 {#limit} 天',
      'number.max': '过期天数最多为 {#limit} 天',
    }),
  });

  return schema.validate(data);
}

/**
 * 验证接受邀请输入
 */
export function validateAcceptInvitationInput(data: any) {
  const schema = Joi.object<AcceptInvitationDto>({
    invitationCode: Joi.string()
      .required()
      .pattern(/^\d{8}$/)
      .messages({
        'string.base': '邀请码必须是字符串',
        'string.empty': '邀请码不能为空',
        'string.pattern.base': '邀请码必须是8位数字',
        'any.required': '邀请码是必填项',
      }),
  });

  return schema.validate(data);
}

/**
 * 验证创建托管成员输入
 */
export function validateCreateCustodialMemberInput(data: any) {
  const schema = Joi.object<CreateCustodialMemberDto>({
    name: Joi.string().required().min(1).max(50).messages({
      'string.base': '成员名称必须是字符串',
      'string.empty': '成员名称不能为空',
      'string.min': '成员名称至少需要 {#limit} 个字符',
      'string.max': '成员名称不能超过 {#limit} 个字符',
      'any.required': '成员名称是必填项',
    }),
    gender: Joi.string().valid('男', '女', '其他').messages({
      'string.base': '性别必须是字符串',
      'any.only': '性别必须是 男、女 或 其他',
    }),
    birthDate: Joi.date().iso().messages({
      'date.base': '出生日期必须是有效的日期',
      'date.format': '出生日期必须是ISO格式',
    }),
    role: Joi.string().valid(Role.ADMIN, Role.MEMBER).messages({
      'string.base': '角色必须是字符串',
      'any.only': '角色必须是 ADMIN 或 MEMBER',
    }),
  });

  return schema.validate(data);
}

/**
 * 验证更新托管成员输入
 */
export function validateUpdateCustodialMemberInput(data: any) {
  const schema = Joi.object({
    name: Joi.string().min(1).max(50).messages({
      'string.base': '成员名称必须是字符串',
      'string.empty': '成员名称不能为空',
      'string.min': '成员名称至少需要 {#limit} 个字符',
      'string.max': '成员名称不能超过 {#limit} 个字符',
    }),
    gender: Joi.string().valid('男', '女', '其他').messages({
      'string.base': '性别必须是字符串',
      'any.only': '性别必须是 男、女 或 其他',
    }),
    birthDate: Joi.date().iso().messages({
      'date.base': '出生日期必须是有效的日期',
      'date.format': '出生日期必须是ISO格式',
    }),
    role: Joi.string().valid(Role.ADMIN, Role.MEMBER).messages({
      'string.base': '角色必须是字符串',
      'any.only': '角色必须是 ADMIN 或 MEMBER',
    }),
  });

  return schema.validate(data);
}
