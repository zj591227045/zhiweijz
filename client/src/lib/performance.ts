/**
 * 性能监控工具
 * 用于测量和记录应用程序的性能指标
 */

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 存储性能标记的Map
const marks: Map<string, number> = new Map();

/**
 * 开始测量性能
 * @param name 性能标记名称
 */
export function startMeasure(name: string): void {
  if (!isDev) return;
  
  marks.set(name, performance.now());
  console.log(`[性能] 开始测量: ${name}`);
}

/**
 * 结束测量性能并输出结果
 * @param name 性能标记名称
 * @returns 测量时间（毫秒）
 */
export function endMeasure(name: string): number | null {
  if (!isDev) return null;
  
  const startTime = marks.get(name);
  if (startTime === undefined) {
    console.warn(`[性能] 未找到开始标记: ${name}`);
    return null;
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`[性能] ${name}: ${duration.toFixed(2)}ms`);
  marks.delete(name);
  
  return duration;
}

/**
 * 测量函数执行时间的装饰器
 * @param target 目标对象
 * @param propertyKey 方法名
 * @param descriptor 属性描述符
 */
export function measure(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    if (!isDev) return originalMethod.apply(this, args);
    
    const methodName = `${target.constructor.name}.${propertyKey}`;
    startMeasure(methodName);
    
    try {
      const result = originalMethod.apply(this, args);
      
      // 处理Promise返回值
      if (result instanceof Promise) {
        return result.finally(() => {
          endMeasure(methodName);
        });
      }
      
      endMeasure(methodName);
      return result;
    } catch (error) {
      endMeasure(methodName);
      throw error;
    }
  };
  
  return descriptor;
}

/**
 * 记录组件渲染时间
 * @param componentName 组件名称
 */
export function logRenderTime(componentName: string): () => void {
  if (!isDev) return () => {};
  
  const markName = `render_${componentName}`;
  startMeasure(markName);
  
  return () => {
    endMeasure(markName);
  };
}

/**
 * 记录API请求时间
 * @param url API请求URL
 */
export function logApiTime(url: string): () => void {
  if (!isDev) return () => {};
  
  const markName = `api_${url.split('?')[0]}`;
  startMeasure(markName);
  
  return () => {
    endMeasure(markName);
  };
}
