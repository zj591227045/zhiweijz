'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';

import { useAIServicesStore } from '@/store/ai-services-store';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
  import AiServiceEditModal from '@/components/ai-service-edit-modal';
  import { CurrentAIService } from '@/components/ai-services/current-ai-service';
  import { AIServiceWizard } from '@/components/ai-services/ai-service-wizard';
import styles from './ai-services.module.css';

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
  const { services, isLoading, error, fetchServices, deleteService } = useAIServicesStore();

  // 获取认证状态和账本状态
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();

  // 模态框状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string>('');

  // 向导状态
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // 从全局AI store获取当前配置
  const { 
    globalConfig, 
    activeServiceError, 
    isLoadingConfig, 
    updateGlobalConfig,
    fetchGlobalConfig
  } = useGlobalAIStore();

  // 加载AI服务列表和当前账本激活服务
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 页面加载，开始获取AI服务列表');
      fetchServices();
      fetchGlobalConfig();
    }
  }, [isAuthenticated, fetchServices, fetchGlobalConfig]);

  // 处理全局AI服务总开关
  const handleGlobalAIToggle = async (enabled: boolean) => {
    try {
      await updateGlobalConfig({ enabled });
      toast.success(enabled ? 'AI服务已启用' : 'AI服务已禁用');
    } catch (error) {
      console.error('切换全局AI服务状态失败:', error);
    }
  };

  // 删除AI服务
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此AI服务吗？')) {
      await deleteService(id);
    }
  };

  // 打开编辑模态框
  const handleEdit = (serviceId: string) => {
    setEditingServiceId(serviceId);
    setIsEditModalOpen(true);
  };

  // 打开新建模态框
  const handleAdd = () => {
    setEditingServiceId('new');
    setIsEditModalOpen(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingServiceId('');
  };

  // 保存成功回调
  const handleSaveSuccess = () => {
    console.log('🔄 AI服务保存成功，开始刷新列表');
    fetchServices(); // 刷新列表
  };

  // 打开向导
  const handleOpenWizard = () => {
    setIsWizardOpen(true);
  };

  // 关闭向导
  const handleCloseWizard = () => {
    setIsWizardOpen(false);
  };

  // 向导完成回调
  const handleWizardComplete = () => {
    console.log('🔄 AI服务配置完成，刷新页面');
    // 可以在这里刷新相关数据
    fetchServices();
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
      <button
        className={styles.iconButton}
        onClick={handleAdd}
        title="添加新服务"
      >
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );

  // 如果用户未认证，显示提示信息
  if (!isAuthenticated) {
    return (
      <PageContainer
        title="AI服务管理"
        showBackButton={true}
        activeNavItem="profile"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <i className="fas fa-lock" style={{
            fontSize: '48px',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}></i>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            需要登录
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '24px'
          }}>
            请先登录以访问AI服务管理功能
          </p>
          <Link href="/auth/login" style={{
            padding: '12px 24px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            前往登录
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="AI服务管理"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {/* 权限错误提示 */}
      {activeServiceError?.includes('权限') && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderLeft: '4px solid rgba(255, 152, 0, 0.6)',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px',
          color: 'var(--text-primary)'
        }}>
          <strong>权限提示: </strong>
          {activeServiceError}，部分功能可能受限。
        </div>
      )}

      {/* 全局AI服务总开关 */}
      <div style={{
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '16px',
        padding: '20px 24px',
        border: '1px solid var(--border-color, #e5e7eb)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary, rgb(31, 41, 55))',
              margin: '0 0 4px 0'
            }}>
              AI服务开关
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary, rgb(107, 114, 128))',
              margin: 0
            }}>
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {isLoadingConfig ? (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '50%',
                borderTopColor: 'var(--primary-color, rgb(59, 130, 246))',
                animation: 'spin 1s linear infinite'
              }}></div>
            ) : (
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '52px',
                height: '30px'
              }}>
                <input
                  type="checkbox"
                  checked={globalConfig?.enabled || false}
                  onChange={(e) => handleGlobalAIToggle(e.target.checked)}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: globalConfig?.enabled ? 'var(--primary-color, rgb(59, 130, 246))' : '#ccc',
                  transition: '0.3s',
                  borderRadius: '30px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '22px',
                    width: '22px',
                    left: globalConfig?.enabled ? '26px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}></span>
                </span>
              </label>
            )}
            
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: globalConfig?.enabled ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
              minWidth: '40px',
              textAlign: 'center'
            }}>
              {globalConfig?.enabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
      </div>

      {/* 当前AI服务状态 */}
      <CurrentAIService onOpenWizard={handleOpenWizard} />

      {/* 自定义服务管理 */}
      <div style={{
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid var(--border-color, #e5e7eb)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                margin: '0 0 4px 0'
              }}>
                自定义AI服务
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: 0
              }}>
                管理您的自定义AI服务配置
              </p>
            </div>
            <button
              onClick={handleAdd}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-plus"></i>
              添加服务
            </button>
          </div>
        </div>

        {/* 服务列表 */}
        <div style={{ padding: '16px 24px 24px 24px' }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '50%',
                borderTopColor: 'var(--primary-color)',
                animation: 'spin 1s linear infinite',
                marginRight: '12px'
              }}></div>
              <span style={{
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}>
                加载中...
              </span>
            </div>
          ) : error ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              <i className="fas fa-exclamation-triangle" style={{
                fontSize: '32px',
                color: 'rgb(239, 68, 68)',
                marginBottom: '12px'
              }}></i>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'rgb(239, 68, 68)',
                margin: '0 0 8px 0'
              }}>
                加载失败
              </p>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '0 0 20px 0'
              }}>
                {error}
              </p>
              <button
                onClick={() => fetchServices()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                重试
              </button>
            </div>
          ) : services.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              <i className="fas fa-robot" style={{
                fontSize: '32px',
                color: 'var(--text-secondary)',
                marginBottom: '12px'
              }}></i>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                margin: '0 0 8px 0'
              }}>
                暂无自定义服务
              </p>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '0 0 20px 0'
              }}>
                您可以添加自己的AI服务配置，如OpenAI、Claude等
              </p>
              <button
                onClick={handleAdd}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <i className="fas fa-plus"></i>
                添加第一个服务
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {services.map((service) => (
                <div
                  key={service.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--card-background, white)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          margin: 0
                        }}>
                          {service.name}
                        </h4>
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        margin: '0 0 8px 0'
                      }}>
                        {service.provider} · {service.model}
                      </p>
                      {service.description && (
                        <p style={{
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          margin: 0
                        }}>
                          {service.description}
                        </p>
                      )}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => handleEdit(service.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="编辑"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: 'rgb(239, 68, 68)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="删除"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑模态框 */}
      <AiServiceEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        serviceId={editingServiceId}
        onSave={handleSaveSuccess}
      />

      {/* AI服务设置向导 */}
      <AIServiceWizard
        isOpen={isWizardOpen}
        onClose={handleCloseWizard}
        onComplete={handleWizardComplete}
      />
    </PageContainer>
  );
}
