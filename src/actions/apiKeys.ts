"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
} from "@/lib/auth";

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export async function getApiKeys(): Promise<ApiKeyInfo[]> {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "admin") return [];

  return prisma.apiKey.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApiKey(
  name: string
): Promise<{ success: boolean; error?: string; apiKey?: string }> {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "admin") {
    return { success: false, error: "権限がありません。" };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "APIキーの名前を入力してください。" };
  }

  if (trimmedName.length > 100) {
    return { success: false, error: "名前は100文字以内で入力してください。" };
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const prefix = getApiKeyPrefix(rawKey);

  await prisma.apiKey.create({
    data: {
      name: trimmedName,
      keyHash,
      prefix,
      userId: user.id,
    },
  });

  revalidatePath("/admin");
  return { success: true, apiKey: rawKey };
}

export async function revokeApiKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "admin") {
    return { success: false, error: "権限がありません。" };
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: user.id },
  });

  if (!apiKey) {
    return { success: false, error: "APIキーが見つかりません。" };
  }

  if (apiKey.revokedAt) {
    return { success: false, error: "このAPIキーは既に無効化されています。" };
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteApiKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "admin") {
    return { success: false, error: "権限がありません。" };
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: user.id },
  });

  if (!apiKey) {
    return { success: false, error: "APIキーが見つかりません。" };
  }

  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  revalidatePath("/admin");
  return { success: true };
}
