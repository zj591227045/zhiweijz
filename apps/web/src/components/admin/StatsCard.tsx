'use client';

import { ComponentType } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray' | 'yellow';
  change?: string;
  changeType: 'positive' | 'negative' | 'neutral' | 'warning';
  isLoading?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-500 text-white',
    text: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-500 text-white',
    text: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-500 text-white',
    text: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-500 text-white',
    text: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-500 text-white',
    text: 'text-red-600',
  },
  gray: {
    bg: 'bg-gray-50',
    icon: 'bg-gray-500 text-white',
    text: 'text-gray-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-500 text-white',
    text: 'text-yellow-600',
  },
};

const changeTypeClasses = {
  positive: 'text-green-600 bg-green-100',
  negative: 'text-red-600 bg-red-100',
  neutral: 'text-gray-600 bg-gray-100',
  warning: 'text-yellow-600 bg-yellow-100',
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  change,
  changeType,
  isLoading = false,
}: StatsCardProps) {
  const colors = colorClasses[color] || colorClasses.blue; // 默认使用蓝色
  const changeColors = changeTypeClasses[changeType] || changeTypeClasses.neutral; // 默认使用中性色

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse"></div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
          </div>
        </div>
        {change && (
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${colors.bg} rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`h-10 w-10 rounded-lg ${colors.icon} flex items-center justify-center`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-bold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>

      {change && (
        <div className="mt-4">
          <div
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${changeColors}`}
          >
            {change}
          </div>
        </div>
      )}
    </div>
  );
}
