/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('crypto');

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_SEED_EMAIL || 'demo@progressionlab.ai';
const adminName = process.env.ADMIN_SEED_NAME || 'Demo Admin';

function getRequiredAdminPassword() {
  const password = process.env.ADMIN_SEED_PASSWORD && process.env.ADMIN_SEED_PASSWORD.trim();

  if (!password) {
    throw new Error('ADMIN_SEED_PASSWORD must be set before running the admin seed');
  }

  return password;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
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
