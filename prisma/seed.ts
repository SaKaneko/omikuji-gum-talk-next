import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

async function main() {
  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  const generalRole = await prisma.role.upsert({
    where: { name: "general" },
    update: {},
    create: { name: "general" },
  });

  // Create permissions
  const permissions = [
    { slug: "draw_omikuji", description: "おみくじを引く権限" },
    { slug: "view_others_posts", description: "他人の投稿の詳細を閲覧する権限" },
    { slug: "delete_others_posts", description: "他人の投稿を削除する権限" },
  ];

  const createdPermissions = [];
  for (const perm of permissions) {
    const p = await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: {},
      create: perm,
    });
    createdPermissions.push(p);
  }

  // Assign all permissions to admin role
  for (const perm of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Create default admin user
  const adminSalt = randomBytes(16).toString("hex");
  const adminPasswordHash = hashPassword("admin", adminSalt);

  await prisma.user.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "admin",
      roleId: adminRole.id,
      passwordHash: adminPasswordHash,
      salt: adminSalt,
    },
  });

  console.log("Seed completed successfully.");
  console.log(`Admin role: ${adminRole.id}`);
  console.log(`General role: ${generalRole.id}`);
  console.log(`Permissions created: ${createdPermissions.map((p) => p.slug).join(", ")}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
