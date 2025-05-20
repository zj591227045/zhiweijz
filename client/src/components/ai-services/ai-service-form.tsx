"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { aiService, LLMSetting, AccountBook } from "@/lib/api/ai-service";
import "./ai-service-form.css";

// 表单验证模式
const formSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  provider: z.string().min(1, "请选择服务提供商"),
  model: z.string().min(1, "模型名称不能为空"),
  apiKey: z.string().min(1, "API密钥不能为空"),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(100).max(10000).default(1000),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

  // 表单初始化
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
        setProviders(["openai", "siliconflow"]);
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

    if (!apiKey || !provider || !model) {
      toast.error("请填写完整的服务信息");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await aiService.testLLMConnection({
        provider,
        model,
        apiKey,
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
      await onSubmit(data);

      // 如果是编辑模式且有选中的账本，绑定账本
      if (initialData && initialData.id && selectedAccountBooks.length > 0) {
        await bindAccountBooks(initialData.id);
      }
      // 如果是创建模式，需要在创建成功后获取ID再绑定账本
      // 这部分逻辑应该在父组件中处理
    } catch (error) {
      console.error("提交表单失败:", error);
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
            setShowBaseUrl(e.target.value.toLowerCase() === "openai");
          }}
        >
          <option value="">请选择服务提供商</option>
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {provider === "openai" ? "OpenAI" :
               provider === "siliconflow" ? "硅基流动" : provider}
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
          placeholder="输入API密钥"
          className={errors.apiKey ? "error" : ""}
        />
        {errors.apiKey && <div className="error-message">{errors.apiKey.message}</div>}
      </div>

      {/* OpenAI提供商显示baseUrl */}
      {selectedProvider === "openai" && (
        <div className="form-group">
          <label htmlFor="baseUrl">API基础URL（可选）</label>
          <input
            id="baseUrl"
            type="text"
            {...register("baseUrl")}
            placeholder="例如：https://api.openai.com/v1"
          />
          <div className="field-description">
            如果使用兼容OpenAI API的第三方服务，请填写API基础URL
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
        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? "保存中..." : initialData ? "更新" : "创建"}
        </button>
      </div>
    </form>
  );
}
