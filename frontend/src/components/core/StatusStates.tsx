'use client';
// frontend/src/components/core/StatusStates.tsx

import React from 'react';
import { cn } from '@/lib/utils';

export function LoadingSkeleton({ className, count = 1 }: { className?: string; count?: number }) {
  return (
    <div className={cn('animate-pulse space-y-4', className)}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-slate-200 rounded-2xl h-24 w-full" />
      ))}
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="w-full bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-hidden">
      <div className="h-16 bg-slate-50 border-b border-slate-100 px-6 flex items-center justify-between">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-12 flex-1 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-12 flex-1 bg-slate-50 rounded-xl animate-pulse" />
            <div className="h-12 flex-1 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message, 
  onRetry 
}: { 
  title?: string; 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50/50 backdrop-blur-sm border border-red-200/60 rounded-3xl p-8 text-center max-w-lg mx-auto my-8">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-red-900 mb-2">{title}</h3>
      <p className="text-red-700/80 mb-8 leading-relaxed">{message || 'An unexpected error occurred. Please try again later.'}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="bg-red-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ 
  title = 'No records found', 
  message = 'Get started by creating your first entry.',
  actionLabel,
  onAction
}: { 
  title?: string; 
  message?: string; 
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-slate-50/50 border border-slate-200 border-dashed rounded-3xl p-12 text-center my-4">
      <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8 text-lg">{message}</p>
      {onAction && (
        <button 
          onClick={onAction}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
        >
          {actionLabel || '+ Create New'}
        </button>
      )}
    </div>
  );
}

export function UnknownComponentState({ type }: { type: string }) {
  return (
    <div className="bg-amber-50/50 backdrop-blur-sm border border-amber-200 rounded-3xl p-8 my-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
        <span className="w-8 h-8 bg-amber-200 rounded-xl flex items-center justify-center text-amber-700">⚠️</span>
        Unknown Component Type
      </h3>
      <p className="text-amber-800/80 mt-3 mb-4 leading-relaxed">
        The component type <code className="bg-amber-100 px-2 py-1 rounded-lg font-mono text-amber-900">{type}</code> is not registered in the <code className="bg-amber-100 px-2 py-1 rounded-lg font-mono text-amber-900 text-sm">ComponentRegistry.tsx</code>.
      </p>
      <div className="bg-white/40 border border-amber-200/50 rounded-2xl p-4 text-sm text-amber-900/60 font-medium italic">
        "Check your JSON configuration or add a new renderer to the registry to fix this."
      </div>
    </div>
  );
}

export function MissingFieldsState({ type, fields }: { type: string; fields: string[] }) {
  return (
    <div className="bg-rose-50/50 backdrop-blur-sm border border-rose-200 rounded-3xl p-8 my-4">
      <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
        <span className="w-8 h-8 bg-rose-200 rounded-xl flex items-center justify-center text-rose-700">📋</span>
        Incomplete Configuration
      </h3>
      <p className="text-rose-800/80 mt-3 mb-4 leading-relaxed">
        Component of type <span className="font-bold">{type}</span> is missing required fields:
      </p>
      <div className="flex flex-wrap gap-2">
        {fields.map(f => (
          <span key={f} className="bg-rose-200/50 text-rose-900 px-3 py-1.5 rounded-xl text-sm font-semibold border border-rose-200">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
