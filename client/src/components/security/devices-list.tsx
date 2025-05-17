"use client";

import { useSecurityStore } from "@/store/security-store";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export function DevicesList() {
  const { 
    sessions, 
    openConfirmDialog,
    logoutSession
  } = useSecurityStore();

  // 处理登出设备
  const handleLogout = (sessionId: string, deviceName: string) => {
    openConfirmDialog(
      '退出设备',
      `确定要退出设备 "${deviceName}" 吗？`,
      () => logoutSession(sessionId)
    );
  };

  // 格式化最后活动时间
  const formatLastActive = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } catch (error) {
      return '未知时间';
    }
  };

  // 获取设备图标
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return 'mobile-alt';
      case 'tablet':
        return 'tablet-alt';
      case 'desktop':
        return 'desktop';
      case 'laptop':
        return 'laptop';
      default:
        return 'question-circle';
    }
  };

  return (
    <div className="device-list">
      {sessions.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          暂无登录设备
        </div>
      ) : (
        sessions.map((session) => (
          <div className="device-item" key={session.id}>
            <div className="device-icon">
              <i className={`fas fa-${getDeviceIcon(session.deviceType)}`}></i>
            </div>
            <div className="device-details">
              <div className="device-name">
                {session.deviceName}
                {session.isCurrent && (
                  <span className="current-device">当前设备</span>
                )}
              </div>
              <div className="device-info">
                {session.os} · {session.browser} · {session.location} · 最后活动：{formatLastActive(session.lastActive)}
              </div>
            </div>
            {!session.isCurrent && (
              <button 
                className="logout-button"
                onClick={() => handleLogout(session.id, session.deviceName)}
              >
                退出
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
