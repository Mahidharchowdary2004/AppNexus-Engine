# ConfigApp — Architecture & Deployment Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                │
│                                                             │
│  ┌─────────────┐   ┌──────────────────────────────────────┐ │
│  │  Auth Pages │   │        App Runtime                   │ │
│  │  /auth/*    │   │  /app/[slug]/[...path]               │ │
│  └─────────────┘   │                                      │ │
│                    │  ┌────────────────────────────────┐  │ │
│  ┌─────────────┐   │  │  ComponentRegistry             │  │ │
│  │  Dashboard  │   │  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │ │
│  │  /dashboard │   │  │  │Table │ │Chart │ │Kanban│  │  │ │
│  └─────────────┘   │  │  └──────┘ └──────┘ └──────┘  │  │ │
│                    │  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │ │
│                    │  │  │Cards │ │Stats │ │Custom│  │  │ │
│                    │  │  └──────┘ └──────┘ └──────┘  │  │ │
│                    │  └────────────────────────────────┘  │ │
│                    │  DynamicForm · DynamicTable          │ │
│                    └──────────────────────────────────────┘ │
│                                                             │
│  Contexts: AuthContext · LocaleContext (i18n)               │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────────────┐
│                      BACKEND (Node.js + TypeScript)         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  /api/auth   │  │  /api/apps   │  │ /api/apps/:slug/   │ │
│  │  login       │  │  CRUD on     │  │  data/:entity      │ │
│  │  register    │  │  AppConfig   │  │  Dynamic CRUD      │ │
│  │  google oauth│  │              │  │                    │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  configValidator — Normalizes any JSON config        │   │
│  │  recordValidator — Validates against FieldConfig[]   │   │
│  │  notificationService — Email + Webhook triggers      │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────▼─────────────────────────────────┐
│                        PostgreSQL                           │
│                                                             │
│  users · sessions · app_instances · entity_schemas         │
│  dynamic_records (JSONB) · csv_imports · notification_logs │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. JSONB for Dynamic Records
Instead of creating per-entity tables (which would require runtime DDL), all entity records are stored in `dynamic_records` with a JSONB `data` column. This allows any schema to work without migrations.

**Trade-off**: Full-text search is slower than dedicated columns. Mitigated by in-process filtering for small datasets; can add pg_trgm or Meilisearch for scale.

### 2. Config Normalization Layer
`configValidator.ts` runs on every config submission and:
- Fills missing required fields with sensible defaults
- Warns about unknown/invalid values instead of erroring
- Auto-generates pages if none defined
- Auto-generates navigation from pages

This is what makes the system resilient to "incomplete/inconsistent/partially incorrect" configs as required.

### 3. Component Registry Pattern
`ComponentRegistry.tsx` maps string type names → React components. To add a new component type:
1. Create the React component
2. Add one entry to `COMPONENT_REGISTRY`
3. Done — no other files need changing

### 4. JWT Auth
Stateless JWT tokens stored in cookies + localStorage. The `requireAuth` middleware extracts and validates the token on every request. Google OAuth exchanges the code server-side and returns a JWT.

## Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Dynamic UI from config | ✅ | Table, Form, Chart, Kanban, Cards, Stats |
| Dynamic API generation | ✅ | Full CRUD per entity |
| Dynamic DB (schema-less) | ✅ | JSONB storage |
| Config validation/normalization | ✅ | Handles incomplete configs |
| Email/password auth | ✅ | bcrypt + JWT |
| Google OAuth | ✅ | Server-side flow |
| CSV Import | ✅ | Preview, map, bulk import with error tracking |
| CSV Export | ✅ | Per entity |
| Multi-language (i18n) | ✅ | Config-driven, runtime switching |
| Email notifications | ✅ | Event-triggered via nodemailer |
| Webhook notifications | ✅ | On record changes |
| Extensible components | ✅ | Registry pattern |
| Error boundaries | ✅ | Components fail gracefully |
| Loading/error states | ✅ | Every component |
| Pagination | ✅ | Configurable page size |
| Search | ✅ | Cross-field search |
| Sort | ✅ | Click column header |
| Soft delete | ✅ | Configurable per entity |
| User-scoped data | ✅ | Per entity |
| Settings editor | ✅ | Edit config in browser |
| Docker deployment | ✅ | One command |

## Deployment Options

### Option A: Docker (Recommended)
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values
docker-compose up -d
```

### Option B: Railway
1. Create Railway project
2. Add PostgreSQL plugin
3. Deploy backend: set `DATABASE_URL` from Railway
4. Deploy frontend: set `NEXT_PUBLIC_API_URL` to backend URL

### Option C: Vercel (Frontend) + Railway (Backend)
1. Deploy backend to Railway
2. Deploy frontend to Vercel
3. Set `NEXT_PUBLIC_API_URL` in Vercel env

### Option D: Render
Both services supported — use `render.yaml` (create one based on docker-compose).

## Extending the System

### Adding a new component type
```tsx
// 1. Create your component
function MyTimeline({ entity, appSlug, component }) { ... }

// 2. Register it in ComponentRegistry.tsx
const COMPONENT_REGISTRY = {
  ...existing,
  timeline: ({ component, entity, appSlug }) => (
    <MyTimeline entity={entity!} appSlug={appSlug} component={component} />
  ),
};
// Done! Config can now use { "type": "timeline" }
```

### Adding a new field type
```ts
// 1. Add to FieldType union in shared/types/config.ts
type FieldType = ... | 'rating';

// 2. Handle in recordValidator.ts (server-side validation)
case 'rating':
  value = Math.min(5, Math.max(1, Number(value)));
  break;

// 3. Handle in DynamicForm.tsx (frontend rendering)
case 'rating':
  return <StarRatingInput {...} />;
```

### Adding a new notification channel
```ts
// In notificationService.ts, add to the trigger method:
if (event.slack) {
  await fetch(event.slack.webhookUrl, {
    method: 'POST',
    body: JSON.stringify({ text: interpolate(event.slack.message, context) }),
  });
}
```

## Testing Resilience

The system is designed to handle:

```bash
# 1. Config with missing fields
curl -X POST /api/apps -d '{"name": "Test"}' 
# → Creates app with defaults, warns about missing fields

# 2. Unknown component type
# Config: { "type": "unknown_future_type" }
# → Renders yellow warning box, doesn't crash page

# 3. Entity reference that doesn't exist
# Config: { "type": "table", "entity": "missing_entity" }
# → Shows warning, renders error component

# 4. Invalid field type
# Config: { "type": "badtype" }
# → Normalizes to "text", logs warning

# 5. Schema mismatch (CSV import)
# Upload CSV with wrong columns
# → Column mapping UI lets user fix the mapping
```
