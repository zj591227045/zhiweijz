import { AnnouncementStats as StatsType } from '@/store/admin/useAnnouncementManagement';
import { 
  DocumentTextIcon,
  CheckCircleIcon,
  DocumentIcon,
  ArchiveBoxIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface AnnouncementStatsProps {
  stats: StatsType;
}

export function AnnouncementStats({ stats }: AnnouncementStatsProps) {
  const statItems = [
    {
      name: '总公告数',
      value: stats.totalCount,
      icon: DocumentTextIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: '已发布',
      value: stats.publishedCount,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: '草稿',
      value: stats.draftCount,
      icon: DocumentIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      name: '已归档',
      value: stats.archivedCount,
      icon: ArchiveBoxIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: '总阅读次数',
      value: stats.totalReadCount,
      icon: EyeIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">公告统计</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statItems.map((item) => (
          <div key={item.name} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${item.bgColor} rounded-md p-3`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{item.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 百分比统计 */}
      {stats.totalCount > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">发布率</span>
              <span className="text-lg font-semibold text-green-600">
                {((stats.publishedCount / stats.totalCount) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(stats.publishedCount / stats.totalCount) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">草稿率</span>
              <span className="text-lg font-semibold text-gray-600">
                {((stats.draftCount / stats.totalCount) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-600 h-2 rounded-full"
                style={{ width: `${(stats.draftCount / stats.totalCount) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">归档率</span>
              <span className="text-lg font-semibold text-yellow-600">
                {((stats.archivedCount / stats.totalCount) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full"
                style={{ width: `${(stats.archivedCount / stats.totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 平均阅读率 */}
      {stats.publishedCount > 0 && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">平均阅读情况</h4>
              <p className="text-xs text-blue-700 mt-1">
                基于已发布公告的阅读数据统计
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">
                {stats.publishedCount > 0 ? (stats.totalReadCount / stats.publishedCount).toFixed(1) : '0'}
              </p>
              <p className="text-xs text-blue-700">平均每个公告阅读次数</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 