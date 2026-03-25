"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { ActionResult, ThemeFormData, DrawFilters, ThemeWithAuthor, PaginatedThemes } from "@/types";
import { Prisma, ThemeStatus } from "@prisma/client";

/** 発表中タイムアウトチェック: presentedAt から60分超過した IN_PROGRESS のお題を COMPLETED に自動更新 */
export async function expireTimedOutThemes(): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1時間前

  const result = await prisma.theme.updateMany({
    where: {
      status: "IN_PROGRESS",
      presentedAt: {
        not: null,
        lt: cutoff,
      },
    },
    data: {
      status: "COMPLETED",
      // actualDuration は null のまま（タイムアウトによる自動完了のため）
    },
  });

  if (result.count > 0) {
    revalidatePath("/themes");
    revalidatePath("/draw");
  }

  return result.count;
}

function validateThemeFormData(data: ThemeFormData): ActionResult | null {
  if (!data.subject || !data.content) {
    return { success: false, error: "件名と本文を入力してください。" };
  }

  if (data.expectedDuration <= 0) {
    return { success: false, error: "予想所要時間は正の数を入力してください。" };
  }

  if (data.type === "LIGHTNING_TALK" && data.expectedDuration > 10) {
    return { success: false, error: "LT（Lightning Talk）は最大10分までです。" };
  }

  return null;
}

export async function postTheme(data: ThemeFormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const validationResult = validateThemeFormData(data);
  if (validationResult) {
    return validationResult;
  }

  await prisma.theme.create({
    data: {
      subject: data.subject,
      content: data.content,
      type: data.type,
      expectedDuration: data.expectedDuration,
      authorId: user.id,
    },
  });

  revalidatePath("/themes");
  return { success: true };
}

export async function updateTheme(
  id: string,
  data: ThemeFormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) {
    return { success: false, error: "お題が見つかりません。" };
  }

  if (theme.authorId !== user.id) {
    return { success: false, error: "自分の投稿のみ編集できます。" };
  }

  if (theme.status !== "PENDING") {
    return { success: false, error: "未消化のお題のみ編集できます。" };
  }

  const validationResult = validateThemeFormData(data);
  if (validationResult) {
    return validationResult;
  }

  const result = await prisma.theme.updateMany({
    where: {
      id,
      authorId: user.id,
      status: ThemeStatus.PENDING,
    },
    data: {
      subject: data.subject,
      content: data.content,
      type: data.type,
      expectedDuration: data.expectedDuration,
    },
  });

  if (result.count === 0) {
    return { success: false, error: "お題が見つからないか、編集できない状態です。" };
  }

  revalidatePath("/themes");
  return { success: true };
}

export async function deleteTheme(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) {
    return { success: false, error: "お題が見つかりません。" };
  }

  // Check: own post or has delete_others_posts permission
  if (theme.authorId !== user.id && !hasPermission(user, "delete_others_posts")) {
    return { success: false, error: "この操作を行う権限がありません。" };
  }

  await prisma.theme.delete({ where: { id } });
  revalidatePath("/themes");
  return { success: true };
}

export async function updateThemeStatus(
  id: string,
  status: ThemeStatus
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  // Admin only for manual status change
  if (user.roleName !== "admin") {
    return { success: false, error: "管理者のみ実行できます。" };
  }

  await prisma.theme.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/themes");
  return { success: true };
}

