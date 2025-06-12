# 页面布局指南

为了确保应用程序中所有页面的布局和样式保持一致，我们创建了统一的页面容器组件 `PageContainer`。本文档提供了使用该组件的指南和最佳实践。

## 为什么需要统一的页面容器？

- **一致的用户体验**：所有页面都有相同的布局结构和视觉风格
- **移动端优先**：确保所有页面都保持移动端的固定宽度（最大宽度480px）
- **减少重复代码**：避免在每个页面中重复编写相同的布局代码
- **集中管理布局变更**：当需要修改布局时，只需修改一个组件

## 如何使用 PageContainer 组件

### 基本用法

```tsx
import { PageContainer } from "@/components/layout/page-container";

export default function YourPage() {
  return (
    <PageContainer title="页面标题">
      {/* 页面内容 */}
      <div>这里是页面内容</div>
    </PageContainer>
  );
}
```

### 带有右侧操作按钮

```tsx
import { PageContainer } from "@/components/layout/page-container";

export default function YourPage() {
  const rightActions = (
    <>
      <button className="icon-button">
        <i className="fas fa-plus"></i>
      </button>
      <button className="icon-button">
        <i className="fas fa-cog"></i>
      </button>
    </>
  );

  return (
    <PageContainer title="页面标题" rightActions={rightActions}>
      {/* 页面内容 */}
      <div>这里是页面内容</div>
    </PageContainer>
  );
}
```

### 带有返回按钮

```tsx
import { PageContainer } from "@/components/layout/page-container";

export default function YourPage() {
  return (
    <PageContainer title="页面标题" showBackButton={true}>
      {/* 页面内容 */}
      <div>这里是页面内容</div>
    </PageContainer>
  );
}
```

### 自定义返回按钮行为

```tsx
import { PageContainer } from "@/components/layout/page-container";
import { useRouter } from "next/navigation";

export default function YourPage() {
  const router = useRouter();

  const handleBackClick = () => {
    // 自定义返回行为
    router.push("/some-specific-page");
  };

  return (
    <PageContainer 
      title="页面标题" 
      showBackButton={true} 
      onBackClick={handleBackClick}
    >
      {/* 页面内容 */}
      <div>这里是页面内容</div>
    </PageContainer>
  );
}
```

### 指定当前激活的导航项

```tsx
import { PageContainer } from "@/components/layout/page-container";

export default function YourPage() {
  return (
    <PageContainer title="页面标题" activeNavItem="budget">
      {/* 页面内容 */}
      <div>这里是页面内容</div>
    </PageContainer>
  );
}
```

### 不显示底部导航栏

```tsx
import { PageContainer } from "@/components/layout/page-container";

export default function YourPage() {
  return (
    <PageContainer title="页面标题" showBottomNav={false}>
      {/* 页面内容 */}
      <div>这里是页面内容</div>
    </PageContainer>
  );
}
```

## 组件属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| children | React.ReactNode | 必填 | 页面内容 |
| title | string | undefined | 页面标题 |
| rightActions | React.ReactNode | undefined | 右侧操作按钮 |
| showBackButton | boolean | false | 是否显示返回按钮 |
| onBackClick | () => void | undefined | 返回按钮点击事件，默认为 window.history.back() |
| activeNavItem | string | undefined | 当前激活的导航项（home, stats, budget, profile） |
| showBottomNav | boolean | true | 是否显示底部导航栏 |

## 最佳实践

1. **所有页面都应使用 PageContainer**：确保应用程序中的所有页面都使用 PageContainer 组件作为最外层容器。

2. **不要在 PageContainer 外添加额外的容器**：避免在 PageContainer 外添加额外的容器，这可能会破坏布局的一致性。

3. **使用正确的导航项**：确保为每个页面指定正确的 activeNavItem，以便底部导航栏能够正确显示当前页面。

4. **保持页面内容简洁**：PageContainer 已经提供了基本的页面结构，页面内容应该专注于业务逻辑。

5. **遵循移动端优先的设计原则**：即使在桌面端，也应该保持移动端的布局和交互方式。

## 常见问题

### 如何在页面中添加自定义样式？

页面内容可以添加自定义样式，但应该避免修改 PageContainer 的基本布局结构。

```tsx
import { PageContainer } from "@/components/layout/page-container";
import "./your-page.css"; // 自定义样式

export default function YourPage() {
  return (
    <PageContainer title="页面标题">
      <div className="your-custom-class">
        这里是带有自定义样式的页面内容
      </div>
    </PageContainer>
  );
}
```

### 如何处理需要全屏显示的页面？

对于需要全屏显示的页面（如登录页、注册页等），可以设置 showBottomNav={false} 并根据需要调整内容样式。

```tsx
import { PageContainer } from "@/components/layout/page-container";

export default function FullScreenPage() {
  return (
    <PageContainer showBottomNav={false} title="全屏页面">
      <div className="h-screen flex items-center justify-center">
        全屏内容
      </div>
    </PageContainer>
  );
}
```
