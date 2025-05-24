"use client";

interface BookPreviewProps {
  name: string;
  description: string;
  isDefault: boolean;
}

export function BookPreview({
  name,
  description,
  isDefault,
}: BookPreviewProps) {
  return (
    <div className="preview-section">
      <div className="preview-title">预览效果</div>
      <div className="book-preview">
        <div className="preview-book-name">{name || "账本名称"}</div>
        <div className="preview-book-description">{description || "账本描述"}</div>
        <div className="preview-book-badges">
          {isDefault && (
            <div className="preview-badge preview-default-badge">
              <i className="fas fa-star" style={{ marginRight: '4px', fontSize: '10px' }}></i>
              默认账本
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
