"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
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
  const { refreshDashboardData } = useDashboardStore();
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

      // 调用智能记账API，使用apiClient确保认证令牌被正确添加
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting`,
        { description },
        { timeout: 60000 } // 设置60秒超时，智能记账可能需要更长时间
      );

      console.log("智能记账结果:", response);

      if (response) {
        // 将结果存储到sessionStorage，供添加交易页面使用
        sessionStorage.setItem('smartAccountingResult', JSON.stringify(response));

        toast.success("智能识别成功");
        onClose();

        // 跳转到添加交易页面
        router.push("/transactions/new");
      } else {
        toast.error("智能识别失败，请手动填写");
      }
    } catch (error: any) {
      console.error("智能记账失败:", error);

      // 提供更详细的错误信息
      if (error.code === 'ECONNABORTED') {
        toast.error("请求超时，服务器处理时间过长，请稍后再试");
      } else if (error.response) {
        // 服务器返回了错误状态码
        toast.error(`识别失败: ${error.response.data?.error || '服务器错误'}`);
      } else if (error.request) {
        // 请求发送了但没有收到响应
        toast.error("未收到服务器响应，请检查网络连接");
      } else {
        // 其他错误
        toast.error("智能识别失败，请手动填写");
      }
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

      // 调用直接添加记账API，使用apiClient确保认证令牌被正确添加
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting/direct`,
        { description },
        { timeout: 60000 } // 设置60秒超时
      );

      console.log("直接添加记账结果:", response);

      if (response && response.id) {
        console.log("记账成功，交易ID:", response.id);
        toast.success("记账成功");
        onClose();

        // 先刷新仪表盘数据，然后再跳转
        if (accountBookId) {
          try {
            console.log("开始刷新仪表盘数据...");
            await refreshDashboardData(accountBookId);
            console.log("仪表盘数据刷新完成");
          } catch (refreshError) {
            console.error("刷新仪表盘数据失败:", refreshError);
            // 即使刷新失败，也继续跳转，让用户手动刷新
          }
        }

        // 数据刷新完成后再跳转到仪表盘页面
        router.push("/dashboard");
      } else {
        toast.error("记账失败，请手动填写");
      }
    } catch (error: any) {
      console.error("直接添加记账失败:", error);

      // 提供更详细的错误信息
      if (error.code === 'ECONNABORTED') {
        toast.error("请求超时，服务器处理时间过长，请稍后再试");
      } else if (error.response) {
        // 服务器返回了错误状态码
        toast.error(`记账失败: ${error.response.data?.error || '服务器错误'}`);
      } else if (error.request) {
        // 请求发送了但没有收到响应
        toast.error("未收到服务器响应，请检查网络连接");
      } else {
        // 其他错误
        toast.error("记账失败，请手动填写");
      }
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

              <div className="smart-accounting-manual-wrapper">
                <button
                  className="smart-accounting-manual-button"
                  onClick={handleManualAccounting}
                >
                  手动记账
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
