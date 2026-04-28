'use client';
// frontend/src/components/core/DynamicKanban.tsx
import { useQuery } from '@tanstack/react-query';
import { EntityConfig, ComponentConfig } from '@/types/config';
import { dataApi } from '@/lib/api';
import { ErrorState } from './StatusStates';
import { useLocale } from '@/contexts/LocaleContext';

interface Props { appSlug: string; entity: EntityConfig; component: ComponentConfig; }

export function DynamicKanban({ appSlug, entity, component }: Props) {
  const { t } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: ['kanban', appSlug, entity.id],
    queryFn: () => dataApi.list(appSlug, entity.id, { pageSize: 200 }),
  });

  if (error) return <ErrorState title="Failed to load kanban" message={(error as Error).message} />;

  // Find select field to group by
  const groupField = entity.fields.find(f => f.type === 'select');
  const titleField = entity.fields[0];
  const records: Record<string, unknown>[] = data?.data || [];

  if (!groupField || !groupField.options) {
    return <ErrorState title="Invalid Kanban Config" message="Kanban requires at least one select field for grouping." />;
  }

  const columns = (groupField.options as any[]).map(opt => ({
    id: typeof opt === 'string' ? opt : opt.value,
    label: typeof opt === 'string' ? opt : opt.label,
    records: records.filter(r => r[groupField.id] === (typeof opt === 'string' ? opt : opt.value)),
  }));

  if (isLoading) {
    return (
       <div className="flex gap-6 overflow-x-auto pb-6">
         {[...Array(3)].map((_, i) => (
           <div key={i} className="flex-shrink-0 w-80 space-y-4">
             <div className="h-8 w-1/2 bg-slate-100 rounded-xl animate-pulse" />
             <div className="h-32 bg-slate-50 rounded-3xl animate-pulse" />
             <div className="h-32 bg-slate-50 rounded-3xl animate-pulse" />
           </div>
         ))}
       </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-slate-900 tracking-tight">{t(entity.labelPlural || entity.label)}</h2>
      <div className="flex gap-6 overflow-x-auto pb-6">
        {columns.map(col => (
          <div key={col.id} className="flex-shrink-0 w-80">
            <div className="mb-4 flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.15em] truncate">{t(col.label)}</h3>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-400 border border-slate-200/50">{col.records.length}</span>
            </div>
            <div className="space-y-3">
              {col.records.length === 0 ? (
                <div className="h-24 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">Empty</div>
              ) : (
                col.records.map(record => (
                  <div key={record.id as string} className="group cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-blue-200">
                    <p className="text-[15px] font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{String(record[titleField?.id] || 'Untitled')}</p>
                    {entity.fields[1] && (
                      <p className="mt-2 text-sm text-slate-500 truncate font-medium">{String(record[entity.fields[1].id] || '')}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
