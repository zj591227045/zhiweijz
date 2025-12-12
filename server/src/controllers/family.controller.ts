import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { FamilyService } from '../services/family.service';
import {
  validateCreateFamilyInput,
  validateCreateFamilyMemberInput,
  validateCreateInvitationInput,
  validateAcceptInvitationInput,
  validateCreateCustodialMemberInput,
  validateUpdateCustodialMemberInput,
} from '../validators/family.validator';

/**
 * 家庭控制器
 */
export class FamilyController {
  private familyService: FamilyService;

  constructor() {
    this.familyService = new FamilyService();
  }

  /**
   * 创建家庭
   */
  async createFamily(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateCreateFamilyInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 创建家庭
      const family = await this.familyService.createFamily(userId, value);
      res.status(201).json(family);
    } catch (error) {
      logger.error('创建家庭失败:', error);
      res.status(500).json({ message: '创建家庭失败' });
    }
  }

  /**
   * 获取用户的家庭列表
   */
  async getFamilies(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 获取家庭列表
      const families = await this.familyService.getFamiliesByUserId(userId);
      res.status(200).json(families);
    } catch (error) {
      logger.error('获取家庭列表失败:', error);
      res.status(500).json({ message: '获取家庭列表失败' });
    }
  }

  /**
   * 获取家庭详情
   */
  async getFamilyById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 获取家庭详情
      try {
        const family = await this.familyService.getFamilyById(familyId, userId);
        res.status(200).json(family);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('获取家庭详情失败:', error);
      res.status(500).json({ message: '获取家庭详情失败' });
    }
  }

  /**
   * 更新家庭
   */
  async updateFamily(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateCreateFamilyInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 更新家庭
      try {
        const family = await this.familyService.updateFamily(familyId, userId, value);
        res.status(200).json(family);
      } catch (error) {
        if (error instanceof Error && error.message === '无权更新此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('更新家庭失败:', error);
      res.status(500).json({ message: '更新家庭失败' });
    }
  }

  /**
   * 删除家庭
   */
  async deleteFamily(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 删除家庭
      try {
        await this.familyService.deleteFamily(familyId, userId);
        res.status(204).end();
      } catch (error) {
        if (error instanceof Error && error.message === '只有家庭创建者可以删除家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('删除家庭失败:', error);
      res.status(500).json({ message: '删除家庭失败' });
    }
  }

  /**
   * 添加家庭成员
   */
  async addFamilyMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateCreateFamilyMemberInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 添加家庭成员
      try {
        const member = await this.familyService.addFamilyMember(familyId, userId, value);
        res.status(201).json(member);
      } catch (error) {
        if (error instanceof Error && error.message === '无权添加家庭成员') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '用户不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '用户已经是家庭成员') {
          res.status(409).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('添加家庭成员失败:', error);
      res.status(500).json({ message: '添加家庭成员失败' });
    }
  }

  /**
   * 创建邀请链接
   */
  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateCreateInvitationInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 创建邀请链接
      try {
        // 获取基础URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const invitation = await this.familyService.createInvitation(
          familyId,
          userId,
          value,
          baseUrl,
        );
        res.status(201).json(invitation);
      } catch (error) {
        if (error instanceof Error && error.message === '无权创建邀请链接') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('创建邀请链接失败:', error);
      res.status(500).json({ message: '创建邀请链接失败' });
    }
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateAcceptInvitationInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 接受邀请
      try {
        const member = await this.familyService.acceptInvitation(userId, value);
        res.status(200).json(member);
      } catch (error) {
        if (error instanceof Error && error.message === '邀请不存在或已过期') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '邀请已过期') {
          res.status(410).json({ message: error.message });
        } else if (error instanceof Error && error.message === '用户不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '您已经是该家庭的成员') {
          res.status(409).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('接受邀请失败:', error);
      res.status(500).json({ message: '接受邀请失败' });
    }
  }

  /**
   * 获取家庭邀请列表
   */
  async getFamilyInvitations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 获取邀请列表
      try {
        // 获取基础URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const invitations = await this.familyService.getFamilyInvitations(
          familyId,
          userId,
          baseUrl,
        );
        res.status(200).json(invitations);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('获取家庭邀请列表失败:', error);
      res.status(500).json({ message: '获取家庭邀请列表失败' });
    }
  }

  /**
   * 获取家庭成员列表
   */
  async getFamilyMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 获取家庭成员列表
      try {
        const members = await this.familyService.getFamilyMembers(familyId, userId);
        res.status(200).json({ members, totalCount: members.length });
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('获取家庭成员列表失败:', error);
      res.status(500).json({ message: '获取家庭成员列表失败' });
    }
  }

  /**
   * 获取家庭统计数据
   */
  async getFamilyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 获取时间范围参数
      const period = (req.query.period as string) || 'month';
      if (!['month', 'last_month', 'year', 'all'].includes(period)) {
        res.status(400).json({ message: '无效的时间范围参数' });
        return;
      }

      // 获取家庭统计数据
      try {
        const statistics = await this.familyService.getFamilyStatistics(familyId, userId, period);
        res.status(200).json(statistics);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('获取家庭统计数据失败:', error);
      res.status(500).json({ message: '获取家庭统计数据失败' });
    }
  }

  /**
   * 退出家庭
   */
  async leaveFamily(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 退出家庭
      try {
        await this.familyService.leaveFamily(familyId, userId);
        res.status(204).end();
      } catch (error) {
        if (error instanceof Error && error.message === '家庭创建者不能退出家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '您不是该家庭的成员') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('退出家庭失败:', error);
      res.status(500).json({ message: '退出家庭失败' });
    }
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.familyId;
      const memberId = req.params.memberId;
      if (!familyId || !memberId) {
        res.status(400).json({ message: '家庭ID和成员ID不能为空' });
        return;
      }

      // 验证请求数据
      if (!req.body.role || !['ADMIN', 'MEMBER'].includes(req.body.role)) {
        res.status(400).json({ message: '角色必须是 ADMIN 或 MEMBER' });
        return;
      }

      // 更新成员角色
      try {
        const member = await this.familyService.updateFamilyMember(familyId, memberId, userId, {
          role: req.body.role,
        });
        res.status(200).json(member);
      } catch (error) {
        if (error instanceof Error && error.message === '无权更新家庭成员') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭成员不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('更新成员角色失败:', error);
      res.status(500).json({ message: '更新成员角色失败' });
    }
  }

  /**
   * 删除家庭成员
   */
  async deleteFamilyMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.familyId;
      const memberId = req.params.memberId;
      if (!familyId || !memberId) {
        res.status(400).json({ message: '家庭ID和成员ID不能为空' });
        return;
      }

      // 删除家庭成员
      try {
        await this.familyService.deleteFamilyMember(familyId, memberId, userId);
        res.status(204).end();
      } catch (error) {
        if (error instanceof Error && error.message === '无权删除家庭成员') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭成员不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '不能删除自己') {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('删除家庭成员失败:', error);
      res.status(500).json({ message: '删除家庭成员失败' });
    }
  }

  /**
   * 获取成员统计
   */
  async getMemberStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 获取时间范围参数
      const period = (req.query.period as string) || 'month';
      if (!['month', 'last_month', 'all'].includes(period)) {
        res.status(400).json({ message: '无效的时间范围参数' });
        return;
      }

      // 获取成员统计数据
      try {
        const statistics = await this.familyService.getMemberStatistics(familyId, userId, period);
        res.status(200).json(statistics);
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('获取成员统计失败:', error);
      res.status(500).json({ message: '获取成员统计失败' });
    }
  }

  /**
   * 添加托管成员
   */
  async addCustodialMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateCreateCustodialMemberInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 添加托管成员
      try {
        const member = await this.familyService.addCustodialMember(familyId, userId, {
          name: req.body.name,
          gender: req.body.gender,
          birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
          role: req.body.role,
        });
        res.status(201).json(member);
      } catch (error) {
        if (error instanceof Error && error.message === '无权添加托管成员') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('添加托管成员失败:', error);
      res.status(500).json({ message: '添加托管成员失败' });
    }
  }

  /**
   * 更新托管成员
   */
  async updateCustodialMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.familyId;
      const memberId = req.params.memberId;
      if (!familyId || !memberId) {
        res.status(400).json({ message: '家庭ID和成员ID不能为空' });
        return;
      }

      // 验证请求数据
      const { error, value } = validateUpdateCustodialMemberInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // 更新托管成员
      try {
        const member = await this.familyService.updateCustodialMember(familyId, memberId, userId, {
          name: req.body.name,
          gender: req.body.gender,
          birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
          role: req.body.role,
        });
        res.status(200).json(member);
      } catch (error) {
        if (error instanceof Error && error.message === '无权更新托管成员') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '托管成员不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '该成员不是托管成员') {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('更新托管成员失败:', error);
      res.status(500).json({ message: '更新托管成员失败' });
    }
  }

  /**
   * 删除托管成员
   */
  async deleteCustodialMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.familyId;
      const memberId = req.params.memberId;
      if (!familyId || !memberId) {
        res.status(400).json({ message: '家庭ID和成员ID不能为空' });
        return;
      }

      // 删除托管成员
      try {
        await this.familyService.deleteCustodialMember(familyId, memberId, userId);
        res.status(204).end();
      } catch (error) {
        if (error instanceof Error && error.message === '无权删除托管成员') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '托管成员不存在') {
          res.status(404).json({ message: error.message });
        } else if (error instanceof Error && error.message === '该成员不是托管成员') {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('删除托管成员失败:', error);
      res.status(500).json({ message: '删除托管成员失败' });
    }
  }

  /**
   * 获取托管成员列表
   */
  async getCustodialMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const familyId = req.params.id;
      if (!familyId) {
        res.status(400).json({ message: '家庭ID不能为空' });
        return;
      }

      // 获取托管成员列表
      try {
        const members = await this.familyService.getCustodialMembers(familyId, userId);
        res.status(200).json({ members, totalCount: members.length });
      } catch (error) {
        if (error instanceof Error && error.message === '无权访问此家庭') {
          res.status(403).json({ message: error.message });
        } else if (error instanceof Error && error.message === '家庭不存在') {
          res.status(404).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('获取托管成员列表失败:', error);
      res.status(500).json({ message: '获取托管成员列表失败' });
    }
  }
}
