# 只为记账 - 前端项目初始化指南

本文档提供了"只为记账"前端项目的初始化步骤，包括项目创建、依赖安装和基础配置。

## 1. 项目创建

使用Next.js 14创建新项目:

```bash
# 创建新的Next.js项目
npx create-next-app@latest client
```

在创建过程中，选择以下选项:

- ✅ 使用TypeScript
- ✅ 使用ESLint
- ✅ 使用Tailwind CSS
- ✅ 使用`src/`目录
- ✅ 使用App Router
- ❌ 不使用自定义导入别名 (我们将手动配置)

## 2. 基础依赖安装

进入项目目录并安装核心依赖:

```bash
cd client

# 安装UI组件库依赖
npm install @radix-ui/react-icons
npm install lucide-react
npm install class-variance-authority
npm install clsx
npm install tailwind-merge

# 安装状态管理依赖
npm install zustand

# 安装表单处理依赖
npm install react-hook-form @hookform/resolvers zod

# 安装HTTP客户端依赖
npm install axios @tanstack/react-query

# 安装工具库依赖
npm install dayjs

# 安装主题依赖
npm install next-themes
```

## 3. 开发依赖安装

安装开发依赖:

```bash
# 安装开发依赖
npm install -D tailwindcss-animate
npm install -D @types/node @types/react @types/react-dom
npm install -D eslint eslint-config-next
npm install -D prettier prettier-plugin-tailwindcss
```

## 4. 配置文件设置

### 4.1 配置Tailwind CSS

更新`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 4.2 配置全局CSS

更新`src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 249 250 251;
    --foreground: 31 41 55;
    --card: 255 255 255;
    --card-foreground: 31 41 55;
    --popover: 255 255 255;
    --popover-foreground: 31 41 55;
    --primary: 59 130 246;
    --primary-foreground: 255 255 255;
    --secondary: 243 244 246;
    --secondary-foreground: 31 41 55;
    --muted: 243 244 246;
    --muted-foreground: 107 114 128;
    --accent: 243 244 246;
    --accent-foreground: 31 41 55;
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    --border: 229 231 235;
    --input: 229 231 235;
    --ring: 59 130 246;
    --radius: 0.5rem;
  }

  .dark {
    --background: 17 24 39;
    --foreground: 243 244 246;
    --card: 31 41 55;
    --card-foreground: 243 244 246;
    --popover: 31 41 55;
    --popover-foreground: 243 244 246;
    --primary: 59 130 246;
    --primary-foreground: 255 255 255;
    --secondary: 38 38 38;
    --secondary-foreground: 243 244 246;
    --muted: 38 38 38;
    --muted-foreground: 163 163 163;
    --accent: 38 38 38;
    --accent-foreground: 243 244 246;
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    --border: 38 38 38;
    --input: 38 38 38;
    --ring: 59 130 246;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 4.3 配置Next.js

更新`next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig
```

### 4.4 配置TypeScript路径别名

更新`tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 5. 创建基础组件

使用shadcn/ui CLI安装基础组件:

```bash
# 安装shadcn/ui CLI
npm install -D @shadcn/ui

# 初始化shadcn/ui
npx shadcn-ui init

# 安装基础组件
npx shadcn-ui add button
npx shadcn-ui add input
npx shadcn-ui add form
npx shadcn-ui add card
npx shadcn-ui add checkbox
npx shadcn-ui add toast
npx shadcn-ui add dialog
npx shadcn-ui add dropdown-menu
npx shadcn-ui add select
npx shadcn-ui add tabs
npx shadcn-ui add avatar
```

## 6. 设置主题提供者

创建`src/components/theme-provider.tsx`:

```tsx
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

## 7. 更新根布局

更新`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "只为记账",
  description: "简单、高效的个人财务管理工具",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## 8. 启动开发服务器

```bash
npm run dev
```

现在，前端项目已经完成初始化，可以开始开发了。
