"use client";

import { useState } from "react";
import { AccountBookSelector } from "./account-book-selector";
import "@/styles/settings-dialog.css";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  // 当前激活的设置面板
  const [activePanel, setActivePanel] = useState<string>("accounts");

  if (!isOpen) return null;

  // 设置选项列表
  const settingOptions = [
    {
      id: "accounts",
      title: "账本切换",
      icon: "fa-book",
      description: "切换当前激活账本",
    },
    {
      id: "theme",
      title: "主题切换",
      icon: "fa-palette",
      description: "快速切换应用主题",
    },
    {
      id: "display",
      title: "显示设置",
      icon: "fa-eye",
      description: "调整显示偏好",
    },
  ];

  // 渲染当前激活的面板
  const renderActivePanel = () => {
    switch (activePanel) {
      case "accounts":
        return <AccountBookSelector onClose={onClose} />;
      case "theme":
        return (
          <div className="p-4 text-center text-gray-500">
            <p>主题切换功能即将推出</p>
          </div>
        );
      case "display":
        return (
          <div className="p-4 text-center text-gray-500">
            <p>显示设置功能即将推出</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-dialog" onClick={onClose}>
      <div
        className="settings-dialog-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-dialog-header">
          <h3 className="settings-dialog-title">设置</h3>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="关闭"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="settings-dialog-body">
          {/* 设置选项侧边栏 */}
          <div className="settings-sidebar">
            {settingOptions.map((option) => (
              <div
                key={option.id}
                className={`settings-option ${activePanel === option.id ? "active" : ""}`}
                onClick={() => setActivePanel(option.id)}
              >
                <div className="flex items-center mb-1">
                  <i className={`fas ${option.icon} settings-option-icon`}></i>
                  <span className="settings-option-title">{option.title}</span>
                </div>
                <p className="settings-option-description pl-6">
                  {option.description}
                </p>
              </div>
            ))}
          </div>

          {/* 设置内容区域 */}
          <div className="settings-content">
            {renderActivePanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
