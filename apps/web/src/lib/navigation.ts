/**
 * 智能导航工具函数
 * 根据当前环境（iOS Capacitor 或 Web）自动选择正确的 URL 格式
 */

// 检测是否在 Capacitor 环境中
export function isCapacitorEnvironment(): boolean {
  if (typeof window === 'undefined') {
    console.log('🧭 [CapacitorDetect] window未定义，非浏览器环境');
    return false;
  }

  const hasCapacitor = !!(window as any).Capacitor;
  console.log('🧭 [CapacitorDetect] Capacitor对象存在:', hasCapacitor);

  if (hasCapacitor) {
    console.log('🧭 [CapacitorDetect] Capacitor详情:', (window as any).Capacitor);
  }

  return hasCapacitor;
}

// 智能路由生成器
export function getSmartRoute(route: string): string {
  if (!isCapacitorEnvironment()) {
    return route; // Web 环境使用原始路由
  }

  // iOS Capacitor 环境需要转换动态路由为 Pages Router 格式
  // 特殊处理记账编辑路由 - 使用主页面 + localStorage 传递记账ID
  if (route.startsWith('/transactions/edit/')) {
    const id = route.replace('/transactions/edit/', '').split('/')[0];

    // 将记账ID存储到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingTransactionEdit', id);
      localStorage.setItem('showTransactionEditModal', 'true');
      console.log('🧭 [SmartNavigate] 记账ID已存储到 localStorage:', id);
      console.log('🧭 [SmartNavigate] 设置记账编辑模态框标记');
    }

    return `/dashboard`;
  }

  const routeMap: Record<string, string> = {
    // 记账相关
    '/transactions/': '/transactions/', // 记账详情页面

    // 家庭相关
    '/families/': '/families/', // 家庭详情页面
    '/settings/families/': '/settings/families/', // 设置中的家庭详情页面

    // 账本相关
    '/books/edit/': '/books/edit/',
    '/settings/books/edit/': '/settings/books/edit/', // 设置中的账本编辑页面

    // 预算相关
    '/budgets/': '/budgets/', // 预算编辑页面需要特殊处理
    '/settings/budgets/': '/settings/budgets/', // 设置中的预算编辑页面

    // 设置相关
    '/settings/categories/': '/settings/categories/',
    '/settings/ai-services/edit/': '/settings/ai-services/edit/',
  };

  // 检查是否是动态路由
  for (const [appRoute, pagesRoute] of Object.entries(routeMap)) {
    if (route.startsWith(appRoute)) {
      // 提取 ID 部分
      const id = route.replace(appRoute, '').split('/')[0];

      // 特殊处理预算编辑路由
      if ((appRoute === '/budgets/' || appRoute === '/settings/budgets/') && route.includes('/edit')) {
        return `${pagesRoute}${id}/edit`;
      }

      // 特殊处理分类编辑路由
      if (appRoute === '/settings/categories/' && route.includes('/edit')) {
        return `${pagesRoute}${id}/edit`;
      }

      // 特殊处理账本编辑路由
      if ((appRoute === '/books/edit/' || appRoute === '/settings/books/edit/')) {
        return `${pagesRoute}${id}`;
      }

      // 特殊处理家庭成员路由
      if ((appRoute === '/families/' || appRoute === '/settings/families/') && route.includes('/members')) {
        return `${pagesRoute}${id}/members`;
      }

      return `${pagesRoute}${id}`;
    }
  }

  return route; // 如果没有匹配的路由映射，返回原始路由
}

// 智能导航函数
export function smartNavigate(router: any, route: string): void {
  console.log('🧭 [SmartNavigate] 开始导航:', route);

  const isCapacitor = isCapacitorEnvironment();
  console.log('🧭 [SmartNavigate] Capacitor环境检测:', isCapacitor);

  const targetRoute = getSmartRoute(route);
  console.log('🧭 [SmartNavigate] 目标路由:', targetRoute);

  if (isCapacitor) {
    // 在 Capacitor 环境中，尝试使用 Capacitor App 插件进行导航
    const fullUrl = `capacitor://localhost${targetRoute}`;
    console.log('🧭 [SmartNavigate] Capacitor导航到:', fullUrl);

    // 添加延迟以确保日志被记录
    setTimeout(async () => {
      console.log('🧭 [SmartNavigate] 即将执行导航...');
      console.log('🧭 [SmartNavigate] 当前 URL:', window.location.href);

      try {
        // 尝试使用 Capacitor App 插件
        if (typeof window !== 'undefined' && (window as any).Capacitor?.Plugins?.App) {
          console.log('🧭 [SmartNavigate] 使用 Capacitor App 插件导航');
          await (window as any).Capacitor.Plugins.App.openUrl({ url: fullUrl });
        } else {
          console.log('🧭 [SmartNavigate] 使用 window.location.href 导航');
          window.location.href = fullUrl;
        }

        console.log('🧭 [SmartNavigate] 导航命令已执行');
      } catch (error) {
        console.error('🧭 [SmartNavigate] 导航失败:', error);
        console.log('🧭 [SmartNavigate] 回退到 window.location.href');
        window.location.href = fullUrl;
      }
    }, 100);
  } else {
    // Web 环境使用 Next.js router
    console.log('🧭 [SmartNavigate] Web导航到:', targetRoute);
    router.push(targetRoute);
  }
}
