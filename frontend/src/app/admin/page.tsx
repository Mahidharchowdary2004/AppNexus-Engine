'use client';
// frontend/src/app/admin/page.tsx
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
  });

  const stats = data?.data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers || 0,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/admin/users',
    },
    {
      label: 'Active Users',
      value: stats.activeUsers || 0,
      icon: '✅',
      color: 'bg-green-500',
      link: '/admin/users?isActive=true',
    },
    {
      label: 'Admin Users',
      value: stats.adminUsers || 0,
      icon: '🔑',
      color: 'bg-purple-500',
      link: '/admin/users?role=admin',
    },
    {
      label: 'Total Apps',
      value: stats.totalApps || 0,
      icon: '📱',
      color: 'bg-orange-500',
      link: '/dashboard',
    },
    {
      label: 'Total Records',
      value: stats.totalRecords || 0,
      icon: '📊',
      color: 'bg-teal-500',
      link: '/dashboard',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map(stat => (
          <Link
            key={stat.label}
            href={stat.link}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
          <p className="text-sm text-gray-500 mt-1">Latest users who joined the platform</p>
        </div>
        <div className="divide-y divide-gray-200">
          {stats.recentUsers?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No users yet</p>
            </div>
          ) : (
            stats.recentUsers?.map((user: any) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        {stats.recentUsers?.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all users →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
