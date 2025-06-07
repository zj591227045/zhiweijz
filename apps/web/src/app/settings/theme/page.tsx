'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useThemeStore } from '@/store/theme-store';

// 导入样式
import './theme-settings.css';

interface Theme {
  id: string;
  name: string;
  description?: string;
  type: 'built-in' | 'custom';
  isActive: boolean;
  preview?: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
}

// 内置主题配置
const builtInThemes: Theme[] = [
  {
    id: 'light-blue',
    name: '浅色蓝色',
    description: '经典的浅色蓝色主题',
    type: 'built-in',
    isActive: false,
    preview: {
      primaryColor: '#3B82F6',
      backgroundColor: '#F9FAFB',
      textColor: '#1F2937',
    },
  },
  {
    id: 'light-green',
    name: '浅色绿色',
    description: '清新的浅色绿色主题',
    type: 'built-in',
    isActive: false,
    preview: {
      primaryColor: '#10B981',
      backgroundColor: '#F9FAFB',
      textColor: '#1F2937',
    },
  },
  {
    id: 'light-purple',
    name: '浅色紫色',
    description: '优雅的浅色紫色主题',
    type: 'built-in',
    isActive: false,
    preview: {
      primaryColor: '#8B5CF6',
      backgroundColor: '#F9FAFB',
      textColor: '#1F2937',
    },
  },
  {
    id: 'light-pink',
    name: '浅色粉色',
    description: '温柔的浅色粉色主题',
    type: 'built-in',
    isActive: false,
    preview: {
      primaryColor: '#EC4899',
      backgroundColor: '#F9FAFB',
      textColor: '#1F2937',
    },
  },
  {
    id: 'light-orange-light',
    name: '浅色橘黄',
    description: '活力的浅色橘黄主题',
    type: 'built-in',
    isActive: false,
    preview: {
      primaryColor: '#FB923C',
      backgroundColor: '#F9FAFB',
      textColor: '#1F2937',
    },
  },
  {
    id: 'dark',
    name: '深色主题',
    description: '护眼的深色主题',
    type: 'built-in',
    isActive: false,
    preview: {
      primaryColor: '#60A5FA',
      backgroundColor: '#111827',
      textColor: '#F3F4F6',
    },
  },
];

