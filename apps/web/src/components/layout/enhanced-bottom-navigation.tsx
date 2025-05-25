"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccountBookStore } from "@/store/account-book-store";
import { SmartAccountingDialog } from "../transactions/smart-accounting-dialog";
import { toast } from "sonner";
import "@/styles/smart-accounting-dialog.css";

interface EnhancedBottomNavigationProps {
  currentPath?: string;
}

export function EnhancedBottomNavigation({ currentPath }: EnhancedBottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();
  const [isSmartAccountingOpen, setIsSmartAccountingOpen] = useState(false);
  const [hasLLMService, setHasLLMService] = useState<boolean | null>(null);

  // 检查当前账本是否绑定了LLM服务
  useEffect(() => {
    const checkLLMServiceBinding = async () => {
      if (currentAccountBook?.id) {
        try {
          console.log("检查账本是否绑定LLM服务，账本ID:", currentAccountBook.id);
          console.log("当前账本对象:", currentAccountBook);

          // 1. 首先检查账本对象是否有userLLMSettingId字段
          if (currentAccountBook.userLLMSettingId) {
            console.log("账本直接包含userLLMSettingId:", currentAccountBook.userLLMSettingId);
            setHasLLMService(true);
            return;
          }

          console.log("账本对象中没有userLLMSettingId字段，准备发起API请求");

          // 2. 使用正确的API路径检查账本LLM设置
          try {
            const apiUrl = `/api/ai/account/${currentAccountBook.id}/llm-settings`;
            console.log("准备发起API请求，URL:", apiUrl);
            
            // 获取认证token
            const token = localStorage.getItem("auth-token");
            console.log("认证token:", token ? "存在" : "不存在");
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
              }
            });
            console.log("API请求已发送，响应状态:", response.status);
            
            if (response.ok) {
              const llmSettings = await response.json();
              console.log("获取到的账本LLM设置:", llmSettings);

              // 检查响应格式，根据API文档判断是否绑定了LLM服务
              if (llmSettings && llmSettings.bound === true) {
                console.log("账本已绑定LLM服务");
                setHasLLMService(true);
              } else if (llmSettings && llmSettings.bound === false) {
                console.log("账本未绑定LLM服务:", llmSettings.message);
                setHasLLMService(false);
              } else {
                console.log("响应格式不明确，默认为未绑定");
                setHasLLMService(false);
              }
            } else {
              console.log("获取账本LLM设置失败，状态码:", response.status);
              setHasLLMService(false);
            }
          } catch (error) {
            console.error("获取账本LLM设置失败:", error);
            setHasLLMService(false);
          }
        } catch (error) {
          console.error("检查账本LLM服务绑定失败:", error);
          setHasLLMService(false);
        }
      } else {
        console.log("没有当前账本信息，默认为未绑定LLM服务");
        setHasLLMService(false);
      }
    };

    checkLLMServiceBinding();
  }, [currentAccountBook]);

  const isActive = (path: string) => {
    if (currentPath) {
      return currentPath === path;
    }
    return pathname === path;
  };

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();

    console.log("添加按钮点击，当前LLM服务绑定状态:", hasLLMService);

    // 如果明确知道账本未绑定LLM服务，直接跳转到手动记账页面
    if (hasLLMService === false) {
      console.log("账本未绑定LLM服务，跳转到手动记账页面");
      router.push("/transactions/new");
      return;
    }

    // 如果账本已绑定LLM服务或状态未知，打开智能记账对话框
    console.log("账本已绑定LLM服务或状态未知，打开智能记账对话框");
    setIsSmartAccountingOpen(true);
  };

  return (
    <>
      <nav className="bottom-nav">
        <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
          <i className="fas fa-home"></i>
          <span>首页</span>
        </Link>
        <Link href="/statistics" className={`nav-item ${isActive('/statistics') ? 'active' : ''}`}>
          <i className="fas fa-chart-pie"></i>
          <span>统计</span>
        </Link>
        <a href="#" onClick={handleAddButtonClick} className="nav-item add-button" style={{ zIndex: 101 }}>
          <div className="add-icon">
            <i className="fas fa-plus"></i>
          </div>
        </a>
        <Link href="/budgets/statistics" className={`nav-item ${isActive('/budgets') || (pathname && pathname.startsWith('/budgets/')) ? 'active' : ''}`}>
          <i className="fas fa-wallet"></i>
          <span>预算</span>
        </Link>
        <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
          <i className="fas fa-user"></i>
          <span>我的</span>
        </Link>
      </nav>

      {/* 智能记账对话框 */}
      <SmartAccountingDialog
        isOpen={isSmartAccountingOpen}
        onClose={() => setIsSmartAccountingOpen(false)}
        accountBookId={currentAccountBook?.id}
      />
    </>
  );
}
