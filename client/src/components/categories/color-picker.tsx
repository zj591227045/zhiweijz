"use client";

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export function ColorPicker({ selectedColor, onSelectColor }: ColorPickerProps) {
  // 预定义颜色
  const predefinedColors = [
    // 蓝色系
    "#3b82f6", // 蓝色
    "#2563eb", // 深蓝色
    "#1d4ed8", // 更深蓝色
    "#60a5fa", // 浅蓝色
    "#93c5fd", // 更浅蓝色
    
    // 红色系
    "#ef4444", // 红色
    "#dc2626", // 深红色
    "#b91c1c", // 更深红色
    "#f87171", // 浅红色
    "#fca5a5", // 更浅红色
    
    // 绿色系
    "#10b981", // 绿色
    "#059669", // 深绿色
    "#047857", // 更深绿色
    "#34d399", // 浅绿色
    "#6ee7b7", // 更浅绿色
    
    // 黄色系
    "#f59e0b", // 黄色
    "#d97706", // 深黄色
    "#b45309", // 更深黄色
    "#fbbf24", // 浅黄色
    "#fcd34d", // 更浅黄色
    
    // 紫色系
    "#8b5cf6", // 紫色
    "#7c3aed", // 深紫色
    "#6d28d9", // 更深紫色
    "#a78bfa", // 浅紫色
    "#c4b5fd", // 更浅紫色
    
    // 粉色系
    "#ec4899", // 粉色
    "#db2777", // 深粉色
    "#be185d", // 更深粉色
    "#f472b6", // 浅粉色
    "#f9a8d4", // 更浅粉色
    
    // 灰色系
    "#6b7280", // 灰色
    "#4b5563", // 深灰色
    "#374151", // 更深灰色
    "#9ca3af", // 浅灰色
    "#d1d5db", // 更浅灰色
  ];

  // 处理颜色选择
  const handleColorSelect = (color: string) => {
    onSelectColor(color);
  };

  // 处理自定义颜色输入
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectColor(e.target.value);
  };

  return (
    <div className="color-picker">
      {/* 预定义颜色网格 */}
      <div className="color-grid">
        {predefinedColors.map((color) => (
          <div
            key={color}
            className={`color-item ${selectedColor === color ? "selected" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelect(color)}
            title={color}
          ></div>
        ))}
      </div>

      {/* 自定义颜色输入 */}
      <div className="custom-color">
        <div
          className="color-preview"
          style={{ backgroundColor: selectedColor }}
        ></div>
        <input
          type="color"
          value={selectedColor}
          onChange={handleCustomColorChange}
          className="color-input"
        />
        <div className="color-value">{selectedColor}</div>
      </div>
    </div>
  );
}
