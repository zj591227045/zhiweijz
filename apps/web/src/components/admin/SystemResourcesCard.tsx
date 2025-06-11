'use client';

interface SystemResourcesCardProps {
  data: any;
  isLoading?: boolean;
}

export function SystemResourcesCard({ data, isLoading = false }: SystemResourcesCardProps) {
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-4 w-24"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">系统资源</h3>
        <div className="h-32 flex items-center justify-center text-gray-500">
          暂无数据
        </div>
      </div>
    );
  }

  // 格式化字节数
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化运行时间
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const memoryUsagePercent = data.memory?.usagePercent || 0;
  const cpuLoad1Min = data.cpu?.loadAverage?.['1min'] || 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">系统资源</h3>
      
      <div className="space-y-4">
        {/* 内存使用情况 */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>内存使用</span>
            <span>{memoryUsagePercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                memoryUsagePercent > 80 ? 'bg-red-500' : 
                memoryUsagePercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${memoryUsagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>已用: {formatBytes(data.memory?.used || 0)}</span>
            <span>总计: {formatBytes(data.memory?.total || 0)}</span>
          </div>
        </div>

        {/* CPU负载 */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>CPU 负载</span>
            <span>{cpuLoad1Min.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                cpuLoad1Min > 2 ? 'bg-red-500' : 
                cpuLoad1Min > 1 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(cpuLoad1Min * 50, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            1分钟平均负载
          </div>
        </div>

        {/* 进程内存 */}
        {data.memory?.process && (
          <div>
            <div className="text-sm text-gray-600 mb-2">进程内存</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">RSS: </span>
                <span className="font-medium">{formatBytes(data.memory.process.rss)}</span>
              </div>
              <div>
                <span className="text-gray-500">堆: </span>
                <span className="font-medium">{formatBytes(data.memory.process.heapUsed)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 系统信息 */}
        <div className="pt-2 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>系统运行时间:</span>
              <span className="font-medium">{formatUptime(data.uptime?.system || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>进程运行时间:</span>
              <span className="font-medium">{formatUptime(data.uptime?.process || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>CPU 核心数:</span>
              <span className="font-medium">{data.cpu?.count || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Node.js 版本:</span>
              <span className="font-medium">{data.nodeVersion || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 