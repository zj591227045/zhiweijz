"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccountBookStore } from "@/store/account-book-store";
import { SmartAccountingDialog } from "../transactions/smart-accounting-dialog";
import { toast } from "sonner";
import { aiService } from "@/lib/api/ai-service";

interface BottomNavigationProps {
  activeItem?: 'home' | 'statistics' | 'add' | 'budget' | 'profile';
}

export function BottomNavigation({ activeItem }: BottomNavigationProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSmartAccountingOpen, setIsSmartAccountingOpen] = useState(false);
  const { currentAccountBook } = useAccountBookStore();
  const [hasLLMService, setHasLLMService] = useState<boolean | null>(null);

  // 检查当前账本是否绑定了LLM服务
  useEffect(() => {
    const checkLLMServiceBinding = async () => {
      if (currentAccountBook?.id) {
        try {
          console.log("检查账本是否绑定LLM服务，账本ID:", currentAccountBook.id);

          // 1. 首先检查账本对象是否有userLLMSettingId字段
          if (currentAccountBook.userLLMSettingId) {
            console.log("账本直接包含userLLMSettingId:", currentAccountBook.userLLMSettingId);
            setHasLLMService(true);
            return;
          }

          // 2. 使用正确的API路径检查账本LLM设置
          try {
            const llmSettings = await aiService.getAccountLLMSettings(currentAccountBook.id);
            console.log("获取到的账本LLM设置:", llmSettings);

            if (llmSettings) {
              console.log("账本已绑定LLM服务");
              setHasLLMService(true);
            } else {
              console.log("账本未绑定LLM服务");
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

  const isActive = (item: string, path: string) => {
    if (activeItem) {
      return activeItem === item;
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
        <Link href="/dashboard" className={`nav-item ${isActive('home', '/dashboard') ? 'active' : ''}`}>
          <i className="fas fa-home"></i>
          <span>首页</span>
        </Link>
        <Link href="/statistics" className={`nav-item ${isActive('statistics', '/statistics') ? 'active' : ''}`}>
          <i className="fas fa-chart-pie"></i>
          <span>统计</span>
        </Link>
        <a href="#" onClick={handleAddButtonClick} className="nav-item add-button" style={{ zIndex: 101 }}>
          <div className="add-icon">
            <i className="fas fa-plus"></i>
          </div>
        </a>
        <Link href="/budgets/statistics" className={`nav-item ${isActive('budget', '/budgets') || (pathname && pathname.startsWith('/budgets/')) ? 'active' : ''}`}>
          <i className="fas fa-wallet"></i>
          <span>预算</span>
        </Link>
        <Link href="/settings" className={`nav-item ${isActive('profile', '/settings') ? 'active' : ''}`}>
          <i className="fas fa-user"></i>
          <span>我的</span>
        </Link>
      </nav>

      {/* 智能记账对话框 */}
      <SmartAccountingDialog
        isOpen={isSmartAccountingOpen}
        onClose={() => setIsSmartAccountingOpen(false)}
      />
    </>
  );
}
