import { Router } from 'express';
import { FamilyController } from '../controllers/family.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const familyController = new FamilyController();

// 创建家庭
router.post('/', authenticate, (req, res) => familyController.createFamily(req, res));

// 获取用户的家庭列表
router.get('/', authenticate, (req, res) => familyController.getFamilies(req, res));

// 获取家庭详情
router.get('/:id', authenticate, (req, res) => familyController.getFamilyById(req, res));

// 更新家庭
router.put('/:id', authenticate, (req, res) => familyController.updateFamily(req, res));

// 删除家庭
router.delete('/:id', authenticate, (req, res) => familyController.deleteFamily(req, res));

// 添加家庭成员
router.post('/:id/members', authenticate, (req, res) => familyController.addFamilyMember(req, res));

// 创建邀请链接
router.post('/:id/invitations', authenticate, (req, res) => familyController.createInvitation(req, res));

// 接受邀请
router.post('/join', authenticate, (req, res) => familyController.acceptInvitation(req, res));

// 获取家庭成员列表
router.get('/:id/members', authenticate, (req, res) => familyController.getFamilyMembers(req, res));

// 获取家庭统计数据
router.get('/:id/statistics', authenticate, (req, res) => familyController.getFamilyStatistics(req, res));

// 退出家庭
router.post('/:id/leave', authenticate, (req, res) => familyController.leaveFamily(req, res));

export default router;
