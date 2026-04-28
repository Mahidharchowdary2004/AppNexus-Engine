'use client';
// frontend/src/app/app/[slug]/[...path]/page.tsx
// Catches all sub-paths like /app/crm/customers, /app/crm/deals, etc.
// Matches against config pages and renders components dynamically

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { appsApi } from '@/lib/api';
import { AppConfig, PageConfig } from '@/types/config';
import { ComponentRenderer } from '@/components/core/ComponentRegistry';
import { DynamicModal } from '@/components/core/DynamicModal';
import { CsvImporter } from '@/components/features/CsvImporter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ErrorState, TableSkeleton } from '@/components/core/StatusStates';

export default function DynamicPage() {
  const { slug, path } = useParams<{ slug: string; path: string[] }>();
  const queryClient = useQueryClient();
  const [importModal, setImportModal] = useState<{ entityId: string } | null>(null);

  const currentPath = '/' + (Array.isArray(path) ? path.join('/') : path);

  const { data: appData, isLoading: configLoading, isError } = useQuery({
    queryKey: ['app', slug],
    queryFn: () => appsApi.get(slug),
    staleTime: 5 * 60 * 1000,
  });

  const appConfig = appData?.data?.config as AppConfig;
  const page = appConfig?.pages.find(p => {
    if (p.path === currentPath) return true;
    if (p.path.replace(/\/$/, '') === currentPath.replace(/\/$/, '')) return true;
    return false;
  });

  if (isError || (appData && !page && !configLoading)) {
    return (
      <div className="py-20">
        <ErrorState 
          title="Page Not Found" 
          message={`The path "${currentPath}" does not exist in this application's configuration.`} 
        />
      </div>
    );
  }

  if (configLoading || !appConfig || !page) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 bg-white/50 border border-slate-100 rounded-3xl" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 h-[500px] bg-white/50 border border-slate-100 rounded-3xl" />
          <div className="col-span-12 lg:col-span-4 h-[500px] bg-white/50 border border-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  const isDashboardPage = page.components.some(component =>
    ['stat_card', 'chart', 'card_grid', 'kanban'].includes(component.type)
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 rounded-[2.5rem] border border-slate-200/60 bg-gradient-to-br from-white via-white to-blue-50/50 px-8 py-8 shadow-sm shadow-slate-200/30 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600/60">
            {isDashboardPage ? 'Analytics Hub' : 'System View'}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">{page.title}</h1>
          <p className="mt-3 text-base text-slate-500 font-medium leading-relaxed">
            {isDashboardPage
              ? 'Real-time monitoring and advanced data visualization for your active datasets.'
              : 'Streamlined data management interface with automated workflow optimization.'}
          </p>
        </div>

        {/* Show CSV import button if any component has import action */}
        {page.components.some(c => c.actions?.includes('import') && c.entity) && (
          <button
            onClick={() => {
              const comp = page.components.find(c => c.actions?.includes('import') && c.entity);
              if (comp?.entity) setImportModal({ entityId: comp.entity });
            }}
            className="inline-flex items-center gap-2 self-start rounded-2xl border-2 border-slate-100 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-blue-100 hover:text-blue-600 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Data
          </button>
        )}
      </div>

      {/* Render all components on this page */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {page.components.map((component, idx) => (
          <div
            key={component.id || `${page.id}-comp-${idx}`}
            className={cn(
              'min-w-0',
              component.type === 'stat_card' && 'md:col-span-6 xl:col-span-3',
              component.type === 'chart' && 'xl:col-span-6',
              component.type === 'card_grid' && 'xl:col-span-8',
              component.type === 'kanban' && 'xl:col-span-12',
              !['stat_card', 'chart', 'card_grid', 'kanban'].includes(component.type) && 'xl:col-span-12'
            )}
          >
            <ComponentRenderer
              component={component}
              appSlug={slug}
              appConfig={appConfig}
            />
          </div>
        ))}
      </div>

      {/* CSV Import modal */}
      {importModal && appConfig.entities.find(e => e.id === importModal.entityId) && (
        <DynamicModal
          open={!!importModal}
          onClose={() => setImportModal(null)}
          title={`Import CSV → ${appConfig.entities.find(e => e.id === importModal.entityId)?.label}`}
          size="lg"
        >
          <CsvImporter
            appSlug={slug}
            entity={appConfig.entities.find(e => e.id === importModal.entityId)!}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['records', slug, importModal.entityId] });
              setImportModal(null);
            }}
          />
        </DynamicModal>
      )}
    </div>
  );
}
