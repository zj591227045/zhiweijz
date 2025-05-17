"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import "./settings.css";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 处理退出登录
  const handleLogout = async () => {
    if (confirm("确定要退出登录吗？")) {
      logout();
      router.push("/login");
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <PageContainer title="设置" activeNavItem="profile">
      <div className="user-card">
        <div className="user-avatar">
          <i className="fas fa-user"></i>
        </div>
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>

      <div className="settings-group">
        <div className="group-title">账户</div>
        <Link href="/settings/profile" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="item-content">
            <div className="item-title">个人资料</div>
            <div className="item-description">修改个人信息</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/settings/security" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="item-content">
            <div className="item-title">账户安全</div>
            <div className="item-description">修改密码</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
      </div>

      <div className="settings-group">
        <div className="group-title">数据管理</div>
        <Link href="/books" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-book"></i>
          </div>
          <div className="item-content">
            <div className="item-title">账本管理</div>
            <div className="item-description">管理您的账本</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/families" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-home"></i>
          </div>
          <div className="item-content">
            <div className="item-title">家庭管理</div>
            <div className="item-description">管理家庭人员及账本</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/settings/categories" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-tags"></i>
          </div>
          <div className="item-content">
            <div className="item-title">分类管理</div>
            <div className="item-description">管理交易分类</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/settings/export" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-file-export"></i>
          </div>
          <div className="item-content">
            <div className="item-title">数据导出</div>
            <div className="item-description">导出账本数据</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
      </div>

      <div className="settings-group">
        <div className="group-title">应用</div>
        <Link href="/settings/theme" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-palette"></i>
          </div>
          <div className="item-content">
            <div className="item-title">主题设置</div>
            <div className="item-description">自定义应用外观</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/settings/language" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-language"></i>
          </div>
          <div className="item-content">
            <div className="item-title">语言</div>
            <div className="item-description">简体中文</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/settings/currency" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-yen-sign"></i>
          </div>
          <div className="item-content">
            <div className="item-title">货币设置</div>
            <div className="item-description">人民币 (¥)</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
      </div>

      <div className="settings-group">
        <div className="group-title">关于</div>
        <Link href="/settings/about" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-info-circle"></i>
          </div>
          <div className="item-content">
            <div className="item-title">关于应用</div>
            <div className="item-description">版本信息</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
        <Link href="/settings/feedback" className="settings-item">
          <div className="item-icon">
            <i className="fas fa-comment-alt"></i>
          </div>
          <div className="item-content">
            <div className="item-title">意见反馈</div>
            <div className="item-description">提交问题或建议</div>
          </div>
          <div className="item-action">
            <i className="fas fa-chevron-right"></i>
          </div>
        </Link>
      </div>

      <button className="logout-button" onClick={handleLogout}>
        退出登录
      </button>

      <div className="version-info">只为记账 v1.0.0</div>
    </PageContainer>
  );
}
