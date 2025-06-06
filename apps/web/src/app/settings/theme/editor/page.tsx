'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { ThemeInfoForm, ThemeInfoFormValues } from '@/components/theme-editor/theme-info-form';
import { ColorPicker } from '@/components/theme-editor/color-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface ThemeVariable {
  name: string;
  label: string;
  value: string;
  category: string;
}

interface CustomTheme {
  id?: string;
  name: string;
  description?: string;
  baseTheme: string;
  variables: ThemeVariable[];
  createdAt?: string;
}

function ThemeEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const themeId = searchParams.get('id');
  const isEditMode = !!themeId;

  const [theme, setTheme] = useState<CustomTheme>({
    name: '',
    description: '',
    baseTheme: 'light',
    variables: [
      { name: '--primary-color', label: '主色调', value: '#3B82F6', category: '主要颜色' },
      { name: '--secondary-color', label: '次要色调', value: '#6B7280', category: '主要颜色' },
      { name: '--success-color', label: '成功色', value: '#10B981', category: '状态颜色' },
      { name: '--warning-color', label: '警告色', value: '#F59E0B', category: '状态颜色' },
      { name: '--error-color', label: '错误色', value: '#EF4444', category: '状态颜色' },
      { name: '--background-color', label: '背景色', value: '#FFFFFF', category: '背景颜色' },
      { name: '--surface-color', label: '表面色', value: '#F9FAFB', category: '背景颜色' },
      { name: '--text-primary', label: '主要文字', value: '#1F2937', category: '文字颜色' },
      { name: '--text-secondary', label: '次要文字', value: '#6B7280', category: '文字颜色' },
      { name: '--border-color', label: '边框色', value: '#E5E7EB', category: '边框颜色' },
    ],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<ThemeVariable | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 获取主题详情（编辑模式）
  useEffect(() => {
    if (isEditMode && themeId) {
      const fetchTheme = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/themes/${themeId}`);
          if (response.ok) {
            const data = await response.json();
            setTheme(data);
          } else {
            toast.error('获取主题详情失败');
            router.push('/settings/theme');
          }
        } catch (error) {
          console.error('获取主题详情失败:', error);
          toast.error('获取主题详情失败');
          router.push('/settings/theme');
        } finally {
          setIsLoading(false);
        }
      };
      fetchTheme();
    }
  }, [isEditMode, themeId, router]);

  // 处理主题信息提交
  const handleThemeInfoSubmit = (data: ThemeInfoFormValues) => {
    setTheme((prev) => ({
      ...prev,
      name: data.name,
      description: data.description,
      baseTheme: data.baseTheme,
    }));
    setHasUnsavedChanges(true);
  };

  // 处理颜色变量点击
  const handleVariableClick = (variable: ThemeVariable) => {
    setSelectedVariable(variable);
    setShowColorPicker(true);
  };

  // 处理颜色变更
  const handleColorChange = (newColor: string) => {
    if (selectedVariable) {
      setTheme((prev) => ({
        ...prev,
        variables: prev.variables.map((v) =>
          v.name === selectedVariable.name ? { ...v, value: newColor } : v,
        ),
      }));
      setHasUnsavedChanges(true);
    }
  };

  // 保存主题
  const handleSave = async () => {
    if (!theme.name.trim()) {
      toast.error('请输入主题名称');
      return;
    }

    setIsSaving(true);
    try {
      const url = isEditMode ? `/api/themes/${themeId}` : '/api/themes';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(theme),
      });

      if (response.ok) {
        toast.success(isEditMode ? '主题更新成功' : '主题创建成功');
        setHasUnsavedChanges(false);
        router.push('/settings/theme');
      } else {
        const error = await response.json();
        toast.error(error.message || '保存主题失败');
      }
    } catch (error) {
      console.error('保存主题失败:', error);
      toast.error('保存主题失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理返回
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      router.push('/settings/theme');
    }
  };

  // 应用主题预览
  const applyThemePreview = () => {
    const root = document.documentElement;
    theme.variables.forEach((variable) => {
      root.style.setProperty(variable.name, variable.value);
    });
  };

  // 实时预览
  useEffect(() => {
    applyThemePreview();
  }, [theme.variables]);

  // 按分类分组变量
  const groupedVariables = theme.variables.reduce(
    (groups, variable) => {
      const category = variable.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(variable);
      return groups;
    },
    {} as Record<string, ThemeVariable[]>,
  );

  if (isLoading) {
    return (
      <PageContainer title="主题编辑器" showBackButton={true} activeNavItem="profile">
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isEditMode ? '编辑主题' : '创建主题'}
      showBackButton={true}
      onBackClick={handleBack}
      activeNavItem="profile"
    >
      {/* 主题信息表单 */}
      <div className="theme-info-section">
        <ThemeInfoForm initialData={theme} onSubmit={handleThemeInfoSubmit} />
      </div>

      {/* 颜色变量编辑 */}
      <div className="color-variables-section">
        <h3 className="section-title">颜色配置</h3>
        {Object.entries(groupedVariables).map(([category, variables]) => (
          <div key={category} className="variable-group">
            <h4 className="group-title">{category}</h4>
            <div className="variables-grid">
              {variables.map((variable) => (
                <div
                  key={variable.name}
                  className="variable-item"
                  onClick={() => handleVariableClick(variable)}
                >
                  <div className="color-preview" style={{ backgroundColor: variable.value }} />
                  <div className="variable-info">
                    <div className="variable-label">{variable.label}</div>
                    <div className="variable-value">{variable.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 保存按钮 */}
      <div className="bottom-button-container">
        <button
          className={`save-button ${isSaving ? 'loading' : ''}`}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存主题'}
        </button>
      </div>

      {/* 颜色选择器 */}
      {showColorPicker && selectedVariable && (
        <ColorPicker
          title={`选择 ${selectedVariable.label} 颜色`}
          color={selectedVariable.value}
          onChange={handleColorChange}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {/* 未保存更改对话框 */}
      <ConfirmDialog
        isOpen={showUnsavedDialog}
        title="未保存的更改"
        message="您有未保存的更改，确定要离开吗？"
        confirmText="离开"
        cancelText="继续编辑"
        onConfirm={() => router.push('/settings/theme')}
        onCancel={() => setShowUnsavedDialog(false)}
        isDangerous
      />
    </PageContainer>
  );
}

export default function ThemeEditorPage() {
  return (
    <Suspense
      fallback={
        <PageContainer title="主题编辑器" showBackButton={true} activeNavItem="profile">
          <div className="flex h-40 items-center justify-center">
            <p className="text-gray-500">加载中...</p>
          </div>
        </PageContainer>
      }
    >
      <ThemeEditorContent />
    </Suspense>
  );
}
