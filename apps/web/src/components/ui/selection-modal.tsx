'use client';

import { ReactNode } from 'react';

interface SelectionOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: SelectionOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}

export function SelectionModal({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect
}: SelectionModalProps) {
  if (!isOpen) return null;

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="selection-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="selection-modal-header">
          <h3 className="selection-modal-title">{title}</h3>
          <button 
            className="selection-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="selection-modal-body">
          {options.map((option) => (
            <div
              key={option.value}
              className={`selection-option ${selectedValue === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.icon && (
                <div className="selection-option-icon">
                  <i className={option.icon}></i>
                </div>
              )}
              <div className="selection-option-content">
                <div className="selection-option-label">{option.label}</div>
                {option.description && (
                  <div className="selection-option-description">{option.description}</div>
                )}
              </div>
              {selectedValue === option.value && (
                <div className="selection-option-check">
                  <i className="fas fa-check"></i>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
