'use client';
// frontend/src/app/dashboard/page.tsx
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { appsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DynamicModal } from '@/components/core/DynamicModal';
import { cn } from '@/lib/utils';

const DEMO_CONFIGS = [
  {
    label: 'CRM App',
    icon: '👥',
    description: 'Customers, deals, contacts',
    config: {
      id: 'crm', name: 'Customer CRM', version: '1.0.0',
      locale: { 
        default: 'en', 
        supported: ['en', 'es', 'fr'],
        messages: {
          es: { 'overview.title': 'Vista General', 'customers.title': 'Clientes' },
          fr: { 'overview.title': 'Vue d\'ensemble', 'customers.title': 'Clients' }
        }
      },
      entities: [
        {
          id: 'customers', label: 'Customer', labelPlural: 'Customers', icon: 'users',
          fields: [
            { id: 'name', label: 'Name', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'email', required: true },
            { id: 'phone', label: 'Phone', type: 'phone' },
            { id: 'status', label: 'Status', type: 'select', options: ['lead', 'active', 'churned'], defaultValue: 'lead' },
            { id: 'value', label: 'Deal Value', type: 'number' },
            { id: 'notes', label: 'Notes', type: 'textarea' },
          ],
        },
        {
          id: 'deals', label: 'Deal', labelPlural: 'Deals', icon: 'chart',
          fields: [
            { id: 'title', label: 'Title', type: 'text', required: true },
            { id: 'amount', label: 'Amount', type: 'number', required: true },
            { id: 'stage', label: 'Stage', type: 'select', options: ['prospecting', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
            { id: 'closeDate', label: 'Close Date', type: 'date' },
          ],
        },
      ],
      pages: [
        { id: 'customers-page', path: '/customers', title: 'Customers', icon: 'users', components: [{ type: 'table', entity: 'customers', actions: ['create', 'edit', 'delete', 'export', 'import'] }] },
        { id: 'deals-page', path: '/deals', title: 'Pipeline', icon: 'chart', components: [{ type: 'kanban', entity: 'deals' }] },
        { id: 'dashboard', path: '/overview', title: 'Overview', icon: 'home', components: [
          { type: 'stat_card', entity: 'customers', title: 'Total Customers' },
          { type: 'stat_card', entity: 'deals', title: 'Total Deals' },
          { type: 'chart', entity: 'customers', title: 'Customers by Status', chart: { type: 'pie', xField: 'status', yField: 'value' } },
        ]},
      ],
      notifications: { events: [{ trigger: 'record.created', entity: 'customers', email: { to: 'admin@example.com', subject: 'New customer: {{name}}' } }] },
      integrations: { csvImport: { enabled: true, entities: ['customers'] }, export: { enabled: true, formats: ['csv', 'json'] } },
    },
  },
  {
    label: 'Task Manager',
    icon: '✅',
    description: 'Projects, tasks, team',
    config: {
      id: 'tasks', name: 'Task Manager', version: '1.0.0',
      entities: [
        {
          id: 'projects', label: 'Project', labelPlural: 'Projects',
          fields: [
            { id: 'name', label: 'Name', type: 'text', required: true },
            { id: 'description', label: 'Description', type: 'textarea' },
            { id: 'status', label: 'Status', type: 'select', options: ['planning', 'active', 'on_hold', 'completed'] },
            { id: 'dueDate', label: 'Due Date', type: 'date' },
          ],
        },
        {
          id: 'tasks', label: 'Task', labelPlural: 'Tasks',
          fields: [
            { id: 'title', label: 'Title', type: 'text', required: true },
            { id: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
            { id: 'status', label: 'Status', type: 'select', options: ['todo', 'in_progress', 'review', 'done'], defaultValue: 'todo' },
            { id: 'dueDate', label: 'Due Date', type: 'date' },
            { id: 'description', label: 'Description', type: 'textarea' },
          ],
        },
      ],
      pages: [
        { id: 'tasks-board', path: '/board', title: 'Board', components: [{ type: 'kanban', entity: 'tasks' }] },
        { id: 'projects-list', path: '/projects', title: 'Projects', components: [{ type: 'table', entity: 'projects', actions: ['create', 'edit', 'delete'] }] },
        { id: 'tasks-list', path: '/tasks', title: 'All Tasks', components: [{ type: 'table', entity: 'tasks', actions: ['create', 'edit', 'delete', 'export'] }] },
      ],
    },
  },
  {
    label: 'Inventory',
    icon: '📦',
    description: 'Products, stock, suppliers',
    config: {
      id: 'inventory', name: 'Inventory Manager', version: '1.0.0',
      entities: [
        {
          id: 'products', label: 'Product', labelPlural: 'Products',
          fields: [
            { id: 'name', label: 'Product Name', type: 'text', required: true },
            { id: 'sku', label: 'SKU', type: 'text', required: true },
            { id: 'category', label: 'Category', type: 'select', options: ['electronics', 'clothing', 'food', 'furniture', 'other'] },
            { id: 'price', label: 'Price', type: 'number', required: true },
            { id: 'stock', label: 'Stock', type: 'number', defaultValue: 0 },
            { id: 'lowStockThreshold', label: 'Low Stock Alert', type: 'number', defaultValue: 10 },
          ],
        },
      ],
      pages: [
        { id: 'products', path: '/products', title: 'Products', components: [{ type: 'table', entity: 'products', actions: ['create', 'edit', 'delete', 'export', 'import'] }] },
        { id: 'overview', path: '/overview', title: 'Overview', components: [
          { type: 'stat_card', entity: 'products', title: 'Total Products' },
          { type: 'chart', entity: 'products', title: 'Stock by Category', chart: { type: 'bar', xField: 'category', yField: 'stock' } },
        ]},
      ],
      integrations: { csvImport: { enabled: true, entities: ['products'] }, export: { enabled: true, formats: ['csv', 'json'] } },
    },
  },
];

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonQuestions, setJsonQuestions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['apps'],
    queryFn: appsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: appsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apps'] }),
  });

  // Guard: Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Initialising Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  const CREATION_STEPS = [
    'Analyzing configuration...',
    'Validating architecture schema...',
    'Generating data models...',
    'Building dynamic navigation...',
    'Initializing Nexus Engine...',
    'Launching application...'
  ];
  const apps = data?.data || [];

  const handleCreate = async (config?: Record<string, unknown>) => {
    setJsonError('');
    setJsonQuestions([]);
    setCreating(true);
    try {
      let parsedConfig: Record<string, unknown> = config || {};
      if (!config) {
        parsedConfig = JSON.parse(jsonInput);
      }
      const validation = await appsApi.validate(parsedConfig);
      if (!validation.valid) {
        const messages = validation.errors?.map((err: any) => err.message) || [];
        setJsonError(messages.join(', ') || 'The JSON config is incomplete.');
        setJsonQuestions(buildConfigQuestions(parsedConfig, validation.errors || []));
        return;
      }
      const res = await appsApi.create(parsedConfig);
      
      // Artificial delay for "WOW" factor and to show the flow
      for (let i = 0; i < CREATION_STEPS.length; i++) {
        setCreationStep(i);
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      }

      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setTimeout(() => {
        setCreateOpen(false);
        router.push(`/app/${res.data.slug}`);
      }, 500);
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        setJsonError('Invalid JSON: ' + e.message);
        setJsonQuestions(buildSyntaxQuestions(jsonInput));
      } else {
        const errors = e.response?.data?.errors || [];
        setJsonError(errors.map((err: any) => err.message).join(', ') || e.response?.data?.error || 'Failed to create app');
        setJsonQuestions(buildConfigQuestions(tryParseJson(jsonInput), errors));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">CA</Link>
            <span className="font-semibold text-gray-900">ConfigApp</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <span className="text-sm text-gray-500">{user?.name}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Apps</h1>
            <p className="text-gray-500 text-sm mt-1">Build apps from JSON configuration</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New App
          </button>
        </div>

        {/* Apps grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-gray-600 font-medium mb-2">No apps yet</p>
            <p className="text-gray-400 text-sm mb-6">Start by creating an app from a JSON config or use a template below</p>
            <button onClick={() => setCreateOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors">
              Create your first app
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {apps.map((app: any) => (
              <div key={app.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-sm">
                    {app.name.slice(0, 2).toUpperCase()}
                  </div>
                  <button
                    onClick={() => confirm('Delete this app?') && deleteMutation.mutate(app.slug)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{app.name}</h3>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-400">/{app.slug}</p>
                  {app.owner && (
                    <p className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded italic">
                      by {app.owner.email}
                    </p>
                  )}
                </div>
                <Link
                  href={`/app/${app.slug}`}
                  className="block w-full text-center bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Open App →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Templates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start from a template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEMO_CONFIGS.map(demo => (
              <div key={demo.label} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleCreate(demo.config)}>
                <div className="text-3xl mb-3">{demo.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{demo.label}</h3>
                <p className="text-sm text-gray-500 mb-4">{demo.description}</p>
                <span className="text-sm text-blue-600 font-medium group-hover:underline">Use template →</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Create from JSON modal - MacBook Style */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl my-8">
            {/* Close button */}
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* MacBook Pro Enclosure */}
            <div className="relative bg-slate-800 rounded-[2.5rem] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_20_50_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-700">
              {/* Screen Frame/Bezel */}
              <div className="bg-black rounded-[1.8rem] overflow-hidden flex flex-col shadow-inner">
                
                {/* Top Bezel with Notch */}
                <div className="relative h-7 bg-black flex items-center justify-center">
                  <div className="absolute left-6 flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] shadow-sm" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] shadow-sm" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] shadow-sm" />
                  </div>
                  
                  {/* The Notch */}
                  <div className="w-40 h-6 bg-black rounded-b-2xl flex items-center justify-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] shadow-inner" /> {/* Camera */}
                    <div className="w-1 h-1 rounded-full bg-[#0a0a0a]" /> {/* Sensor */}
                  </div>

                  <div className="absolute right-6 flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase tracking-widest">
                    <span className="animate-pulse flex h-1.5 w-1.5 rounded-full bg-blue-500 opacity-75" />
                    Live Config
                  </div>
                </div>

                {/* Main Content (The Screen) */}
                <div className="flex flex-col bg-slate-900 flex-1">
                  {/* Editor Header/Tab Bar */}
                  <div className="bg-slate-800 px-4 py-2 flex items-center border-b border-white/5">
                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-t-lg border-x border-t border-white/10 text-xs text-gray-300">
                      <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                      </svg>
                      <span className="font-medium">config.json</span>
                    </div>
                  </div>

                  {/* Code Editor Area */}
                  <div className="flex-1 min-h-[400px] max-h-[60vh] overflow-auto custom-scrollbar group/editor bg-slate-950 relative">
                    {creating ? (
                      <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
                        {/* Technical Animation */}
                        <div className="relative w-24 h-24 mb-8">
                          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <div className="absolute inset-4 border-4 border-cyan-400/20 rounded-full" />
                          <div className="absolute inset-4 border-4 border-cyan-400 border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Synthesizing Application</h3>
                        <p className="text-slate-400 text-sm mb-8 max-w-xs">{CREATION_STEPS[creationStep]}</p>

                        {/* Progress Bar */}
                        <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden mb-8">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                            style={{ width: `${((creationStep + 1) / CREATION_STEPS.length) * 100}%` }}
                          />
                        </div>

                        {/* Step Indicators */}
                        <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                          {CREATION_STEPS.map((step, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "h-1 rounded-full transition-all duration-300",
                                i <= creationStep ? "bg-blue-500" : "bg-slate-800"
                              )} 
                            />
                          ))}
                        </div>

                        {/* Terminal-like output */}
                        <div className="mt-8 w-full max-w-md bg-black/40 rounded-lg p-4 font-mono text-[10px] text-left border border-white/5 h-32 overflow-hidden">
                          <div className="text-blue-400 opacity-50 mb-1">Nexus Engine v1.0.4 - Log Output</div>
                          <div className="space-y-1">
                            {CREATION_STEPS.slice(0, creationStep + 1).map((step, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-green-500">DONE</span>
                                <span className="text-slate-500">{step}</span>
                              </div>
                            ))}
                            {creationStep < CREATION_STEPS.length - 1 && (
                              <div className="flex gap-2 animate-pulse">
                                <span className="text-blue-500">RUN</span>
                                <span className="text-slate-300">{CREATION_STEPS[creationStep + 1]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex min-h-full">
                      {/* Line Numbers */}
                      <div className="bg-slate-950 px-4 py-6 border-r border-white/5 select-none text-right sticky left-0 z-10">
                        <div className="text-slate-600 font-mono text-[13px] leading-6">
                          {Array.from({ length: Math.max(25, jsonInput.split('\n').length) }, (_, i) => (
                            <div key={i + 1} className="h-6">{i + 1}</div>
                          ))}
                        </div>
                      </div>

                      {/* Textarea Area */}
                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          value={jsonInput}
                          onChange={e => { setJsonInput(e.target.value); setJsonError(''); setJsonQuestions([]); }}
                          placeholder={`{\n  "id": "my-app",\n  "name": "My App",\n  "entities": [...],\n  "pages": [...]\n}`}
                          className="w-full bg-transparent text-slate-300 font-mono text-[13px] p-6 leading-6 focus:outline-none resize-none min-h-full selection:bg-blue-500/30"
                          style={{ height: `${Math.max(25, jsonInput.split('\n').length) * 1.5}rem` }}
                          spellCheck={false}
                        />
                        
                        {/* Status Bar Floating */}
                        <div className="absolute bottom-4 right-6 flex items-center gap-4 px-3 py-1.5 bg-slate-800/80 backdrop-blur-md border border-white/10 rounded-full text-[10px] text-slate-400 font-mono sticky bottom-4 float-right shadow-lg">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            UTF-8
                          </div>
                          <div>JSON</div>
                          <div>{jsonInput.split('\n').length} lines</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Editor Footer / Actions */}
                  <div className="bg-slate-900 px-8 py-6 border-t border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
                    {jsonError ? (
                      <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-3">
                          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-red-400 text-sm font-medium">{jsonError}</p>
                            {jsonQuestions.length > 0 && (
                              <ul className="mt-2 space-y-1 text-red-400/70 text-xs list-disc pl-4">
                                {jsonQuestions.map(question => (
                                  <li key={question}>{question}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6 flex items-center gap-3 text-gray-400">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs">Paste your JSON configuration. We'll automatically validate and generate your application architecture.</p>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button
                        onClick={() => handleCreate()}
                        disabled={!jsonInput.trim() || creating}
                        className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_4_12_rgba(37,99,235,0.2)]"
                      >
                        {creating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Building Engine...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Launch Application
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setCreateOpen(false)}
                        className="px-8 py-3.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-all border border-white/5 active:scale-[0.98]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Bezel with Logo */}
                <div className="h-8 bg-black flex items-center justify-center border-t border-white/5">
                  <span className="text-[10px] text-gray-700 font-medium tracking-[0.2em] uppercase">MacBook Pro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function tryParseJson(input: string): Record<string, unknown> | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function buildSyntaxQuestions(input: string): string[] {
  const questions = [
    'Did you paste only pure JSON, without comments or plain English text between objects?',
    'Are all object keys and string values wrapped in double quotes?',
    'Do all arrays and objects have matching commas, braces, and brackets?',
  ];

  if (input.includes("'")) {
    questions.push('Are you using single quotes anywhere that should be double quotes?');
  }

  if (/,\s*[}\]]/.test(input)) {
    questions.push('Is there a trailing comma before a closing `}` or `]`?');
  }

  return questions;
}

function buildConfigQuestions(config: Record<string, unknown> | null, errors: Array<{ field?: string; message?: string; code?: string }>): string[] {
  const questions: string[] = [];

  if (!config) return buildSyntaxQuestions('');

  const hasLegacyShape = typeof config.appName === 'string' || Array.isArray(config.models);
  const hasSupportedShape = typeof config.name === 'string' || Array.isArray(config.entities);

  if (!hasLegacyShape && !hasSupportedShape) {
    questions.push('What is the app name? Add either `appName` or `name`.');
    questions.push('What data models or entities should this app contain?');
  }

  if (Array.isArray(config.models) && config.models.length === 0) {
    questions.push('Should `models` include at least one item, such as `products` or `orders`?');
  }

  if (Array.isArray(config.pages) && config.pages.length === 0) {
    questions.push('Which pages should be generated for this app?');
  }

  for (const error of errors) {
    if (error.field?.includes('name')) {
      questions.push('What should the app or field name be here?');
    } else if (error.field?.includes('entities') || error.field?.includes('models')) {
      questions.push('Is each model/entity defined as an object with a name and fields array?');
    } else if (error.field?.includes('pages')) {
      questions.push('Does each page include a route/path and at least one component?');
    }
  }

  if (questions.length === 0) {
    questions.push('Can you confirm the JSON includes an app name, models/entities, and pages?');
    questions.push('Should I treat this as the legacy AI Generator format or the full ConfigApp format?');
  }

  return Array.from(new Set(questions));
}
