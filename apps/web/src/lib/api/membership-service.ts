import { apiClient } from './base';

export interface MembershipInfo {
  id: string;
  userId: string;
  memberType: 'REGULAR' | 'DONOR' | 'LIFETIME';
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  autoRenewal: boolean;
  monthlyPoints: number;
  usedPoints: number;
  lastPointsReset: string | null;
  selectedBadge: string | null;
  createdAt: string;
  updatedAt: string;
  badges: Array<{
    id: string;
    badgeId: string;
    awardedAt: string;
    awardReason: string | null;
    isDisplayed: boolean;
    badge: {
      id: string;
      name: string;
      description: string | null;
      icon: string;
      color: string;
      rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
      category: string;
    };
  }>;
  renewalHistory: Array<{
    id: string;
    renewalType: 'MANUAL' | 'AUTO' | 'ADMIN' | 'UPGRADE';
    startDate: string;
    endDate: string;
    amount: number | null;
    paymentMethod: string | null;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    createdAt: string;
  }>;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  category: string;
  isActive: boolean;
  sortOrder: number;
}

export interface MembershipNotification {
  id: string;
  userId: string;
  notificationType: string;
  title: string;
  content: string;
  isRead: boolean;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface MembershipResponse {
  success: boolean;
  data: MembershipInfo;
  systemEnabled: boolean;
  pointsEnabled: boolean;
  message?: string;
}

export interface BadgesResponse {
  success: boolean;
  data: Badge[];
  message?: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: MembershipNotification[];
  message?: string;
}

export interface BasicResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class MembershipApiService {
  // 获取当前用户会员信息
  async getMembershipInfo(): Promise<MembershipResponse> {
    return apiClient.get('/membership/me');
  }

  // 重置会员积分
  async resetMemberPoints(): Promise<MembershipResponse> {
    return apiClient.post('/membership/reset-points');
  }

  // 设置选择的徽章
  async selectBadge(badgeId: string): Promise<BasicResponse> {
    return apiClient.post('/membership/badge/select', { badgeId });
  }

  // 获取所有可用徽章
  async getAllBadges(): Promise<BadgesResponse> {
    return apiClient.get('/membership/badges');
  }

  // 获取会员通知
  async getNotifications(limit = 20): Promise<NotificationsResponse> {
    return apiClient.get(`/membership/notifications?limit=${limit}`);
  }

  // 标记通知为已读
  async markNotificationAsRead(notificationId: string): Promise<BasicResponse> {
    return apiClient.put(`/membership/notifications/${notificationId}/read`);
  }

  // 使用会员积分
  async useMemberPoints(points: number, description: string): Promise<BasicResponse> {
    return apiClient.post('/membership/points/use', { points, description });
  }

  // 升级会员
  async upgradeMembership(memberType: string, duration = 12, paymentMethod = 'manual'): Promise<MembershipResponse> {
    return apiClient.post('/membership/upgrade', { memberType, duration, paymentMethod });
  }

  // 获取会员类型标签
  getMemberTypeLabel(type: string): string {
    switch (type) {
      case 'REGULAR': return '普通会员';
      case 'DONOR': return '捐赠会员';
      case 'LIFETIME': return '永久会员';
      default: return type;
    }
  }

  // 获取会员类型颜色
  getMemberTypeColor(type: string): string {
    switch (type) {
      case 'REGULAR': return 'bg-gray-100 text-gray-800';
      case 'DONOR': return 'bg-yellow-100 text-yellow-800';
      case 'LIFETIME': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // 获取徽章稀有度标签
  getBadgeRarityLabel(rarity: string): string {
    switch (rarity) {
      case 'COMMON': return '普通';
      case 'UNCOMMON': return '不常见';
      case 'RARE': return '稀有';
      case 'EPIC': return '史诗';
      case 'LEGENDARY': return '传说';
      default: return rarity;
    }
  }

  // 获取徽章稀有度颜色
  getBadgeRarityColor(rarity: string): string {
    switch (rarity) {
      case 'COMMON': return 'bg-gray-100 text-gray-800';
      case 'UNCOMMON': return 'bg-green-100 text-green-800';
      case 'RARE': return 'bg-blue-100 text-blue-800';
      case 'EPIC': return 'bg-purple-100 text-purple-800';
      case 'LEGENDARY': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // 计算会员到期天数
  getDaysUntilExpiry(endDate: string | null): number | null {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // 检查会员是否即将到期
  isExpiringsoon(endDate: string | null, days = 7): boolean {
    const daysLeft = this.getDaysUntilExpiry(endDate);
    return daysLeft !== null && daysLeft <= days && daysLeft > 0;
  }

  // 检查会员是否已过期
  isExpired(endDate: string | null): boolean {
    const daysLeft = this.getDaysUntilExpiry(endDate);
    return daysLeft !== null && daysLeft < 0;
  }
}

export const membershipApi = new MembershipApiService();
export default membershipApi;