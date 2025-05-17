"use client";

import { useEffect } from "react";
import { useProfileStore } from "@/store/profile-store";

export function SaveFeedback() {
  const { submitStatus, error, setSubmitStatus } = useProfileStore();

  // 自动隐藏成功/错误提示
  useEffect(() => {
    if (submitStatus === "success" || submitStatus === "error") {
      const timer = setTimeout(() => {
        setSubmitStatus("idle");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [submitStatus, setSubmitStatus]);

  if (submitStatus === "idle") {
    return null;
  }

  return (
    <>
      {/* 保存成功提示 */}
      {submitStatus === "success" && (
        <div className="save-feedback feedback-success" style={{ display: "flex" }}>
          <i className="fas fa-check-circle feedback-icon"></i>
          <span>保存成功</span>
        </div>
      )}
      
      {/* 保存失败提示 */}
      {submitStatus === "error" && (
        <div className="save-feedback feedback-error" style={{ display: "flex" }}>
          <i className="fas fa-times-circle feedback-icon"></i>
          <span>{error || "保存失败，请重试"}</span>
        </div>
      )}
    </>
  );
}
