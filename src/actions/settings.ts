"use server";

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
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

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
