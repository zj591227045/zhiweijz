'use client';

import { ContentModal } from './content-modal';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  return (
    <ContentModal isOpen={isOpen} onClose={onClose} title="服务条款">
      <div className="terms-of-service-content">
        <div className="terms-section">
          <h3>1. 服务说明</h3>
          <p>
            只为记账是一款个人和家庭财务管理应用，提供记账、预算管理、统计分析等功能。通过使用本服务，您同意遵守本服务条款。
          </p>
        </div>

        <div className="terms-section">
          <h3>2. 用户账户</h3>
          <ul>
            <li>您需要创建账户才能使用本服务</li>
            <li>您有责任保护账户安全，包括密码保密</li>
            <li>您对账户下的所有活动承担责任</li>
            <li>发现账户被盗用时应立即通知我们</li>
            <li>每个用户只能注册一个账户</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>3. 使用规则</h3>
          <p>使用本服务时，您同意：</p>
          <ul>
            <li>仅将服务用于合法目的</li>
            <li>不进行任何可能损害服务的行为</li>
            <li>不尝试未经授权访问系统或数据</li>
            <li>不传播恶意软件或进行网络攻击</li>
            <li>不侵犯他人的知识产权</li>
            <li>不发布违法、有害或不当内容</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>4. 数据和隐私</h3>
          <ul>
            <li>您拥有输入到应用中的财务数据</li>
            <li>我们承诺保护您的数据安全和隐私</li>
            <li>详细的隐私保护措施请参见隐私政策</li>
            <li>您可以随时导出或删除您的数据</li>
            <li>我们不会将您的个人财务数据用于商业目的</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>5. 服务可用性</h3>
          <ul>
            <li>我们努力保持服务的持续可用性</li>
            <li>可能因维护、升级等原因暂时中断服务</li>
            <li>我们会提前通知计划内的服务中断</li>
            <li>不保证服务100%无故障运行</li>
            <li>我们会尽力修复服务问题</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>6. 知识产权</h3>
          <ul>
            <li>本应用及其内容受知识产权法保护</li>
            <li>您不得复制、修改、分发应用代码</li>
            <li>应用中的商标、标识归我们所有</li>
            <li>您可以正常使用应用功能，但不得进行逆向工程</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>7. 免责声明</h3>
          <ul>
            <li>本服务按"现状"提供，不提供任何明示或暗示的保证</li>
            <li>我们不对因使用服务而产生的任何损失承担责任</li>
            <li>您应当备份重要的财务数据</li>
            <li>我们不对第三方服务的可用性或准确性负责</li>
            <li>您使用本服务的风险由您自行承担</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>8. 服务变更和终止</h3>
          <ul>
            <li>我们可能会更新、修改或终止服务功能</li>
            <li>重大变更会提前通知用户</li>
            <li>您可以随时停止使用服务并删除账户</li>
            <li>我们可能因违规行为暂停或终止您的账户</li>
            <li>服务终止时，我们会提供数据导出选项</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>9. 费用和付款</h3>
          <ul>
            <li>基础功能免费提供</li>
            <li>高级功能可能需要付费订阅</li>
            <li>费用标准在应用内明确显示</li>
            <li>付费服务支持退款，具体政策另行说明</li>
            <li>价格可能会调整，调整前会通知用户</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>10. 争议解决</h3>
          <ul>
            <li>本条款受中华人民共和国法律管辖</li>
            <li>争议优先通过友好协商解决</li>
            <li>协商不成的，提交有管辖权的人民法院解决</li>
            <li>如条款某部分无效，不影响其他部分的效力</li>
          </ul>
        </div>

        <div className="terms-section">
          <h3>11. 条款更新</h3>
          <p>
            我们可能会不时更新本服务条款。重大变更时，我们会通过应用内通知或邮件方式告知您。继续使用服务即表示您接受更新后的条款。
          </p>
        </div>

        <div className="terms-section">
          <h3>12. 联系我们</h3>
          <p>如果您对本服务条款有任何疑问，请通过以下方式联系我们：</p>
          <ul>
            <li>邮箱：support@zhiweijz.cn</li>
            <li>官网：https://www.zhiweijz.cn</li>
          </ul>
        </div>

        <div className="terms-footer">
          <p>
            <strong>生效日期：</strong>2024年12月1日
          </p>
          <p>
            <strong>最后更新：</strong>2024年12月1日
          </p>
        </div>
      </div>
    </ContentModal>
  );
}
