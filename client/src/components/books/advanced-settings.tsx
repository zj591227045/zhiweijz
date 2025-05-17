"use client";

import { useState } from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { BookFormValues } from "./book-form";

interface AdvancedSettingsProps {
  register: UseFormRegister<BookFormValues>;
  errors: FieldErrors<BookFormValues>;
  enabled: boolean;
}

export function AdvancedSettings({
  register,
  errors,
  enabled,
}: AdvancedSettingsProps) {
  const [expanded, setExpanded] = useState(false);

  // 切换展开/折叠状态
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`advanced-settings ${enabled ? '' : 'disabled'}`}>
      <div className="collapsible-header" onClick={toggleExpanded}>
        <div className="collapsible-title">高级设置</div>
        <div className={`collapsible-icon ${expanded ? "expanded" : ""}`}>
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>

      <div className="collapsible-content" style={{ display: expanded ? "block" : "none" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="custom-prompt">自定义提示词</label>
          <textarea
            id="custom-prompt"
            className="form-textarea"
            placeholder="输入自定义提示词"
            {...register("aiService.customPrompt")}
          ></textarea>
          <div className="form-hint">自定义AI的行为和回复风格</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="language">语言偏好</label>
          <select
            id="language"
            className="form-input"
            {...register("aiService.language")}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>
    </div>
  );
}
