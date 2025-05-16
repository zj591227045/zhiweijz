"use client";

import { useTransactionFormStore } from "@/store/transaction-form-store";

interface BottomActionButtonsProps {
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function BottomActionButtons({
  onSubmit,
  isSubmitting,
}: BottomActionButtonsProps) {
  const { currentStep, goToStep } = useTransactionFormStore();

  // 处理下一步按钮点击
  const handleNextClick = () => {
    goToStep(2);
  };

  // 处理上一步按钮点击
  const handleBackClick = () => {
    goToStep(1);
  };

  return (
    <div className="bottom-button-container">
      {/* 第一步按钮 */}
      {currentStep === 1 && (
        <button
          className="next-button"
          onClick={handleNextClick}
        >
          下一步
        </button>
      )}

      {/* 第二步按钮 */}
      {currentStep === 2 && (
        <div className="step2-buttons">
          <button
            className="back-button"
            onClick={handleBackClick}
            disabled={isSubmitting}
          >
            上一步
          </button>
          <button
            className="save-button"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </div>
      )}
    </div>
  );
}
