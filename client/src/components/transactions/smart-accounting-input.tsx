"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTransactionFormStore } from "@/store/transaction-form-store";
import { useAccountBookStore } from "@/store/account-book-store";
import { apiClient } from "@/lib/api";
import { getCategories } from "@/lib/api/transaction-service";
import { TransactionType } from "@/types";

/**
 * 智能记账输入组件
 * 允许用户输入自然语言描述，调用智能记账API，并自动填充表单
 */
export function SmartAccountingInput() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentAccountBook } = useAccountBookStore();

  // 获取表单状态和操作函数
  const {
    amount,
    type,
    categoryId,
    categoryName,
    categoryIcon,
    description: formDescription,
    date,
    time,
    currentStep,
    setAmount,
    setType,
    setCategoryId,
    setCategoryName,
    setCategoryIcon,
    setCategory,
    setDescription: setFormDescription,
    setDate,
    setTime,
    goToStep
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

  // 调试用：监控表单状态变化
  useEffect(() => {
    console.log("表单状态变化:", {
      amount,
      type,
      categoryId,
      categoryName,
      categoryIcon,
      description: formDescription,
      date: date?.toISOString(),
      time,
      currentStep
    });
  }, [amount, type, categoryId, categoryName, categoryIcon, formDescription, date, time, currentStep]);

  // 处理智能记账
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
      toast.info("正在进行智能识别，请稍候...");

      // 调用智能记账API，使用更长的超时时间
      const response = await apiClient.post(
        `/ai/account/${currentAccountBook.id}/smart-accounting`,
        { description },
        { timeout: 60000 } // 设置60秒超时，智能记账可能需要更长时间
      );

      console.log("智能记账结果:", response);

      // 添加调试信息，查看响应的具体结构
      console.log("响应类型:", typeof response);
      console.log("响应字段:", Object.keys(response || {}));

      // 输出原始JSON字符串，便于调试
      try {
        console.log("原始JSON:", JSON.stringify(response, null, 2));
      } catch (e) {
        console.error("无法序列化响应:", e);
      }

      if (response) {
        // 填充表单数据 - 处理不同的响应结构
        let result = extractSmartAccountingResult(response);

        // 调试输出
        console.log("处理的数据:", result);

        // 填充金额
        if (result.amount) {
          console.log("设置金额:", result.amount);
          setAmount(result.amount.toString());
        }

        // 填充交易类型 - 必须在设置分类之前设置类型
        if (result.type) {
          console.log("设置类型:", result.type);
          setType(result.type);
        }

        // 填充分类信息
        if (result.categoryId) {
          console.log("设置分类ID:", result.categoryId);

          // 尝试查找完整的分类信息
          const category = findCategoryById(result.categoryId, result.type || "EXPENSE");

          if (category) {
            // 如果找到分类，使用setCategory方法一次性设置所有分类信息
            console.log("找到分类信息:", category);
            setCategory(
              category.id,
              category.name,
              category.icon || null
            );
          } else {
            // 如果没有找到分类，分别设置ID、名称和图标
            setCategoryId(result.categoryId);

            if (result.categoryName) {
              console.log("设置分类名称:", result.categoryName);
              setCategoryName(result.categoryName);
            }

            if (result.categoryIcon) {
              console.log("设置分类图标:", result.categoryIcon);
              setCategoryIcon(result.categoryIcon);
            }
          }
        }

        // 设置描述/备注
        if (result.note) {
          console.log("设置备注(note):", result.note);
          setFormDescription(result.note);
        } else if (result.description) {
          // 备选字段
          console.log("设置备注(description):", result.description);
          setFormDescription(result.description);
        } else if (result.originalDescription) {
          // 另一个备选字段
          console.log("设置备注(originalDescription):", result.originalDescription);
          setFormDescription(result.originalDescription);
        }

        // 设置日期和时间
        if (result.date) {
          console.log("设置日期:", result.date);
          try {
            const date = new Date(result.date);
            setDate(date);

            // 设置时间
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
            console.log("设置时间:", `${hours}:${minutes}`);
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
        console.log("跳转到第二步");
        goToStep(2);

        toast.success("智能识别成功");
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
      toast.info("正在处理，请稍候...");

      // 调用直接添加记账API，使用更长的超时时间
      const response = await apiClient.post(
        `/ai/account/${currentAccountBook.id}/smart-accounting/direct`,
        { description },
        { timeout: 60000 } // 设置60秒超时
      );

      console.log("直接添加记账结果:", response);
      console.log("响应类型:", typeof response);
      console.log("响应字段:", Object.keys(response || {}));

      // 输出原始JSON字符串，便于调试
      try {
        console.log("原始JSON:", JSON.stringify(response, null, 2));
      } catch (e) {
        console.error("无法序列化响应:", e);
      }

      if (response && response.id) {
        console.log("记账成功，交易ID:", response.id);
        toast.success("记账成功");
        // 跳转到仪表盘页面
        router.push("/dashboard");
      } else if (response) {
        // 如果创建交易失败但返回了智能记账结果，可以尝试填充表单
        console.log("尝试提取智能记账结果");
        const result = extractSmartAccountingResult(response);
        console.log("提取的结果:", result);

        if (result.amount) {
          console.log("设置金额:", result.amount);
          setAmount(result.amount.toString());
        }

        // 先设置类型
        if (result.type) {
          console.log("设置类型:", result.type);
          setType(result.type);
        }

        // 设置分类信息
        if (result.categoryId) {
          console.log("设置分类ID:", result.categoryId);

          // 尝试查找完整的分类信息
          const category = findCategoryById(result.categoryId, result.type || "EXPENSE");

          if (category) {
            // 如果找到分类，使用setCategory方法一次性设置所有分类信息
            console.log("找到分类信息:", category);
            setCategory(
              category.id,
              category.name,
              category.icon || null
            );
          } else {
            // 如果没有找到分类，分别设置ID、名称和图标
            setCategoryId(result.categoryId);

            if (result.categoryName) {
              console.log("设置分类名称:", result.categoryName);
              setCategoryName(result.categoryName);
            }
          }
        }

        // 设置描述/备注
        if (result.note) {
          console.log("设置备注:", result.note);
          setFormDescription(result.note);
        } else if (result.description) {
          console.log("设置备注(description):", result.description);
          setFormDescription(result.description);
        } else if (result.originalDescription) {
          console.log("设置备注(originalDescription):", result.originalDescription);
          setFormDescription(result.originalDescription);
        }

        if (result.date) {
          console.log("设置日期:", result.date);
          try {
            const date = new Date(result.date);
            setDate(date);

            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
            console.log("设置时间:", `${hours}:${minutes}`);
          } catch (dateError) {
            console.error("日期转换错误:", dateError);
            // 使用当前日期
            const now = new Date();
            setDate(now);
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            setTime(`${hours}:${minutes}`);
          }
        }

        console.log("跳转到第二步");
        goToStep(2);

        toast.warning("直接添加失败，但已填充表单，请检查后手动保存");
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
    }
  };

  return (
    <div className="smart-accounting-container">
      <div className="smart-accounting-header">
        <h3 className="smart-accounting-title">智能记账</h3>
        <p className="smart-accounting-subtitle">输入一句话，自动识别记账信息</p>
      </div>

      <div className="smart-accounting-input-wrapper">
        <textarea
          className="smart-accounting-textarea"
          placeholder="例如：昨天在沃尔玛买了日用品，花了128.5元"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="smart-accounting-buttons">
        <button
          className="smart-accounting-button identify-button"
          onClick={handleSmartAccounting}
          disabled={isProcessing}
        >
          {isProcessing ? "识别中..." : "智能识别"}
        </button>

        <button
          className="smart-accounting-button direct-button"
          onClick={handleDirectAdd}
          disabled={isProcessing}
        >
          {isProcessing ? "添加中..." : "直接添加"}
        </button>
      </div>
    </div>
  );
}
