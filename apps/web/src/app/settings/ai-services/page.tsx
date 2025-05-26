"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { useAuthStore } from "@/store/auth-store";
import { aiService, LLMSetting } from "@/lib/api/ai-service";
import styles from "./ai-services.module.css";

interface AIService {
  id: string;
  name: string;
  provider: string;
  model: string;
  description?: string;
  createdAt: string;
}

export default function AIServicesPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuthStore();
  const [services, setServices] = useState<LLMSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 快速登录功能
  const quickLogin = async () => {
    await login({
      email: "zhangjie@jacksonz.cn",
      password: "Zj233401!"
    });
    // 登录后立即获取服务列表
    setTimeout(fetchServices, 500);
  };

  // 监听认证状态变化
  useEffect(() => {
    console.log("认证状态变化:", isAuthenticated);
  }, [isAuthenticated]);

  // 加载AI服务列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchServices();
    }
  }, [isAuthenticated]);

  // 获取AI服务列表
  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("开始获取AI服务列表...");
      console.log("认证状态:", isAuthenticated);
      console.log("认证令牌:", localStorage.getItem("auth-token"));

      // 检查认证状态
      if (!isAuthenticated) {
        console.warn("用户未登录，无法获取AI服务列表");
        setError("请先登录后再查看AI服务列表");
        setIsLoading(false);
        return;
      }

      // 检查认证令牌
      const token = localStorage.getItem("auth-token");
      if (!token) {
        console.warn("未找到认证令牌，请重新登录");
        setError("认证令牌无效，请重新登录");
        setIsLoading(false);
        return;
      }

      // 获取服务列表
      console.log("正在调用API获取服务列表...");
      const data = await aiService.getLLMSettingsList();
      console.log("获取到的AI服务列表:", data);

      // 确保返回的数据是数组
      if (Array.isArray(data)) {
        console.log(`成功获取到 ${data.length} 个AI服务`);
        setServices(data);
      } else {
        console.warn("API返回的数据不是数组:", data);
        setServices([]);
        setError("API返回的数据格式不正确");
        toast.error("数据格式错误");
      }
    } catch (error) {
      console.error("获取AI服务列表失败:", error);
      toast.error("获取AI服务列表失败，请检查网络连接");
      setServices([]);

      // 详细记录错误信息
      if (error instanceof Error) {
        console.error("错误名称:", error.name);
        console.error("错误消息:", error.message);
        console.error("错误堆栈:", error.stack);
        setError(`获取失败: ${error.message}`);
      } else {
        console.error("未知错误类型:", typeof error);
        console.error("错误内容:", error);
        setError("未知错误，请查看控制台日志");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 删除AI服务
  const handleDelete = async (id: string) => {
    if (confirm("确定要删除此AI服务吗？")) {
      try {
        await aiService.deleteLLMSettings(id);
        toast.success("AI服务已删除");
        fetchServices();
      } catch (error) {
        console.error("删除AI服务失败:", error);
        toast.error("删除AI服务失败");
      }
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <div className={styles.actionButtons}>
      <button
        className={`${styles.iconButton} ${styles.refreshButton}`}
        onClick={() => fetchServices()}
        title="刷新列表"
      >
        <i className="fas fa-sync-alt"></i>
      </button>
      <Link href="/settings/ai-services/add" className={styles.iconButton} title="添加新服务">
        <i className="fas fa-plus"></i>
      </Link>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h2>需要登录</h2>
          <p>请登录后查看AI服务设置</p>
          <button onClick={quickLogin} className={styles.loginButton}>
            快速登录 (测试账号)
          </button>
          <div className={styles.loginInfo}>
            <p>使用测试账号：</p>
            <p>邮箱：zhangjie@jacksonz.cn</p>
            <p>密码：Zj233401!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      title="AI服务管理"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>加载中...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h3>加载失败</h3>
          <p>{error}</p>
          <button onClick={fetchServices} className={styles.retryButton}>
            重试
          </button>
        </div>
      ) : services.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <i className="fas fa-robot"></i>
          </div>
          <h3>暂无AI服务</h3>
          <p>点击右上角添加按钮创建新的AI服务</p>
          <Link href="/settings/ai-services/add" className={styles.addServiceButton}>
            添加AI服务
          </Link>
        </div>
      ) : (
        <div className={styles.aiServicesList}>
          {services.map((service) => (
            <div key={service.id} className={styles.aiServiceItem}>
              <div className={styles.serviceInfo}>
                <div className={styles.serviceName}>{service.name}</div>
                <div className={styles.serviceDetails}>
                  <span className={styles.serviceProvider}>
                    {service.provider === "openai" ? "OpenAI" :
                     service.provider === "siliconflow" ? "硅基流动" :
                     service.provider === "deepseek" ? "Deepseek" :
                     service.provider}
                  </span>
                  <span className={styles.serviceModel}>{service.model}</span>
                </div>
                {service.description && (
                  <div className={styles.serviceDescription}>{service.description}</div>
                )}
              </div>
              <div className={styles.serviceActions}>
                <Link href={`/settings/ai-services/edit/${service.id}`} className={styles.editButton}>
                  <i className="fas fa-edit"></i>
                </Link>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(service.id)}
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
