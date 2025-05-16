"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTransactionFormStore } from "@/store/transaction-form-store";
import { AccountBook, Family, FamilyMember } from "@/types";
import { getFamilies, getFamilyMembers } from "@/lib/api/transaction-service";
import { formatDateForInput } from "@/lib/utils";
import dayjs from "dayjs";

interface TransactionFormProps {
  accountBooks: AccountBook[];
  isLoading: boolean;
}

export function TransactionForm({ accountBooks, isLoading }: TransactionFormProps) {
  const {
    categoryId,
    categoryName,
    categoryIcon,
    description,
    setDescription,
    date,
    setDate,
    time,
    setTime,
    accountBookId,
    setAccountBookId,
    familyId,
    setFamilyId,
    familyMemberId,
    setFamilyMemberId,
    goToStep,
  } = useTransactionFormStore();

  // 获取家庭列表
  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: getFamilies,
  });

  // 获取家庭成员列表
  const { data: familyMembers = [] } = useQuery({
    queryKey: ["familyMembers", familyId],
    queryFn: () => getFamilyMembers(familyId!),
    enabled: !!familyId,
  });

  // 处理日期变更
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setDate(new Date(dateValue));
    }
  };

  // 处理时间变更
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

  // 处理账本变更
  const handleAccountBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAccountBookId(e.target.value);
  };

  // 处理家庭变更
  const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFamilyId(value === "" ? null : value);
  };

  // 处理家庭成员变更
  const handleFamilyMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFamilyMemberId(value === "" ? null : value);
  };

  // 处理更改分类按钮点击
  const handleChangeCategory = () => {
    goToStep(1);
  };

  // 设置默认日期和时间
  useEffect(() => {
    if (!date) {
      setDate(new Date());
    }
    
    if (!time) {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    }
  }, [date, time, setDate, setTime]);

  // 获取图标类名
  const getIconClass = (iconName: string | null) => {
    if (!iconName) return "fas fa-question";
    
    // 如果图标名称已经包含完整的类名，则直接返回
    if (iconName.startsWith("fa-")) {
      return `fas ${iconName}`;
    }
    
    // 根据图标名称映射到Font Awesome图标
    const iconMap: Record<string, string> = {
      restaurant: "fa-utensils",
      shopping: "fa-shopping-bag",
      transport: "fa-bus",
      home: "fa-home",
      clothing: "fa-tshirt",
      entertainment: "fa-gamepad",
      medical: "fa-heartbeat",
      education: "fa-graduation-cap",
      gift: "fa-gift",
      travel: "fa-plane",
      communication: "fa-mobile-alt",
      // 添加更多图标映射...
    };
    
    return `fas ${iconMap[iconName] || "fa-question"}`;
  };

  if (!categoryId || !categoryName) {
    return (
      <div className="step-content">
        <div className="text-center py-8">请先选择分类</div>
      </div>
    );
  }

  return (
    <div className="step-content" id="step-details">
      <div className="selected-category">
        <div className="category-icon-wrapper">
          <i className={getIconClass(categoryIcon)}></i>
        </div>
        <span>{categoryName}</span>
        <button className="change-category-btn" onClick={handleChangeCategory}>
          更改
        </button>
      </div>

      <div className="transaction-form">
        <div className="form-group">
          <label className="form-label">描述</label>
          <div className="form-input">
            <input
              type="text"
              placeholder="添加描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">日期</label>
          <div className="form-input">
            <input
              type="date"
              value={formatDateForInput(date)}
              onChange={handleDateChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">时间</label>
          <div className="form-input">
            <input
              type="time"
              value={time}
              onChange={handleTimeChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">账本</label>
          <div className="form-input">
            <select
              value={accountBookId || ""}
              onChange={handleAccountBookChange}
            >
              <option value="" disabled>
                选择账本
              </option>
              {accountBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {families.length > 0 && (
          <div className="form-group">
            <label className="form-label">家庭</label>
            <div className="form-input">
              <select
                value={familyId || ""}
                onChange={handleFamilyChange}
              >
                <option value="">个人</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {familyId && familyMembers.length > 0 && (
          <div className="form-group">
            <label className="form-label">成员</label>
            <div className="form-input">
              <select
                value={familyMemberId || ""}
                onChange={handleFamilyMemberChange}
              >
                <option value="">选择成员</option>
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
