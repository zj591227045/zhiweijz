"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBudgetFormStore } from "@/store/budget-form-store";
import { budgetFormSchema, BudgetFormValues } from "@/lib/validations/budget";
import { accountBookService } from "@/lib/api/budget-service";
import { categoryService } from "@/lib/api/category-service";
import { AccountBookSection } from "./account-book-section";
import { BasicInfoSection } from "./basic-info-section";
import { CategoryBudgetSection } from "./category-budget-section";
import { RolloverSection } from "./rollover-section";

interface BudgetFormProps {
  mode: "create" | "edit";
  budgetId?: string;
}

export function BudgetForm({ mode, budgetId }: BudgetFormProps) {
  const router = useRouter();
  const {
    setMode,
    setBudgetId,
    setAccountBooks,
    setCategories,
    loadBudgetData,
    submitForm,
    isLoading,
    isSubmitting,
    resetForm,
  } = useBudgetFormStore();

  // 设置表单模式
  useEffect(() => {
    setMode(mode);
    if (mode === "edit" && budgetId) {
      setBudgetId(budgetId);
      loadBudgetData(budgetId);
    } else {
      resetForm();
    }
  }, [mode, budgetId, setMode, setBudgetId, loadBudgetData, resetForm]);

  // 获取账本列表
  const { data: accountBooks = [] } = useQuery({
    queryKey: ["accountBooks"],
    queryFn: accountBookService.getAccountBooks,
    onSuccess: (data) => {
      setAccountBooks(data);
      // 如果是创建模式且有默认账本，自动选择默认账本
      if (mode === "create" && data.length > 0) {
        const defaultBook = data.find((book) => book.isDefault);
        if (defaultBook) {
          useBudgetFormStore.getState().setSelectedAccountBook(defaultBook.id);
        } else {
          useBudgetFormStore.getState().setSelectedAccountBook(data[0].id);
        }
      }
    },
  });

  // 获取支出分类列表
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => categoryService.getCategories({ type: "EXPENSE" }),
    onSuccess: (data) => {
      setCategories(data);
    },
  });

  // 表单处理
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: "",
      amount: 0,
      periodType: "MONTHLY",
      startDate: "",
      endDate: "",
      accountBookId: "",
      enableCategoryBudget: false,
      enableRollover: false,
    },
  });

  // 处理表单提交
  const onSubmit = async () => {
    await submitForm();
  };

  // 处理取消
  const handleCancel = () => {
    router.push("/budgets");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="budget-form">
      {/* 账本选择区块 */}
      <AccountBookSection />

      {/* 基本信息区块 */}
      <BasicInfoSection />

      {/* 分类预算区块 */}
      <CategoryBudgetSection />

      {/* 结转设置区块 */}
      <RolloverSection />

      {/* 提交按钮 */}
      <div className="form-actions">
        <button
          type="button"
          className="cancel-button"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="submit"
          className="submit-button"
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner"></span>
              {mode === "create" ? "保存中..." : "更新中..."}
            </>
          ) : (
            mode === "create" ? "保存预算" : "保存修改"
          )}
        </button>
      </div>
    </form>
  );
}
