'use client';
// frontend/src/components/core/DynamicStatCard.tsx
import { useQuery } from '@tanstack/react-query';
import { EntityConfig, ComponentConfig } from '@/types/config';
import { dataApi } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';

interface Props { appSlug: string; entity: EntityConfig; component: ComponentConfig; }

export function DynamicStatCard({ appSlug, entity, component }: Props) {
  const { t } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: ['stat', appSlug, entity?.id],
    queryFn: () => entity ? dataApi.list(appSlug, entity.id, { pageSize: 1 }) : Promise.resolve({ meta: { total: 0 } }),
    enabled: !!entity,
  });

  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs">Error</div>;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/40 p-6 shadow-sm shadow-slate-200/50 group transition-all hover:shadow-md hover:border-blue-200">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl group-hover:bg-blue-400/20 transition-colors" />
      <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        {t(component.title || (entity?.label + ' Count'))}
      </p>
      <div className="relative mt-4 flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-10 w-20 bg-slate-100 animate-pulse rounded-lg" />
        ) : (
          <span className="text-5xl font-black tracking-tighter text-slate-900">
            {data?.meta?.total ?? 0}
          </span>
        )}
        <span className="text-sm font-bold text-slate-400 uppercase tracking-tight">Records</span>
      </div>
      {component.description && <p className="relative mt-4 text-sm text-slate-500 leading-relaxed font-medium">{component.description}</p>}
    </div>
  );
}
