"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { useAuthStore } from "@/store/auth-store";
import { aiService, LLMSetting } from "@/lib/api/ai-service";
import "./ai-services.css";
import "./styles.css";

export default function AIServicesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [services, setServices] = useState<LLMSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 加载AI服务列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchServices();
    }
  }, [isAuthenticated]);

  // 获取AI服务列表
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const data = await aiService.getLLMSettingsList();
      setServices(data);
    } catch (error) {
      console.error("获取AI服务列表失败:", error);
      toast.error("获取AI服务列表失败");
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
    <Link href="/settings/ai-services/add" className="icon-button">
      <i className="fas fa-plus"></i>
    </Link>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer
      title="AI服务管理"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-robot"></i>
          </div>
          <h3>暂无AI服务</h3>
          <p>点击右上角添加按钮创建新的AI服务</p>
          <Link href="/settings/ai-services/add" className="add-service-button">
            添加AI服务
          </Link>
        </div>
      ) : (
        <div className="ai-services-list">
          {services.map((service) => (
            <div key={service.id} className="ai-service-item">
              <div className="service-info">
                <div className="service-name">{service.name}</div>
                <div className="service-details">
                  <span className="service-provider">{service.provider}</span>
                  <span className="service-model">{service.model}</span>
                </div>
                {service.description && (
                  <div className="service-description">{service.description}</div>
                )}
              </div>
              <div className="service-actions">
                <Link href={`/settings/ai-services/edit/${service.id}`} className="edit-button">
                  <i className="fas fa-edit"></i>
                </Link>
                <button
                  className="delete-button"
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
