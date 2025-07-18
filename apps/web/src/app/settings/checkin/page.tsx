'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CalendarIcon, 
  FireIcon, 
  TrophyIcon,
  CheckCircleIcon,
  GiftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { useAccountingPointsStore } from '../../../store/accounting-points-store';
import useMembershipStore from '../../../store/membership-store';
import { useAuthStore } from '../../../store/auth-store';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'react-hot-toast';
import { PageContainer } from '../../../components/layout/page-container';

export default function CheckinPage() {
  const router = useRouter();
  const { config } = useSystemConfig();
  
  const {
    balance,
    checkinStatus,
    checkinHistory,
    loading,
    error,
    fetchBalance,
    fetchCheckinStatus,
    fetchCheckinHistory,
    checkin
  } = useAccountingPointsStore();

  const {
    membership,
    systemEnabled: membershipEnabled,
    pointsEnabled,
    fetchMembershipInfo
  } = useMembershipStore();

  const { user } = useAuthStore();

  const [isCheckinLoading, setIsCheckinLoading] = useState(false);

  // 返回到上一页
  const handleBackClick = () => {
    router.back();
  };

  useEffect(() => {
    // 只有在记账点系统启用时才获取相关数据
    if (config.accountingPointsEnabled) {
      fetchBalance();
      fetchCheckinStatus();
      fetchCheckinHistory();
    }
    if (config.membershipEnabled) {
      fetchMembershipInfo();
    }
  }, [config]);


  const handleCheckin = async () => {
    if (checkinStatus?.hasCheckedIn || isCheckinLoading) {
      return;
    }

    setIsCheckinLoading(true);
    try {
      const result = await checkin();
      toast.success(`${result.message} 获得 ${result.pointsAwarded} 记账点！`);
      
      // 不再显示会员额外奖励提示
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '签到失败');
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const hasCheckedIn = checkinStatus?.hasCheckedIn;
  const isDisabled = hasCheckedIn || isCheckinLoading || loading;
  const consecutiveDays = checkinHistory?.consecutiveDays || 0;

  const getCurrentMonthCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const calendar = [];
    
    // 添加空白天数
    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // 添加月份天数
    for (let day = 1; day <= daysInMonth; day++) {
      // 直接构造日期字符串，避免时区转换问题
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const checkinRecord = checkinHistory?.history.find(record => record.date === dateString);

      // 获取今天的日期字符串（北京时间）
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const todayString = beijingTime.toISOString().split('T')[0];

      calendar.push({
        day,
        date: dateString,
        isToday: dateString === todayString,
        isCheckedIn: checkinRecord?.isCheckedIn || false,
        points: checkinRecord?.pointsAwarded || 0
      });
    }

    return calendar;
  };

  const calendar = getCurrentMonthCalendar();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 如果记账点系统未启用，显示提示页面
  if (!config.accountingPointsEnabled) {
    return (
      <PageContainer 
        title="每日签到" 
        showBackButton={true} 
        onBackClick={handleBackClick}
        showBottomNav={false}
      >
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">签到功能未启用</h3>
            <p className="text-sm text-gray-500">
              当前版本未启用记账点系统，签到功能暂不可用
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="每日签到" 
      showBackButton={true} 
      onBackClick={handleBackClick}
      showBottomNav={false}
    >
      <div className="px-4 py-4">
        <div className="space-y-6">
          {/* 页面说明 */}
          <div className="text-center">
            <p className="text-sm text-gray-600">坚持签到，获得更多记账点奖励</p>
          </div>

        {/* 签到状态卡片 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {/* 记账点余额显示 */}
          {balance && (
            <div className="mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {balance.totalBalance}
                </div>
                <div className="text-sm text-gray-600">记账点余额</div>
                <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                  <span>赠送：{balance.giftBalance}</span>
                  {balance.memberBalance > 0 && (
                    <span>会员：{balance.memberBalance}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 连续签到天数 */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-2">
                <FireIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900">{consecutiveDays}</div>
              <div className="text-xs text-gray-600">连续签到</div>
            </div>
            
            {/* 显示捐赠会员标识 */}
            {membership?.memberType === 'DONOR' && config.membershipEnabled && (
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
                  <TrophyIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">VIP</div>
                <div className="text-xs text-gray-600">捐赠会员</div>
              </div>
            )}
            
            {/* 普通会员连续签到奖励提示 */}
            {membership?.memberType !== 'DONOR' && config.membershipEnabled && consecutiveDays >= 25 && (
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                  <TrophyIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">{30 - consecutiveDays}</div>
                <div className="text-xs text-gray-600">天获得会员</div>
              </div>
            )}
          </div>

          {/* 签到按钮 */}
          <button
            className={`
              w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200
              ${hasCheckedIn 
                ? 'bg-green-500 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={handleCheckin}
            disabled={isDisabled}
          >
            {isCheckinLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>签到中...</span>
              </div>
            ) : hasCheckedIn ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircleSolidIcon className="h-5 w-5" />
                <span>今日已签到</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <GiftIcon className="h-5 w-5" />
                <span>每日签到 +5</span>
              </div>
            )}
          </button>

          {/* 捐赠会员特权提示 */}
          {membership?.memberType === 'DONOR' && config.membershipEnabled && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <SparklesIcon className="h-4 w-4" />
                <span className="text-sm font-medium">捐赠会员特权</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                感谢您的支持！捐赠会员享有更多专属服务和优先权益
              </p>
            </div>
          )}

          {/* 连续签到获得会员提示 */}
          {membership?.memberType !== 'DONOR' && config.membershipEnabled && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <SparklesIcon className="h-4 w-4" />
                <span className="text-sm font-medium">连续签到奖励</span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                普通会员连续签到30天可联系客服免费赠送1个月捐赠会员资格
              </p>
            </div>
          )}
        </div>

        {/* 签到日历 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">签到日历</h3>
          </div>
          
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* 日历网格 */}
          <div className="grid grid-cols-7 gap-1">
            {calendar.map((day, index) => (
              <div key={index} className="aspect-square">
                {day ? (
                  <div
                    className={`
                      w-full h-full flex items-center justify-center text-sm rounded-lg relative
                      ${day.isToday 
                        ? 'bg-blue-100 text-blue-900 font-semibold border-2 border-blue-500' 
                        : day.isCheckedIn
                        ? 'bg-green-100 text-green-800'
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span>{day.day}</span>
                    {day.isCheckedIn && (
                      <div className="absolute -top-1 -right-1">
                        <CheckCircleSolidIcon className="h-3 w-3 text-green-500" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            ))}
          </div>
          
          {/* 图例 */}
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span className="text-gray-600">今天</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 rounded relative">
                <CheckCircleSolidIcon className="h-2 w-2 text-green-500 absolute -top-0.5 -right-0.5" />
              </div>
              <span className="text-gray-600">已签到</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded"></div>
              <span className="text-gray-600">未签到</span>
            </div>
          </div>
        </div>

        {/* 用户信息 - 移动到签到日历下方，方便截图给客服 */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">用户信息</h3>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-xs text-gray-500 mt-2">连续签到满30天请截图此页面联系客服申请捐赠会员</p>
            </div>
          </div>
        )}

        {/* 签到规则说明 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">记账点获取规则</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>每日签到可获得 5 个记账点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>每日首次访问自动获得 5 个记账点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>每日仅可签到一次，过期不补</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>赠送记账点上限为 30 点</span>
            </div>
            {membership?.memberType !== 'DONOR' && config.membershipEnabled && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>普通会员连续签到30天可联系客服免费赠送1个月捐赠会员</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>记账点消费：文本AI 1点，语音AI 2点，图像AI 3点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>记账点可用于AI智能记账和其他AI功能，未来支持兑换勋章、主题以及社交论坛使用</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}
        </div>
      </div>
    </PageContainer>
  );
}