import { BudgetStatisticsPage } from '@/components/budgets/budget-statistics-page';
import { Metadata } from 'next';
import './statistics.css';

export const metadata: Metadata = {
  title: '预算统计 - 只为记账',
  description: '查看您的预算使用情况和统计分析',
};

export default function BudgetStatistics() {
  return <BudgetStatisticsPage />;
}
