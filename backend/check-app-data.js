const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const app = await prisma.appInstance.findUnique({ where: { slug: 'smart-healthcare-core' } });
  if (!app) {
    console.log('App not found');
    return;
  }
  const records = await prisma.dynamicRecord.findMany({ where: { appId: app.id } });
  console.log(`Records for ${app.slug}:`, JSON.stringify(records, null, 2));
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
