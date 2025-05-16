"use client";

import { useTransactionEditStore } from "@/store/transaction-edit-store";
import { cn } from "@/lib/utils";

export function StepIndicator() {
  const { currentStep } = useTransactionEditStore();

  return (
    <div className="step-indicator edit-transaction-steps">
      <div className={cn("step", currentStep === 1 && "active")}>
        <span className="step-number">1</span>
        <span className="step-text">选择分类</span>
      </div>
      <div className={cn("step", currentStep === 2 && "active")}>
        <span className="step-number">2</span>
        <span className="step-text">填写详情</span>
      </div>
    </div>
  );
}
