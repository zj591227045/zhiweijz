# 家庭账本模块技术文档

## 概述

家庭账本模块允许用户创建家庭账本，邀请家庭成员加入，并共享财务信息。该模块支持家庭成员角色管理、邀请链接生成和权限控制等功能。

## 数据模型

### Family (家庭)

家庭是多个用户共享财务信息的基本单位。

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 主键 |
| name | String | 家庭名称 |
| createdBy | UUID | 创建者ID (关联User) |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### FamilyMember (家庭成员)

家庭成员表示用户在家庭中的身份和权限。

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 主键 |
| familyId | UUID | 家庭ID (关联Family) |
| userId | UUID? | 用户ID (关联User，可为空) |
| name | String | 成员名称 |
| role | Role | 角色 (ADMIN/MEMBER) |
| isRegistered | Boolean | 是否已注册用户 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### Invitation (邀请)

邀请用于通过链接邀请新成员加入家庭。

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 主键 |
| familyId | UUID | 家庭ID (关联Family) |
| invitationCode | UUID | 邀请码 |
| expiresAt | DateTime | 过期时间 |
| createdAt | DateTime | 创建时间 |

## 仓库层 (Repository)

### FamilyRepository

家庭仓库负责处理与家庭、家庭成员和邀请相关的数据库操作。

主要方法：
- `createFamily(userId: string, name: string): Promise<Family>`
- `findFamilyById(id: string): Promise<FamilyWithMembers | null>`
- `findFamiliesByCreatorId(userId: string): Promise<FamilyWithCreator[]>`
- `findFamiliesByMemberId(userId: string): Promise<Family[]>`
- `findAllFamiliesByUserId(userId: string): Promise<Family[]>`
- `updateFamily(id: string, data: { name?: string }): Promise<Family>`
- `deleteFamily(id: string): Promise<Family>`
- `createFamilyMember(data: {...}): Promise<FamilyMember>`
- `findFamilyMemberById(id: string): Promise<FamilyMember | null>`
- `findFamilyMemberByUserAndFamily(userId: string, familyId: string): Promise<FamilyMember | null>`
- `findFamilyMembers(familyId: string): Promise<FamilyMember[]>`
- `updateFamilyMember(id: string, data: {...}): Promise<FamilyMember>`
- `deleteFamilyMember(id: string): Promise<FamilyMember>`
- `createInvitation(familyId: string, invitationCode: string, expiresAt: Date): Promise<Invitation>`
- `findInvitationByCode(invitationCode: string): Promise<Invitation | null>`
- `deleteInvitation(id: string): Promise<Invitation>`

## 服务层 (Service)

### FamilyService

家庭服务实现了与家庭账本相关的业务逻辑。

主要方法：
- `createFamily(userId: string, familyData: CreateFamilyDto): Promise<FamilyResponseDto>`
- `getFamiliesByUserId(userId: string): Promise<FamilyListResponseDto[]>`
- `getFamilyById(id: string, userId: string): Promise<FamilyResponseDto>`
- `updateFamily(id: string, userId: string, familyData: UpdateFamilyDto): Promise<FamilyResponseDto>`
- `deleteFamily(id: string, userId: string): Promise<void>`
- `addFamilyMember(familyId: string, userId: string, memberData: CreateFamilyMemberDto): Promise<FamilyMemberResponseDto>`
- `updateFamilyMember(familyId: string, memberId: string, userId: string, memberData: UpdateFamilyMemberDto): Promise<FamilyMemberResponseDto>`
- `deleteFamilyMember(familyId: string, memberId: string, userId: string): Promise<void>`
- `createInvitation(familyId: string, userId: string, invitationData: CreateInvitationDto, baseUrl: string): Promise<InvitationResponseDto>`
- `acceptInvitation(userId: string, invitationData: AcceptInvitationDto): Promise<FamilyMemberResponseDto>`
- `isUserFamilyMember(userId: string, familyId: string): Promise<boolean>`
- `isUserFamilyAdmin(userId: string, familyId: string): Promise<boolean>`

## 控制器层 (Controller)

### FamilyController

家庭控制器处理与家庭账本相关的HTTP请求。

主要方法：
- `createFamily(req: Request, res: Response): Promise<void>`
- `getFamilies(req: Request, res: Response): Promise<void>`
- `getFamilyById(req: Request, res: Response): Promise<void>`
- `updateFamily(req: Request, res: Response): Promise<void>`
- `deleteFamily(req: Request, res: Response): Promise<void>`
- `addFamilyMember(req: Request, res: Response): Promise<void>`
- `createInvitation(req: Request, res: Response): Promise<void>`
- `acceptInvitation(req: Request, res: Response): Promise<void>`

## API端点

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /api/families | 创建家庭 | 已认证用户 |
| GET | /api/families | 获取用户的家庭列表 | 已认证用户 |
| GET | /api/families/:id | 获取家庭详情 | 家庭成员 |
| PUT | /api/families/:id | 更新家庭 | 家庭管理员 |
| DELETE | /api/families/:id | 删除家庭 | 家庭创建者 |
| POST | /api/families/:id/members | 添加家庭成员 | 家庭管理员 |
| POST | /api/families/:id/invitations | 创建邀请链接 | 家庭管理员 |
| POST | /api/families/join | 接受邀请加入家庭 | 已认证用户 |

## 权限控制

家庭账本模块实现了基于角色的权限控制：

1. **创建者 (Creator)**
   - 创建家庭的用户
   - 拥有家庭的所有权限
   - 是唯一可以删除家庭的角色

2. **管理员 (ADMIN)**
   - 可以管理家庭成员
   - 可以创建邀请链接
   - 可以更新家庭信息

3. **成员 (MEMBER)**
   - 可以查看家庭信息
   - 可以查看家庭成员列表
   - 可以查看家庭的财务信息

## 邀请机制

1. 管理员可以创建邀请链接，设置过期时间
2. 系统生成唯一的邀请码
3. 用户通过邀请链接加入家庭
4. 邀请在使用后自动失效

## 数据流

1. **创建家庭**
   - 用户创建家庭
   - 系统自动将创建者添加为管理员成员

2. **邀请流程**
   - 管理员创建邀请链接
   - 用户通过链接接受邀请
   - 系统将用户添加为家庭成员

## 测试

家庭账本模块包含以下测试：

1. **单元测试**
   - 测试家庭服务的业务逻辑
   - 测试权限控制机制
   - 测试邀请机制

2. **集成测试**
   - 测试API端点
   - 测试数据库交互
   - 测试完整的邀请流程

## 注意事项

1. 家庭创建者不能被删除
2. 邀请链接有过期时间限制
3. 用户可以同时属于多个家庭
4. 家庭成员可以是已注册用户，也可以是未注册的占位成员
