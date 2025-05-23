import { BudgetListPage } from "@/components/budgets/budget-list-page";
import { Metadata } from "next";
import "./budgets.css";

export const metadata: Metadata = {
  title: "预算管理 - 只为记账",
  description: "管理您的个人和通用预算",
};

export default function BudgetsPage() {
  return <BudgetListPage />;
}
