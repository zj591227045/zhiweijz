"use client";

import { useBudgetFormStore } from "@/store/budget-form-store";

export function RolloverSection() {
  const {
    enableRollover,
    toggleRollover,
    rolloverData,
    mode
  } = useBudgetFormStore();

  return (
    <div className="form-section">
      <div className="section-header">
        <div className="section-title">结转设置</div>
        <div className="toggle-container">
          <span>启用结转</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={enableRollover}
              onChange={toggleRollover}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      {enableRollover && (
        <>
          <div className="rollover-info">
            <i className="fas fa-info-circle"></i>
            <p>启用结转后，当月未花完的预算将结转到下个月，超支的金额将从下个月扣除。</p>
          </div>
          
          {mode === "edit" && rolloverData.previousRollover !== null && (
            <div className="current-rollover">
              <div className="rollover-header">当前结转情况</div>
              <div className="rollover-data">
                {rolloverData.previousRollover !== null && (
                  <div className="rollover-item">
                    <span className="rollover-label">上月结转:</span>
                    <span className={`rollover-value ${rolloverData.previousRollover >= 0 ? "positive" : "negative"}`}>
                      {rolloverData.previousRollover >= 0 ? "+" : ""}
                      ¥{Math.abs(rolloverData.previousRollover).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {rolloverData.estimatedRollover !== null && (
                  <div className="rollover-item">
                    <span className="rollover-label">本月预计结转:</span>
                    <span className={`rollover-value ${rolloverData.estimatedRollover >= 0 ? "positive" : "negative"}`}>
                      {rolloverData.estimatedRollover >= 0 ? "+" : ""}
                      ¥{Math.abs(rolloverData.estimatedRollover).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
