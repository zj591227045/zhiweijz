"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@zhiweijz/web";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError("两次输入的密码不一致");
      return false;
    }
    
    if (password.length < 8) {
      setPasswordError("密码长度至少为8位");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    try {
      await register({ name, email, password });
      router.push("/dashboard");
    } catch (error) {
      console.error("注册失败:", error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="app-logo">只为记账</h1>
        <p className="app-slogan">简单高效的个人记账应用</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <span>{error}</span>
            <button
              type="button"
              className="float-right"
              onClick={clearError}
            >
              &times;
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="name" className="form-label">
            姓名
          </label>
          <input
            type="text"
            id="name"
            className="form-input full-width"
            placeholder="请输入姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            邮箱
          </label>
          <input
            type="email"
            id="email"
            className="form-input full-width"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            密码
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="form-input full-width"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            确认密码
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              className="form-input full-width"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordError && (
            <p className="text-red-500 text-sm mt-1">{passwordError}</p>
          )}
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? "注册中..." : "注册"}
        </button>

        <div className="auth-links">
          <span className="text-gray-500">已有账号?</span>
          <Link href="/auth/login" className="auth-link">
            登录
          </Link>
        </div>
      </form>

      <div className="auth-footer">
        <p>&copy; {new Date().getFullYear()} 只为记账. 保留所有权利.</p>
      </div>
    </div>
  );
}
