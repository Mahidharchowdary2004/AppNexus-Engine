'use client';
// frontend/src/app/auth/callback/page.tsx
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      Cookies.set('token', token, { expires: 7 });
      localStorage.setItem('token', token);
      router.push('/dashboard');
    } else {
      router.push('/auth/login?error=oauth_failed');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}
