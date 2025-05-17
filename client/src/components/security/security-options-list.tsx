"use client";

import { useSecurityStore } from "@/store/security-store";
import { SecurityGroup } from "./security-group";
import { SecurityItem } from "./security-item";
import { DevicesList } from "./devices-list";
import { SecurityLogs } from "./security-logs";
import { formatDate } from "@/lib/utils";

export function SecurityOptionsList() {
  const {
    security,
    setActiveForm,
    fetchSessions,
    fetchLogs
  } = useSecurityStore();

  // 处理修改密码点击
  const handlePasswordClick = () => {
    setActiveForm('password');
  };

  // 处理修改邮箱点击
  const handleEmailClick = () => {
    setActiveForm('email');
  };

  // 处理设备管理点击
  const handleDevicesClick = async () => {
    await fetchSessions();
    // 打开设备管理模态框
    const modal = document.getElementById('device-modal');
    if (modal) {
      // 设置样式使模态框显示在屏幕中央
      (modal as HTMLDivElement).style.display = 'flex';
      document.body.style.overflow = 'hidden'; // 防止背景滚动
    }
  };

  // 处理安全日志点击
  const handleLogsClick = async () => {
    await fetchLogs();
    // 打开安全日志模态框
    const modal = document.getElementById('logs-modal');
    if (modal) {
      // 设置样式使模态框显示在屏幕中央
      (modal as HTMLDivElement).style.display = 'flex';
      document.body.style.overflow = 'hidden'; // 防止背景滚动
    }
  };

  return (
    <div>
      {/* 账户凭证 */}
      <SecurityGroup title="账户凭证">
        <SecurityItem
          icon="lock"
          title="修改密码"
          description={security?.lastPasswordChange
            ? `上次修改：${formatDate(security.lastPasswordChange)}`
            : "未修改过密码"}
          onClick={handlePasswordClick}
          showArrow
        />
        <SecurityItem
          icon="envelope"
          title="修改邮箱"
          description={security?.email ? `当前邮箱：${security.email}` : "未设置邮箱"}
          onClick={handleEmailClick}
          showArrow
        />
        <SecurityItem
          icon="question-circle"
          title="安全问题"
          description="用于账户恢复"
          status={security?.securityQuestionSet ? "已设置" : "未设置"}
          statusType={security?.securityQuestionSet ? "success" : "warning"}
        />
      </SecurityGroup>

      {/* 登录安全 */}
      <SecurityGroup title="登录安全">
        <SecurityItem
          icon="mobile-alt"
          title="登录设备管理"
          description="查看和管理已登录的设备"
          onClick={handleDevicesClick}
          showArrow
        />
        <SecurityItem
          icon="bell"
          title="登录通知"
          description="新设备登录时通知我"
          status={security?.loginNotification ? "已开启" : "已关闭"}
          statusType={security?.loginNotification ? "success" : "warning"}
        />
        <SecurityItem
          icon="history"
          title="安全日志"
          description="查看账户安全相关操作记录"
          onClick={handleLogsClick}
          showArrow
        />
      </SecurityGroup>

      {/* 账户保护 */}
      <SecurityGroup title="账户保护">
        <SecurityItem
          icon="envelope-open-text"
          title="账户恢复邮箱"
          description="用于找回账户"
          status={security?.recoveryEmailSet ? "已设置" : "未设置"}
          statusType={security?.recoveryEmailSet ? "success" : "warning"}
        />
        <SecurityItem
          icon="shield-alt"
          title="账户冻结保护"
          description="异常登录时自动冻结账户"
          status="已开启"
          statusType="success"
        />
      </SecurityGroup>

      {/* 设备管理模态框 */}
      <div className="modal-overlay" id="device-modal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="modal-title">登录设备管理</div>
            <div
              className="modal-close"
              onClick={() => {
                const modal = document.getElementById('device-modal');
                if (modal) {
                  (modal as HTMLDivElement).style.display = 'none';
                  document.body.style.overflow = ''; // 恢复背景滚动
                }
              }}
            >
              <i className="fas fa-times"></i>
            </div>
          </div>
          <div className="modal-body">
            <DevicesList />
          </div>
          <div className="modal-footer">
            <button
              className="modal-button cancel-button"
              onClick={() => {
                const modal = document.getElementById('device-modal');
                if (modal) {
                  (modal as HTMLDivElement).style.display = 'none';
                  document.body.style.overflow = ''; // 恢复背景滚动
                }
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 安全日志模态框 */}
      <div className="modal-overlay" id="logs-modal">
        <div className="modal-container">
          <div className="modal-header">
            <div className="modal-title">安全日志</div>
            <div
              className="modal-close"
              onClick={() => {
                const modal = document.getElementById('logs-modal');
                if (modal) {
                  (modal as HTMLDivElement).style.display = 'none';
                  document.body.style.overflow = ''; // 恢复背景滚动
                }
              }}
            >
              <i className="fas fa-times"></i>
            </div>
          </div>
          <div className="modal-body">
            <SecurityLogs />
          </div>
          <div className="modal-footer">
            <button
              className="modal-button cancel-button"
              onClick={() => {
                const modal = document.getElementById('logs-modal');
                if (modal) {
                  (modal as HTMLDivElement).style.display = 'none';
                  document.body.style.overflow = ''; // 恢复背景滚动
                }
              }}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
