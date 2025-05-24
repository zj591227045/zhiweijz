"use client";

import "@/styles/security.css";

export default function TestSecurityPage() {
  return (
    <div className="security-page">
      <div className="security-section">
        <div className="section-title">测试样式</div>
        <div className="security-list">
          <div className="security-item">
            <div className="security-icon">
              <i className="fas fa-lock"></i>
            </div>
            <div className="security-details">
              <div className="security-title">测试项目</div>
              <div className="security-description">这是一个测试描述</div>
            </div>
            <div className="security-status">
              <span className="status-badge status-active">已设置</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 