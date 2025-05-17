"use client";

import { useEffect } from "react";
import dayjs from "dayjs";
import { useBudgetFormStore } from "@/store/budget-form-store";

export function BasicInfoSection() {
  const { 
    formData, 
    updateFormData 
  } = useBudgetFormStore();

  // 处理预算名称变更
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ name: e.target.value });
  };

  // 处理预算金额变更
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 只允许输入数字和小数点
    if (/^$|^[0-9]+\.?[0-9]*$/.test(value)) {
      updateFormData({ amount: value ? parseFloat(value) : 0 });
    }
  };

  // 处理预算周期变更
  const handlePeriodChange = (periodType: "MONTHLY" | "YEARLY") => {
    updateFormData({ periodType });
    
    // 根据周期类型更新日期范围
    if (periodType === "MONTHLY") {
      updateFormData({
        startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
        endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
      });
    } else {
      updateFormData({
        startDate: dayjs().startOf("year").format("YYYY-MM-DD"),
        endDate: dayjs().endOf("year").format("YYYY-MM-DD"),
      });
    }
  };

  // 处理开始日期变更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ startDate: e.target.value });
  };

  // 处理结束日期变更
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ endDate: e.target.value });
  };

  return (
    <div className="form-section">
      <div className="section-title">基本信息</div>
      
      <div className="form-group">
        <label htmlFor="budget-name">预算名称</label>
        <input
          type="text"
          id="budget-name"
          placeholder="例如：餐饮月度预算"
          value={formData.name}
          onChange={handleNameChange}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="budget-amount">预算金额</label>
        <div className="amount-input">
          <span className="currency-symbol">¥</span>
          <input
            type="text"
            id="budget-amount"
            placeholder="0.00"
            value={formData.amount || ""}
            onChange={handleAmountChange}
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>预算周期</label>
        <div className="period-options">
          <div
            className={`period-option ${formData.periodType === "MONTHLY" ? "active" : ""}`}
            onClick={() => handlePeriodChange("MONTHLY")}
          >
            <span>月度</span>
          </div>
          <div
            className={`period-option ${formData.periodType === "YEARLY" ? "active" : ""}`}
            onClick={() => handlePeriodChange("YEARLY")}
          >
            <span>年度</span>
          </div>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="budget-start-date">开始日期</label>
        <div className="date-input">
          <input
            type="date"
            id="budget-start-date"
            value={formData.startDate}
            onChange={handleStartDateChange}
          />
          <i className="fas fa-calendar"></i>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="budget-end-date">结束日期</label>
        <div className="date-input">
          <input
            type="date"
            id="budget-end-date"
            value={formData.endDate}
            onChange={handleEndDateChange}
          />
          <i className="fas fa-calendar"></i>
        </div>
      </div>
    </div>
  );
}
