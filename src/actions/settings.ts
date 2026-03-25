"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  generateSalt,
  verifyPassword,
  getCurrentUser,
} from "@/lib/auth";
import { ActionResult } from "@/types";

export async function changePassword(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const currentPasswordValue = formData.get("currentPassword");
  const newPasswordValue = formData.get("newPassword");
  const confirmPasswordValue = formData.get("confirmPassword");

  if (
    typeof currentPasswordValue !== "string" ||
    typeof newPasswordValue !== "string" ||
    typeof confirmPasswordValue !== "string"
  ) {
    return { success: false, error: "不正なリクエストです。" };
  }

  const currentPassword = currentPasswordValue;
  const newPassword = newPasswordValue;
  const confirmPassword = confirmPasswordValue;
  // 入力チェック
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "すべての項目を入力してください。" };
  }

  // 新しいパスワードの長さチェック
  if (newPassword.length < 4) {
    return { success: false, error: "新しいパスワードは4文字以上で入力してください。" };
  }

  // 新しいパスワードの一致チェック
  if (newPassword !== confirmPassword) {
    return { success: false, error: "新しいパスワードが一致しません。" };
  }

  // 新旧パスワードの同一チェック
  if (currentPassword === newPassword) {
    return { success: false, error: "新しいパスワードは現在のパスワードと異なるものを入力してください。" };
  }

  // ログインユーザー取得
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return { success: false, error: "認証エラー: ログインし直してください。" };
  }

  // DBからユーザー情報を取得（salt, passwordHash が必要）
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id, deletedAt: null },
  });

  if (!user) {
    return { success: false, error: "ユーザーが見つかりません。" };
  }

  // 現在のパスワードを検証
  if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
    return { success: false, error: "現在のパスワードが正しくありません。" };
  }

  // 新しいパスワードでハッシュ・ソルトを再生成しDB更新
  const newSalt = generateSalt();
  const newPasswordHash = hashPassword(newPassword, newSalt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      salt: newSalt,
    },
  });

  return { success: true };
}

export async function updateProfile(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const displayNameValue = formData.get("displayName");
  const emailValue = formData.get("email");

  if (typeof displayNameValue !== "string") {
    return { success: false, error: "不正なリクエストです。" };
  }

  const displayName = displayNameValue.trim();
  const email = typeof emailValue === "string" ? emailValue.trim() : "";

  if (!displayName) {
    return { success: false, error: "表示名を入力してください。" };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "メールアドレスの形式が正しくありません。" };
  }

  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return { success: false, error: "認証エラー: ログインし直してください。" };
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      displayName,
      email: email || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

const SYSTEM_SETTING_DEFAULTS: Record<string, string> = {
  themes_per_page: "20",
};

export async function getSystemSettings(): Promise<Record<string, string>> {
  const settings = await prisma.systemSetting.findMany();
  const result = { ...SYSTEM_SETTING_DEFAULTS };
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

export async function getThemesPerPage(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "themes_per_page" },
  });
  const value = parseInt(setting?.value ?? SYSTEM_SETTING_DEFAULTS.themes_per_page, 10);
  return value > 0 ? value : 20;
}

export async function updateSystemSetting(
  key: string,
  value: string
): Promise<ActionResult> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.roleName !== "admin") {
    return { success: false, error: "管理者権限が必要です。" };
  }

  if (!(key in SYSTEM_SETTING_DEFAULTS)) {
    return { success: false, error: "不明な設定キーです。" };
  }

  if (key === "themes_per_page") {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
      return { success: false, error: "表示件数は正の整数で指定してください。" };
    }
  }

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  revalidatePath("/themes");
  revalidatePath("/admin");
  return { success: true };
}
