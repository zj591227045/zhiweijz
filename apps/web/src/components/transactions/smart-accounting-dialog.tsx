"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import "@/styles/smart-accounting-dialog.css";

interface SmartAccountingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountBookId?: string;
}

interface SmartAccountingResult {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  description?: string;
  date?: string;
}

export function SmartAccountingDialog({
  isOpen,
  onClose,
  accountBookId
}: SmartAccountingDialogProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setIsProcessing(false);
      setProcessingStep(null);
    }
  }, [isOpen]);

  // 处理智能识别
  const handleSmartAccounting = async () => {
    if (!description.trim()) {
      toast.error("请输入描述");
      return;
    }

    if (!accountBookId) {
      toast.error("请先选择账本");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep("正在分析您的描述...");

      // 延迟显示不同的处理步骤，提升用户体验
      setTimeout(() => setProcessingStep("正在识别交易类型和金额..."), 800);
      setTimeout(() => setProcessingStep("正在匹配最佳分类..."), 1600);
      setTimeout(() => setProcessingStep("正在生成交易详情..."), 2400);

      // 调用智能记账API
      const response = await fetch(`/api/ai/account/${accountBookId}/smart-accounting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
        }),
      });

      if (response.ok) {
        const result: SmartAccountingResult = await response.json();

        // 将结果存储到sessionStorage，供添加交易页面使用
        sessionStorage.setItem('smartAccountingResult', JSON.stringify(result));

        toast.success("智能识别成功");
        onClose();

        // 跳转到添加交易页面
        router.push("/transactions/new");
      } else {
        const error = await response.json();
        toast.error(error.message || "智能识别失败，请手动填写");
      }
    } catch (error) {
      console.error("智能记账失败:", error);
      toast.error("智能识别失败，请手动填写");
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  // 处理直接添加记账
  const handleDirectAdd = async () => {
    if (!description.trim()) {
      toast.error("请输入描述");
      return;
    }

    if (!accountBookId) {
      toast.error("请先选择账本");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep("正在分析您的描述...");

      setTimeout(() => setProcessingStep("正在识别交易类型和金额..."), 800);
      setTimeout(() => setProcessingStep("正在匹配最佳分类..."), 1600);
      setTimeout(() => setProcessingStep("正在创建交易记录..."), 2400);

      // 调用直接添加记账API
      const response = await fetch(`/api/ai/account/${accountBookId}/smart-accounting/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("记账成功");
        onClose();

        // 可以选择跳转到交易详情页面或交易列表
        router.push("/transactions");
      } else {
        const error = await response.json();
        toast.error(error.message || "记账失败，请手动填写");
      }
    } catch (error) {
      console.error("直接添加记账失败:", error);
      toast.error("记账失败，请手动填写");
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  // 处理手动记账
  const handleManualAccounting = () => {
    onClose();
    router.push("/transactions/new");
  };

  if (!isOpen) return null;

  return (
    <div className="smart-accounting-dialog-overlay">
      <div className="smart-accounting-dialog">
        <div className="smart-accounting-dialog-header">
          <h3 className="smart-accounting-dialog-title">智能记账</h3>
          <button className="smart-accounting-dialog-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {isProcessing ? (
          <div className="smart-accounting-processing">
            <div className="smart-accounting-loading">
              <div className="spinner"></div>
            </div>
            <p className="smart-accounting-processing-text">
              {processingStep || "正在处理..."}
            </p>
          </div>
        ) : (
          <>
            <div className="smart-accounting-dialog-content">
              <p className="smart-accounting-dialog-subtitle">
                输入一句话，自动识别记账信息
              </p>
              <div className="smart-accounting-input-wrapper">
                <textarea
                  className="smart-accounting-textarea"
                  placeholder="例如：昨天在沃尔玛买了日用品，花了128.5元"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  autoFocus
                />
              </div>

              <div className="smart-accounting-buttons">
                <button
                  className="smart-accounting-button identify-button"
                  onClick={handleSmartAccounting}
                  disabled={isProcessing}
                >
                  智能识别
                </button>

                <button
                  className="smart-accounting-button direct-button"
                  onClick={handleDirectAdd}
                  disabled={isProcessing}
                >
                  直接添加
                </button>
              </div>
            </div>

            <div className="smart-accounting-dialog-footer">
              <button
                className="smart-accounting-manual-button"
                onClick={handleManualAccounting}
              >
                手动记账
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
