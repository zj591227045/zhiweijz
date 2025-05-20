import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface BudgetTrendChartProps {
  data: Array<{
    date: string;
    amount: number;
    rolloverAmount?: number;
  }>;
}

const BudgetTrendChart: React.FC<BudgetTrendChartProps> = ({ data }) => {
  const [timeRange, setTimeRange] = useState<'6m' | '1y'>('6m');
  
  // Filter data based on time range selection
  const filteredData = timeRange === '6m' 
    ? data.slice(-6) 
    : data;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as '6m' | '1y')}
          className="px-3 py-1 border rounded-md text-sm"
        >
          <option value="6m">最近6个月</option>
          <option value="1y">最近1年</option>
        </select>
      </div>
      
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart
            data={filteredData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <YAxis 
              tickFormatter={(value: number) => `¥${value}`}
              tick={{ fill: 'var(--text-secondary)' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `¥${value}`, 
                name === 'amount' ? '预算金额' : '结转金额'
              ]}
              labelFormatter={(label) => `日期: ${label}`}
              contentStyle={{
                background: 'var(--background-secondary)',
                borderColor: 'var(--border-color)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--text-primary)'
              }}
            />
            <Legend />
            <Bar 
              dataKey="amount" 
              name="预算金额"
              fill="var(--primary-color)"
            />
            {filteredData.some(d => d.rolloverAmount) && (
              <Bar 
                dataKey="rolloverAmount" 
                name="结转金额"
                fill="var(--secondary-color)"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export { BudgetTrendChart };