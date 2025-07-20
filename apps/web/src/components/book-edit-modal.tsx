'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { fetchApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { AccountBook } from '@/types';
// AI服务管理已迁移到全局设置，移除相关导入
// import { aiService, LLMSetting } from '@/lib/api/ai-service';

interface BookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  onSave?: (updatedBook: any) => void;
}

// 预定义的iOS系统颜色
const PRESET_COLORS = [
  '#007AFF', // 蓝色
  '#FF3B30', // 红色
  '#FF9500', // 橙色
  '#FFCC00', // 黄色
  '#34C759', // 绿色
  '#5AC8FA', // 青色
  '#AF52DE', // 紫色
  '#FF2D92', // 粉色
];

export default function BookEditModal({ isOpen, onClose, bookId, onSave }: BookEditModalProps) {
  const { isAuthenticated } = useAuthStore();

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'CNY',
    color: PRESET_COLORS[0],
    isDefault: false,
    aiEnabled: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<AccountBook | null>(null);

  // AI服务相关状态已移除，现在由全局AI服务管理
  // const [aiServices, setAiServices] = useState<LLMSetting[]>([]);
  // const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  // const [isLoadingServices, setIsLoadingServices] = useState(false);

  // 获取账本详情
  useEffect(() => {
    const fetchBookDetail = async () => {
      if (!isOpen || !bookId || bookId === 'placeholder') {
        setIsLoading(false);
        return;
      }

      if (!isAuthenticated) {
        setError('未提供认证令牌');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchApi(`/api/account-books/${bookId}`);

        if (response.ok) {
          const data = await response.json();
          setBook(data);
          setFormData({
            name: data.name || '',
            description: data.description || '',
            currency: data.currency || 'CNY',
            color: data.color || PRESET_COLORS[0],
            isDefault: data.isDefault || false,
            aiEnabled: data.aiService?.enabled || false,
          });

          // AI服务管理已迁移到全局设置，无需在账本级别加载
          // await loadAIServices(data.id);
        } else {
          const errorData = await response.json().catch(() => ({ message: '获取账本详情失败' }));
          setError(errorData.message || '获取账本详情失败');
        }
      } catch (error) {
        console.error('获取账本详情失败:', error);
        setError('获取账本详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookDetail();
  }, [isOpen, bookId, isAuthenticated]);

  // 移除AI服务加载逻辑，现在由全局AI服务管理
  // const loadAIServices = async (accountBookId: string) => {
  //   // AI服务管理已迁移到全局设置
  // };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入账本名称');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchApi(`/api/account-books/${bookId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          currency: formData.currency,
          color: formData.color,
          isDefault: formData.isDefault,
          aiService: {
            enabled: formData.aiEnabled,
          },
        }),
      });

      if (response.ok) {
        const updatedBook = await response.json();

        // AI服务管理已迁移到全局设置，移除账本级别的AI服务绑定逻辑
        // AI服务现在由全局AI服务管理界面统一管理

        toast.success('账本更新成功');
        onSave?.(updatedBook);
        onClose();
      } else {
        const error = await response.json().catch(() => ({ message: '更新账本失败' }));
        toast.error(error.message || '更新账本失败');
      }
    } catch (error) {
      console.error('更新账本失败:', error);
      toast.error('更新账本失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理表单字段变化
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 隐藏底层页面的头部和底部导航
  useEffect(() => {
    if (isOpen) {
      const appContainer = document.querySelector('.app-container');
      const pageHeader = appContainer?.querySelector('.header');
      const bottomNav = document.querySelector('.bottom-nav');

      if (pageHeader) {
        (pageHeader as HTMLElement).style.display = 'none';
      }
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'none';
      }

      return () => {
        // 恢复显示
        if (pageHeader) {
          (pageHeader as HTMLElement).style.display = '';
        }
        if (bottomNav) {
          (bottomNav as HTMLElement).style.display = '';
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--background-color)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // 移动端优化
        WebkitOverflowScrolling: 'touch',
        // 确保可以接收触摸事件
        touchAction: 'manipulation',
        // 强制硬件加速
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        // 动画效果
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* 头部高度修复 - 确保跨平台一致性 */
        .app-container .header {
          height: 64px !important;
          min-height: 64px !important;
        }

        /* iOS 特殊样式覆盖 */
        .ios-app .app-container .header,
        .capacitor-ios .app-container .header {
          height: 64px !important;
          min-height: 64px !important;
          padding-top: 0 !important;
        }

        /* 内容区域布局修复 - 确保宽度自适应和底部空间 */
        .main-content {
          padding: 0 !important;
          padding-bottom: 120px !important; /* 确保底部有足够空间 */
          margin: 0 auto;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        /* 确保所有子元素也自适应宽度 */
        .main-content > * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        /* 确保最后一个内容元素有额外的底部边距 */
        .main-content > div:last-child {
          margin-bottom: 40px !important;
        }
      `}</style>
      {/* 使用完全相同的应用容器结构 - 修复宽度自适应 */}
      <div
        className="app-container"
        style={{
          maxWidth: '100vw',
          margin: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          left: 0,
          right: 0,
        }}
      >
        {/* 模态框专用头部 - 修复高度和居中问题 */}
        <div
          className="header"
          style={{
            height: '64px',
            minHeight: '64px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
          }}
        >
          <button className="icon-button" onClick={onClose}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div
            className="header-title"
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              textAlign: 'center',
              flex: 1,
            }}
          >
            编辑账本
          </div>
          <div style={{ width: '32px' }}></div>
        </div>

        {/* 主要内容 - 修复布局偏移问题和宽度自适应 */}
        <div
          className="main-content"
          style={{
            paddingBottom: '120px', // 为固定底部按钮留出足够空间（按钮48px + 内边距36px + 安全区域20px + 额外缓冲16px）
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
            // 移动端优化
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid var(--border-color)',
                  borderTop: '4px solid var(--primary-color)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontWeight: '500',
                }}
              >
                加载中...
              </div>
            </div>
          ) : error ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                gap: '16px',
                textAlign: 'center',
              }}
            >
              <i
                className="fas fa-exclamation-triangle"
                style={{
                  fontSize: '48px',
                  color: '#ef4444',
                }}
              ></i>
              <div style={{ color: 'var(--text-primary)' }}>{error}</div>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                返回
              </button>
            </div>
          ) : (
            <div style={{ padding: '0 20px' }}>
              {/* 基本信息组 */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px',
                    paddingLeft: '4px',
                  }}
                >
                  基本信息
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-background)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {/* 账本名称 */}
                  <div
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      账本名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="请输入账本名称"
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                        padding: '0',
                      }}
                    />
                    {!formData.name.trim() && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#ef4444',
                          marginTop: '4px',
                        }}
                      >
                        账本名称不能为空
                      </div>
                    )}
                  </div>

                  {/* 账本描述 */}
                  <div style={{ padding: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      账本描述
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="请输入账本描述（可选）"
                      disabled={isSubmitting}
                      rows={3}
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                        padding: '0',
                        resize: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 外观设置组 */}
              <div style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px',
                    paddingLeft: '4px',
                  }}
                >
                  外观设置
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-background)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '12px',
                    }}
                  >
                    主题颜色
                  </label>

                  {/* 颜色选择器网格 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '12px',
                      marginBottom: '20px',
                    }}
                  >
                    {PRESET_COLORS.map((color) => (
                      <div
                        key={color}
                        onClick={() => handleChange('color', color)}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '24px',
                          backgroundColor: color,
                          border:
                            formData.color === color
                              ? '3px solid var(--primary-color)'
                              : '2px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: formData.color === color ? 'scale(1.1)' : 'scale(1)',
                          boxShadow:
                            formData.color === color ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* 实时预览卡片 */}
                  <div
                    style={{
                      backgroundColor: 'var(--background-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      预览效果
                    </div>
                    <div
                      style={{
                        backgroundColor: formData.color,
                        borderRadius: '8px',
                        padding: '16px',
                        color: 'white',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          marginBottom: '4px',
                        }}
                      >
                        {formData.name || '账本名称'}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          opacity: 0.9,
                          marginBottom: '8px',
                        }}
                      >
                        {formData.description || '账本描述'}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {formData.isDefault && (
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            默认
                          </span>
                        )}
                        {formData.aiEnabled && (
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 功能设置组 */}
              <div style={{ marginBottom: '80px' }}>
                {' '}
                {/* 增加底部边距，确保不被保存按钮遮挡 */}
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px',
                    paddingLeft: '4px',
                  }}
                >
                  功能设置
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--card-background)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {/* 默认账本开关 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '500',
                          color: 'var(--text-color)',
                          marginBottom: '2px',
                        }}
                      >
                        设为默认账本
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        新记账将默认使用此账本
                      </div>
                    </div>
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '44px',
                        height: '24px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => handleChange('isDefault', e.target.checked)}
                        disabled={isSubmitting}
                        style={{
                          opacity: 0,
                          width: 0,
                          height: 0,
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: formData.isDefault
                            ? 'var(--primary-color)'
                            : 'var(--border-color)',
                          transition: '0.3s',
                          borderRadius: '24px',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: '18px',
                            width: '18px',
                            left: formData.isDefault ? '23px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            transition: '0.3s',
                            borderRadius: '50%',
                          }}
                        ></span>
                      </span>
                    </label>
                  </div>

                  {/* AI服务管理已迁移到全局设置 */}
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--muted, rgb(243, 244, 246))',
                      borderRadius: '8px',
                    }}
                  >
                    <i
                      className="fas fa-info-circle"
                      style={{
                        fontSize: '20px',
                        marginBottom: '8px',
                        display: 'block',
                      }}
                    ></i>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      AI服务管理已迁移到全局设置
                    </div>
                    <div style={{ fontSize: '12px' }}>请前往"设置 &gt; AI服务管理"进行配置</div>
                  </div>

                  {/* AI服务选择器已移除，现在由全局AI服务管理 */}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 固定底部保存按钮 - 修复遮挡问题和移动端适配 */}
      {!isLoading && !error && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            maxWidth: '100vw',
            padding: '16px 20px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))', // iOS安全区域适配
            backgroundColor: 'white',
            borderTop: '1px solid var(--border-color)',
            zIndex: 10001,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', // 添加阴影增强视觉层次
          }}
        >
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              opacity: isSubmitting || !formData.name.trim() ? 0.6 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {isSubmitting ? '保存中...' : '保存'}
          </button>
        </div>
      )}
    </div>
  );
}
