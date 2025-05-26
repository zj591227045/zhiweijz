"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { aiService, LLMSetting, AccountBook } from "@/lib/api/ai-service";
import "./ai-service-form.css";

type FormValues = {
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  description: string;
};

interface AIServiceFormProps {
  initialData?: LLMSetting;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function AIServiceForm({ initialData, onSubmit, onCancel }: AIServiceFormProps) {
  const [providers, setProviders] = useState<string[]>([]);
  const [accountBooks, setAccountBooks] = useState<AccountBook[]>([]);
  const [selectedAccountBooks, setSelectedAccountBooks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showBaseUrl, setShowBaseUrl] = useState(!!initialData?.baseUrl);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [apiKeyChanged, setApiKeyChanged] = useState(false);

  // 表单初始化
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: initialData
      ? {
          ...initialData,
          temperature: initialData.temperature || 0.7,
          maxTokens: initialData.maxTokens || 1000,
        }
      : {
          name: "",
          provider: "",
          model: "",
          apiKey: "",
          baseUrl: "",
          temperature: 0.7,
          maxTokens: 1000,
          description: "",
        },
  });

  const selectedProvider = watch("provider");

  // 加载可用的提供商列表和账本列表
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取可用提供商
        const providers = await aiService.getAvailableProviders();
        setProviders(providers);

        // 如果没有初始数据且有可用提供商，默认选择第一个
        if (!initialData && providers.length > 0) {
          setValue("provider", providers[0]);
        }

        // 获取账本列表
        const books = await aiService.getAccountBooks();
        setAccountBooks(books);

        // 如果有初始数据，获取已绑定的账本
        if (initialData) {
          // 这里应该调用API获取已绑定的账本，但目前API可能未实现
          // 暂时使用空数组
          setSelectedAccountBooks([]);
        }
      } catch (error) {
        console.error("获取数据失败:", error);
        // 设置默认提供商
        setProviders(["openai", "siliconflow", "deepseek"]);
      }
    };

    fetchData();
  }, [initialData, setValue]);

  // 测试连接
  const handleTestConnection = async () => {
    const apiKey = watch("apiKey");
    const provider = watch("provider");
    const model = watch("model");
    const baseUrl = watch("baseUrl");

    // 检查必要字段
    if (!provider || !model) {
      toast.error("请选择服务提供商和模型");
      return;
    }

    // 检查API密钥 - 如果是编辑模式且未修改API密钥，使用占位符提示
    if (!apiKey && !initialData) {
      toast.error("请输入API密钥");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // 如果是编辑模式且API密钥未修改，提示用户
      if (!apiKey && initialData) {
        toast.info("使用已保存的API密钥进行测试");
      }

      const result = await aiService.testLLMConnection({
        provider,
        model,
        apiKey: apiKey || "USE_EXISTING", // 使用特殊标记表示使用已有密钥
        baseUrl: baseUrl || undefined,
      });

      setTestResult(result);

      if (result.success) {
        toast.success(result.message || "连接测试成功");
      } else {
        toast.error("连接测试失败: " + (result.message || "未知错误"));
      }
    } catch (error) {
      console.error("测试连接失败:", error);
      setTestResult({
        success: false,
        message: typeof error === 'string' ? error : "连接测试失败，请检查API密钥和服务地址",
      });
      toast.error("连接测试失败");
    } finally {
      setIsTesting(false);
    }
  };

  // 处理账本选择
  const handleAccountBookToggle = (accountBookId: string) => {
    setSelectedAccountBooks(prev => {
      if (prev.includes(accountBookId)) {
        return prev.filter(id => id !== accountBookId);
      } else {
        return [...prev, accountBookId];
      }
    });
  };

  // 绑定账本
  const bindAccountBooks = async (llmSettingId: string) => {
    try {
      // 为每个选中的账本绑定LLM设置
      for (const accountBookId of selectedAccountBooks) {
        try {
          await aiService.updateAccountLLMSettings(accountBookId, llmSettingId);
          console.log(`成功绑定账本 ${accountBookId} 到LLM设置 ${llmSettingId}`);
        } catch (error) {
          console.error(`绑定账本 ${accountBookId} 失败:`, error);
        }
      }
      toast.success("账本绑定成功");
    } catch (error) {
      console.error("绑定账本失败:", error);
      toast.error("绑定账本失败");
    }
  };

  // 提交表单
  const onFormSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      console.log('表单提交触发，表单数据:', {
        ...data,
        apiKey: data.apiKey ? '******' : undefined
      });

      // 处理API密钥 - 如果是编辑模式且API密钥未修改，则从提交数据中移除API密钥
      if (initialData && !apiKeyChanged) {
        // 创建一个新对象，不包含apiKey字段
        const { apiKey, ...dataWithoutApiKey } = data;
        console.log('API密钥未修改，使用原有密钥');
        console.log('提交数据(不含API密钥):', dataWithoutApiKey);
        await onSubmit(dataWithoutApiKey as FormValues);
      } else {
        // 如果是新建或API密钥已修改，则提交完整数据
        console.log('提交包含API密钥的完整数据');
        await onSubmit(data);
      }

      // 如果是编辑模式且有选中的账本，绑定账本
      if (initialData && initialData.id && selectedAccountBooks.length > 0) {
        console.log('绑定账本，服务ID:', initialData.id, '选中账本:', selectedAccountBooks);
        await bindAccountBooks(initialData.id);
      }
      // 如果是创建模式，需要在创建成功后获取ID再绑定账本
      // 这部分逻辑应该在父组件中处理
    } catch (error) {
      console.error("提交表单失败:", error);
      // 详细记录错误信息
      if (error instanceof Error) {
        console.error('错误名称:', error.name);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
      }
      toast.error("提交表单失败，请检查网络连接或稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 根据提供商显示不同的模型选项
  const getModelOptions = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "openai":
        return [
          { value: "gpt-4", label: "GPT-4" },
          { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
          { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        ];
      case "siliconflow":
        return [
          { value: "Qwen/Qwen3-32B", label: "Qwen3-32B" },
          { value: "Qwen/Qwen2.5-32B-Instruct", label: "Qwen2.5-32B-Instruct" },
          { value: "Qwen/Qwen3-14B", label: "Qwen3-14B" },
          { value: "Qwen/Qwen3-30B-A3B", label: "Qwen3-30B-A3B" },
        ];
      case "deepseek":
        return [
          { value: "deepseek-chat", label: "Deepseek Chat" },
        ];
      default:
        return [];
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="ai-service-form">
      <div className="form-group">
        <label htmlFor="name">服务名称</label>
        <input
          id="name"
          type="text"
          {...register("name")}
          placeholder="例如：我的OpenAI服务"
          className={errors.name ? "error" : ""}
        />
        {errors.name && <div className="error-message">{errors.name.message}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="provider">服务提供商</label>
        <select
          id="provider"
          {...register("provider")}
          className={errors.provider ? "error" : ""}
          onChange={(e) => {
            setValue("provider", e.target.value);
            // 根据提供商设置默认模型
            const models = getModelOptions(e.target.value);
            if (models.length > 0) {
              setValue("model", models[0].value);
            } else {
              setValue("model", "");
            }
            // 对于OpenAI兼容API，显示baseUrl字段
            setShowBaseUrl(e.target.value.toLowerCase() === "openai" || e.target.value.toLowerCase() === "deepseek");
          }}
        >
          <option value="">请选择服务提供商</option>
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider === "openai" ? "OpenAI" :
               provider === "siliconflow" ? "硅基流动" :
               provider === "deepseek" ? "Deepseek" : provider}
            </option>
          ))}
        </select>
        {errors.provider && <div className="error-message">{errors.provider.message}</div>}
      </div>

      {selectedProvider && (
        <div className="form-group">
          <label htmlFor="model">模型名称</label>
          <select
            id="model"
            {...register("model")}
            className={errors.model ? "error" : ""}
          >
            <option value="">请选择模型</option>
            {getModelOptions(selectedProvider).map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          {errors.model && <div className="error-message">{errors.model.message}</div>}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="apiKey">API密钥</label>
        <input
          id="apiKey"
          type="password"
          {...register("apiKey")}
          placeholder={initialData ? "••••••••••••••••" : "输入API密钥"}
          className={errors.apiKey ? "error" : ""}
          onChange={(e) => {
            // 标记API密钥已被修改
            if (e.target.value) {
              setApiKeyChanged(true);
            }
          }}
        />
        {errors.apiKey && <div className="error-message">{errors.apiKey.message}</div>}
        {initialData && !apiKeyChanged && (
          <div className="field-description">
            如不修改API密钥，请保持为空
          </div>
        )}
      </div>

      {/* OpenAI兼容提供商显示baseUrl */}
      {(selectedProvider === "openai" || selectedProvider === "deepseek") && (
        <div className="form-group">
          <label htmlFor="baseUrl">API基础URL（可选）</label>
          <input
            id="baseUrl"
            type="text"
            {...register("baseUrl")}
            placeholder={
              selectedProvider === "deepseek" 
                ? "默认：https://api.deepseek.com" 
                : "例如：https://api.openai.com/v1"
            }
          />
          <div className="field-description">
            {selectedProvider === "deepseek" 
              ? "Deepseek API基础URL，留空使用默认地址" 
              : "如果使用兼容OpenAI API的第三方服务，请填写API基础URL"}
          </div>
        </div>
      )}

      {/* 高级设置折叠区域 */}
      <div className="advanced-settings">
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          高级设置 {showAdvancedSettings ? "▲" : "▼"}
        </button>

        {showAdvancedSettings && (
          <div className="advanced-content">
            <div className="warning-message">
              <i className="fas fa-exclamation-triangle"></i>
              <span>警告：除非您明确知道这些设置的作用，否则请勿修改以下高级选项</span>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label htmlFor="temperature">温度</label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  {...register("temperature", { valueAsNumber: true })}
                  className={errors.temperature ? "error" : ""}
                />
                {errors.temperature && (
                  <div className="error-message">{errors.temperature.message}</div>
                )}
              </div>

              <div className="form-group half">
                <label htmlFor="maxTokens">最大Token数</label>
                <input
                  id="maxTokens"
                  type="number"
                  step="100"
                  min="100"
                  max="10000"
                  {...register("maxTokens", { valueAsNumber: true })}
                  className={errors.maxTokens ? "error" : ""}
                />
                {errors.maxTokens && (
                  <div className="error-message">{errors.maxTokens.message}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">描述（可选）</label>
              <textarea
                id="description"
                {...register("description")}
                placeholder="服务描述"
                rows={3}
              ></textarea>
            </div>
          </div>
        )}
      </div>

      {/* 账本绑定区域 */}
      <div className="account-books-section">
        <h3 className="section-title">账本绑定</h3>
        <p className="section-description">选择要绑定此AI服务的账本</p>

        {accountBooks.length === 0 ? (
          <div className="no-account-books">暂无可用账本</div>
        ) : (
          <div className="account-books-list">
            {accountBooks.map(book => (
              <div key={book.id} className="account-book-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedAccountBooks.includes(book.id)}
                    onChange={() => handleAccountBookToggle(book.id)}
                  />
                  <span className="book-name">{book.name}</span>
                  <span className="book-type">
                    {book.type === 'PERSONAL' ? '个人账本' : '家庭账本'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="test-connection">
        <button
          type="button"
          className="test-button"
          onClick={handleTestConnection}
          disabled={isTesting}
        >
          {isTesting ? "测试中..." : "测试连接"}
        </button>
        {testResult && (
          <div
            className={`test-result ${testResult.success ? "success" : "error"}`}
          >
            {testResult.message}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="cancel-button" onClick={onCancel}>
          取消
        </button>
        <button
          type="button" // 改为button类型，不再使用表单提交
          className="submit-button"
          disabled={isLoading}
          onClick={() => {
            // 手动获取表单数据并提交
            const formData = {
              name: watch("name") || initialData?.name || "",
              provider: watch("provider") || initialData?.provider || "",
              model: watch("model") || initialData?.model || "",
              apiKey: watch("apiKey") || "",
              baseUrl: watch("baseUrl") || initialData?.baseUrl || "",
              temperature: watch("temperature") || initialData?.temperature || 0.7,
              maxTokens: watch("maxTokens") || initialData?.maxTokens || 1000,
              description: watch("description") || initialData?.description || ""
            };

            // 跳过验证，直接提交
            console.log("手动触发表单提交，数据:", {
              ...formData,
              apiKey: formData.apiKey ? '******' : undefined
            });

            setIsLoading(true);

            // 直接调用onSubmit，绕过表单验证
            try {
              onSubmit(formData as FormValues);

              // 如果是编辑模式且有选中的账本，绑定账本
              if (initialData && initialData.id && selectedAccountBooks.length > 0) {
                console.log('绑定账本，服务ID:', initialData.id, '选中账本:', selectedAccountBooks);
                bindAccountBooks(initialData.id).catch(err => {
                  console.error("绑定账本失败:", err);
                });
              }
            } catch (error) {
              console.error("提交表单失败:", error);
              toast.error("提交失败，请稍后重试");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {isLoading ? "保存中..." : initialData ? "更新" : "创建"}
        </button>
      </div>
    </form>
  );
}
