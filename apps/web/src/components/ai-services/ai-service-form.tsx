'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, '服务名称不能为空'),
  provider: z.string().min(1, '请选择服务提供商'),
  model: z.string().min(1, '请选择模型'),
  apiKey: z.string().min(1, 'API密钥不能为空'),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).optional().default(0.7),
  maxTokens: z.number().min(100).max(10000).optional().default(1000),
  description: z.string().optional(),
});

export type AIServiceFormValues = z.infer<typeof formSchema>;

interface AIServiceFormProps {
  initialData?: Partial<AIServiceFormValues & { id: string }>;
  onSubmit: (data: AIServiceFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AIServiceForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AIServiceFormProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AIServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      provider: initialData?.provider || '',
      model: initialData?.model || '',
      apiKey: initialData?.apiKey || '',
      baseUrl: initialData?.baseUrl || '',
      temperature: initialData?.temperature || 0.7,
      maxTokens: initialData?.maxTokens || 1000,
      description: initialData?.description || '',
    },
  });

  const selectedProvider = watch('provider');

  // 测试连接
  const testConnection = async () => {
    const formData = watch();

    if (!formData.provider || !formData.apiKey || !formData.baseURL) {
      toast.error('请填写完整的配置信息');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const data = await apiClient.post('/ai/llm-settings/test', {
        provider: formData.provider,
        apiKey: formData.apiKey,
        baseURL: formData.baseURL,
        model: formData.model || 'gpt-3.5-turbo',
      });

      setTestResult({
        success: true,
        message: data.message || '连接测试成功！',
      });
      toast.success('连接测试成功！');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '连接测试失败';
      setTestResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  // 根据提供商显示不同的模型选项
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

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'siliconflow', label: '硅基流动' },
    { value: 'deepseek', label: 'Deepseek' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="ai-service-form space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          服务名称
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          placeholder="例如：我的OpenAI服务"
          className={`form-input ${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name.message}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="provider" className="form-label">
          服务提供商
        </label>
        <select
          id="provider"
          {...register('provider')}
          className={`form-input ${errors.provider ? 'border-red-500' : ''}`}
          onChange={(e) => {
            setValue('provider', e.target.value);
            // 根据提供商设置默认模型
            const models = getModelOptions(e.target.value);
            if (models.length > 0) {
              setValue('model', models[0].value);
            }
          }}
        >
          <option value="">请选择服务提供商</option>
          {providers.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
        {errors.provider && (
          <div className="text-red-500 text-xs mt-1">{errors.provider.message}</div>
        )}
      </div>

      {selectedProvider && (
        <div className="form-group">
          <label htmlFor="model" className="form-label">
            模型名称
          </label>
          <select
            id="model"
            {...register('model')}
            className={`form-input ${errors.model ? 'border-red-500' : ''}`}
          >
            <option value="">请选择模型</option>
            {getModelOptions(selectedProvider).map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          {errors.model && <div className="text-red-500 text-xs mt-1">{errors.model.message}</div>}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="apiKey" className="form-label">
          API密钥
        </label>
        <input
          id="apiKey"
          type="password"
          {...register('apiKey')}
          placeholder="输入API密钥"
          className={`form-input ${errors.apiKey ? 'border-red-500' : ''}`}
        />
        {errors.apiKey && <div className="text-red-500 text-xs mt-1">{errors.apiKey.message}</div>}
      </div>

      {(selectedProvider === 'openai' || selectedProvider === 'deepseek') && (
        <div className="form-group">
          <label htmlFor="baseUrl" className="form-label">
            API基础URL（可选）
          </label>
          <input
            id="baseUrl"
            type="text"
            {...register('baseUrl')}
            placeholder={
              selectedProvider === 'deepseek'
                ? '默认：https://api.deepseek.com'
                : '例如：https://api.openai.com/v1'
            }
            className="form-input"
          />
          <div className="form-hint">
            {selectedProvider === 'deepseek'
              ? 'Deepseek API基础URL，留空使用默认地址'
              : '如果使用兼容OpenAI API的第三方服务，请填写API基础URL'}
          </div>
        </div>
      )}

      {/* 高级设置 */}
      <div className="advanced-settings">
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          高级设置 {showAdvancedSettings ? '▲' : '▼'}
        </button>

        {showAdvancedSettings && (
          <div className="advanced-content space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="temperature" className="form-label">
                  温度
                </label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  {...register('temperature', { valueAsNumber: true })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxTokens" className="form-label">
                  最大Token数
                </label>
                <input
                  id="maxTokens"
                  type="number"
                  step="100"
                  min="100"
                  max="10000"
                  {...register('maxTokens', { valueAsNumber: true })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                描述（可选）
              </label>
              <textarea
                id="description"
                {...register('description')}
                placeholder="服务描述"
                rows={3}
                className="form-textarea"
              />
            </div>
          </div>
        )}
      </div>

      {/* 测试连接 */}
      <div className="test-connection">
        <button
          type="button"
          className="test-button"
          onClick={testConnection}
          disabled={isTesting}
        >
          {isTesting ? '测试中...' : '测试连接'}
        </button>
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* 表单操作按钮 */}
      <div className="form-actions flex gap-4">
        <button
          type="button"
          className="cancel-button flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </button>
        <button type="submit" className="submit-button flex-1" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
