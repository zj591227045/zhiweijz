"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFamilyStore } from "@/lib/stores/family-store";

// 表单验证模式
const createFamilySchema = z.object({
  name: z.string()
    .min(1, "家庭名称不能为空")
    .max(30, "家庭名称不能超过30个字符"),
});

type CreateFamilyFormValues = z.infer<typeof createFamilySchema>;

interface CreateFamilyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFamilyDialog({ isOpen, onClose }: CreateFamilyDialogProps) {
  const { createFamily } = useFamilyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单初始化
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFamilyFormValues>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: {
      name: "",
    },
  });

  // 处理表单提交
  const onSubmit = async (data: CreateFamilyFormValues) => {
    setIsSubmitting(true);
    const result = await createFamily(data);
    setIsSubmitting(false);
    
    if (result) {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex" }}>
      <div className="modal-content">
        <div className="modal-header">创建家庭</div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="family-name">家庭名称</label>
              <input
                id="family-name"
                className={`form-input ${errors.name ? "border-red-500" : ""}`}
                {...register("name")}
                placeholder="例如：我的家庭"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="modal-button cancel"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="modal-button confirm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "创建中..." : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
