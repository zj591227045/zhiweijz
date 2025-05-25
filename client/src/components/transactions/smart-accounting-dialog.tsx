"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTransactionFormStore } from "@/store/transaction-form-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { triggerTransactionChange } from "@/store/dashboard-store";
import { apiClient } from "@/lib/api";
import { getCategories } from "@/lib/api/transaction-service";
import { aiService } from "@/lib/api/ai-service";
import { TransactionType } from "@/types";
import { TransactionToast } from "./transaction-toast";
import "./smart-accounting-dialog.css";

interface SmartAccountingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 智能记账对话框组件
 * 允许用户输入自然语言描述，调用智能记账API，并自动填充表单或直接添加记账
 */
export function SmartAccountingDialog({ isOpen, onClose }: SmartAccountingDialogProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const { currentAccountBook } = useAccountBookStore();

  // 获取表单状态和操作函数
  const {
    setAmount,
    setType,
    setCategoryId,
    setCategoryName,
    setCategoryIcon,
    setCategory,
    setDescription: setFormDescription,
    setDate,
    setTime,
    goToStep,
    resetForm,
    setShowKeyboardInitially
  } = useTransactionFormStore();

  // 获取分类列表，用于匹配分类ID
  const { data: expenseCategories } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => getCategories("EXPENSE"),
  });

  const { data: incomeCategories } = useQuery({
    queryKey: ["categories", "INCOME"],
    queryFn: () => getCategories("INCOME"),
  });

  // 重置表单并检查账本是否绑定LLM服务
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setIsProcessing(false);
      setProcessingStep(null);
      setShowToast(false);
      setTransactionResult(null);

      // 检查当前账本是否绑定了LLM服务
      const checkLLMServiceBinding = async () => {
        if (currentAccountBook?.id) {
          console.log("智能记账对话框 - 检查账本是否绑定LLM服务，账本ID:", currentAccountBook.id);

          // 检查账本是否有userLLMSettingId字段
          if (currentAccountBook.userLLMSettingId) {
            console.log("智能记账对话框 - 账本直接包含userLLMSettingId:", currentAccountBook.userLLMSettingId);
            return;
          }

          // 使用aiService检查账本是否绑定LLM服务
          try {
            // 1. 首先检查账本对象是否有userLLMSettingId字段
            if (currentAccountBook.userLLMSettingId) {
              console.log("智能记账对话框 - 账本直接包含userLLMSettingId:", currentAccountBook.userLLMSettingId);
              return; // 已绑定，继续显示对话框
            }

            // 2. 使用aiService获取账本LLM设置
            const llmSettings = await aiService.getAccountLLMSettings(currentAccountBook.id);
            console.log("智能记账对话框 - 获取账本LLM设置:", llmSettings);

            if (llmSettings) {
              console.log("智能记账对话框 - 账本已绑定LLM服务");
              return; // 已绑定，继续显示对话框
            } else {
              // 如果没有绑定LLM服务，关闭对话框并跳转到手动记账页面
              console.log("智能记账对话框 - 账本未绑定LLM服务，跳转到手动记账页面");
              onClose();
              router.push("/transactions/new");
            }
          } catch (error) {
            console.error("智能记账对话框 - 检查账本LLM服务绑定失败:", error);
            // 出错时默认为未绑定，关闭对话框并跳转到手动记账页面
            console.log("智能记账对话框 - API请求失败，默认为未绑定，跳转到手动记账页面");
            onClose();
            router.push("/transactions/new");
          }
        }
      };

      checkLLMServiceBinding();
    }
  }, [isOpen, currentAccountBook, onClose, router]);

  // 根据分类ID查找分类信息
  const findCategoryById = (categoryId: string, transactionType: TransactionType) => {
    const categories = transactionType === "EXPENSE" ? expenseCategories : incomeCategories;
    if (!categories) return null;

    return categories.find(category => category.id === categoryId) || null;
  };

  // 辅助函数：从API响应中提取智能记账结果
  const extractSmartAccountingResult = (response: any) => {
    if (!response) return null;

    // 检查响应是否直接包含所需字段
    if (response.amount !== undefined || response.type !== undefined || response.categoryId !== undefined) {
      return response;
    }

    // 检查是否有data字段
    if (response.data) {
      // 如果data字段包含所需字段，返回data
      if (response.data.amount !== undefined || response.data.type !== undefined || response.data.categoryId !== undefined) {
        return response.data;
      }

      // 检查data.smartAccountingResult
      if (response.data.smartAccountingResult) {
        return response.data.smartAccountingResult;
      }
    }

    // 检查是否有smartAccountingResult字段
    if (response.smartAccountingResult) {
      return response.smartAccountingResult;
    }

    // 检查是否有result字段
    if (response.result) {
      return response.result;
    }

    // 如果找不到有效的结果结构，返回原始响应
    return response;
  };

  // 处理智能识别
  const handleSmartAccounting = async () => {
    if (!description.trim()) {
      toast.error("请输入描述");
      return;
    }

    if (!currentAccountBook?.id) {
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

      // 调用智能记账API，使用更长的超时时间
      const response = await apiClient.post(
        `/ai/account/${currentAccountBook.id}/smart-accounting`,
        { description },
        { timeout: 60000 } // 设置60秒超时，智能记账可能需要更长时间
      );

      console.log("智能记账结果:", response);

      if (response) {
        // 填充表单数据 - 处理不同的响应结构
        let result = extractSmartAccountingResult(response);

        // 重置表单，确保没有旧数据
        resetForm();

        // 填充金额
        if (result.amount) {
          setAmount(result.amount.toString());
        }

        // 填充交易类型 - 必须在设置分类之前设置类型
        if (result.type) {
          setType(result.type);
        }

        // 填充分类信息
        if (result.categoryId) {
          // 尝试查找完整的分类信息
          const category = findCategoryById(result.categoryId, result.type || "EXPENSE");

          if (category) {
            // 如果找到分类，使用setCategory方法一次性设置所有分类信息
            setCategory(
              category.id,
              category.name,
              category.icon || null
            );
          } else {
            // 如果没有找到分类，分别设置ID、名称和图标
            setCategoryId(result.categoryId);

            if (result.categoryName) {
              setCategoryName(result.categoryName);
            }

            if (result.categoryIcon) {
              setCategoryIcon(result.categoryIcon);
            }
          }
        }

        // 设置描述/备注
        if (result.note) {
          setFormDescription(result.note);
        } else if (result.description) {
          // 备选字段
          setFormDescription(result.description);
        } else if (result.originalDescription) {
          // 另一个备选字段
          setFormDescription(result.originalDescription);
        }

        // 设置日期和时间
        if (result.date) {
          try {
            const date = new Date(result.date);
            setDate(date);

            // 设置时间
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
          } catch (dateError) {
            console.error("日期转换错误:", dateError);
            // 如果日期转换失败，使用当前日期
            const now = new Date();
            setDate(now);
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
          }
        }

        // 跳转到第二步
        goToStep(2);

        // 设置不显示虚拟键盘
        setShowKeyboardInitially(false);

        toast.success("智能识别成功");
        onClose(); // 关闭对话框

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

    if (!currentAccountBook?.id) {
      toast.error("请先选择账本");
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep("正在分析您的描述...");

      // 延迟显示不同的处理步骤，提升用户体验
      setTimeout(() => setProcessingStep("正在识别交易类型和金额..."), 800);
      setTimeout(() => setProcessingStep("正在匹配最佳分类..."), 1600);
      setTimeout(() => setProcessingStep("正在创建交易记录..."), 2400);

      // 调用直接添加记账API，使用更长的超时时间
      const response = await apiClient.post(
        `/ai/account/${currentAccountBook.id}/smart-accounting/direct`,
        { description },
        { timeout: 60000 } // 设置60秒超时
      );

      console.log("直接添加记账结果:", response);

      if (response && response.id) {
        console.log("记账成功，交易ID:", response.id);

        // 准备交易结果数据用于显示
        const result = extractSmartAccountingResult(response);
        setTransactionResult({
          id: response.id,
          amount: result.amount || 0,
          type: result.type || 'EXPENSE',
          categoryName: result.categoryName || '未分类',
          categoryIcon: result.categoryIcon || null,
          description: result.note || result.description || result.originalDescription || '',
          date: result.date ? new Date(result.date).toISOString() : new Date().toISOString()
        });

        // 触发交易变化事件，让仪表盘自动刷新
        triggerTransactionChange(currentAccountBook.id);

        // 显示顶部弹窗
        setShowToast(true);
        onClose(); // 关闭对话框
      } else {
        toast.error("记账失败，请手动填写");
        onClose(); // 关闭对话框
        // 跳转到添加交易页面
        router.push("/transactions/new");
      }
    } catch (error: any) {
      console.error("直接添加记账失败:", error);

      // 提供更详细的错误信息
      if (error.code === 'ECONNABORTED') {
        toast.error("请求超时，服务器处理时间过长，请稍后再试");
      } else if (error.response) {
        // 服务器返回了错误状态码
        toast.error(`添加失败: ${error.response.data?.error || '服务器错误'}`);
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
    onClose(); // 关闭对话框
    router.push("/transactions/new"); // 跳转到添加交易页面
  };

  if (!isOpen && !showToast) return null;

  return (
    <>
      {isOpen && (
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
                <p className="smart-accounting-processing-text">{processingStep || "正在处理..."}</p>
              </div>
            ) : (
              <>
                <div className="smart-accounting-dialog-content">
                  <p className="smart-accounting-dialog-subtitle">输入一句话，自动识别记账信息</p>
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
      )}

      {/* 交易记录顶部弹窗 */}
      <TransactionToast
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        transaction={transactionResult}
        processingStep={processingStep}
        isProcessing={isProcessing && !isOpen}
      />
    </>
  );
}
