import { TagAnalysisPage } from '@/components/statistics/tag-analysis-page';
import { Metadata } from 'next';
import './tag-analysis.css';

export const metadata: Metadata = {
  title: '按标签分析 - 只为记账',
  description: '查看按标签分类的财务统计和分析',
};

export default function TagAnalysis() {
  return <TagAnalysisPage />;
}
