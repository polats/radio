const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const collabs = await prisma.collab.findMany();
  console.log("Collabs in DB:", collabs.length);
  collabs.forEach(c => console.log(c.title));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
