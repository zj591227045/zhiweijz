'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { ChangePasswordModal } from './ChangePasswordModal';
import { 
  Bars3Icon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface AdminHeaderProps {
  onMenuClick: () => void;
  isMobile: boolean;
}

export function AdminHeader({ onMenuClick, isMobile }: AdminHeaderProps) {
  const router = useRouter();
  const { admin, logout } = useAdminAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const handleChangePassword = () => {
    setIsDropdownOpen(false);
    setShowChangePasswordModal(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-6">
          {/* 左侧：菜单按钮 */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* 页面标题 */}
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900">管理后台</h1>
            </div>
          </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center space-x-4">
            {/* 管理员信息下拉菜单 */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* 头像 */}
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {admin?.username?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                
                {/* 用户信息 */}
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {admin?.username || '管理员'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {admin?.role === 'SUPER_ADMIN' ? '超级管理员' : '管理员'}
                  </div>
                </div>
                
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </button>

              {/* 下拉菜单 */}
              {isDropdownOpen && (
                <>
                  {/* 遮罩层 */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  
                  {/* 下拉内容 */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="p-4 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        {admin?.username}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {admin?.email || '无邮箱'}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {admin?.role === 'SUPER_ADMIN' ? '超级管理员' : '管理员'}
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={handleChangePassword}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <KeyIcon className="h-4 w-4 mr-3" />
                        修改密码
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                        退出登录
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 修改密码弹窗 */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </>
  );
} 