"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AccountBook } from "@/types";
import { useAccountBookStore } from "@/store/account-book-store";
import { toast } from "sonner";

// 表单验证模式
const bookFormSchema = z.object({
  name: z.string().min(1, "账本名称不能为空").max(50, "账本名称不能超过50个字符"),
  description: z.string().max(200, "账本描述不能超过200个字符").optional(),
  isDefault: z.boolean().optional(),
  aiProvider: z.string().optional(),
  apiKey: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookFormDialogProps {
  isOpen: boolean;
  book: AccountBook | null;
  onClose: () => void;
}

export function BookFormDialog({
  isOpen,
  book,
  onClose,
}: BookFormDialogProps) {
  const { createAccountBook, updateAccountBook } = useAccountBookStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // 表单初始化
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isDefault: false,
      aiProvider: "openai",
      apiKey: "",
    },
  });

  // 当编辑模式变化时，重置表单
  useEffect(() => {
    if (book) {
      reset({
        name: book.name,
        description: book.description || "",
        isDefault: book.isDefault,
        // AI设置暂时不处理
        aiProvider: "openai",
        apiKey: "",
      });
    } else {
      reset({
        name: "",
        description: "",
        isDefault: false,
        aiProvider: "openai",
        apiKey: "",
      });
    }
  }, [book, reset]);

  // 提交表单
  const onSubmit = async (data: BookFormValues) => {
    setIsSubmitting(true);
    try {
      if (book) {
        // 更新账本
        await updateAccountBook(book.id, data.name, data.description);
        toast.success("账本更新成功");
      } else {
        // 创建账本
        await createAccountBook(data.name, data.description);
        toast.success("账本创建成功");
      }
      onClose();
    } catch (error) {
      toast.error(book ? "更新账本失败" : "创建账本失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 切换API密钥可见性
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex" }}>
      <div className="modal-content">
        <div className="modal-header">
          {book ? "编辑账本" : "添加账本"}
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="book-name">
                账本名称
              </label>
              <input
                type="text"
                id="book-name"
                className="form-input"
                placeholder="请输入账本名称"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="book-description">
                账本描述
              </label>
              <textarea
                id="book-description"
                className="form-textarea"
                placeholder="请输入账本描述"
                {...register("description")}
              ></textarea>
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>
            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="default-book"
                  {...register("isDefault")}
                />
                <label htmlFor="default-book">设为默认账本</label>
              </div>
            </div>

            <div className="ai-section">
              <div className="ai-header">AI助手设置</div>
              <div className="form-group ai-provider">
                <label className="form-label" htmlFor="ai-provider">
                  AI服务提供商
                </label>
                <select
                  id="ai-provider"
                  className="provider-select"
                  {...register("aiProvider")}
                >
                  <option value="openai">OpenAI</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="api-key">
                  API密钥
                </label>
                <div className="api-key-input">
                  <input
                    type={showApiKey ? "text" : "password"}
                    id="api-key"
                    className="form-input"
                    placeholder="请输入API密钥"
                    {...register("apiKey")}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={toggleApiKeyVisibility}
                  >
                    <i className={`fas ${showApiKey ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="modal-button cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="modal-button confirm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
