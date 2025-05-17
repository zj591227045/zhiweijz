"use client";

interface EmptyStateProps {
  onCreateFamily: () => void;
  onJoinFamily: () => void;
}

export function EmptyState({ onCreateFamily, onJoinFamily }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <i className="fas fa-home text-4xl text-primary"></i>
      </div>
      <h2 className="text-xl font-semibold mb-2">还没有家庭账本</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        创建或加入家庭账本，与家人共同管理财务，记录家庭收支。
      </p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <button
          className="btn-primary w-full py-3 rounded-lg flex items-center justify-center"
          onClick={onCreateFamily}
        >
          <i className="fas fa-plus mr-2"></i>
          创建家庭
        </button>
        <button
          className="btn-outline w-full py-3 rounded-lg flex items-center justify-center mt-6"
          onClick={onJoinFamily}
        >
          <i className="fas fa-sign-in-alt mr-2"></i>
          加入家庭
        </button>
      </div>
    </div>
  );
}
