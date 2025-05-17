"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCategoryFormStore } from "@/store/category-form-store";
import { IconPicker } from "./icon-picker";
import { ColorPicker } from "./color-picker";

interface CategoryFormProps {
  id?: string;
  onSubmit?: () => void;
}

export function CategoryForm({ id, onSubmit }: CategoryFormProps) {
  const router = useRouter();
  const {
    mode,
    name,
    type,
    icon,
    color,
    originalCategory,
    errors,
    isSubmitting,
    setName,
    setType,
    setIcon,
    setColor,
    validateForm,
    submitForm
  } = useCategoryFormStore();

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
      return;
    }

    // 提交表单
    const success = await submitForm();

    if (success) {
      // 如果有自定义提交回调，则调用
      if (onSubmit) {
        onSubmit();
      } else {
        // 否则返回分类列表页面
        router.push("/settings/categories");
      }
    }
  };

  // 处理类型切换
  const handleTypeChange = (newType: "EXPENSE" | "INCOME") => {
    setType(newType);
  };

  return (
    <form className="category-form" onSubmit={handleSubmit}>
      {/* 分类名称 */}
      <div className="form-group">
        <label htmlFor="category-name">分类名称</label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入分类名称"
          maxLength={10}
          className={errors.name ? "error" : ""}
          disabled={mode === "edit" && originalCategory?.isDefault}
        />
        {errors.name && <div className="error-message">{errors.name}</div>}
        <div className="input-hint">
          {mode === "edit" && originalCategory?.isDefault
            ? "默认分类不能修改名称"
            : "最多10个字符"}
        </div>
      </div>

      {/* 分类类型 */}
      <div className="form-group">
        <label>分类类型</label>
        <div className="type-selector">
          <button
            type="button"
            className={`type-button ${type === "EXPENSE" ? "active" : ""}`}
            onClick={() => handleTypeChange("EXPENSE")}
            disabled={mode === "edit" && originalCategory?.isDefault}
          >
            支出
          </button>
          <button
            type="button"
            className={`type-button ${type === "INCOME" ? "active" : ""}`}
            onClick={() => handleTypeChange("INCOME")}
            disabled={mode === "edit" && originalCategory?.isDefault}
          >
            收入
          </button>
        </div>
        {mode === "edit" && originalCategory?.isDefault && (
          <div className="input-hint">默认分类不能修改类型</div>
        )}
      </div>

      {/* 分类图标 */}
      <div className="form-group">
        <label>分类图标</label>
        <IconPicker
          selectedIcon={icon}
          onSelectIcon={setIcon}
          error={errors.icon}
        />
      </div>

      {/* 分类颜色 */}
      <div className="form-group">
        <label>分类颜色</label>
        <ColorPicker selectedColor={color} onSelectColor={setColor} />
      </div>

      {/* 提交按钮 */}
      <div className="form-actions">
        <button
          type="button"
          className="cancel-button"
          onClick={() => router.push("/settings/categories")}
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> 保存中...
            </>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </form>
  );
}
