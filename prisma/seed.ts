import { PrismaClient, Role } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { seedBadges } from "./seeds/badges";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const parsed = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: parsed.hostname,
  port: Number(parsed.port || "3306"),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ""),
});
const prisma = new PrismaClient({ adapter });

async function upsertUser(email: string, role: Role, displayName: string): Promise<void> {
  await prisma.user.upsert({
    where: { email },
    update: { role, displayName },
    create: {
      email,
      role,
      displayName,
      isActive: true,
      emailVerified: true,
    },
  });
}

async function main(): Promise<void> {
  await upsertUser("coach@test.com", Role.COACH, "Sarah Johnson");
  await upsertUser("player@test.com", Role.PLAYER, "Alex Johnson");
  await upsertUser("parent@test.com", Role.PARENT, "Michael Thompson");
  await upsertUser("junior@test.com", Role.PLAYER, "Jake Thompson");
  await upsertUser("admin@test.com", Role.ADMIN, "Admin User");

  await seedBadges(prisma);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
