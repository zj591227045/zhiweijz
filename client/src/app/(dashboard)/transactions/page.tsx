import { Metadata } from "next";
import { TransactionListPage } from "@/components/transactions/transaction-list-page";
import "./transactions.css";

export const metadata: Metadata = {
  title: "交易记录 - 只为记账",
  description: "查看和管理您的交易记录",
};

export default function TransactionsPage() {
  return <TransactionListPage />;
}
