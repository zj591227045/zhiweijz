"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

export default function ThemeSettingsPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);

  // 获取主题列表
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch('/api/themes');
        if (response.ok) {
          const data = await response.json();
          setThemes(data);
        } else {
          toast.error('获取主题列表失败');
        }
      } catch (error) {
        console.error('获取主题列表失败:', error);
        toast.error('获取主题列表失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemes();
  }, []);

  // 切换主题
  const handleThemeSelect = async (themeId: string) => {
    try {
      const response = await fetch('/api/themes/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId }),
      });

      if (response.ok) {
        toast.success('主题切换成功');
        // 更新主题状态
        setThemes(prev => prev.map(theme => ({
          ...theme,
          isActive: theme.id === themeId,
        })));
        
        // 刷新页面以应用新主题
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.message || '切换主题失败');
      }
    } catch (error) {
      console.error('切换主题失败:', error);
      toast.error('切换主题失败');
    }
  };

  // 删除自定义主题
  const handleDeleteTheme = async () => {
    if (!themeToDelete) return;

    try {
      const response = await fetch(`/api/themes/${themeToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('主题删除成功');
        setThemes(prev => prev.filter(theme => theme.id !== themeToDelete.id));
        setShowDeleteDialog(false);
        setThemeToDelete(null);
      } else {
        const error = await response.json();
        toast.error(error.message || '删除主题失败');
      }
    } catch (error) {
      console.error('删除主题失败:', error);
      toast.error('删除主题失败');
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <Link href="/settings/theme/editor" className="icon-button" title="创建主题">
      <i className="fas fa-plus"></i>
    </Link>
  );

  // 分组主题
  const builtInThemes = themes.filter(theme => theme.type === 'built-in');
  const customThemes = themes.filter(theme => theme.type === 'custom');
  const activeTheme = themes.find(theme => theme.isActive);

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
              {builtInThemes.map((theme) => (
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

          {/* 创建主题按钮 */}
          <div className="create-theme-section">
            <Link href="/settings/theme/editor" className="create-theme-button">
              <i className="fas fa-plus"></i>
              创建自定义主题
            </Link>
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
