# ConfigApp — Dynamic Config-Driven App Generator

A full-stack system that converts JSON configuration into fully working web applications.

## Architecture Overview

```
configapp/
├── frontend/          # Next.js 14 app (config-driven UI renderer)
├── backend/           # Node.js + TypeScript API server
├── shared/            # Shared TypeScript types
└── README.md         # Documentation
```

## Features Implemented

1. **Dynamic Application Runtime** — JSON config → Live UI + APIs + DB
2. **CSV Import System** — Upload, map columns, store, render
3. **Multi-language / Localization** — Dynamic i18n via config
4. **Email Notifications** — Event-based transactional emails
5. **Auth** — Email/password + Google OAuth (configurable)
6. **Extensible Component Registry** — Add new UI components without touching core

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- pnpm (recommended)

### 1. Clone & Install

```bash
git clone <your-repo>
cd configapp
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
pnpm install --recursive
```

### 2. Configure Environment

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/configapp
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

### 3. Set Up Database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start Development

```bash
# Terminal 1 — Backend
cd backend && pnpm dev

# Terminal 2 — Frontend  
cd frontend && pnpm dev
```

Visit http://localhost:3000

## Config Schema

See `shared/types/config.ts` for the full config spec.

### Example App Config

```json
{
  "id": "crm-app",
  "name": "Customer CRM",
  "version": "1.0.0",
  "locale": { "default": "en", "supported": ["en", "es", "fr"] },
  "auth": {
    "enabled": true,
    "methods": ["email", "google"],
    "userScoped": true
  },
  "entities": [
    {
      "id": "customers",
      "label": "Customers",
      "fields": [
        { "id": "name", "label": "Name", "type": "text", "required": true },
        { "id": "email", "label": "Email", "type": "email", "required": true },
        { "id": "status", "label": "Status", "type": "select", "options": ["lead", "active", "churned"] }
      ]
    }
  ],
  "pages": [
    {
      "id": "customers-list",
      "path": "/customers",
      "title": "Customers",
      "components": [
        { "type": "table", "entity": "customers", "actions": ["create", "edit", "delete", "export"] }
      ]
    }
  ],
  "notifications": {
    "events": [
      { "trigger": "record.created", "entity": "customers", "email": { "to": "admin@example.com", "subject": "New customer added" } }
    ]
  }
}
```

## Deployment

The system is designed to be deployed to platforms like Render, Vercel, or Heroku.

For Render:
1. Connect your GitHub repository.
2. Set the Root Directory (e.g., `frontend` or `backend`).
3. Configure build and start commands as defined in each workspace's `package.json`.

## Testing Resilience

The system handles:
- Missing fields → uses defaults
- Unknown component types → renders fallback
- Schema mismatches → graceful migration
- Invalid config → detailed validation errors

Run the test suite:
```bash
cd backend && pnpm test
```
