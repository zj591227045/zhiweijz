import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import membershipApi, { MembershipInfo, Badge, MembershipNotification } from '../api/membership-service';

interface MembershipState {
  // 状态
  membership: MembershipInfo | null;
  badges: Badge[];
  notifications: MembershipNotification[];
  loading: boolean;
  error: string | null;
  systemEnabled: boolean;
  pointsEnabled: boolean;

  // 操作
  fetchMembershipInfo: () => Promise<void>;
  resetMemberPoints: () => Promise<void>;
  selectBadge: (badgeId: string) => Promise<void>;
  fetchBadges: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  useMemberPoints: (points: number, description: string) => Promise<boolean>;
  upgradeMembership: (memberType: string, duration?: number) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useMembershipStore = create<MembershipState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      membership: null,
      badges: [],
      notifications: [],
      loading: false,
      error: null,
      systemEnabled: false,
      pointsEnabled: false,

      // 获取会员信息
      fetchMembershipInfo: async () => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.getMembershipInfo();
          
          if (response.success) {
            set({ 
              membership: response.data,
              systemEnabled: response.systemEnabled,
              pointsEnabled: response.pointsEnabled,
              loading: false 
            });
          } else {
            set({ 
              error: response.message || '获取会员信息失败',
              loading: false 
            });
          }
        } catch (error) {
          console.error('获取会员信息失败:', error);
          set({ 
            error: '获取会员信息失败',
            loading: false 
          });
        }
      },

      // 重置会员积分
      resetMemberPoints: async () => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.resetMemberPoints();
          
          if (response.success) {
            set({ 
              membership: response.data,
              loading: false 
            });
          } else {
            set({ 
              error: response.message || '重置积分失败',
              loading: false 
            });
          }
        } catch (error) {
          console.error('重置积分失败:', error);
          set({ 
            error: '重置积分失败',
            loading: false 
          });
        }
      },

      // 选择徽章
      selectBadge: async (badgeId: string) => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.selectBadge(badgeId);
          
          if (response.success) {
            // 更新本地状态
            const { membership } = get();
            if (membership) {
              const updatedBadges = membership.badges.map(badge => ({
                ...badge,
                isDisplayed: badge.badgeId === badgeId
              }));
              
              set({
                membership: {
                  ...membership,
                  selectedBadge: badgeId,
                  badges: updatedBadges
                },
                loading: false
              });
            }
          } else {
            set({ 
              error: response.message || '设置徽章失败',
              loading: false 
            });
          }
        } catch (error) {
          console.error('设置徽章失败:', error);
          set({ 
            error: '设置徽章失败',
            loading: false 
          });
        }
      },

      // 获取所有徽章
      fetchBadges: async () => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.getAllBadges();
          
          if (response.success) {
            set({ 
              badges: response.data,
              loading: false 
            });
          } else {
            set({ 
              error: response.message || '获取徽章列表失败',
              loading: false 
            });
          }
        } catch (error) {
          console.error('获取徽章列表失败:', error);
          set({ 
            error: '获取徽章列表失败',
            loading: false 
          });
        }
      },

      // 获取通知
      fetchNotifications: async () => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.getNotifications();
          
          if (response.success) {
            set({ 
              notifications: response.data,
              loading: false 
            });
          } else {
            set({ 
              error: response.message || '获取通知失败',
              loading: false 
            });
          }
        } catch (error) {
          console.error('获取通知失败:', error);
          set({ 
            error: '获取通知失败',
            loading: false 
          });
        }
      },

      // 标记通知为已读
      markNotificationAsRead: async (notificationId: string) => {
        try {
          const response = await membershipApi.markNotificationAsRead(notificationId);
          
          if (response.success) {
            // 更新本地状态
            const { notifications } = get();
            const updatedNotifications = notifications.map(notification =>
              notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification
            );
            
            set({ notifications: updatedNotifications });
          }
        } catch (error) {
          console.error('标记通知失败:', error);
        }
      },

      // 使用会员积分
      useMemberPoints: async (points: number, description: string) => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.useMemberPoints(points, description);
          
          if (response.success) {
            // 重新获取会员信息以更新积分
            await get().fetchMembershipInfo();
            set({ loading: false });
            return true;
          } else {
            set({ 
              error: response.message || '使用积分失败',
              loading: false 
            });
            return false;
          }
        } catch (error) {
          console.error('使用积分失败:', error);
          set({ 
            error: '使用积分失败',
            loading: false 
          });
          return false;
        }
      },

      // 升级会员
      upgradeMembership: async (memberType: string, duration = 12) => {
        try {
          set({ loading: true, error: null });
          const response = await membershipApi.upgradeMembership(memberType, duration);
          
          if (response.success) {
            set({ 
              membership: response.data,
              loading: false 
            });
          } else {
            set({ 
              error: response.message || '升级会员失败',
              loading: false 
            });
          }
        } catch (error) {
          console.error('升级会员失败:', error);
          set({ 
            error: '升级会员失败',
            loading: false 
          });
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ loading });
      }
    }),
    {
      name: 'membership-store',
    }
  )
);

export default useMembershipStore;