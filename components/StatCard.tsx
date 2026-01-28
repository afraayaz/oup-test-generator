'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  // Strict dashboard palette
  // Deep maroon: #B71C2B, dark navy: #0B1F3A, white: #fff, soft gray: #B0B7C3, heading: #1A2233
  // Only use these colors for all stat cards
  const palette = {
    cardBg: 'bg-[#B71C2B]', // deep maroon
    icon: 'text-white',
    border: 'border-[#B71C2B]',
    heading: 'text-[#1A2233]', // dark navy/charcoal
    value: 'text-white',
    secondary: 'text-[#B0B7C3]', // soft gray
  };

  return (
    <div className={`rounded-xl border ${palette.border} p-6 shadow-sm hover:shadow-md transition-shadow ${palette.cardBg}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1 text-white">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <i className={`ri-arrow-${trend.isPositive ? 'up' : 'down'}-line text-sm text-white`}></i>
              <span className="text-xs font-medium ml-1 text-white">
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-white bg-opacity-20`}>
          <span className="text-white text-2xl w-full h-full flex items-center justify-center">{icon}</span>
        </div>
      </div>
    </div>
  );
}