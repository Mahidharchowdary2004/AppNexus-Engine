'use client';
// frontend/src/components/core/DynamicCardGrid.tsx
import { useQuery } from '@tanstack/react-query';
import { EntityConfig, ComponentConfig } from '@/types/config';
import { dataApi } from '@/lib/api';
import { ErrorState, EmptyState } from './StatusStates';
import { useLocale } from '@/contexts/LocaleContext';

interface Props { appSlug: string; entity: EntityConfig; component: ComponentConfig; }

export function DynamicCardGrid({ appSlug, entity, component }: Props) {
  const { t } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: ['cards', appSlug, entity.id],
    queryFn: () => dataApi.list(appSlug, entity.id, { pageSize: 20 }),
  });

  if (error) return <ErrorState title="Failed to load cards" message={(error as Error).message} />;

  const records: Record<string, unknown>[] = data?.data || [];
  const displayFields = entity.fields.slice(0, 4);
  const titleField = entity.fields[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t(entity.labelPlural || entity.label)}</h2>
        {!isLoading && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">{records.length} items</span>}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/50 rounded-3xl border border-slate-200 p-6 animate-pulse">
              <div className="mb-4 h-6 w-3/4 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
                <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.map(record => (
            <div key={record.id as string} className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/40 group">
              <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {String(record[titleField?.id] || 'Untitled')}
              </h3>
              <div className="mt-5 space-y-3">
                {displayFields.slice(1, 4).map(f => (
                  <div key={f.id} className="flex justify-between items-center text-[13px]">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">{t(f.label)}</span>
                    <span className="text-slate-700 font-semibold truncate ml-4">{String(record[f.id] || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
