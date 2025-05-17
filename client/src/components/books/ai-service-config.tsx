"use client";

import { useState } from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { BookFormValues } from "./book-form";

interface AIServiceConfigProps {
  register: UseFormRegister<BookFormValues>;
  setValue: UseFormSetValue<BookFormValues>;
  errors: FieldErrors<BookFormValues>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function AIServiceConfig({
  register,
  setValue,
  errors,
  enabled,
  onToggle,
}: AIServiceConfigProps) {
  const [selectedProvider, setSelectedProvider] = useState("OpenAI");
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"none" | "success" | "error">("none");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // 处理服务提供商选择
  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    setValue("aiService.provider", provider);

    // 根据提供商设置默认模型
    if (provider === "OpenAI") {
      setValue("aiService.model", "gpt-4");
    } else if (provider === "Azure OpenAI") {
      setValue("aiService.model", "gpt-4");
    } else {
      setValue("aiService.model", "other");
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("none");

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 假设连接成功
      setConnectionStatus("success");
      setConnectionMessage("连接成功！API密钥有效。");
    } catch (error) {
      setConnectionStatus("error");
      setConnectionMessage("连接失败，请检查API密钥是否正确。");
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 切换API密钥可见性
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  return (
    <div className="space-y-4">
      <div className="form-group">
        <div className="toggle-container">
          <div className="toggle-label">启用AI服务</div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="enable-ai"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="form-hint">启用后可使用智能分析和建议功能</div>
      </div>

      <div className={`ai-service-section ${enabled ? '' : 'disabled'}`}>
        <div className="provider-selector">
          <label className="provider-label">选择服务提供商</label>
          <div className="provider-options">
            <div
              className={`provider-option ${selectedProvider === "OpenAI" ? "active" : ""}`}
              onClick={() => handleProviderSelect("OpenAI")}
            >
              <div className="provider-icon">
                <i className="fas fa-robot"></i>
              </div>
              <div className="provider-name">OpenAI</div>
            </div>
            <div
              className={`provider-option ${selectedProvider === "Azure OpenAI" ? "active" : ""}`}
              onClick={() => handleProviderSelect("Azure OpenAI")}
            >
              <div className="provider-icon">
                <i className="fab fa-microsoft"></i>
              </div>
              <div className="provider-name">Azure OpenAI</div>
            </div>
            <div
              className={`provider-option ${selectedProvider === "其他" ? "active" : ""}`}
              onClick={() => handleProviderSelect("其他")}
            >
              <div className="provider-icon">
                <i className="fas fa-microchip"></i>
              </div>
              <div className="provider-name">其他</div>
            </div>
          </div>
        </div>

        <div className="model-selector">
          <label className="form-label" htmlFor="ai-model">选择模型</label>
          <select
            id="ai-model"
            className="form-input"
            {...register("aiService.model")}
          >
            {selectedProvider === "OpenAI" && (
              <>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            )}
            {selectedProvider === "Azure OpenAI" && (
              <>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            )}
            {selectedProvider === "其他" && (
              <option value="other">自定义模型</option>
            )}
          </select>
        </div>

        <div className="api-key-input">
          <label className="form-label" htmlFor="api-key">API密钥</label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              id="api-key"
              className="form-input font-mono pr-10"
              placeholder="输入API密钥"
              {...register("aiService.apiKey")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              onClick={toggleApiKeyVisibility}
            >
              <i className={`fas ${showApiKey ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
          <div className="form-hint">您的API密钥将被安全加密存储</div>
        </div>

        <button
          type="button"
          className="test-connection-button"
          onClick={handleTestConnection}
          disabled={isTestingConnection}
        >
          {isTestingConnection ? "测试中..." : "测试连接"}
        </button>

        {connectionStatus === "success" && (
          <div className="connection-status success">
            <i className="fas fa-check-circle"></i>
            <span>{connectionMessage}</span>
          </div>
        )}

        {connectionStatus === "error" && (
          <div className="connection-status error">
            <i className="fas fa-times-circle"></i>
            <span>{connectionMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
