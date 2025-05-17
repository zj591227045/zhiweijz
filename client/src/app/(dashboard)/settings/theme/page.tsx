"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-container";
import { useAuthStore } from "@/store/auth-store";
import { useThemeStore } from "@/store/theme-store";
import { useExtendedThemeStore } from "@/store/theme-store-extended";
import { CurrentThemePreview } from "./components/current-theme-preview";
import { BuiltInThemes } from "./components/built-in-themes";
import { CustomThemes } from "./components/custom-themes";
import { ThemeImportExport } from "./components/theme-import-export";
import { ThemeImportDialog } from "./components/theme-import-dialog";
import { ThemeDeleteDialog } from "./components/theme-delete-dialog";

// 导入自定义CSS样式
import "./theme-settings.css";

export default function ThemeSettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { theme, themeColor } = useThemeStore();
  const {
    builtInThemes,
    customThemes,
    currentThemeId,
    isCustomTheme,
    isLoading,
    error,
    fetchThemes,
    switchTheme,
    deleteTheme,
    importTheme,
    exportTheme,
  } = useExtendedThemeStore();

  // 对话框状态
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 获取主题列表
  useEffect(() => {
    if (isAuthenticated) {
      const loadThemes = async () => {
        try {
          await fetchThemes();
        } catch (err) {
          toast.error("获取主题列表失败");
        } finally {
          setIsPageLoading(false);
        }
      };

      loadThemes();
    }
  }, [isAuthenticated, fetchThemes]);

  // 监听错误
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 打开导入对话框
  const handleOpenImportDialog = () => {
    setIsImportDialogOpen(true);
  };

  // 关闭导入对话框
  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false);
  };

  // 打开删除确认对话框
  const handleOpenDeleteDialog = (themeId: string) => {
    setThemeToDelete(themeId);
    setIsDeleteDialogOpen(true);
  };

  // 关闭删除确认对话框
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setThemeToDelete(null);
  };

  // 确认删除主题
  const handleConfirmDelete = async () => {
    if (themeToDelete) {
      try {
        await deleteTheme(themeToDelete);
        toast.success("主题删除成功");
        handleCloseDeleteDialog();
      } catch (err) {
        toast.error("删除主题失败");
      }
    }
  };

  // 导出当前主题
  const handleExportTheme = async () => {
    try {
      await exportTheme(currentThemeId);
      toast.success("主题导出成功");
    } catch (err) {
      toast.error("导出主题失败");
    }
  };

  // 导入主题
  const handleImportTheme = async (file: File) => {
    try {
      await importTheme(file);
      toast.success("主题导入成功");
      handleCloseImportDialog();
    } catch (err) {
      toast.error("导入主题失败");
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button"
      onClick={() => setIsImportDialogOpen(true)}
      aria-label="导入/导出主题"
    >
      <i className="fas fa-ellipsis-v"></i>
    </button>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <PageContainer
      title="主题设置"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {isPageLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* 当前主题预览 */}
          <CurrentThemePreview
            currentThemeId={currentThemeId}
            isCustomTheme={isCustomTheme}
            builtInThemes={builtInThemes}
            customThemes={customThemes}
          />

          {/* 内置主题 */}
          <BuiltInThemes
            themes={builtInThemes}
            currentThemeId={currentThemeId}
            onThemeSelect={switchTheme}
            isLoading={isLoading}
          />

          {/* 自定义主题 */}
          <CustomThemes
            themes={customThemes}
            currentThemeId={currentThemeId}
            onThemeSelect={switchTheme}
            onDeleteTheme={handleOpenDeleteDialog}
            isLoading={isLoading}
          />

          {/* 导入导出按钮 */}
          <ThemeImportExport
            onImport={handleOpenImportDialog}
            onExport={handleExportTheme}
            isLoading={isLoading}
          />

          {/* 导入对话框 */}
          <ThemeImportDialog
            isOpen={isImportDialogOpen}
            onClose={handleCloseImportDialog}
            onImport={handleImportTheme}
            isLoading={isLoading}
          />

          {/* 删除确认对话框 */}
          <ThemeDeleteDialog
            isOpen={isDeleteDialogOpen}
            onClose={handleCloseDeleteDialog}
            onConfirm={handleConfirmDelete}
            isLoading={isLoading}
          />
        </>
      )}
    </PageContainer>
  );
}
