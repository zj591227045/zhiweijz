import { StatisticsPage } from '@/components/statistics/statistics-page';
import { Metadata } from 'next';
import './statistics.css';

export const metadata: Metadata = {
  title: '统计分析 - 只为记账',
  description: '查看您的财务统计和分析',
};

export default function Statistics() {
  return <StatisticsPage />;
}
