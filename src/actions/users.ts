"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ActionResult } from "@/types";

export async function updateUserRole(
  userId: string,
  newRoleName: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (user.roleName !== "admin") {
    return { success: false, error: "管理者のみ実行できます。" };
  }

  const role = await prisma.role.findUnique({
    where: { name: newRoleName },
  });

  if (!role) {
    return { success: false, error: "ロールが見つかりません。" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { roleId: role.id },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (user.roleName !== "admin") {
    return { success: false, error: "管理者のみ実行できます。" };
  }

  if (userId === user.id) {
    return { success: false, error: "自分自身は削除できません。" };
  }

  // Soft delete
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function getUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return users;
}
