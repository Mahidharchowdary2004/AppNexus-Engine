'use client';
// frontend/src/app/app/[slug]/settings/page.tsx
// Post-creation integration: Allow users to modify the app configuration after generation

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { appsApi } from '@/lib/api';
import { AppConfig } from '@/types/config';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState, LoadingSkeleton } from '@/components/core/StatusStates';
import { cn } from '@/lib/utils';

export default function AppSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [app, setApp] = useState<{ id: string; slug: string; name: string; config: AppConfig } | null>(null);
  const [configJson, setConfigJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'config' | 'notifications'>('config');
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEffect(() => {
    appsApi.get(slug).then(res => {
      setApp(res.data);
      setConfigJson(JSON.stringify(res.data.config, null, 2));
      setLoading(false);
    }).catch(err => {
      setError(err.response?.data?.error || 'Failed to load configuration');
      setLoading(false);
    });
  }, [slug]);

  const fetchNotifs = async () => {
    setLoadingNotifs(true);
    try {
      const res = await appsApi.getNotifications(slug);
      setNotifs(res.data);
    } catch (e) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') fetchNotifs();
  }, [activeTab, slug]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      setWarnings([]);
      
      let parsed;
      try {
        parsed = JSON.parse(configJson);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }

      const res = await appsApi.update(slug, parsed);
      
      if (res.warnings) {
        setWarnings(res.warnings.map((w: any) => w.message));
      }

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.map((e: any) => e.message).join(', '));
      } else {
        setError(err.message || 'Failed to update configuration');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error && !app) return <ErrorState title="Settings Error" message={error} />;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-4 rounded-[2.5rem] border border-slate-200/60 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600/60 mb-2 px-1">Engine Control Room</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{app?.name}</h1>
            <div className="flex items-center gap-4 mt-4">
               <button 
                onClick={() => setActiveTab('config')}
                className={cn(
                  "text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all",
                  activeTab === 'config' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
               >
                 Architecture
               </button>
               <button 
                onClick={() => setActiveTab('notifications')}
                className={cn(
                  "text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all",
                  activeTab === 'notifications' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
               >
                 Notifications
               </button>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2 text-right">
             <span className="px-4 py-1.5 bg-blue-100 text-blue-700 text-[11px] font-black uppercase tracking-widest rounded-full border border-blue-200/50 shadow-sm">Nexus Core Active</span>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Version {app?.config.version || '1.0.0'}</p>
          </div>
        </div>
      </div>

      {activeTab === 'config' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                 <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
               </div>
               <h3 className="text-xl font-black mb-4 flex items-center gap-3 relative z-10">
                 Live Integration
               </h3>
               <p className="text-sm text-slate-400 leading-relaxed mb-8 relative z-10 font-medium">
                 Modify the JSON schema below to dynamically update entities, pages, or components. The engine validates all changes in real-time.
               </p>
               <ul className="space-y-4 text-[13px] font-bold text-slate-300 relative z-10">
                 <li className="flex items-start gap-3 group/item">
                   <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover/item:bg-blue-500 group-hover/item:text-white transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   </div>
                   Add "relation" fields to link data
                 </li>
                 <li className="flex items-start gap-3 group/item">
                   <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover/item:bg-blue-500 group-hover/item:text-white transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                   </div>
                   Create analytical "chart" widgets
                 </li>
               </ul>
            </div>
            
            <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100/50">
               <h4 className="text-xs font-black text-blue-900 uppercase tracking-[0.2em] mb-4">Deployment Log</h4>
               <div className="space-y-3">
                 {success && <p className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   Successfully deployed v{app?.config.version}
                 </p>}
                 {error && <p className="text-xs font-bold text-rose-600 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                   Deployment failed
                 </p>}
                 {warnings.map((w, i) => (
                   <p key={i} className="text-xs font-bold text-amber-600 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                     {w}
                   </p>
                 ))}
               </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2.7rem] opacity-20 blur group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
              <div className="relative bg-slate-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                <div className="bg-slate-900 px-8 py-4 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500/40" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/40" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <span className="text-[11px] font-mono font-black text-slate-500 tracking-widest uppercase">app_architecture.json</span>
                  </div>
                </div>
                <textarea
                  value={configJson}
                  onChange={e => { setConfigJson(e.target.value); setSuccess(false); setError(null); }}
                  className="w-full h-[600px] bg-transparent text-blue-400 font-mono text-[14px] p-10 focus:outline-none resize-none custom-scrollbar selection:bg-blue-500/20 leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <button 
                onClick={() => router.back()}
                className="px-8 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Deploying...' : 'Apply Config'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[2.5rem] border border-slate-200/60 bg-white overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
           <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Communication Logs</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Audit trail of all transactional emails and event triggers.</p>
              </div>
              <button onClick={fetchNotifs} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <svg className={cn("w-5 h-5", loadingNotifs && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
           </div>
           
           {loadingNotifs && notifs.length === 0 ? (
             <div className="p-20 text-center">
               <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading logs...</p>
             </div>
           ) : notifs.length === 0 ? (
             <div className="p-20 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
               </div>
               <p className="text-slate-900 font-black text-lg">No notifications yet</p>
               <p className="text-slate-500 text-sm mt-2 font-medium">Logs will appear here once events are triggered.</p>
             </div>
           ) : (
             <div className="divide-y divide-slate-100">
               {notifs.map((log) => (
                 <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-start gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                      log.status.includes('sent') ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {log.channel === 'email' ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{log.trigger}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mb-3">
                        {log.channel === 'email' ? `Email to ${log.payload?.to || 'recipient'}` : `Webhook to ${log.payload?.url || 'endpoint'}`}
                      </p>
                      <div className="flex items-center gap-3">
                         <span className={cn(
                           "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border",
                           log.status.includes('sent') ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                         )}>
                           {log.status.replace('_', ' ')}
                         </span>
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{log.channel}</span>
                      </div>
                    </div>
                    <details className="group/details">
                       <summary className="list-none p-2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                       </summary>
                       <div className="bg-slate-900 text-white rounded-2xl p-6 mt-4 text-[10px] font-mono overflow-hidden">
                          <p className="text-blue-400 mb-2 font-bold uppercase tracking-widest">Payload Context</p>
                          <pre className="custom-scrollbar overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                       </div>
                    </details>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
}
