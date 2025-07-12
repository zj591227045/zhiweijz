'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  UsersIcon,
  CogIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  MicrophoneIcon,
  EyeIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const navigation = [
  { name: '仪表盘', href: '/admin', icon: HomeIcon, current: false },
  { 
    name: '用户管理', 
    href: '/admin/users', 
    icon: UsersIcon, 
    current: false,
    children: [
      { name: '用户列表', href: '/admin/users', current: false },
      { name: '记账点管理', href: '/admin/accounting-points', current: false },
      { name: '会员管理', href: '/admin/membership', current: false }
    ]
  },
  {
    name: 'LLM管理',
    href: '/admin/llm',
    icon: CogIcon,
    current: false,
    children: [
      { name: '配置管理', href: '/admin/llm', current: false },
      { name: '多提供商管理', href: '/admin/multi-provider-llm', current: false },
      { name: '调用日志', href: '/admin/llm/logs', current: false }
    ]
  },
  { name: '多模态AI', href: '/admin/multimodal-ai', icon: MicrophoneIcon, current: false },
  { name: '文件存储', href: '/admin/storage', icon: CloudArrowUpIcon, current: false },
  { name: '公告管理', href: '/admin/announcements', icon: SpeakerWaveIcon, current: false },
  { name: '统计分析', href: '/admin/analytics', icon: ChartBarIcon, current: false },
];

export function AdminSidebar({ isOpen, onClose, isMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { config } = useSystemConfig();

  // 根据系统配置过滤导航项
  const getFilteredNavigation = () => {
    return navigation.map(item => {
      if (item.name === '用户管理' && item.children) {
        // 过滤用户管理子菜单
        const filteredChildren = item.children.filter(child => {
          if (child.name === '记账点管理' && !config.accountingPointsEnabled) {
            return false;
          }
          if (child.name === '会员管理' && !config.membershipEnabled) {
            return false;
          }
          return true;
        });
        
        return {
          ...item,
          children: filteredChildren
        };
      }
      return item;
    });
  };

  const navItems = getFilteredNavigation().map(item => ({
    ...item,
    current: pathname === item.href,
  }));

  return (
    <>
      {/* 桌面端侧边栏 */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isMobile ? 'w-64' : 'w-64'}
        bg-white shadow-lg transition-transform duration-300 ease-in-out
      `}>
        <div className="flex flex-col h-full">
          {/* Logo区域 */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="ml-3 text-lg font-semibold text-gray-900">只为记账</span>
            </div>
            
            {/* 移动端关闭按钮 */}
            {isMobile && (
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isParentActive = hasChildren && item.children.some(child => pathname === child.href);
              
              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    onClick={isMobile ? onClose : undefined}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${item.current || isParentActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700 border-r-2'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon
                      className={`
                        mr-3 h-5 w-5
                        ${item.current || isParentActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    {item.name}
                  </Link>
                  
                  {/* 子菜单 */}
                  {hasChildren && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          onClick={isMobile ? onClose : undefined}
                          className={`
                            block px-3 py-2 text-sm rounded-md transition-colors
                            ${pathname === child.href
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 底部信息 */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>管理后台</p>
              <p className="mt-1">v0.2.5</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 