export async function drawOmikuji(
  filters: DrawFilters
): Promise<{ success: boolean; theme?: ThemeWithAuthor; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (!hasPermission(user, "draw_omikuji")) {
    return { success: false, error: "くじ引きの権限がありません。" };
  }

  try {
    // Use interactive transaction with raw query for row-level locking
    const result = await prisma.$transaction(async (tx) => {
      // Build WHERE conditions
      const conditions: string[] = ["status = 'PENDING'"];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.type) {
        conditions.push(`type = $${paramIndex}::\"ThemeType\"`);
        params.push(filters.type);
        paramIndex++;
      }
      if (filters.minDuration !== undefined && filters.minDuration > 0) {
        conditions.push(`expected_duration >= $${paramIndex}`);
        params.push(filters.minDuration);
        paramIndex++;
      }
      if (filters.maxDuration !== undefined && filters.maxDuration > 0) {
        conditions.push(`expected_duration <= $${paramIndex}`);
        params.push(filters.maxDuration);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      // SELECT with FOR UPDATE SKIP LOCKED for exclusive access
      const themes = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM themes WHERE ${whereClause} ORDER BY RANDOM() LIMIT 1 FOR UPDATE SKIP LOCKED`,
        ...params
      );

      if (themes.length === 0) {
        return null;
      }

      // Return full theme data
      return tx.theme.findUnique({
        where: { id: themes[0].id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayName: true,
              timeBiasCoefficient: true,
              deletedAt: true,
            },
          },
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!result) {
      return { success: false, error: "抽選可能なお題がありません。" };
    }

    return { success: true, theme: result as ThemeWithAuthor };
  } catch (error) {
    console.error("Draw error:", error);
    return { success: false, error: "抽選中にエラーが発生しました。もう一度お試しください。" };
  }
}

export async function drawOldestTheme(
  filters: DrawFilters
): Promise<{ success: boolean; theme?: ThemeWithAuthor; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (!hasPermission(user, "draw_omikuji")) {
    return { success: false, error: "くじ引きの権限がありません。" };
  }

  try {
    // 抽選前にタイムアウトチェック
    await expireTimedOutThemes();

    const result = await prisma.$transaction(async (tx) => {
      // Build WHERE conditions
      const conditions: string[] = ["status = 'PENDING'"];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.type) {
        conditions.push(`type = $${paramIndex}::"ThemeType"`);
        params.push(filters.type);
        paramIndex++;
      }
      if (filters.minDuration !== undefined && filters.minDuration > 0) {
        conditions.push(`expected_duration >= $${paramIndex}`);
        params.push(filters.minDuration);
        paramIndex++;
      }
      if (filters.maxDuration !== undefined && filters.maxDuration > 0) {
        conditions.push(`expected_duration <= $${paramIndex}`);
        params.push(filters.maxDuration);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      // SELECT oldest theme with FOR UPDATE SKIP LOCKED for exclusive access
      const themes = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM themes WHERE ${whereClause} ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
        ...params
      );

      if (themes.length === 0) {
        return null;
      }

      return tx.theme.findUnique({
        where: { id: themes[0].id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              displayName: true,
              timeBiasCoefficient: true,
              deletedAt: true,
            },
          },
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!result) {
      return { success: false, error: "選出可能なお題がありません。" };
    }

    return { success: true, theme: result as ThemeWithAuthor };
  } catch (error) {
    console.error("Draw oldest error:", error);
    return { success: false, error: "選出中にエラーが発生しました。もう一度お試しください。" };
  }
}

export async function passTheme(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (!hasPermission(user, "draw_omikuji")) {
    return { success: false, error: "権限がありません。" };
  }

  await prisma.theme.update({
    where: { id },
    data: {
      status: "PENDING",
      presentedAt: null,
    },
  });

  revalidatePath("/draw");
  return { success: true };
}

export async function completeTheme(
  id: string,
  actualDuration: number
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const alpha = parseFloat(process.env.ALPHA_LEARNING_RATE || "0.2");
  const minDuration = parseFloat(process.env.MIN_ACTUAL_DURATION || "0.1");

  // Clip actual duration to minimum
  const clippedActual = Math.max(actualDuration, minDuration);

  const theme = await prisma.theme.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, timeBiasCoefficient: true },
      },
    },
  });

  if (!theme) {
    return { success: false, error: "お題が見つかりません。" };
  }

  // Update theme with actual duration
  await prisma.theme.update({
    where: { id },
    data: {
      actualDuration: Math.round(clippedActual),
      status: "COMPLETED",
    },
  });

  // Update time bias coefficient if values are valid
  if (theme.expectedDuration > 0 && clippedActual > 0) {
    const kOld = theme.author.timeBiasCoefficient;
    const kNew =
      (1 - alpha) * kOld +
      alpha * (Math.log(clippedActual) - Math.log(theme.expectedDuration));

    await prisma.user.update({
      where: { id: theme.author.id },
      data: { timeBiasCoefficient: kNew },
    });
  }

  revalidatePath("/themes");
  revalidatePath("/draw");
  return { success: true };
}

export async function getThemes(): Promise<ThemeWithAuthor[]> {
  const themes = await prisma.theme.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
          displayName: true,
          timeBiasCoefficient: true,
          deletedAt: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return themes as ThemeWithAuthor[];
}

export async function getThemesPaginated(
  page: number,
  perPage: number,
  statusFilter?: string
): Promise<PaginatedThemes> {
  const where: Prisma.ThemeWhereInput = {};
  if (statusFilter && statusFilter !== "all") {
    const statusMap: Record<string, ThemeStatus> = {
      pending: "PENDING",
      in_progress: "IN_PROGRESS",
      completed: "COMPLETED",
    };
    const status = statusMap[statusFilter];
    if (status) {
      where.status = status;
    }
  }

  const [themes, totalCount] = await Promise.all([
    prisma.theme.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            timeBiasCoefficient: true,
            deletedAt: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.theme.count({ where }),
  ]);

  return {
    themes: themes as ThemeWithAuthor[],
    totalCount,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
  };
}

export async function startPresentation(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  if (!hasPermission(user, "draw_omikuji")) {
    return { success: false, error: "権限がありません。" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // すでに発表中のお題が存在しないか確認
      const existingInProgress = await tx.theme.findFirst({
        where: { status: "IN_PROGRESS" },
      });

      if (existingInProgress) {
        throw new Error("すでに発表中のお題があります。");
      }

      // 対象お題が PENDING の場合にのみ IN_PROGRESS に更新
      const result = await tx.theme.updateMany({
        where: {
          id,
          status: "PENDING",
        },
        data: {
          status: "IN_PROGRESS",
          presentedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error("お題が存在しないか、開始できない状態です。");
      }
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "発表開始に失敗しました。";
    return { success: false, error: message };
  }
  revalidatePath("/draw");
  revalidatePath("/themes");
  return { success: true };
}
