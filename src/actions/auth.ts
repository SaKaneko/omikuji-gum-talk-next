"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  generateSalt,
  verifyPassword,
  createToken,
  setAuthCookie,
  removeAuthCookie,
} from "@/lib/auth";
import { ActionResult } from "@/types";

export async function login(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  if (!name || !password) {
    return { success: false, error: "ユーザー名とパスワードを入力してください。" };
  }

  const user = await prisma.user.findFirst({
    where: { name, deletedAt: null },
    include: { role: true },
  });

  if (!user) {
    return { success: false, error: "ユーザー名またはパスワードが正しくありません。" };
  }

  if (!verifyPassword(password, user.salt, user.passwordHash)) {
    return { success: false, error: "ユーザー名またはパスワードが正しくありません。" };
  }

  const token = await createToken({
    userId: user.id,
    name: user.name,
    roleName: user.role.name,
  });

  await setAuthCookie(token);
  redirect("/");
}

export async function logout(): Promise<void> {
  await removeAuthCookie();
  redirect("/login");
}

export async function register(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !password) {
    return { success: false, error: "ユーザー名とパスワードを入力してください。" };
  }

  if (name.length < 2 || name.length > 20) {
    return { success: false, error: "ユーザー名は2〜20文字で入力してください。" };
  }

  if (password.length < 4) {
    return { success: false, error: "パスワードは4文字以上で入力してください。" };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "パスワードが一致しません。" };
  }

  const existingUser = await prisma.user.findFirst({
    where: { name, deletedAt: null },
  });

  if (existingUser) {
    return { success: false, error: "このユーザー名は既に使用されています。" };
  }

  const generalRole = await prisma.role.findUnique({
    where: { name: "general" },
  });

  if (!generalRole) {
    return { success: false, error: "システムエラー: ロールが見つかりません。" };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const user = await prisma.user.create({
    data: {
      name,
      roleId: generalRole.id,
      passwordHash,
      salt,
    },
  });

  const token = await createToken({
    userId: user.id,
    name: user.name,
    roleName: generalRole.name,
  });

  await setAuthCookie(token);
  redirect("/");
}
