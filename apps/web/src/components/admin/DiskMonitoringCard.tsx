'use client';

interface DiskDrive {
  drive: string;
  total: number;
  used: number;
  free: number;
  usagePercent: number;
  filesystem: string;
  note?: string;
  error?: string;
}

interface DiskInfo {
  drives: DiskDrive[];
  total: number;
  used: number;
  free: number;
  usagePercent: number;
  error?: string;
}

interface DiskMonitoringCardProps {
  data: DiskInfo | null;
  isLoading?: boolean;
}

export function DiskMonitoringCard({ data, isLoading = false }: DiskMonitoringCardProps) {
  // 格式化字节数
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取使用率颜色
  const getUsageColor = (percent: number) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 80) return 'bg-orange-500';
    if (percent > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 获取使用率文本颜色
  const getUsageTextColor = (percent: number) => {
    if (percent > 90) return 'text-red-600';
    if (percent > 80) return 'text-orange-600';
    if (percent > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-4 w-32"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
              <div className="flex justify-between">
                <div className="h-2 bg-gray-200 rounded w-16"></div>
                <div className="h-2 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">磁盘空间监控</h3>
        <div className="h-32 flex items-center justify-center text-gray-500">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">磁盘空间监控</h3>

      {data.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{data.error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 总体磁盘使用情况 */}
        {data.total > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900">总体使用情况</h4>
              <span className={`text-sm font-semibold ${getUsageTextColor(data.usagePercent)}`}>
                {data.usagePercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(data.usagePercent)}`}
                style={{ width: `${data.usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>已用: {formatBytes(data.used)}</span>
              <span>可用: {formatBytes(data.free)}</span>
              <span>总计: {formatBytes(data.total)}</span>
            </div>
          </div>
        )}

        {/* 各驱动器详情 */}
        {data.drives && data.drives.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">驱动器详情</h4>
            <div className="space-y-4">
              {data.drives.map((drive, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{drive.drive}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {drive.filesystem}
                      </span>
                    </div>
                    {drive.total > 0 && (
                      <span
                        className={`text-sm font-semibold ${getUsageTextColor(drive.usagePercent)}`}
                      >
                        {drive.usagePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {drive.total > 0 ? (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(drive.usagePercent)}`}
                          style={{ width: `${drive.usagePercent}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="block text-gray-500">已用</span>
                          <span className="font-medium">{formatBytes(drive.used)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500">可用</span>
                          <span className="font-medium">{formatBytes(drive.free)}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500">总计</span>
                          <span className="font-medium">{formatBytes(drive.total)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      {drive.note || drive.error || '无法获取磁盘信息'}
                    </div>
                  )}

                  {drive.note && drive.total > 0 && (
                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {drive.note}
                    </div>
                  )}

                  {drive.error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      {drive.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 磁盘健康状态指示器 */}
        {data.drives && data.drives.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">磁盘健康状态</h4>
            <div className="flex flex-wrap gap-2">
              {data.drives.map((drive, index) => {
                if (drive.total === 0) return null;
                return (
                  <div key={index} className="flex items-center space-x-1">
                    <div
                      className={`w-3 h-3 rounded-full ${getUsageColor(drive.usagePercent)}`}
                      title={`${drive.drive}: ${drive.usagePercent.toFixed(1)}%`}
                    />
                    <span className="text-xs text-gray-600">{drive.drive}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <span className="inline-flex items-center mr-4">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                正常 (&lt;60%)
              </span>
              <span className="inline-flex items-center mr-4">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                注意 (60-80%)
              </span>
              <span className="inline-flex items-center mr-4">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                警告 (80-90%)
              </span>
              <span className="inline-flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                危险 (&gt;90%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
