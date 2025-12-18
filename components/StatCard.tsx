'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-100',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-100',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-100',
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      border: 'border-orange-100',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className={`bg-white rounded-xl border ${classes.border} p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <i className={`ri-arrow-${trend.isPositive ? 'up' : 'down'}-line text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}></i>
              <span className={`text-xs font-medium ml-1 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${classes.bg} rounded-lg flex items-center justify-center`}>
          <i className={`${icon} text-xl ${classes.icon}`}></i>
        </div>
      </div>
    </div>
  );
}