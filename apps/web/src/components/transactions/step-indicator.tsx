"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { cn } from "@/lib/utils";

export function StepIndicator() {
  const { currentStep } = useTransactionFormStore();

  return (
    <div className="step-indicator">
      <div className={cn("step-item", currentStep === 1 && "active")}>
        <div className="step-text">1. 选择分类</div>
      </div>
      <div className={cn("step-item", currentStep === 2 && "active")}>
        <div className="step-text">2. 填写详情</div>
      </div>
    </div>
  );
}
