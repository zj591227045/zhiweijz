"use client";

import { useSecurityStore } from "@/store/security-store";
import { SecurityLogType } from "@/lib/api/security-service";
import { formatDate } from "@/lib/utils";

export function SecurityLogs() {
  const { logs } = useSecurityStore();

  // 获取日志图标
  const getLogIcon = (type: SecurityLogType) => {
    switch (type) {
      case SecurityLogType.LOGIN:
        return 'sign-in-alt';
      case SecurityLogType.LOGOUT:
        return 'sign-out-alt';
      case SecurityLogType.PASSWORD_CHANGE:
        return 'lock';
      case SecurityLogType.EMAIL_CHANGE:
        return 'envelope';
      case SecurityLogType.DEVICE_LOGOUT:
        return 'mobile-alt';
      case SecurityLogType.SECURITY_SETTING_CHANGE:
        return 'shield-alt';
      default:
        return 'history';
    }
  };

  // 格式化日志时间
  const formatLogTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } else {
        return formatDate(dateString);
      }
    } catch (error) {
      return '未知时间';
    }
  };

  return (
    <div className="security-logs">
      {logs.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          暂无安全日志
        </div>
      ) : (
        logs.map((log) => (
          <div className="log-item" key={log.id}>
            <div className="log-icon">
              <i className={`fas fa-${getLogIcon(log.type)}`}></i>
            </div>
            <div className="log-details">
              <div className="log-action">{log.description}</div>
              <div className="log-info">
                <span className="log-time">{formatLogTime(log.createdAt)}</span>
                <span className="log-device">{log.deviceInfo} · {log.location}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
