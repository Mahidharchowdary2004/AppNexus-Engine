'use client';
// frontend/src/components/core/DynamicTable.tsx

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityConfig, ComponentConfig } from '@/types/config';
import { dataApi } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { DynamicForm } from './DynamicForm';
import { DynamicModal } from './DynamicModal';
import { format } from 'date-fns';
import { ErrorState, TableSkeleton, EmptyState } from './StatusStates';

interface DynamicTableProps {
  appSlug: string;
  entity: EntityConfig;
  component: ComponentConfig;
}

export function DynamicTable({ appSlug, entity, component }: DynamicTableProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pageSize = component.pagination?.pageSize || 20;

  const queryKey = ['records', appSlug, entity.id, page, search, sortField, sortDir];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => dataApi.list(appSlug, entity.id, { page, pageSize, search, sort: sortField, dir: sortDir }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (d: object) => dataApi.create(appSlug, entity.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', appSlug, entity.id] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      dataApi.update(appSlug, entity.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', appSlug, entity.id] });
      setEditRecord(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataApi.delete(appSlug, entity.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', appSlug, entity.id] });
      setDeleteId(null);
    },
  });

  const actions = component.actions || ['create', 'edit', 'delete'];
  const visibleFields = component.fields || entity.fields.map(f => f.id);
  const displayFields = entity.fields.filter(f => visibleFields.includes(f.id) && !f.hidden);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const records: Record<string, unknown>[] = data?.data || [];
  const total: number = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const formatValue = (value: unknown, fieldType: string): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (fieldType === 'boolean') return value ? '✓' : '✗';
    if (fieldType === 'date' || fieldType === 'datetime') {
      try { return format(new Date(value as string), fieldType === 'date' ? 'MMM d, yyyy' : 'MMM d, yyyy HH:mm'); }
      catch { return String(value); }
    }
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{t(entity.labelPlural || entity.label)}</h2>
          {!isLoading && <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">{total}</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="search"
            placeholder={t('common.search') + '...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-base border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white"
          />
          {/* Export */}
          {actions.includes('export') && (
            <a
              href={dataApi.exportCsv(appSlug, entity.id)}
              className="text-base text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              {t('common.export')}
            </a>
          )}
          {/* Create */}
          {actions.includes('create') && (
            <button
              onClick={() => setCreateOpen(true)}
              className="text-base bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              + {t('common.create')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-12">
            <ErrorState 
              message={(error as Error).message || t('common.error')} 
              onRetry={() => queryClient.invalidateQueries({ queryKey })}
            />
          </div>
        ) : records.length === 0 ? (
          <EmptyState 
            actionLabel={actions.includes('create') ? `Create your first ${entity.label}` : undefined}
            onAction={actions.includes('create') ? () => setCreateOpen(true) : undefined}
          />
        ) : (
          <table className="w-full text-[15px] md:text-base">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {displayFields.map(field => (
                  <th
                    key={field.id}
                    className="text-left px-6 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none whitespace-nowrap transition-colors"
                    onClick={() => handleSort(field.id)}
                  >
                    <div className="flex items-center gap-2">
                      {t(field.label)}
                      {sortField === field.id && (
                        <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
                {(actions.includes('edit') || actions.includes('delete')) && (
                  <th className="text-right px-6 py-5 text-sm font-bold text-slate-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map(record => (
                <tr key={record.id as string} className="hover:bg-blue-50/30 transition-all group">
                  {displayFields.map(field => (
                    <td key={field.id} className="px-6 py-5 text-slate-600 max-w-[300px] truncate">
                      {field.type === 'boolean' ? (
                        <span className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-tight ${record[field.id] ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {record[field.id] ? 'Active' : 'Inactive'}
                        </span>
                      ) : field.type === 'select' ? (
                        <span className="inline-flex px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {formatValue(record[field.id], field.type)}
                        </span>
                      ) : (
                        <span className="font-medium">{formatValue(record[field.id], field.type)}</span>
                      )}
                    </td>
                  ))}
                  {(actions.includes('edit') || actions.includes('delete')) && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {actions.includes('edit') && (
                          <button
                            onClick={() => setEditRecord(record)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-2xl transition-all"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {actions.includes('delete') && (
                          <button
                            onClick={() => setDeleteId(record.id as string)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-100/50 rounded-2xl transition-all"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-base text-slate-600 bg-slate-50/60">
          <span>{t('table.page')} {page} {t('table.of')} {totalPages} · {total} {t('table.total')}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl border border-slate-300 disabled:opacity-40 hover:bg-white">
              {t('common.prev')}
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded-xl border border-slate-300 disabled:opacity-40 hover:bg-white">
              {t('common.next')}
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <DynamicModal open={createOpen} onClose={() => setCreateOpen(false)} title={`Create ${entity.label}`}>
        <DynamicForm
          entity={entity}
          onSubmit={async (data) => { await createMutation.mutateAsync(data); }}
          onCancel={() => setCreateOpen(false)}
          loading={createMutation.isPending}
        />
        {createMutation.error && (
          <p className="text-red-500 text-sm mt-2">{(createMutation.error as any)?.response?.data?.errors?.map((e: any) => e.message).join(', ') || 'Failed to create'}</p>
        )}
      </DynamicModal>

      {/* Edit Modal */}
      <DynamicModal open={!!editRecord} onClose={() => setEditRecord(null)} title={`Edit ${entity.label}`}>
        {editRecord && (
          <DynamicForm
            entity={entity}
            defaultValues={editRecord}
            onSubmit={async (data) => { await updateMutation.mutateAsync({ id: editRecord.id as string, data }); }}
            onCancel={() => setEditRecord(null)}
            loading={updateMutation.isPending}
          />
        )}
      </DynamicModal>

      {/* Delete Confirm */}
      <DynamicModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
        <p className="text-gray-600 mb-4">Are you sure you want to delete this record? This cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleteMutation.isPending ? 'Deleting...' : t('common.delete')}
          </button>
          <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </button>
        </div>
      </DynamicModal>
    </div>
  );
}