export default function ThemeSettingsPage() {
  const router = useRouter();
  const { theme, themeColor, setTheme, setThemeColor } = useThemeStore();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);

  // 获取主题列表
  useEffect(() => {
    const loadThemes = () => {
      try {
        // 使用内置主题，并根据当前主题状态设置激活状态
        const currentThemeId = theme === 'dark' ? 'dark' : `light-${themeColor}`;
        const themesWithActiveState = builtInThemes.map((t) => ({
          ...t,
          isActive: t.id === currentThemeId,
        }));

        setThemes(themesWithActiveState);
      } catch (error) {
        console.error('加载主题列表失败:', error);
        toast.error('加载主题列表失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadThemes();
  }, [theme, themeColor]);

  // 切换主题
  const handleThemeSelect = async (themeId: string) => {
    try {
      // 解析主题ID并应用主题
      if (themeId === 'dark') {
        setTheme('dark');
      } else if (themeId.startsWith('light-')) {
        const color = themeId.replace('light-', '') as any;
        setTheme('light');
        setThemeColor(color);
      }

      // 更新主题状态
      setThemes((prev) =>
        prev.map((theme) => ({
          ...theme,
          isActive: theme.id === themeId,
        })),
      );

      toast.success('主题切换成功');
    } catch (error) {
      console.error('切换主题失败:', error);
      toast.error('切换主题失败');
    }
  };

  // 删除自定义主题
  const handleDeleteTheme = async () => {
    if (!themeToDelete) return;

    try {
      // 目前只支持内置主题，不支持删除
      toast.error('内置主题无法删除');
      setShowDeleteDialog(false);
      setThemeToDelete(null);
    } catch (error) {
      console.error('删除主题失败:', error);
      toast.error('删除主题失败');
    }
  };

  // 右侧操作按钮 - 暂时隐藏主题编辑器入口
  const rightActions = null;

  // 分组主题
  const builtInThemesList = themes.filter((theme) => theme.type === 'built-in');
  const customThemes = themes.filter((theme) => theme.type === 'custom');
  const activeTheme = themes.find((theme) => theme.isActive);

  return (
    <PageContainer
      title="主题设置"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : (
        <>
          {/* 当前主题 */}
          {activeTheme && (
            <div className="current-theme-section">
              <h3 className="section-title">当前主题</h3>
              <div className="current-theme-card">
                <div className="theme-preview">
                  {activeTheme.preview && (
                    <div className="preview-colors">
                      <div
                        className="color-dot"
                        style={{ backgroundColor: activeTheme.preview.primaryColor }}
                      />
                      <div
                        className="color-dot"
                        style={{ backgroundColor: activeTheme.preview.backgroundColor }}
                      />
                      <div
                        className="color-dot"
                        style={{ backgroundColor: activeTheme.preview.textColor }}
                      />
                    </div>
                  )}
                </div>
                <div className="theme-info">
                  <div className="theme-name">{activeTheme.name}</div>
                  {activeTheme.description && (
                    <div className="theme-description">{activeTheme.description}</div>
                  )}
                  <div className="theme-type">
                    {activeTheme.type === 'built-in' ? '内置主题' : '自定义主题'}
                  </div>
                </div>
                {activeTheme.type === 'custom' && (
                  <div className="theme-actions">
                    <Link
                      href={`/settings/theme/editor?id=${activeTheme.id}`}
                      className="edit-button"
                      title="编辑主题"
                    >
                      <i className="fas fa-edit"></i>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 内置主题 */}
          <div className="themes-section">
            <h3 className="section-title">内置主题</h3>
            <div className="themes-grid">
              {builtInThemesList.map((theme) => (
                <div
                  key={theme.id}
                  className={`theme-card ${theme.isActive ? 'active' : ''}`}
                  onClick={() => !theme.isActive && handleThemeSelect(theme.id)}
                >
                  <div className="theme-preview">
                    {theme.preview && (
                      <div className="preview-colors">
                        <div
                          className="color-dot"
                          style={{ backgroundColor: theme.preview.primaryColor }}
                        />
                        <div
                          className="color-dot"
                          style={{ backgroundColor: theme.preview.backgroundColor }}
                        />
                        <div
                          className="color-dot"
                          style={{ backgroundColor: theme.preview.textColor }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="theme-info">
                    <div className="theme-name">{theme.name}</div>
                    {theme.description && (
                      <div className="theme-description">{theme.description}</div>
                    )}
                  </div>
                  {theme.isActive && (
                    <div className="active-indicator">
                      <i className="fas fa-check"></i>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 自定义主题 */}
          {customThemes.length > 0 && (
            <div className="themes-section">
              <h3 className="section-title">自定义主题</h3>
              <div className="themes-grid">
                {customThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`theme-card ${theme.isActive ? 'active' : ''}`}
                    onClick={() => !theme.isActive && handleThemeSelect(theme.id)}
                  >
                    <div className="theme-preview">
                      {theme.preview && (
                        <div className="preview-colors">
                          <div
                            className="color-dot"
                            style={{ backgroundColor: theme.preview.primaryColor }}
                          />
                          <div
                            className="color-dot"
                            style={{ backgroundColor: theme.preview.backgroundColor }}
                          />
                          <div
                            className="color-dot"
                            style={{ backgroundColor: theme.preview.textColor }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="theme-info">
                      <div className="theme-name">{theme.name}</div>
                      {theme.description && (
                        <div className="theme-description">{theme.description}</div>
                      )}
                    </div>
                    <div className="theme-actions">
                      <Link
                        href={`/settings/theme/editor?id=${theme.id}`}
                        className="edit-button"
                        title="编辑主题"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <i className="fas fa-edit"></i>
                      </Link>
                      <button
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setThemeToDelete(theme);
                          setShowDeleteDialog(true);
                        }}
                        title="删除主题"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                    {theme.isActive && (
                      <div className="active-indicator">
                        <i className="fas fa-check"></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 主题说明 */}
          <div className="theme-info-section">
            <div className="info-card">
              <div className="info-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <div className="info-content">
                <div className="info-title">主题说明</div>
                <div className="info-text">
                  选择您喜欢的主题颜色，主题设置会自动保存并应用到整个应用。
                  深色主题可以减少眼部疲劳，特别适合在光线较暗的环境中使用。
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="删除主题"
        message={`确定要删除主题 "${themeToDelete?.name}" 吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDeleteTheme}
        onCancel={() => setShowDeleteDialog(false)}
        isDangerous
      />
    </PageContainer>
  );
}
