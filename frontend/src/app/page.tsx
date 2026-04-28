// frontend/src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <nav className="flex items-center justify-between mb-24">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">CA</div>
            <span className="font-semibold text-lg">ConfigApp</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link href="/auth/register" className="text-sm bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-medium transition-colors">Get started</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 text-blue-300 text-xs px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span>Config-driven · Fully dynamic · Production ready</span>
          </div>
          <h1 className="text-6xl font-bold mb-8 leading-tight max-w-4xl mx-auto">
            JSON config →{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Working App
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Define your data models, UI, and APIs in JSON. ConfigApp generates a fully functional web application — no code required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/register" className="bg-blue-600 hover:bg-blue-500 px-8 py-3.5 rounded-xl font-semibold text-base transition-colors inline-flex items-center gap-2">
              Build your app
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/dashboard" className="text-gray-300 hover:text-white px-8 py-3.5 rounded-xl border border-gray-700 hover:border-gray-500 font-medium transition-colors">
              View demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {[
            { icon: '⚡', title: 'Dynamic Runtime', desc: 'Reads your JSON config and generates UI, APIs, and DB schema automatically. No hardcoding.' },
            { icon: '🔌', title: 'Extensible', desc: 'Add new component types via the registry. Extend features without rewriting core logic.' },
            { icon: '🛡️', title: 'Resilient', desc: 'Handles missing fields, invalid configs, and schema mismatches. Works even with broken input.' },
            { icon: '📊', title: 'CSV Import', desc: 'Upload CSV, map columns to entity fields, and bulk import data with validation.' },
            { icon: '🌍', title: 'Multi-language', desc: 'Config-driven i18n with dynamic locale switching. Support any language.' },
            { icon: '🔔', title: 'Notifications', desc: 'Event-based email and webhook notifications triggered by record changes.' },
          ].map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-3 text-lg">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Code sample */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Simple Configuration</h2>
            <p className="text-gray-400 text-lg">Define your entire app in a single JSON file</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-gray-500 text-xs font-mono">app-config.json</span>
            </div>
            <pre className="px-6 py-5 text-sm text-gray-300 overflow-x-auto leading-relaxed">
{`{
  "id": "crm",
  "name": "Customer CRM",
  "entities": [{
    "id": "customers",
    "label": "Customers",
    "fields": [
      { "id": "name",   "type": "text",   "required": true },
      { "id": "email",  "type": "email",  "required": true },
      { "id": "status", "type": "select", "options": ["lead", "active"] }
    ]
  }],
  "pages": [{
    "path": "/customers",
    "components": [{ "type": "table", "entity": "customers" }]
  }]
}`}
            </pre>
          </div>

          <p className="text-center text-gray-400 text-sm mt-8 leading-relaxed">
            This JSON generates a full CRUD app with table, forms, search, pagination, CSV import, and more.
          </p>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-24 pt-12 border-t border-white/10">
          <h2 className="text-3xl font-bold mb-6">Ready to build?</h2>
          <p className="text-gray-400 mb-8 text-lg">Start creating your config-driven app today</p>
          <Link href="/auth/register" className="bg-blue-600 hover:bg-blue-500 px-8 py-3.5 rounded-xl font-semibold text-base transition-colors inline-flex items-center gap-2">
            Get started for free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
