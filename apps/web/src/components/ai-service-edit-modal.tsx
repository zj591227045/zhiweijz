'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAIServicesStore } from '@/store/ai-services-store';
import { toast } from 'sonner';
import { fetchApi, getApiBaseUrl } from '@/lib/api-client';

interface AiServiceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  onSave?: () => void;
}

// AI服务表单数据类型
interface AIServiceFormData {
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

// 连接测试结果类型
interface TestResult {
  success: boolean;
  message: string;
}

export default function AiServiceEditModal({
  isOpen,
  onClose,
  serviceId,
  onSave
}: AiServiceEditModalProps) {
  // 组件状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [formError, setFormError] = useState('');

  // 表单数据状态
  const [formData, setFormData] = useState<AIServiceFormData>({
    name: '',
    provider: '',
    model: '',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 1000,
    description: ''
  });

  // Store hooks
  const { isAuthenticated } = useAuthStore();

  // 服务提供商选项
  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'siliconflow', label: '硅基流动' },
    { value: 'deepseek', label: 'Deepseek' },
  ];

  // 根据提供商获取模型选项
  const getModelOptions = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        ];
      case 'siliconflow':
        return [
          { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen2.5-32B-Instruct' },
          { value: 'Qwen/Qwen2-72B-Instruct', label: 'Qwen2-72B-Instruct' },
          { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek-V2.5' },
        ];
      case 'deepseek':
        return [{ value: 'deepseek-chat', label: 'Deepseek Chat' }];
      default:
        return [];
    }
  };

  // 获取AI服务详情
  const fetchAiService = useCallback(async () => {
    if (!serviceId || serviceId === 'new') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetchApi(`/api/ai/llm-settings/${serviceId}`);

      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || '',
          provider: data.provider || '',
          model: data.model || '',
          apiKey: data.apiKey || '',
          baseUrl: data.baseUrl || '',
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 1000,
          description: data.description || ''
        });
      } else {
        toast.error('获取AI服务详情失败');
        onClose();
      }
    } catch (error) {
      console.error('获取AI服务详情失败:', error);
      toast.error('获取AI服务详情失败');
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, onClose]);

  // 初始化数据
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchAiService();
    }
  }, [isOpen, isAuthenticated, fetchAiService]);

  // 隐藏底层页面的头部和导航
  useEffect(() => {
    if (isOpen) {
      // 隐藏底层页面的头部和底部导航
      const appContainer = document.querySelector('.app-container');
      const pageHeader = appContainer?.querySelector('.header');
      const bottomNav = document.querySelector('.bottom-nav');

      if (pageHeader) {
        (pageHeader as HTMLElement).style.display = 'none';
      }
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'none';
      }

      return () => {
        // 恢复显示
        if (pageHeader) {
          (pageHeader as HTMLElement).style.display = '';
        }
        if (bottomNav) {
          (bottomNav as HTMLElement).style.display = '';
        }
      };
    }
  }, [isOpen]);

  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));

    // 清除错误信息
    if (formError) {
      setFormError('');
    }

    // 清除测试结果
    if (testResult) {
      setTestResult(null);
    }
  };

  // 处理提供商变化
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    const models = getModelOptions(provider);

    setFormData(prev => ({
      ...prev,
      provider,
      model: models.length > 0 ? models[0].value : '',
      baseUrl: '' // 重置baseUrl
    }));

    // 清除测试结果
    if (testResult) {
      setTestResult(null);
    }
  };

  // 处理连接测试
  const handleTestConnection = async () => {
    if (!formData.provider || !formData.apiKey) {
      toast.error('请填写完整的配置信息');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('🧪 开始连接测试:', {
        provider: formData.provider,
        model: formData.model,
        hasApiKey: !!formData.apiKey,
        baseUrl: formData.baseUrl
      });

      // 使用项目的fetchApi函数，它会自动处理动态API URL和认证
      const response = await fetchApi('/ai/llm-settings/test', {
        method: 'POST',
        body: JSON.stringify({
          provider: formData.provider,
          apiKey: formData.apiKey,
          baseUrl: formData.baseUrl || undefined,
          model: formData.model || 'gpt-3.5-turbo'
        })
      });

      const data = await response.json();

      console.log('🧪 连接测试响应:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: data.message || '连接测试成功！'
        });
        toast.success('连接测试成功！');
      } else {
        setTestResult({
          success: false,
          message: data.message || '连接测试失败'
        });
        toast.error(data.message || '连接测试失败');
      }
    } catch (error: any) {
      console.error('🧪 连接测试失败:', error);
      const errorMessage = error.message || '连接测试失败';
      setTestResult({
        success: false,
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    // 表单验证
    if (!formData.name.trim()) {
      setFormError('请输入服务名称');
      return;
    }

    if (!formData.provider) {
      setFormError('请选择服务提供商');
      return;
    }

    if (!formData.model) {
      setFormError('请选择模型');
      return;
    }

    if (!formData.apiKey.trim()) {
      setFormError('请输入API Key');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      console.log('💾 开始保存AI服务:', {
        serviceId,
        isNew: serviceId === 'new',
        name: formData.name,
        provider: formData.provider,
        model: formData.model
      });

      // 构建请求数据
      const requestData = {
        name: formData.name.trim(),
        provider: formData.provider,
        model: formData.model,
        apiKey: formData.apiKey.trim(),
        baseUrl: formData.baseUrl.trim() || undefined,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        description: formData.description.trim() || undefined
      };

      let response: Response;

      if (serviceId === 'new') {
        // 创建新服务
        response = await fetchApi('/ai/llm-settings', {
          method: 'POST',
          body: JSON.stringify(requestData)
        });
      } else {
        // 更新现有服务
        response = await fetchApi(`/ai/llm-settings/${serviceId}`, {
          method: 'PUT',
          body: JSON.stringify(requestData)
        });
      }

      console.log('💾 保存响应:', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        toast.success(serviceId === 'new' ? 'AI服务创建成功' : 'AI服务更新成功');
        onSave?.();
        onClose();
      } else {
        const errorData = await response.json();
        console.error('💾 保存失败:', errorData);
        setFormError(errorData.message || '保存失败，请重试');
      }
    } catch (error: any) {
      console.error('💾 保存AI服务失败:', error);
      setFormError('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--background-color)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'manipulation',
      transform: 'translateZ(0)',
      WebkitTransform: 'translateZ(0)'
    }}>
      {/* 应用容器 */}
      <div className="app-container" style={{
        maxWidth: 'none',
        margin: 0,
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        WebkitOverflowScrolling: 'touch',
        isolation: 'isolate'
      }}>
        {/* 模态框头部 */}
        <div className="header">
          <button className="icon-button" onClick={onClose}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="header-title">编辑AI服务</div>
          <div style={{ width: '32px' }}></div>
        </div>

        {/* 主要内容 */}
        <div className="main-content" style={{
          paddingBottom: '100px', // 为底部按钮留出足够空间
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          minHeight: 'calc(100vh - 60px)'
        }}>
          <div style={{ padding: '0 20px' }}>
            {/* 加载状态 */}
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px',
                color: 'var(--text-secondary)'
              }}>
                加载中...
              </div>
            ) : (
              <>
                {/* 基本信息卡片 */}
                <div style={{
                  backgroundColor: 'var(--background-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>基本信息</h3>
                  
                  {/* 服务名称 */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>服务名称 *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="例如：我的OpenAI服务"
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                        backgroundColor: 'var(--background-secondary)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* 服务描述 */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>服务描述</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="添加服务描述..."
                      disabled={isSubmitting}
                      rows={3}
                      style={{
                        width: '100%',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                        backgroundColor: 'var(--background-secondary)',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                {/* API配置卡片 */}
                <div style={{
                  backgroundColor: 'var(--background-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>API配置</h3>

                  {/* 服务提供商 */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>服务提供商 *</label>
                    <select
                      name="provider"
                      value={formData.provider}
                      onChange={handleProviderChange}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '16px',
                        color: 'var(--text-color)',
                        backgroundColor: 'var(--background-secondary)',
                        outline: 'none'
                      }}
                    >
                      <option value="">请选择服务提供商</option>
                      {providers.map((provider) => (
                        <option key={provider.value} value={provider.value}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 模型选择 */}
                  {formData.provider && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}>模型名称 *</label>
                      <select
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          fontSize: '16px',
                          color: 'var(--text-color)',
                          backgroundColor: 'var(--background-secondary)',
                          outline: 'none'
                        }}
                      >
                        <option value="">请选择模型</option>
                        {getModelOptions(formData.provider).map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* API Key */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px'
                    }}>API Key *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        name="apiKey"
                        value={formData.apiKey}
                        onChange={handleChange}
                        placeholder="输入API密钥"
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px 40px 12px 12px',
                          fontSize: '16px',
                          color: 'var(--text-color)',
                          backgroundColor: 'var(--background-secondary)',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Base URL */}
                  {(formData.provider === 'openai' || formData.provider === 'deepseek') && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}>API基础URL（可选）</label>
                      <input
                        type="text"
                        name="baseUrl"
                        value={formData.baseUrl}
                        onChange={handleChange}
                        placeholder={
                          formData.provider === 'deepseek'
                            ? '默认：https://api.deepseek.com'
                            : '例如：https://api.openai.com/v1'
                        }
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          fontSize: '16px',
                          color: 'var(--text-color)',
                          backgroundColor: 'var(--background-secondary)',
                          outline: 'none'
                        }}
                      />
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginTop: '4px'
                      }}>
                        {formData.provider === 'deepseek'
                          ? 'Deepseek API基础URL，留空使用默认地址'
                          : '如果使用兼容OpenAI API的第三方服务，请填写API基础URL'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 连接测试卡片 */}
                <div style={{
                  backgroundColor: 'var(--background-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>连接测试</h3>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !formData.provider || !formData.apiKey || isSubmitting}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isTesting ? 'var(--text-secondary)' : 'var(--primary-color)',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: (isTesting || !formData.provider || !formData.apiKey || isSubmitting) ? 'not-allowed' : 'pointer',
                      opacity: (isTesting || !formData.provider || !formData.apiKey || isSubmitting) ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px'
                    }}
                  >
                    {isTesting ? '测试中...' : '测试连接'}
                  </button>

                  {/* 测试结果显示 */}
                  {testResult && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
                      border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                      color: testResult.success ? '#166534' : '#dc2626',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      {testResult.message}
                    </div>
                  )}
                </div>



                {/* 错误信息 */}
                {formError && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px',
                    margin: '16px 0',
                    color: '#dc2626',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>{formError}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 底部保存按钮 */}
        {!isLoading && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--background-color)',
            borderTop: '1px solid var(--border-color)',
            padding: '16px 20px',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)'
          }}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name || !formData.provider || !formData.model || !formData.apiKey}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: (isSubmitting || !formData.name || !formData.provider || !formData.model || !formData.apiKey)
                  ? 'var(--text-secondary)'
                  : 'var(--primary-color)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (isSubmitting || !formData.name || !formData.provider || !formData.model || !formData.apiKey)
                  ? 'not-allowed'
                  : 'pointer',
                opacity: (isSubmitting || !formData.name || !formData.provider || !formData.model || !formData.apiKey)
                  ? 0.6
                  : 1,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
