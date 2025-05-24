"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";

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
  const [services, setServices] = useState<AIService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取AI服务列表
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/ai-services', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setServices(data);
        } else {
          toast.error('获取AI服务列表失败');
        }
      } catch (error) {
        console.error('获取AI服务列表失败:', error);
        toast.error('获取AI服务列表失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, []);

  // 删除AI服务
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除AI服务 "${name}" 吗？`)) {
      try {
        const response = await fetch(`/api/ai-services/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('AI服务已删除');
          setServices(prev => prev.filter(service => service.id !== id));
        } else {
          const error = await response.json();
          toast.error(error.message || '删除AI服务失败');
        }
      } catch (error) {
        console.error('删除AI服务失败:', error);
        toast.error('删除AI服务失败');
      }
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <Link href="/settings/ai-services/add" className="icon-button" title="添加新服务">
      <i className="fas fa-plus"></i>
    </Link>
  );

  return (
    <PageContainer
      title="AI服务管理"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-robot"></i>
          </div>
          <div className="empty-text">暂无AI服务</div>
          <div className="empty-description">
            点击右上角添加按钮创建新的AI服务
          </div>
          <Link href="/settings/ai-services/add" className="submit-button">
            添加AI服务
          </Link>
        </div>
      ) : (
        <div className="ai-services-list space-y-4">
          {services.map((service) => (
            <div key={service.id} className="ai-service-item">
              <div className="service-info">
                <div className="service-name">{service.name}</div>
                <div className="service-details">
                  <span className="service-provider">
                    {service.provider === "openai" ? "OpenAI" :
                     service.provider === "siliconflow" ? "硅基流动" :
                     service.provider}
                  </span>
                  <span className="service-model">{service.model}</span>
                </div>
                {service.description && (
                  <div className="service-description">{service.description}</div>
                )}
              </div>
              <div className="service-actions">
                <Link 
                  href={`/settings/ai-services/edit/${service.id}`} 
                  className="edit-button"
                  title="编辑服务"
                >
                  <i className="fas fa-edit"></i>
                </Link>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(service.id, service.name)}
                  title="删除服务"
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
