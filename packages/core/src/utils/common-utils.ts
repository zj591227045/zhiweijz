/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param ms 延迟时间
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param ms 延迟时间
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;

  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= ms) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (obj instanceof Object) {
    const copy: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as Record<string, any>)[key]);
    });
    return copy as T;
  }

  return obj;
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * 检查对象是否为空
 * @param obj 要检查的对象
 * @returns 是否为空
 */
export function isEmptyObject(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * 从对象中选择指定的属性
 * @param obj 源对象
 * @param keys 要选择的属性
 * @returns 新对象
 */
export function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 从对象中排除指定的属性
 * @param obj 源对象
 * @param keys 要排除的属性
 * @returns 新对象
 */
export function omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

/**
 * 将查询参数对象转换为URL查询字符串
 * @param params 查询参数对象
 * @returns URL查询字符串
 */
export function objectToQueryString(params: Record<string, any>): string {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => {
      if (Array.isArray(params[key])) {
        return params[key]
          .map((value: any) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    })
    .join('&');
}

/**
 * 解析URL查询字符串为对象
 * @param queryString URL查询字符串
 * @returns 查询参数对象
 */
export function queryStringToObject(queryString: string): Record<string, string> {
  if (!queryString || queryString === '?') return {};
  
  const query = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  const result: Record<string, string> = {};
  
  query.split('&').forEach(part => {
    if (!part) return;
    
    const [key, value] = part.split('=');
    result[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  
  return result;
}

/**
 * 获取分类图标类名
 * @param iconName 图标名称
 * @returns Font Awesome图标类名
 */
export function getCategoryIconClass(iconName?: string): string {
  if (!iconName) return 'fa-tag';

  // 如果图标名称已经包含完整的类名，则直接返回
  if (iconName.startsWith("fa-")) {
    return iconName;
  }

  // 图标映射表 - 扩展更完整的图标映射
  const iconMap: Record<string, string> = {
    // 基础分类
    food: 'fa-utensils',
    shopping: 'fa-shopping-bag',
    transport: 'fa-bus',
    entertainment: 'fa-film',
    home: 'fa-home',
    health: 'fa-heartbeat',
    education: 'fa-graduation-cap',
    travel: 'fa-plane',
    other: 'fa-ellipsis-h',

    // 收入类别
    salary: 'fa-money-bill-wave',
    investment: 'fa-chart-line',
    bonus: 'fa-gift',
    interest: 'fa-percentage',

    // 支出类别
    restaurant: 'fa-utensils',
    clothing: 'fa-tshirt',
    medical: 'fa-heartbeat',
    gift: 'fa-gift',
    communication: 'fa-mobile-alt',
    daily: 'fa-shopping-basket',
    sports: 'fa-running',
    beauty: 'fa-spa',
    child: 'fa-baby',
    elder: 'fa-user-friends',
    social: 'fa-users',
    digital: 'fa-laptop',
    car: 'fa-car',
    repayment: 'fa-hand-holding-usd',
    insurance: 'fa-shield-alt',
    office: 'fa-briefcase',
    repair: 'fa-tools',

    // 中文分类名称映射
    餐饮: 'fa-utensils',
    购物: 'fa-shopping-bag',
    交通: 'fa-bus',
    娱乐: 'fa-film',
    住房: 'fa-home',
    医疗: 'fa-heartbeat',
    学习: 'fa-graduation-cap',
    旅行: 'fa-plane',
    工资: 'fa-money-bill-wave',
    投资: 'fa-chart-line',
    奖金: 'fa-gift',
    利息: 'fa-percentage',
    服饰: 'fa-tshirt',
    通讯: 'fa-mobile-alt',
    日用: 'fa-shopping-basket',
    运动: 'fa-running',
    美容: 'fa-spa',
    孩子: 'fa-baby',
    社交: 'fa-users',
    数码: 'fa-laptop',
    汽车: 'fa-car',
    保险: 'fa-shield-alt',
    办公: 'fa-briefcase',
    维修: 'fa-tools',
    其他: 'fa-ellipsis-h',
  };

  return iconMap[iconName] || 'fa-tag';
}

/**
 * 获取图标完整类名
 * @param iconName 图标名称
 * @returns 完整的Font Awesome图标类名
 */
export function getIconClass(iconName?: string): string {
  if (!iconName) return 'fas fa-tag';

  // 如果图标名称已经包含完整的类名，则直接返回
  if (iconName.startsWith("fa-")) {
    return `fas ${iconName}`;
  }

  // 使用getCategoryIconClass获取图标名称
  const iconClass = getCategoryIconClass(iconName);
  return `fas ${iconClass}`;
}
