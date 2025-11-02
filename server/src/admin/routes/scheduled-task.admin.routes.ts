import { Router } from 'express';
import { ScheduledTaskAdminController } from '../controllers/scheduled-task.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const scheduledTaskController = new ScheduledTaskAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * @route GET /api/admin/scheduled-tasks
 * @desc 获取计划任务列表
 * @access Admin
 */
router.get('/', (req, res) => scheduledTaskController.getTaskList(req, res));

/**
 * @route GET /api/admin/scheduled-tasks/logs/list
 * @desc 获取执行日志列表
 * @access Admin
 * 注意：这个路由必须在 /:id 之前，否则会被 /:id 匹配
 */
router.get('/logs/list', (req, res) => scheduledTaskController.getExecutionLogs(req, res));

/**
 * @route GET /api/admin/scheduled-tasks/logs/:id
 * @desc 获取执行日志详情
 * @access Admin
 */
router.get('/logs/:id', (req, res) => scheduledTaskController.getExecutionLogById(req, res));

/**
 * @route POST /api/admin/scheduled-tasks/test-webdav
 * @desc 测试WebDAV连接
 * @access Admin
 * 注意：这个路由必须在 /:id 之前，否则会被 /:id 匹配
 */
router.post('/test-webdav', (req, res) => scheduledTaskController.testWebDAVConnection(req, res));

/**
 * @route GET /api/admin/scheduled-tasks/:id
 * @desc 获取计划任务详情
 * @access Admin
 */
router.get('/:id', (req, res) => scheduledTaskController.getTaskById(req, res));

/**
 * @route POST /api/admin/scheduled-tasks
 * @desc 创建计划任务
 * @access Admin
 */
router.post('/', (req, res) => scheduledTaskController.createTask(req, res));

/**
 * @route PUT /api/admin/scheduled-tasks/:id
 * @desc 更新计划任务
 * @access Admin
 */
router.put('/:id', (req, res) => scheduledTaskController.updateTask(req, res));

/**
 * @route DELETE /api/admin/scheduled-tasks/:id
 * @desc 删除计划任务
 * @access Admin
 */
router.delete('/:id', (req, res) => scheduledTaskController.deleteTask(req, res));

/**
 * @route POST /api/admin/scheduled-tasks/:id/execute
 * @desc 手动执行计划任务
 * @access Admin
 */
router.post('/:id/execute', (req, res) => scheduledTaskController.executeTask(req, res));

/**
 * @route PATCH /api/admin/scheduled-tasks/:id/toggle
 * @desc 启用/禁用计划任务
 * @access Admin
 */
router.patch('/:id/toggle', (req, res) => scheduledTaskController.toggleTask(req, res));

/**
 * @route GET /api/admin/scheduled-tasks/:id/config
 * @desc 获取任务配置
 * @access Admin
 */
router.get('/:id/config', (req, res) => scheduledTaskController.getTaskConfig(req, res));

/**
 * @route PUT /api/admin/scheduled-tasks/:id/config
 * @desc 更新任务配置
 * @access Admin
 */
router.put('/:id/config', (req, res) => scheduledTaskController.updateTaskConfig(req, res));

export default router;

