'use client';

/**
 * 组件预览组件
 */
export function PreviewComponents() {
  return (
    <div className="preview-components">
      <div>
        <h4>按钮</h4>
        <div className="preview-buttons">
          <button className="preview-button primary-button">
            主要按钮
          </button>
          <button className="preview-button secondary-button">
            次要按钮
          </button>
          <button className="preview-button danger-button">
            危险按钮
          </button>
        </div>
      </div>

      <div>
        <h4>卡片</h4>
        <div className="preview-card">
          <div className="card-title">卡片标题</div>
          <div className="card-content">这是卡片内容，展示主题的卡片样式效果。</div>
          <button className="preview-button primary-button">
            操作按钮
          </button>
        </div>
      </div>

      <div>
        <h4>表单元素</h4>
        <div className="preview-form">
          <input
            type="text"
            placeholder="输入框"
            className="preview-input"
          />
          <select className="preview-input">
            <option>下拉选择框</option>
            <option>选项1</option>
            <option>选项2</option>
          </select>
        </div>
      </div>

      <div>
        <h4>文本样式</h4>
        <div className="preview-text">
          <div className="text-primary">主要文本</div>
          <div className="text-secondary">次要文本内容，用于展示详细信息和描述性内容。</div>
        </div>
      </div>
    </div>
  );
}
