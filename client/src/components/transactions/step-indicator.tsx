"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";
import { cn } from "@/lib/utils";

export function StepIndicator() {
  const { currentStep } = useTransactionFormStore();

  return (
    <div className="step-indicator">
      <div className={cn("step", currentStep === 1 && "active")}>
        1. 选择分类
      </div>
      <div className={cn("step", currentStep === 2 && "active")}>
        2. 填写详情
      </div>
    </div>
  );
}
