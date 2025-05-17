"use client";

import { useEffect } from "react";
import { useProfileStore } from "@/store/profile-store";
import dayjs from "dayjs";

interface ProfileFormProps {
  id?: string;
}

export function ProfileForm({ id = "profile-form" }: ProfileFormProps) {
  const {
    profile,
    username,
    bio,
    birthDate,
    usernameError,
    bioError,
    setUsername,
    setBio,
    setBirthDate,
    setUsernameError,
    setBioError,
  } = useProfileStore();

  // 验证用户名
  const validateUsername = (value: string) => {
    if (!value.trim()) {
      setUsernameError("用户名不能为空");
      return false;
    }

    if (value.length < 2) {
      setUsernameError("用户名至少需要2个字符");
      return false;
    }

    if (value.length > 20) {
      setUsernameError("用户名最多20个字符");
      return false;
    }

    setUsernameError(null);
    return true;
  };

  // 验证个人简介
  const validateBio = (value: string) => {
    if (value.length > 200) {
      setBioError("个人简介最多200个字符");
      return false;
    }

    setBioError(null);
    return true;
  };

  // 处理用户名变更
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  // 处理个人简介变更
  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBio(value);
    validateBio(value);
  };

  // 处理出生日期变更
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBirthDate(value);
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return dayjs(dateString).format("YYYY年M月D日");
  };

  return (
    <form id={id} className="profile-form">
      <div className="form-group">
        <label className="form-label" htmlFor="username">
          用户名
        </label>
        <input
          type="text"
          id="username"
          className={`form-input ${usernameError ? "border-red-500" : ""}`}
          value={username}
          onChange={handleUsernameChange}
          maxLength={20}
        />
        <div className="flex justify-between items-center mt-1">
          {usernameError ? (
            <div className="text-red-500 text-xs">{usernameError}</div>
          ) : (
            <div className="w-0"></div>
          )}
          <div className="character-counter">
            <span id="username-count">{username.length}</span>/20
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="bio">
          个人简介
        </label>
        <textarea
          id="bio"
          className={`form-textarea ${bioError ? "border-red-500" : ""}`}
          value={bio}
          onChange={handleBioChange}
          maxLength={200}
        ></textarea>
        <div className="flex justify-between items-center mt-1">
          {bioError ? (
            <div className="text-red-500 text-xs">{bioError}</div>
          ) : (
            <div className="w-0"></div>
          )}
          <div className="character-counter">
            <span id="bio-count">{bio.length}</span>/200
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="birthDate">
          出生日期
        </label>
        <input
          type="date"
          id="birthDate"
          className="date-picker"
          value={birthDate}
          onChange={handleBirthDateChange}
        />
      </div>

      <div className="form-group">
        <label className="readonly-label">
          <span className="form-label">邮箱</span>
          <span className="readonly-badge">不可修改</span>
        </label>
        <div className="readonly-field">{profile?.email}</div>
      </div>

      <div className="form-group">
        <label className="form-label">注册日期</label>
        <div className="readonly-field">{formatDate(profile?.createdAt)}</div>
      </div>
    </form>
  );
}
