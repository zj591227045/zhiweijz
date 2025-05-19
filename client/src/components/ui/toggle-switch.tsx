'use client';

import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({ id, checked, onChange }: ToggleSwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
      />
      <span className="toggle-slider"></span>
    </label>
  );
}
