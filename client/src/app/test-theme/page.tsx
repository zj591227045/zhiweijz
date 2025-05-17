"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme-store";
import { useExtendedThemeStore } from "@/store/theme-store-extended";
import Link from "next/link";

export default function TestThemePage() {
  const { theme, themeColor, setTheme, setThemeColor, toggleTheme } = useThemeStore();
  const { fetchThemes, builtInThemes, customThemes, currentThemeId, switchTheme } = useExtendedThemeStore();

  useEffect(() => {
    // 获取主题列表
    fetchThemes();
  }, [fetchThemes]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">主题测试页面</h1>
      
      <div className="mb-6 p-4 bg-card rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">当前主题设置</h2>
        <p>主题模式: <span className="font-medium">{theme}</span></p>
        <p>主题颜色: <span className="font-medium">{themeColor}</span></p>
        <p>当前主题ID: <span className="font-medium">{currentThemeId}</span></p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">主题控制</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            className="px-3 py-2 bg-primary text-primary-foreground rounded"
            onClick={toggleTheme}
          >
            切换明暗模式
          </button>
          <button 
            className="px-3 py-2 bg-primary text-primary-foreground rounded"
            onClick={() => setThemeColor("blue")}
          >
            蓝色
          </button>
          <button 
            className="px-3 py-2 bg-primary text-primary-foreground rounded"
            onClick={() => setThemeColor("green")}
          >
            绿色
          </button>
          <button 
            className="px-3 py-2 bg-primary text-primary-foreground rounded"
            onClick={() => setThemeColor("purple")}
          >
            紫色
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">内置主题</h2>
        <div className="grid grid-cols-2 gap-4">
          {builtInThemes.map((theme) => (
            <div 
              key={theme.id}
              className={`p-3 rounded-lg cursor-pointer ${currentThemeId === theme.id ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              onClick={() => switchTheme(theme.id)}
            >
              {theme.name}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">自定义主题</h2>
        <div className="grid grid-cols-2 gap-4">
          {customThemes.length > 0 ? (
            customThemes.map((theme) => (
              <div 
                key={theme.id}
                className={`p-3 rounded-lg cursor-pointer ${currentThemeId === theme.id ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                onClick={() => switchTheme(theme.id)}
              >
                {theme.name}
              </div>
            ))
          ) : (
            <p className="col-span-2 text-muted-foreground">暂无自定义主题</p>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">CSS变量测试</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
            --primary-color
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--background-color)' }}>
            --background-color
          </div>
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--card-background)' }}>
            --card-background
          </div>
          <div className="p-3 rounded-lg" style={{ color: 'var(--text-primary)', border: '1px solid' }}>
            --text-primary
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <Link href="/settings/theme" className="text-primary hover:underline">
          前往主题设置页面
        </Link>
      </div>
    </div>
  );
}
