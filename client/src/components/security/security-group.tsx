"use client";

import { ReactNode } from "react";

interface SecurityGroupProps {
  title: string;
  children: ReactNode;
}

export function SecurityGroup({ title, children }: SecurityGroupProps) {
  return (
    <div className="security-section">
      <div className="section-title">{title}</div>
      <div className="security-list">
        {children}
      </div>
    </div>
  );
}
