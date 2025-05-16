"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon, User, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">只为记账</span>
          </Link>
        </div>

        {/* 桌面导航 */}
        <nav className="hidden md:flex md:items-center md:space-x-4 lg:space-x-6">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                仪表盘
              </Link>
              <Link
                href="/transactions"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/transactions") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                交易记录
              </Link>
              <Link
                href="/categories"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/categories") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                分类管理
              </Link>
              <Link
                href="/budgets"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/budgets") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                预算管理
              </Link>
              <Link
                href="/statistics"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/statistics") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                统计分析
              </Link>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="切换主题"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
                <div className="relative group">
                  <Button variant="ghost" size="icon" aria-label="用户菜单">
                    <User size={18} />
                  </Button>
                  <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-background shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden group-hover:block">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-muted-foreground">
                        {user?.name}
                      </div>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                      >
                        设置
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/login") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                登录
              </Link>
              <Link
                href="/register"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/register") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                注册
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="切换主题"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
            </>
          )}
        </nav>

        {/* 移动端菜单按钮 */}
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="切换主题"
            className="mr-2"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "关闭菜单" : "打开菜单"}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-background md:hidden">
          <nav className="container flex flex-col space-y-4 py-6">
            {isAuthenticated ? (
              <>
                <div className="border-b pb-4 mb-4">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-sm text-muted-foreground">{user?.email}</div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/dashboard") ? "text-primary" : "text-foreground"
                  }`}
                >
                  仪表盘
                </Link>
                <Link
                  href="/transactions"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/transactions") ? "text-primary" : "text-foreground"
                  }`}
                >
                  交易记录
                </Link>
                <Link
                  href="/categories"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/categories") ? "text-primary" : "text-foreground"
                  }`}
                >
                  分类管理
                </Link>
                <Link
                  href="/budgets"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/budgets") ? "text-primary" : "text-foreground"
                  }`}
                >
                  预算管理
                </Link>
                <Link
                  href="/statistics"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/statistics") ? "text-primary" : "text-foreground"
                  }`}
                >
                  统计分析
                </Link>
                <Link
                  href="/settings"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/settings") ? "text-primary" : "text-foreground"
                  }`}
                >
                  设置
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-base font-medium text-foreground"
                >
                  <LogOut size={18} className="mr-2" />
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/login") ? "text-primary" : "text-foreground"
                  }`}
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className={`text-base font-medium ${
                    isActive("/register") ? "text-primary" : "text-foreground"
                  }`}
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
