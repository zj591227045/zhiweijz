'use client';

import { useEffect, useState } from 'react';
import { 
  CalendarIcon, 
  FireIcon, 
  TrophyIcon,
  CheckCircleIcon,
  GiftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import { useAccountingPointsStore } from '../../store/accounting-points-store';
import useMembershipStore from '../../store/membership-store';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'react-hot-toast';

interface CheckinRecord {
  date: string;
  points: number;
  isCheckedIn: boolean;
}

export default function CheckinPage() {
  const { config } = useSystemConfig();
  
  const {
    balance,
    checkinStatus,
    loading,
    error,
    fetchBalance,
    fetchCheckinStatus,
    checkin
  } = useAccountingPointsStore();

  const {
    membership,
    systemEnabled: membershipEnabled,
    pointsEnabled,
    fetchMembershipInfo
  } = useMembershipStore();

  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [checkinHistory, setCheckinHistory] = useState<CheckinRecord[]>([]);

  useEffect(() => {
    // 只有在记账点系统启用时才获取相关数据
    if (config.accountingPointsEnabled) {
      fetchBalance();
      fetchCheckinStatus();
    }
    if (config.membershipEnabled) {
      fetchMembershipInfo();
    }
    generateCheckinCalendar();
  }, [config]);

  // 生成签到日历（最近30天）
  const generateCheckinCalendar = () => {
    const today = new Date();
    const history: CheckinRecord[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 模拟签到数据（实际应用中从API获取）
      const isCheckedIn = i === 0 ? checkinStatus?.hasCheckedIn || false : Math.random() > 0.3;
      
      history.push({
        date: date.toISOString().split('T')[0],
        points: isCheckedIn ? 5 : 0,
        isCheckedIn
      });
    }
    
    setCheckinHistory(history);
  };

  const handleCheckin = async () => {
    if (checkinStatus?.hasCheckedIn || isCheckinLoading) {
      return;
    }

    setIsCheckinLoading(true);
    try {
      const result = await checkin();
      toast.success(`${result.message} 获得 ${result.pointsAwarded} 记账点！`);
      
      // 如果是会员，额外奖励
      if (membership?.memberType === 'DONOR' && config.accountingPointsEnabled) {
        toast.success('会员签到额外奖励！', {
          icon: '👑',
          duration: 3000
        });
      }
      
      // 更新本地日历状态
      setCheckinHistory(prev => 
        prev.map((record, index) => 
          index === prev.length - 1 
            ? { ...record, isCheckedIn: true, points: result.pointsAwarded }
            : record
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '签到失败');
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const hasCheckedIn = checkinStatus?.hasCheckedIn;
  const isDisabled = hasCheckedIn || isCheckinLoading || loading;
  const consecutiveDays = checkinHistory.filter((record, index) => {
    if (!record.isCheckedIn) return false;
    // 计算连续签到天数的逻辑
    return true;
  }).length;

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
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const checkinRecord = checkinHistory.find(record => record.date === dateString);
      
      calendar.push({
        day,
        date: dateString,
        isToday: dateString === new Date().toISOString().split('T')[0],
        isCheckedIn: checkinRecord?.isCheckedIn || false,
        points: checkinRecord?.points || 0
      });
    }

    return calendar;
  };

  const calendar = getCurrentMonthCalendar();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 如果记账点系统未启用，显示提示页面
  if (!config.accountingPointsEnabled) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">每日签到</h1>
          <p className="text-sm text-gray-600 mt-1">坚持签到，获得更多记账点奖励</p>
        </div>

        {/* 签到状态卡片 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* 积分余额显示 */}
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
            
            {membership?.memberType === 'DONOR' && config.membershipEnabled && (
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-2">
                  <TrophyIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900">VIP</div>
                <div className="text-xs text-gray-600">会员奖励</div>
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
                <span>
                  每日签到 +5
                  {membership?.memberType === 'DONOR' && config.membershipEnabled && ' (会员额外奖励)'}
                </span>
              </div>
            )}
          </button>

          {/* 会员特权提示 */}
          {membership?.memberType === 'DONOR' && config.membershipEnabled && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <SparklesIcon className="h-4 w-4" />
                <span className="text-sm font-medium">会员特权</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                捐赠会员签到可获得额外奖励，感谢您的支持！
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

        {/* 签到规则说明 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">签到规则</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>每日签到可获得 5 个记账点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>每日仅可签到一次，过期不补</span>
            </div>
            {membership?.memberType === 'DONOR' && config.membershipEnabled && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                <span>捐赠会员享受签到额外奖励</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>记账点可用于AI功能和其他服务</span>
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
  );
}