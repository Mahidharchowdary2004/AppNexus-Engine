'use client';
// frontend/src/app/app/[slug]/layout.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { appsApi } from '@/lib/api';
import { AppConfig } from '@/types/config';
import { AppLayout } from '@/components/ui/AppLayout';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: appData, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['app', slug],
    queryFn: () => appsApi.get(slug),
    staleTime: 5 * 60 * 1000,
    enabled: !authLoading,
  });

  const appConfig = appData?.data?.config as AppConfig;
  const loading = configLoading || authLoading;
  const error = configError ? (configError as any).response?.status === 404 ? 'App not found' : 'Failed to load app' : null;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading app...</p>
        </div>
      </div>
    );
  }

  if (error || !appConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">{error || 'App not found'}</p>
          <button onClick={() => router.push('/dashboard')} className="mt-3 text-sm text-blue-600 hover:underline">
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <LocaleProvider appConfig={appConfig}>
      <AppLayout appConfig={appConfig} appSlug={slug}>
        {children}
      </AppLayout>
    </LocaleProvider>
  );
}
