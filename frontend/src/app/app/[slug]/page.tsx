'use client';
// frontend/src/app/app/[slug]/page.tsx
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appsApi } from '@/lib/api';
import { AppConfig } from '@/types/config';

export default function AppIndexPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appsApi.get(slug).then(res => {
      const config = res.data.config as AppConfig;
      const firstPage = config.pages?.[0];
      if (firstPage) {
        router.replace(`/app/${slug}${firstPage.path}`);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [slug]);

  if (!loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>No pages configured for this app.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
