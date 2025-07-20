'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';

import { useGlobalAIStore } from '@/store/global-ai-store';
import { useAuthStore } from '@/store/auth-store';
import { useAccountingPointsStore } from '@/store/accounting-points-store';
import { useMembershipStore } from '@/store/membership-store';
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

  // 获取认证状态
  const { isAuthenticated } = useAuthStore();

  // 从全局AI store获取当前配置和用户AI服务状态
  const {
    userAIEnabled, // 用户级别AI服务状态
    isLoadingUserAI, // 用户AI状态加载中
    userAIError, // 用户AI状态错误
    fetchUserAIEnabled, // 获取用户AI服务状态
    toggleUserAIService, // 切换用户AI服务状态
  } = useGlobalAIStore();

  // 获取记账点相关状态
  const {
    balance,
    transactions,
    loading: pointsLoading,
    error: pointsError,
    fetchBalance,
    fetchTransactions,
  } = useAccountingPointsStore();

  // 获取会员相关状态
  const {
    membership,
    loading: membershipLoading,
    error: membershipError,
    fetchMembershipInfo,
  } = useMembershipStore();

  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // 加载AI服务状态和记账点信息
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 页面加载，开始获取用户AI服务状态和记账点信息');
      fetchUserAIEnabled(); // 获取用户级别AI服务状态
      fetchBalance(); // 获取记账点余额
      fetchMembershipInfo(); // 获取会员信息
    }
  }, [isAuthenticated, fetchUserAIEnabled, fetchBalance, fetchMembershipInfo]);

  // 处理全局AI服务总开关
  const handleGlobalAIToggle = async (enabled: boolean) => {
    try {
      // 使用 store 中的切换方法，它已经包含了错误处理和状态更新
      await toggleUserAIService(enabled);
    } catch (error) {
      // 错误处理已经在 store 中完成，这里可以不做额外处理
      console.error('切换用户AI服务状态失败:', error);
    }
  };

  // 查看记账点使用记录
  const handleViewTransactionHistory = async () => {
    if (!showTransactionHistory) {
      await fetchTransactions(50); // 获取最近50条记录
    }
    setShowTransactionHistory(!showTransactionHistory);
  };

  // 刷新记账点余额
  const handleRefreshBalance = async () => {
    await fetchBalance();
    await fetchMembershipInfo();
  };

  // 右侧操作按钮
  const rightActions = (
    <div className={styles.actionButtons}>
      <button
        className={`${styles.iconButton} ${styles.refreshButton}`}
        onClick={handleRefreshBalance}
        title="刷新记账点余额"
      >
        <i className="fas fa-sync-alt"></i>
      </button>
    </div>
  );

  // 如果用户未认证，显示提示信息
  if (!isAuthenticated) {
    return (
      <PageContainer title="AI服务管理" showBackButton={true} activeNavItem="profile">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <i
            className="fas fa-lock"
            style={{
              fontSize: '48px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}
          ></i>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}
          >
            需要登录
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '24px',
            }}
          >
            请先登录以访问AI服务管理功能
          </p>
          <Link
            href="/auth/login"
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
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
      {/* AI服务开关 */}
      <div
        style={{
          backgroundColor: 'var(--card-background, white)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px',
          padding: '20px 24px',
          border: '1px solid var(--border-color, #e5e7eb)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                margin: '0 0 4px 0',
              }}
            >
              AI服务开关
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: 0,
              }}
            >
              开启后可以使用智能记账等AI功能
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {isLoadingUserAI ? (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '50%',
                  borderTopColor: 'var(--primary-color, rgb(59, 130, 246))',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
            ) : (
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '52px',
                  height: '30px',
                }}
              >
                <input
                  type="checkbox"
                  checked={userAIEnabled}
                  onChange={(e) => handleGlobalAIToggle(e.target.checked)}
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
                    backgroundColor: userAIEnabled
                      ? 'var(--primary-color, rgb(59, 130, 246))'
                      : '#ccc',
                    transition: '0.3s',
                    borderRadius: '30px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '',
                      height: '22px',
                      width: '22px',
                      left: userAIEnabled ? '26px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  ></span>
                </span>
              </label>
            )}

            <span
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: userAIEnabled ? 'rgb(34, 197, 94)' : 'rgb(107, 114, 128)',
                minWidth: '40px',
                textAlign: 'center',
              }}
            >
              {userAIEnabled ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
      </div>

      {/* AI记账点状态显示 */}
      {userAIEnabled && (
        <div
          style={{
            backgroundColor: 'var(--card-background, white)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            marginBottom: '16px',
            overflow: 'hidden',
            border: '1px solid var(--border-color, #e5e7eb)',
          }}
        >
          <div
            style={{
              padding: '20px 24px 16px 24px',
              borderBottom: '1px solid var(--border-color, #e5e7eb)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--text-primary, rgb(31, 41, 55))',
                    margin: '0 0 4px 0',
                  }}
                >
                  AI记账点余额
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary, rgb(107, 114, 128))',
                    margin: 0,
                  }}
                >
                  使用AI功能会消耗记账点
                </p>
              </div>
              <button
                onClick={handleViewTransactionHistory}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--primary-color, rgb(59, 130, 246))',
                  border: '1px solid var(--primary-color, rgb(59, 130, 246))',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-history"></i>
                {showTransactionHistory ? '隐藏记录' : '查看记录'}
              </button>
            </div>

            {/* 记账点余额卡片 */}
            {pointsLoading || membershipLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '50%',
                    borderTopColor: 'var(--primary-color)',
                    animation: 'spin 1s linear infinite',
                    marginRight: '12px',
                  }}
                ></div>
                <span
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  加载中...
                </span>
              </div>
            ) : pointsError || membershipError ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: 'rgb(239, 68, 68)',
                }}
              >
                <i
                  className="fas fa-exclamation-triangle"
                  style={{
                    fontSize: '24px',
                    marginBottom: '8px',
                  }}
                ></i>
                <p style={{ fontSize: '14px', margin: 0 }}>{pointsError || membershipError}</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* 总记账点 */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <i
                      className="fas fa-coins"
                      style={{
                        fontSize: '16px',
                        color: 'var(--primary-color, rgb(59, 130, 246))',
                      }}
                    ></i>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                      }}
                    >
                      总记账点
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      color: 'var(--primary-color, rgb(59, 130, 246))',
                    }}
                  >
                    {balance?.totalBalance || 0}
                  </div>
                </div>

                {/* 会员记账点 */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <i
                      className="fas fa-crown"
                      style={{
                        fontSize: '16px',
                        color: 'rgb(34, 197, 94)',
                      }}
                    ></i>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                      }}
                    >
                      会员记账点
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      color: 'rgb(34, 197, 94)',
                    }}
                  >
                    {balance?.memberBalance || 0}
                  </div>
                  {membership?.memberType === 'donor' && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      捐赠会员每月可获得记账点
                    </div>
                  )}
                </div>

                {/* 赠送记账点 */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <i
                      className="fas fa-gift"
                      style={{
                        fontSize: '16px',
                        color: 'rgb(168, 85, 247)',
                      }}
                    ></i>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                      }}
                    >
                      赠送记账点
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      color: 'rgb(168, 85, 247)',
                    }}
                  >
                    {balance?.giftBalance || 0}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                    }}
                  >
                    签到和活动获得的记账点
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 记账点使用记录 */}
          {showTransactionHistory && (
            <div style={{ padding: '16px 24px 24px 24px' }}>
              <h4
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  margin: '0 0 16px 0',
                }}
              >
                记账点使用记录
              </h4>

              {pointsLoading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '50%',
                      borderTopColor: 'var(--primary-color)',
                      animation: 'spin 1s linear infinite',
                      marginRight: '8px',
                    }}
                  ></div>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    加载记录中...
                  </span>
                </div>
              ) : transactions.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <i
                    className="fas fa-history"
                    style={{
                      fontSize: '24px',
                      marginBottom: '8px',
                    }}
                  ></i>
                  <p style={{ fontSize: '14px', margin: 0 }}>暂无使用记录</p>
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                >
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom:
                          index < transactions.length - 1
                            ? '1px solid var(--border-color)'
                            : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                            marginBottom: '2px',
                          }}
                        >
                          {transaction.description}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color:
                            transaction.operation === 'deduct'
                              ? 'rgb(239, 68, 68)'
                              : 'rgb(34, 197, 94)',
                        }}
                      >
                        {transaction.operation === 'deduct' ? '-' : '+'}
                        {transaction.points}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 记账点规则说明 */}
      {userAIEnabled && (
        <div
          style={{
            backgroundColor: 'var(--card-background, white)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            marginBottom: '16px',
            padding: '20px 24px',
            border: '1px solid var(--border-color, #e5e7eb)',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            记账点规则说明
          </h3>

          {/* 获取规则 */}
          <div style={{ marginBottom: '20px' }}>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-coins" style={{ color: 'rgb(34, 197, 94)' }}></i>
              记账点获取方式
            </h4>
            <div
              style={{
                display: 'grid',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i
                  className="fas fa-gift"
                  style={{ color: 'rgb(168, 85, 247)', width: '16px' }}
                ></i>
                <span>
                  <strong>每日签到：</strong>每天首次访问可获得 1-5 个赠送记账点
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i
                  className="fas fa-crown"
                  style={{ color: 'rgb(34, 197, 94)', width: '16px' }}
                ></i>
                <span>
                  <strong>捐赠会员：</strong>每月自动获得 1000 个会员记账点
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-star" style={{ color: 'rgb(255, 193, 7)', width: '16px' }}></i>
                <span>
                  <strong>活动奖励：</strong>参与官方活动可获得额外赠送记账点
                </span>
              </div>
            </div>
          </div>

          {/* 消耗规则 */}
          <div>
            <h4
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: '0 0 12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-robot" style={{ color: 'rgb(59, 130, 246)' }}></i>
              AI功能消耗规则
            </h4>
            <div
              style={{
                display: 'grid',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'rgb(59, 130, 246)',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  1
                </div>
                <span>
                  <strong>文字记账：</strong>消耗1个记账点，智能分类和预算匹配
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'rgb(239, 68, 68)',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  2
                </div>
                <span>
                  <strong>语音记账：</strong>消耗2个记账点，语音识别 + 智能分类
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: 'rgb(34, 197, 94)',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  3
                </div>
                <span>
                  <strong>图片记账：</strong>消耗3个记账点，图像识别 + 智能分类
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fas fa-info-circle" style={{ color: 'rgb(59, 130, 246)' }}></i>
                <span>
                  <strong>使用优先级：</strong>会员记账点 → 赠送记账点，优先消耗即将过期的记账点
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI服务不可用提示 */}
      {!userAIEnabled && (
        <div
          style={{
            backgroundColor: 'var(--card-background, white)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            padding: '40px 24px',
            textAlign: 'center',
            border: '1px solid var(--border-color, #e5e7eb)',
          }}
        >
          <i
            className="fas fa-robot"
            style={{
              fontSize: '48px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}
          ></i>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
            }}
          >
            AI服务未启用
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0 0 20px 0',
            }}
          >
            开启AI服务后，您可以使用智能记账、语音记账、图片记账等AI功能
          </p>
          <button
            onClick={() => handleGlobalAIToggle(true)}
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
            立即开启AI服务
          </button>
        </div>
      )}
    </PageContainer>
  );
}
