"use client";

interface SecurityItemProps {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
  showArrow?: boolean;
  status?: string;
  statusType?: 'success' | 'warning' | 'error';
}

export function SecurityItem({
  icon,
  title,
  description,
  onClick,
  showArrow = false,
  status,
  statusType = 'success'
}: SecurityItemProps) {
  return (
    <div 
      className="security-item" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="security-icon">
        <i className={`fas fa-${icon}`}></i>
      </div>
      <div className="security-details">
        <div className="security-title">{title}</div>
        <div className="security-description">{description}</div>
      </div>
      <div className="security-status">
        {status && (
          <span className={`status-badge status-${statusType}`}>{status}</span>
        )}
        {showArrow && <i className="fas fa-chevron-right"></i>}
      </div>
    </div>
  );
}
