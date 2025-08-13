'use client';

import { useLayoutStore, LayoutDensity } from '@/store/layout-store';

interface DisplaySettingsPanelProps {
  onClose?: () => void;
}

export function DisplaySettingsPanel({ onClose }: DisplaySettingsPanelProps) {
  const { density, setDensity } = useLayoutStore();

  const densityOptions = [
    {
      value: 'comfortable' as LayoutDensity,
      name: '舒适',
      description: '标准间距，适合大多数用户',
      icon: 'fa-expand-arrows-alt',
    },
    {
      value: 'compact' as LayoutDensity,
      name: '紧凑',
      description: '减少间距，显示更多内容',
      icon: 'fa-compress-arrows-alt',
    },
  ];

  const handleDensityChange = (selectedDensity: LayoutDensity) => {
    setDensity(selectedDensity);
  };

  const isActive = (selectedDensity: LayoutDensity) => {
    return density === selectedDensity;
  };

  return (
    <div className="display-settings-panel">
      <div className="display-settings-header">
        <h4 className="display-settings-title">显示设置</h4>
        <p className="display-settings-description">调整界面显示偏好</p>
      </div>

      <div className="setting-section">
        <h5 className="setting-section-title">布局密度</h5>
        <p className="setting-section-description">
          选择界面元素的间距密度，紧凑模式可以在屏幕上显示更多内容
        </p>
        
        <div className="density-options">
          {densityOptions.map((option) => (
            <div
              key={option.value}
              className={`density-option ${isActive(option.value) ? 'active' : ''}`}
              onClick={() => handleDensityChange(option.value)}
            >
              <div className="density-option-preview">
                <div className="density-icon">
                  <i className={`fas ${option.icon}`}></i>
                </div>
              </div>
              <div className="density-option-info">
                <div className="density-option-name">{option.name}</div>
                <div className="density-option-desc">{option.description}</div>
              </div>
              {isActive(option.value) && (
                <div className="density-option-check">
                  <i className="fas fa-check"></i>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="setting-section">
        <h5 className="setting-section-title">预览效果</h5>
        <div className="layout-preview">
          <div className={`preview-container ${density === 'compact' ? 'compact' : 'comfortable'}`}>
            <div className="preview-header">
              <div className="preview-title">示例页面</div>
              <div className="preview-actions">
                <div className="preview-icon"></div>
                <div className="preview-icon"></div>
              </div>
            </div>
            <div className="preview-content">
              <div className="preview-card">
                <div className="preview-card-header">
                  <div className="preview-card-title">卡片标题</div>
                  <div className="preview-card-value">¥1,234</div>
                </div>
                <div className="preview-card-content">
                  <div className="preview-item">
                    <div className="preview-item-icon"></div>
                    <div className="preview-item-text">
                      <div className="preview-item-name">项目名称</div>
                      <div className="preview-item-desc">项目描述</div>
                    </div>
                    <div className="preview-item-amount">¥123</div>
                  </div>
                  <div className="preview-item">
                    <div className="preview-item-icon"></div>
                    <div className="preview-item-text">
                      <div className="preview-item-name">项目名称</div>
                      <div className="preview-item-desc">项目描述</div>
                    </div>
                    <div className="preview-item-amount">¥456</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
