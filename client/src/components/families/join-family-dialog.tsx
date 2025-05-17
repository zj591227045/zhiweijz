"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFamilyStore } from "@/lib/stores/family-store";

// 表单验证模式
const joinFamilySchema = z.object({
  inviteCode: z.string()
    .min(1, "邀请码不能为空")
    .regex(/^[A-Za-z0-9]+$/, "邀请码格式不正确"),
});

type JoinFamilyFormValues = z.infer<typeof joinFamilySchema>;

interface JoinFamilyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinFamilyDialog({ isOpen, onClose }: JoinFamilyDialogProps) {
  const { joinFamily } = useFamilyStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单初始化
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinFamilyFormValues>({
    resolver: zodResolver(joinFamilySchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  // 处理表单提交
  const onSubmit = async (data: JoinFamilyFormValues) => {
    setIsSubmitting(true);
    const success = await joinFamily(data);
    setIsSubmitting(false);
    
    if (success) {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex" }}>
      <div className="modal-content">
        <div className="modal-header">加入家庭</div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="invite-code">邀请码</label>
              <input
                id="invite-code"
                className={`form-input ${errors.inviteCode ? "border-red-500" : ""}`}
                {...register("inviteCode")}
                placeholder="输入邀请码"
              />
              {errors.inviteCode && (
                <p className="text-red-500 text-xs mt-1">{errors.inviteCode.message}</p>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              <i className="fas fa-info-circle mr-1"></i>
              请向家庭管理员获取邀请码
            </p>
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
              {isSubmitting ? "加入中..." : "加入"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
