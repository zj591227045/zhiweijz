import { redirect } from 'next/navigation';

// 重定向到主预算页面，因为预算列表功能已经在 /budgets 中实现
export default function BudgetList() {
  redirect('/budgets');
}
