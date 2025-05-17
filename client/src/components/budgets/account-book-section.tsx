"use client";

import { useBudgetFormStore } from "@/store/budget-form-store";

export function AccountBookSection() {
  const { 
    accountBooks, 
    selectedAccountBookId, 
    setSelectedAccountBook,
    mode
  } = useBudgetFormStore();

  // 处理账本选择
  const handleAccountBookSelect = (id: string) => {
    // 编辑模式下不允许更改账本
    if (mode === "edit") return;
    
    setSelectedAccountBook(id);
  };

  return (
    <div className="form-section">
      <div className="section-title">选择账本</div>
      <div className="account-book-options">
        {accountBooks.map((book) => (
          <div
            key={book.id}
            className={`account-book-option ${
              selectedAccountBookId === book.id ? "active" : ""
            } ${mode === "edit" ? "disabled" : ""}`}
            onClick={() => handleAccountBookSelect(book.id)}
          >
            <i className={`fas fa-${book.type === "PERSONAL" ? "book" : "users"}`}></i>
            <span>{book.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
