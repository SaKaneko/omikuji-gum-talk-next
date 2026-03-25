"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { ActionResult, CommentWithAuthor } from "@/types";

export async function getComments(
  themeId: string
): Promise<{ success: boolean; comments?: CommentWithAuthor[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { status: true },
  });

  if (!theme) {
    return { success: false, error: "お題が見つかりません。" };
  }

  if (theme.status === "PENDING") {
    return { success: false, error: "未消化のお題にはコメントできません。" };
  }

  const comments = await prisma.comment.findMany({
    where: { themeId },
    include: {
      author: {
        select: { displayName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, comments: comments as CommentWithAuthor[] };
}

export async function addComment(
  themeId: string,
  content: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: "コメントを入力してください。" };
  }

  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    select: { status: true },
  });

  if (!theme) {
    return { success: false, error: "お題が見つかりません。" };
  }

  if (theme.status === "PENDING") {
    return { success: false, error: "未消化のお題にはコメントできません。" };
  }

  await prisma.comment.create({
    data: {
      content: content.trim(),
      themeId,
      authorId: user.id,
    },
  });

  revalidatePath("/themes");
  return { success: true };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return { success: false, error: "コメントが見つかりません。" };
  }

  if (comment.authorId !== user.id && !hasPermission(user, "delete_others_posts")) {
    return { success: false, error: "この操作を行う権限がありません。" };
  }

  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath("/themes");
  return { success: true };
}
