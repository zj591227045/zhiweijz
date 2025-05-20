import { Family, FamilyMember, Invitation, Prisma, Role } from '@prisma/client';
import prisma from '../config/database';

/**
 * 包含家庭和成员的家庭详情
 */
export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
}

/**
 * 包含家庭和创建者的家庭信息
 */
export interface FamilyWithCreator extends Family {
  creator: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * 家庭仓库
 */
export class FamilyRepository {
  /**
   * 创建家庭
   */
  async createFamily(userId: string, name: string): Promise<Family> {
    return prisma.family.create({
      data: {
        name,
        createdBy: userId,
      },
    });
  }

  /**
   * 根据ID查找家庭
   */
  async findFamilyById(id: string): Promise<FamilyWithMembers | null> {
    return prisma.family.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 查找用户创建的家庭
   */
  async findFamiliesByCreatorId(userId: string): Promise<FamilyWithCreator[]> {
    return prisma.family.findMany({
      where: { createdBy: userId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 查找用户所属的家庭
   */
  async findFamiliesByMemberId(userId: string): Promise<Family[]> {
    const familyMembers = await prisma.familyMember.findMany({
      where: { userId },
      select: { familyId: true },
    });

    const familyIds = familyMembers.map((member: { familyId: string }) => member.familyId);

    return prisma.family.findMany({
      where: { id: { in: familyIds } },
    });
  }

  /**
   * 查找用户的所有家庭（包括创建的和加入的）
   */
  async findAllFamiliesByUserId(userId: string): Promise<Family[]> {
    const createdFamilies = await this.findFamiliesByCreatorId(userId);
    const memberFamilies = await this.findFamiliesByMemberId(userId);

    // 合并并去重
    const allFamilies = [...createdFamilies, ...memberFamilies];
    const uniqueFamilies = allFamilies.filter((family, index, self) =>
      index === self.findIndex(f => f.id === family.id)
    );

    return uniqueFamilies;
  }

  /**
   * 更新家庭
   */
  async updateFamily(id: string, data: { name?: string }): Promise<Family> {
    return prisma.family.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除家庭
   */
  async deleteFamily(id: string): Promise<Family> {
    // 使用事务确保所有相关数据都被正确删除
    return prisma.$transaction(async (tx) => {
      // 1. 删除所有邀请
      await tx.invitation.deleteMany({
        where: { familyId: id },
      });

      // 2. 删除所有家庭成员
      await tx.familyMember.deleteMany({
        where: { familyId: id },
      });

      // 3. 删除所有家庭分类预算
      const familyBudgets = await tx.budget.findMany({
        where: { familyId: id },
        select: { id: true },
      });

      const budgetIds = familyBudgets.map(budget => budget.id);

      if (budgetIds.length > 0) {
        await tx.categoryBudget.deleteMany({
          where: { budgetId: { in: budgetIds } },
        });
      }

      // 4. 删除所有家庭预算
      await tx.budget.deleteMany({
        where: { familyId: id },
      });

      // 5. 更新所有关联的交易记录，移除家庭关联
      await tx.transaction.updateMany({
        where: { familyId: id },
        data: {
          familyId: null,
          familyMemberId: null
        },
      });

      // 6. 删除家庭分类
      await tx.category.deleteMany({
        where: { familyId: id },
      });

      // 7. 最后删除家庭
      return tx.family.delete({
        where: { id },
      });
    });
  }

  /**
   * 创建家庭成员
   */
  async createFamilyMember(data: {
    familyId: string;
    userId?: string;
    name: string;
    gender?: string;
    birthDate?: Date;
    role: Role;
    isRegistered: boolean;
    isCustodial?: boolean;
  }): Promise<FamilyMember> {
    return prisma.familyMember.create({
      data,
    });
  }

  /**
   * 查找家庭成员
   */
  async findFamilyMemberById(id: string): Promise<FamilyMember | null> {
    return prisma.familyMember.findUnique({
      where: { id },
    });
  }

  /**
   * 查找用户在家庭中的成员记录
   */
  async findFamilyMemberByUserAndFamily(userId: string, familyId: string): Promise<FamilyMember | null> {
    return prisma.familyMember.findFirst({
      where: {
        userId,
        familyId,
      },
    });
  }

  /**
   * 查找家庭的所有成员
   */
  async findFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    return prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * 更新家庭成员
   */
  async updateFamilyMember(id: string, data: {
    name?: string;
    gender?: string;
    birthDate?: Date;
    role?: Role;
  }): Promise<FamilyMember> {
    return prisma.familyMember.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除家庭成员
   */
  async deleteFamilyMember(id: string): Promise<FamilyMember> {
    return prisma.familyMember.delete({
      where: { id },
    });
  }

  /**
   * 创建邀请
   */
  async createInvitation(familyId: string, invitationCode: string, expiresAt: Date): Promise<Invitation> {
    return prisma.invitation.create({
      data: {
        familyId,
        invitationCode,
        expiresAt,
      },
    });
  }

  /**
   * 根据邀请码查找邀请
   */
  async findInvitationByCode(invitationCode: string): Promise<Invitation | null> {
    return prisma.invitation.findUnique({
      where: { invitationCode },
      include: {
        family: true,
      },
    });
  }

  /**
   * 获取家庭的所有邀请
   */
  async findFamilyInvitations(familyId: string): Promise<Invitation[]> {
    return prisma.invitation.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 标记邀请为已使用
   */
  async markInvitationAsUsed(id: string, usedByUserId: string, usedByUserName: string): Promise<Invitation> {
    return prisma.invitation.update({
      where: { id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedByUserId,
        usedByUserName
      },
    });
  }

  /**
   * 删除邀请
   */
  async deleteInvitation(id: string): Promise<Invitation> {
    return prisma.invitation.delete({
      where: { id },
    });
  }

  /**
   * 检查用户是否为家庭成员
   */
  async isFamilyMember(userId: string, familyId: string): Promise<boolean> {
    // 检查用户是否为家庭创建者
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (family && family.createdBy === userId) {
      return true;
    }

    // 检查用户是否为家庭成员
    const member = await this.findFamilyMemberByUserAndFamily(userId, familyId);
    return !!member;
  }
}
