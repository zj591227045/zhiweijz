"use client";

import { useState } from "react";

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
  error?: string;
}

export function IconPicker({ selectedIcon, onSelectIcon, error }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllIcons, setShowAllIcons] = useState(false);

  // 图标列表
  const expenseIcons = [
    { name: "餐饮", value: "utensils" },
    { name: "购物", value: "shopping-bag" },
    { name: "日用", value: "shopping-basket" },
    { name: "交通", value: "bus" },
    { name: "运动", value: "running" },
    { name: "娱乐", value: "gamepad" },
    { name: "通讯", value: "mobile-alt" },
    { name: "服饰", value: "tshirt" },
    { name: "美容", value: "spa" },
    { name: "居家", value: "home" },
    { name: "孩子", value: "baby" },
    { name: "长辈", value: "user-friends" },
    { name: "社交", value: "users" },
    { name: "旅行", value: "plane" },
    { name: "数码", value: "laptop" },
    { name: "汽车", value: "car" },
    { name: "医疗", value: "heartbeat" },
    { name: "还款", value: "hand-holding-usd" },
    { name: "保险", value: "shield-alt" },
    { name: "学习", value: "graduation-cap" },
    { name: "办公", value: "briefcase" },
    { name: "维修", value: "tools" },
    { name: "利息", value: "percentage" },
  ];

  const incomeIcons = [
    { name: "工资", value: "money-bill-wave" },
    { name: "兼职", value: "coins" },
    { name: "理财", value: "chart-line" },
    { name: "奖金", value: "gift" },
    { name: "提成", value: "hand-holding-usd" },
    { name: "其他", value: "ellipsis-h" },
  ];

  // 更多图标
  const moreIcons = [
    { name: "标签", value: "tag" },
    { name: "星星", value: "star" },
    { name: "心形", value: "heart" },
    { name: "钱包", value: "wallet" },
    { name: "信用卡", value: "credit-card" },
    { name: "日历", value: "calendar" },
    { name: "时钟", value: "clock" },
    { name: "地图", value: "map-marker-alt" },
    { name: "音乐", value: "music" },
    { name: "电影", value: "film" },
    { name: "相机", value: "camera" },
    { name: "图片", value: "image" },
    { name: "视频", value: "video" },
    { name: "文件", value: "file" },
    { name: "文档", value: "file-alt" },
    { name: "书籍", value: "book" },
    { name: "笔记", value: "sticky-note" },
    { name: "邮件", value: "envelope" },
    { name: "电话", value: "phone" },
    { name: "礼物", value: "gift" },
    { name: "咖啡", value: "coffee" },
    { name: "餐厅", value: "utensils" },
    { name: "酒杯", value: "wine-glass" },
    { name: "购物车", value: "shopping-cart" },
    { name: "商店", value: "store" },
  ];

  // 合并所有图标
  const allIcons = [...expenseIcons, ...incomeIcons, ...moreIcons];

  // 过滤图标
  const filteredIcons = searchTerm
    ? allIcons.filter(
        (icon) =>
          icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          icon.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : showAllIcons
    ? allIcons
    : [...expenseIcons, ...incomeIcons];

  // 处理图标选择
  const handleIconSelect = (icon: string) => {
    onSelectIcon(icon);
  };

  return (
    <div className="icon-picker">
      {/* 搜索框 */}
      <div className="icon-search">
        <input
          type="text"
          placeholder="搜索图标..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="button"
          className="show-all-button"
          onClick={() => setShowAllIcons(!showAllIcons)}
        >
          {showAllIcons ? "显示常用" : "显示全部"}
        </button>
      </div>

      {/* 已选图标 */}
      <div className="selected-icon">
        <div className="icon-preview">
          <i className={`fas fa-${selectedIcon}`}></i>
        </div>
        <div className="icon-name">已选: {selectedIcon}</div>
      </div>

      {/* 图标网格 */}
      <div className={`icon-grid ${error ? "error" : ""}`}>
        {filteredIcons.map((icon) => (
          <div
            key={icon.value}
            className={`icon-item ${selectedIcon === icon.value ? "selected" : ""}`}
            onClick={() => handleIconSelect(icon.value)}
            title={icon.name}
          >
            <i className={`fas fa-${icon.value}`}></i>
          </div>
        ))}
      </div>

      {/* 错误信息 */}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
