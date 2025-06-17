'use client';

import { ContentModal } from './content-modal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <ContentModal isOpen={isOpen} onClose={onClose} title="隐私政策">
      <div className="privacy-policy-content">
        <div className="policy-section">
          <h3>1. 信息收集</h3>
          <p>我们收集您在使用只为记账应用时提供的信息，包括但不限于：</p>
          <ul>
            <li>账户信息：用户名、邮箱地址、密码等注册信息</li>
            <li>财务数据：您输入的收支记录、预算设置、分类信息等</li>
            <li>设备信息：设备型号、操作系统版本、应用版本等技术信息</li>
            <li>使用数据：应用使用频率、功能使用情况等匿名统计信息</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>2. 信息使用</h3>
          <p>我们使用收集的信息用于：</p>
          <ul>
            <li>提供记账服务和功能</li>
            <li>改进应用性能和用户体验</li>
            <li>提供客户支持和技术服务</li>
            <li>发送重要的服务通知和更新</li>
            <li>进行安全监控和欺诈防护</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>3. 信息保护</h3>
          <p>我们采取以下措施保护您的个人信息：</p>
          <ul>
            <li>使用行业标准的加密技术保护数据传输</li>
            <li>实施严格的访问控制和权限管理</li>
            <li>定期进行安全审计和漏洞检测</li>
            <li>建立完善的数据备份和恢复机制</li>
            <li>对员工进行隐私保护培训</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>4. 信息共享</h3>
          <p>我们不会向第三方出售、交易或转让您的个人信息，除非：</p>
          <ul>
            <li>获得您的明确同意</li>
            <li>法律法规要求或政府部门要求</li>
            <li>为保护我们的权利、财产或安全</li>
            <li>与可信的服务提供商合作（如云存储服务）</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>5. 数据存储</h3>
          <p>您的数据存储相关信息：</p>
          <ul>
            <li>数据主要存储在中国境内的安全服务器上</li>
            <li>我们会保留您的数据直到您删除账户</li>
            <li>删除账户后，我们会在30天内完全删除您的个人数据</li>
            <li>某些匿名统计数据可能会被保留用于改进服务</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>6. 您的权利</h3>
          <p>您对个人信息享有以下权利：</p>
          <ul>
            <li>访问和查看您的个人信息</li>
            <li>更正不准确或不完整的信息</li>
            <li>删除您的个人信息和账户</li>
            <li>限制或反对某些数据处理活动</li>
            <li>数据可携带权（导出您的数据）</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>7. Cookie和追踪技术</h3>
          <p>我们使用Cookie和类似技术来：</p>
          <ul>
            <li>记住您的登录状态和偏好设置</li>
            <li>分析应用使用情况和性能</li>
            <li>提供个性化的用户体验</li>
            <li>确保应用安全性</li>
          </ul>
        </div>

        <div className="policy-section">
          <h3>8. 未成年人保护</h3>
          <p>我们不会故意收集13岁以下儿童的个人信息。如果我们发现收集了此类信息，将立即删除。</p>
        </div>

        <div className="policy-section">
          <h3>9. 政策更新</h3>
          <p>我们可能会不时更新本隐私政策。重大变更时，我们会通过应用内通知或邮件方式告知您。</p>
        </div>

        <div className="policy-section">
          <h3>10. 联系我们</h3>
          <p>如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
          <ul>
            <li>邮箱：privacy@zhiweijz.cn</li>
            <li>官网：https://www.zhiweijz.cn</li>
          </ul>
        </div>

        <div className="policy-footer">
          <p><strong>生效日期：</strong>2024年12月1日</p>
          <p><strong>最后更新：</strong>2024年12月1日</p>
        </div>
      </div>
    </ContentModal>
  );
}
