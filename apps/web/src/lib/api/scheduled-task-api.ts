import { adminApi } from '../admin-api-client';

/**
 * 计划任务接口定义
 */
export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  scriptType: 'shell' | 'sql' | 'node';
  scriptPath: string;
  cronExpression: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TaskExecutionLog {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  output?: string;
  error?: string;
  exitCode?: number;
  triggeredBy: 'cron' | 'manual';
  triggeredByUser?: string;
  createdAt: string;
  task?: {
    id: string;
    name: string;
  };
}

export interface CreateTaskDto {
  name: string;
  description?: string;
  scriptType: 'shell' | 'sql' | 'node';
  scriptPath: string;
  cronExpression: string;
  isEnabled?: boolean;
}

export interface UpdateTaskDto {
  name?: string;
  description?: string;
  scriptType?: 'shell' | 'sql' | 'node';
  scriptPath?: string;
  cronExpression?: string;
  isEnabled?: boolean;
}

export interface TaskListQuery {
  page?: number;
  limit?: number;
  isEnabled?: boolean;
  search?: string;
}

export interface ExecutionLogQuery {
  taskId?: string;
  taskName?: string;
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface TaskListResponse {
  success: boolean;
  data: ScheduledTask[];
  total: number;
  page: number;
  limit: number;
}

export interface ExecutionLogListResponse {
  success: boolean;
  data: TaskExecutionLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 计划任务API服务
 */
export const scheduledTaskApi = {
  /**
   * 获取任务列表
   */
  async getTaskList(query?: TaskListQuery): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.isEnabled !== undefined) params.append('isEnabled', query.isEnabled.toString());
    if (query?.search) params.append('search', query.search);

    const queryString = params.toString();
    const endpoint = `/api/admin/scheduled-tasks${queryString ? `?${queryString}` : ''}`;

    const response = await adminApi.get(endpoint);
    return response.json();
  },

  /**
   * 获取任务详情
   */
  async getTaskById(id: string): Promise<{ success: boolean; data: ScheduledTask }> {
    const response = await adminApi.get(`/api/admin/scheduled-tasks/${id}`);
    return response.json();
  },

  /**
   * 创建任务
   */
  async createTask(data: CreateTaskDto): Promise<{ success: boolean; data: ScheduledTask; message: string }> {
    const response = await adminApi.post('/api/admin/scheduled-tasks', data);
    return response.json();
  },

  /**
   * 更新任务
   */
  async updateTask(id: string, data: UpdateTaskDto): Promise<{ success: boolean; data: ScheduledTask; message: string }> {
    const response = await adminApi.put(`/api/admin/scheduled-tasks/${id}`, data);
    return response.json();
  },

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<{ success: boolean; message: string }> {
    const response = await adminApi.delete(`/api/admin/scheduled-tasks/${id}`);
    return response.json();
  },

  /**
   * 手动执行任务
   */
  async executeTask(id: string): Promise<{ success: boolean; data: { logId: string }; message: string }> {
    const response = await adminApi.post(`/api/admin/scheduled-tasks/${id}/execute`);
    return response.json();
  },

  /**
   * 启用/禁用任务
   */
  async toggleTask(id: string, isEnabled: boolean): Promise<{ success: boolean; data: ScheduledTask; message: string }> {
    const response = await adminApi.patch(`/api/admin/scheduled-tasks/${id}/toggle`, { isEnabled });
    return response.json();
  },

  /**
   * 获取执行日志列表
   */
  async getExecutionLogs(query?: ExecutionLogQuery): Promise<ExecutionLogListResponse> {
    const params = new URLSearchParams();
    if (query?.taskId) params.append('taskId', query.taskId);
    if (query?.taskName) params.append('taskName', query.taskName);
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    const queryString = params.toString();
    const endpoint = `/api/admin/scheduled-tasks/logs/list${queryString ? `?${queryString}` : ''}`;

    const response = await adminApi.get(endpoint);
    return response.json();
  },

  /**
   * 获取执行日志详情
   */
  async getExecutionLogById(id: string): Promise<{ success: boolean; data: TaskExecutionLog }> {
    const response = await adminApi.get(`/api/admin/scheduled-tasks/logs/${id}`);
    return response.json();
  },

  /**
   * 获取任务配置
   */
  async getTaskConfig(id: string): Promise<{ success: boolean; data: any }> {
    const response = await adminApi.get(`/api/admin/scheduled-tasks/${id}/config`);
    return response.json();
  },

  /**
   * 更新任务配置
   */
  async updateTaskConfig(id: string, config: any): Promise<{ success: boolean; data: ScheduledTask; message: string }> {
    const response = await adminApi.put(`/api/admin/scheduled-tasks/${id}/config`, config);
    return response.json();
  },

  /**
   * 测试WebDAV连接
   */
  async testWebDAVConnection(config: any): Promise<{ success: boolean; data: { success: boolean; message: string }; message: string }> {
    const response = await adminApi.post('/api/admin/scheduled-tasks/test-webdav', config);
    return response.json();
  },
};

export default scheduledTaskApi;

