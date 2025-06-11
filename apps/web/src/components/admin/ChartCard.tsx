'use client';

interface ChartCardProps {
  title: string;
  data: any[];
  isLoading?: boolean;
  type: 'line' | 'bar';
  dataKey: string;
  xAxisKey: string;
  color: string;
}

export function ChartCard({ 
  title, 
  data, 
  isLoading = false, 
  type, 
  dataKey, 
  xAxisKey, 
  color 
}: ChartCardProps) {
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-4 w-32"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // 简单的条形图实现（不使用外部图表库）
  const maxValue = Math.max(...data.map(item => item[dataKey]));
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          暂无数据
        </div>
      ) : (
        <div className="h-64">
          {type === 'bar' ? (
            <div className="flex items-end justify-between h-full space-x-1">
              {data.map((item, index) => {
                const height = maxValue > 0 ? (item[dataKey] / maxValue) * 100 : 0;
                const date = new Date(item[xAxisKey]);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full rounded-t"
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: color,
                        minHeight: '2px'
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45">
                      {dateStr}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // 简单的折线图（使用SVG）
            <div className="relative h-full">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* 生成折线 */}
                {data.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={data.map((item, index) => {
                      const x = (index / (data.length - 1)) * 380 + 10;
                      const y = maxValue > 0 ? 190 - (item[dataKey] / maxValue) * 180 : 190;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                )}
                
                {/* 数据点 */}
                {data.map((item, index) => {
                  const x = (index / Math.max(data.length - 1, 1)) * 380 + 10;
                  const y = maxValue > 0 ? 190 - (item[dataKey] / maxValue) * 180 : 190;
                  
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={color}
                    />
                  );
                })}
              </svg>
              
              {/* X轴标签 */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                {data.map((item, index) => {
                  if (index % Math.ceil(data.length / 5) === 0) {
                    const date = new Date(item[xAxisKey]);
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                    return <span key={index}>{dateStr}</span>;
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 数据汇总 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>总计: {data.reduce((sum, item) => sum + item[dataKey], 0)}</span>
          <span>平均: {data.length > 0 ? Math.round(data.reduce((sum, item) => sum + item[dataKey], 0) / data.length) : 0}</span>
        </div>
      </div>
    </div>
  );
} 