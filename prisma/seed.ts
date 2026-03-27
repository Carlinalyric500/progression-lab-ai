import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'demo@progressionlab.ai';
const adminName = process.env.ADMIN_SEED_NAME ?? 'Demo Admin';

function getRequiredAdminPassword(): string {
  const password = process.env.ADMIN_SEED_PASSWORD?.trim();

  if (!password) {
    throw new Error('ADMIN_SEED_PASSWORD must be set before running the admin seed');
  }

  return password;
}

async function main() {
  const adminPassword = getRequiredAdminPassword();

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      name: adminName,
      passwordHash: hashPassword(adminPassword),
    },
    create: {
      id: 'demo-user-id',
      email: adminEmail,
      name: adminName,
      passwordHash: hashPassword(adminPassword),
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin seed completed successfully');
  console.log(`📧 Admin email: ${adminEmail}`);
  console.log(
    '⚠️ Password not logged to console for security - use environment variable provided during deployment',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
