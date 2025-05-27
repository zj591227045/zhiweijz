"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { useAuthStore } from "@/store/auth-store";
import { useAIServicesStore } from "@/store/ai-services-store";
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
  const { services, isLoading, error, fetchServices, deleteService } = useAIServicesStore();

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



  // 删除AI服务
  const handleDelete = async (id: string) => {
    if (confirm("确定要删除此AI服务吗？")) {
      await deleteService(id);
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
