// backend/src/seed.ts
// Creates a demo user + demo CRM app
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validateAndNormalizeConfig } from './services/configValidator';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@configapp.dev' },
    update: {},
    create: {
      email: 'demo@configapp.dev',
      passwordHash,
      name: 'Demo User',
      role: 'admin',
    },
  });
  console.log('✅ Demo user: demo@configapp.dev / password123');

  // Create CRM demo app
  const crmConfig = {
    id: 'crm-demo',
    name: 'Customer CRM',
    version: '1.0.0',
    locale: { default: 'en', supported: ['en', 'es', 'fr'] },
    entities: [
      {
        id: 'customers',
        label: 'Customer',
        labelPlural: 'Customers',
        fields: [
          { id: 'name', label: 'Name', type: 'text', required: true },
          { id: 'email', label: 'Email', type: 'email', required: true },
          { id: 'phone', label: 'Phone', type: 'phone' },
          { id: 'status', label: 'Status', type: 'select', options: ['lead', 'active', 'churned'], defaultValue: 'lead' },
          { id: 'value', label: 'Deal Value ($)', type: 'number' },
          { id: 'notes', label: 'Notes', type: 'textarea' },
        ],
      },
    ],
    pages: [
      {
        id: 'customers-page',
        path: '/customers',
        title: 'Customers',
        components: [{ type: 'table', entity: 'customers', actions: ['create', 'edit', 'delete', 'export', 'import'] }],
      },
      {
        id: 'overview',
        path: '/overview',
        title: 'Overview',
        components: [
          { type: 'stat_card', entity: 'customers', title: 'Total Customers' },
          { type: 'chart', entity: 'customers', title: 'Customers by Status', chart: { type: 'pie', xField: 'status', yField: 'value' } },
        ],
      },
    ],
  };

  const { normalized, warnings } = validateAndNormalizeConfig(crmConfig);
  if (warnings.length) console.log('⚠ Warnings:', warnings.map(w => w.message).join(', '));

  const configHash = crypto.createHash('md5').update(JSON.stringify(normalized)).digest('hex');

  const app = await prisma.appInstance.upsert({
    where: { slug: 'crm-demo' },
    update: { config: normalized as object, configHash },
    create: {
      slug: 'crm-demo',
      name: 'Customer CRM',
      config: normalized as object,
      configHash,
      ownerId: user.id,
    },
  });

  // Seed demo customers
  const demoCustomers = [
    { name: 'Alice Johnson', email: 'alice@acme.com', phone: '+1-555-0101', status: 'active', value: 15000, notes: 'Enterprise customer, renews annually' },
    { name: 'Bob Smith', email: 'bob@startup.io', phone: '+1-555-0102', status: 'lead', value: 5000, notes: 'Interested in premium plan' },
    { name: 'Carol White', email: 'carol@corp.com', phone: '+1-555-0103', status: 'active', value: 32000, notes: 'Long-term partner since 2021' },
    { name: 'David Lee', email: 'david@agency.co', phone: '+1-555-0104', status: 'churned', value: 2500, notes: 'Switched to competitor' },
    { name: 'Emma Davis', email: 'emma@ventures.vc', phone: '+1-555-0105', status: 'lead', value: 80000, notes: 'High-value prospect, decision in Q2' },
  ];

  for (const customer of demoCustomers) {
    await prisma.dynamicRecord.create({
      data: {
        appId: app.id,
        entityId: 'customers',
        data: customer,
        createdBy: user.id,
      },
    });
  }

  console.log('✅ Created demo CRM app with 5 customers');
  console.log('🌐 Visit: http://localhost:3000/app/crm-demo');
  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
