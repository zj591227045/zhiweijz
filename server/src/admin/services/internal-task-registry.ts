/**
 * 内部任务注册系统
 * 用于将内部服务方法注册为可调度的任务，供计划任务管理系统统一调度
 */

/**
 * 内部任务接口
 */
export interface InternalTask {
  /** 任务唯一标识 */
  key: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description: string;
  /** 任务执行函数，可接收任务配置参数 */
  execute: (config?: any) => Promise<void>;
  /** 建议的Cron表达式 */
  suggestedCron?: string;
}

/**
 * 内部任务注册表
 * 单例模式，全局唯一
 */
class InternalTaskRegistry {
  private static instance: InternalTaskRegistry;
  private tasks: Map<string, InternalTask> = new Map();

  private constructor() {
    console.log('[内部任务注册表] 初始化');
  }

  /**
   * 获取单例实例
   */
  static getInstance(): InternalTaskRegistry {
    if (!InternalTaskRegistry.instance) {
      InternalTaskRegistry.instance = new InternalTaskRegistry();
    }
    return InternalTaskRegistry.instance;
  }

  /**
   * 注册任务
   */
  register(task: InternalTask): void {
    if (this.tasks.has(task.key)) {
      console.warn(`[内部任务注册表] 任务已存在，将被覆盖: ${task.key}`);
    }
    this.tasks.set(task.key, task);
    console.log(`[内部任务注册表] 注册任务: ${task.key} - ${task.name}`);
  }

  /**
   * 批量注册任务
   */
  registerBatch(tasks: InternalTask[]): void {
    tasks.forEach(task => this.register(task));
  }

  /**
   * 执行任务
   * @param key 任务key
   * @param config 任务配置（可选）
   */
  async execute(key: string, config?: any): Promise<void> {
    const task = this.tasks.get(key);
    if (!task) {
      throw new Error(`[内部任务注册表] 任务不存在: ${key}`);
    }

    console.log(`[内部任务注册表] 开始执行任务: ${task.name} (${key})`);
    const startTime = Date.now();

    try {
      await task.execute(config);
      const duration = Date.now() - startTime;
      console.log(`[内部任务注册表] 任务执行成功: ${task.name} (耗时: ${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[内部任务注册表] 任务执行失败: ${task.name} (耗时: ${duration}ms)`, error);
      throw error;
    }
  }

  /**
   * 获取任务信息
   */
  getTask(key: string): InternalTask | undefined {
    return this.tasks.get(key);
  }

  /**
   * 获取所有已注册的任务
   */
  getAllTasks(): InternalTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 检查任务是否存在
   */
  hasTask(key: string): boolean {
    return this.tasks.has(key);
  }

  /**
   * 取消注册任务
   */
  unregister(key: string): boolean {
    const result = this.tasks.delete(key);
    if (result) {
      console.log(`[内部任务注册表] 取消注册任务: ${key}`);
    }
    return result;
  }

  /**
   * 清空所有任务
   */
  clear(): void {
    this.tasks.clear();
    console.log('[内部任务注册表] 已清空所有任务');
  }

  /**
   * 获取任务数量
   */
  get size(): number {
    return this.tasks.size;
  }
}

// 导出单例实例
export const internalTaskRegistry = InternalTaskRegistry.getInstance();
export default internalTaskRegistry;

