import { Request, Response } from 'express';
import { FamilyService } from '../services/family.service';
import { validateCreateFamilyInput, validateCreateFamilyMemberInput, validateCreateInvitationInput, validateAcceptInvitationInput } from '../validators/family.validator';

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
      console.error('创建家庭失败:', error);
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
      console.error('获取家庭列表失败:', error);
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
      console.error('获取家庭详情失败:', error);
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
      console.error('更新家庭失败:', error);
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
      console.error('删除家庭失败:', error);
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
      console.error('添加家庭成员失败:', error);
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
        const invitation = await this.familyService.createInvitation(familyId, userId, value, baseUrl);
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
      console.error('创建邀请链接失败:', error);
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
      console.error('接受邀请失败:', error);
      res.status(500).json({ message: '接受邀请失败' });
    }
  }
}
