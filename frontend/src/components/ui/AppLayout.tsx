'use client';
// frontend/src/components/ui/AppLayout.tsx
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppConfig } from '@/types/config';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  appConfig: AppConfig;
  appSlug: string;
  children: React.ReactNode;
}

const ICONS: Record<string, React.ReactNode> = {
  database: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>,
  users: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  chart: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  home: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  settings: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

function NavIcon({ name }: { name?: string }) {
  return ICONS[name || 'database'] || ICONS.database;
}

export function AppLayout({ appConfig, appSlug, children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, locale, setLocale, supportedLocales } = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = appConfig.navigation || appConfig.pages.map(p => ({
    id: p.id, label: p.title, icon: p.icon, path: `/app/${appSlug}${p.path}`,
  }));

  const theme = appConfig.theme || {};
  const primaryColor = theme.primaryColor || '#2563eb';

  const resolveNavHref = (item: NonNullable<AppConfig['navigation']>[number]) => {
    if (item.path) {
      return item.path.startsWith('/app/')
        ? item.path
        : `/app/${appSlug}${item.path.startsWith('/') ? item.path : `/${item.path}`}`;
    }

    if (item.page) {
      const page = appConfig.pages.find(p => p.id === item.page);
      if (page) {
        return `/app/${appSlug}${page.path.startsWith('/') ? page.path : `/${page.path}`}`;
      }
    }

    return `/app/${appSlug}/${item.id}`;
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden text-[15px] md:text-base">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-2xl lg:shadow-xl shadow-slate-200/40 transition-all duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 opacity-100'
      )}>
        {/* Logo / App name */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100/80">
          <div className="flex items-center gap-3 min-w-0">
            {theme.logo ? (
              <img src={theme.logo} alt={appConfig.name} className="h-10 w-10 rounded-2xl object-cover shadow-sm border border-slate-100" />
            ) : (
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-200/50" style={{ background: primaryColor }}>
                {appConfig.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-slate-900 text-lg truncate tracking-tight">{appConfig.name}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {nav.map(item => {
            const href = resolveNavHref(item);
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={item.id}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-bold transition-all',
                  active
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 active:scale-[0.98]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]'
                )}
              >
                <span className={cn(
                  'transition-colors duration-200',
                  active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                )}>
                  <NavIcon name={item.icon} />
                </span>
                {t(item.label)}
              </Link>
            );
          })}
          
          <div className="pt-6 mt-6 border-t border-slate-100">
             <Link
                href={`/app/${appSlug}/settings`}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[14px] font-bold transition-all',
                  pathname.includes('/settings')
                    ? 'bg-slate-900 text-white shadow-lg active:scale-[0.98]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]'
                )}
              >
                <span className={cn(
                  'transition-colors duration-200',
                  pathname.includes('/settings') ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                )}>
                  <NavIcon name="settings" />
                </span>
                App Configuration
              </Link>
          </div>
        </nav>

        {/* Bottom: user + locale */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-4">
          {/* Locale switcher */}
          {supportedLocales.length > 1 && (
            <div className="px-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Interface Language</label>
              <div className="flex flex-wrap gap-2">
                {supportedLocales.map(l => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
                      locale === l 
                        ? 'bg-white border-blue-500 text-blue-600 shadow-sm' 
                        : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'
                    )}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* User */}
          {user && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-inner">
                {user.avatar ? <img src={user.avatar} alt="" className="w-10 h-10 rounded-full" /> : user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate font-medium">{user.email}</p>
              </div>
              <button onClick={logout} title={t('auth.logout')} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition-all border border-transparent hover:border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
