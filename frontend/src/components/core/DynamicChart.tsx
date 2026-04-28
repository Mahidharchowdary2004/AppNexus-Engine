'use client';
// frontend/src/components/core/DynamicChart.tsx
import { useQuery } from '@tanstack/react-query';
import { EntityConfig, ComponentConfig } from '@/types/config';
import { dataApi } from '@/lib/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ErrorState, EmptyState } from './StatusStates';
import { useLocale } from '@/contexts/LocaleContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface Props { appSlug: string; entity: EntityConfig; component: ComponentConfig; }

export function DynamicChart({ appSlug, entity, component }: Props) {
  const { t } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: ['chart', appSlug, entity.id],
    queryFn: () => dataApi.list(appSlug, entity.id, { pageSize: 1000 }),
  });

  const chartConfig = component.chart;
  if (!chartConfig) return <ErrorState title="Missing Chart Config" message="No chart configuration found." />;

  if (isLoading) {
    return (
      <div className="bg-white/95 rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/50">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="space-y-2 w-1/3">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
            </div>
            <div className="h-8 bg-blue-50 rounded-xl w-20" />
          </div>
          <div className="h-64 bg-slate-50 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState title="Failed to load chart" message={(error as Error).message} />;

  const records: Record<string, unknown>[] = data?.data || [];
  if (records.length === 0) {
    return (
      <div className="bg-white/95 rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/50">
         <EmptyState title="No data for chart" message="Add some records to see analytics." />
      </div>
    );
  }

  // Aggregate data by xField
  const aggregated: Record<string, number> = {};
  records.forEach(r => {
    const key = String(r[chartConfig.xField] || 'Unknown');
    const val = Number(r[chartConfig.yField] || 0);
    aggregated[key] = (aggregated[key] || 0) + val;
  });

  const chartData = Object.entries(aggregated).map(([name, value]) => ({ name, value }));

  return (
    <div className="bg-white/95 rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/50">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600/80">Analytics</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 tracking-tight">{t(component.title || entity.label + ' Chart')}</h3>
        </div>
        <div className="rounded-2xl bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-tight text-blue-700 border border-blue-100">
          {chartConfig.type}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        {chartConfig.type === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgba(59,130,246,0.08)' }} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 12px 32px rgba(15,23,42,0.12)', padding: '12px 16px' }} />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 4, 4]} />
          </BarChart>
        ) : chartConfig.type === 'line' || chartConfig.type === 'area' ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`chartFill-${entity.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 12px 32px rgba(15,23,42,0.12)', padding: '12px 16px' }} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill={`url(#chartFill-${entity.id})`} />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={chartConfig.type === 'donut' ? 60 : 0} paddingAngle={4} label>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
