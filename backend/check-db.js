const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const apps = await prisma.appInstance.findMany();
  console.log('Apps:', apps.map(a => ({ id: a.id, slug: a.slug })));
  
  const records = await prisma.dynamicRecord.findMany();
  console.log('Records Count:', records.length);
  if (records.length > 0) {
    console.log('Sample Record:', JSON.stringify(records[0], null, 2));
  }
}

checkData().catch(console.error).finally(() => prisma.$disconnect());
