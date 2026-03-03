import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { expireTimedOutThemes } from "@/actions/themes";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 発表中タイムアウトチェック
  await expireTimedOutThemes();

  const activeTheme = await prisma.theme.findFirst({
    where: { status: "IN_PROGRESS" },
    orderBy: { presentedAt: "desc" },
    select: {
      id: true,
      subject: true,
      content: true,
      type: true,
      expectedDuration: true,
      author: {
        select: {
          name: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!activeTheme) {
    return NextResponse.json(null);
  }

  return NextResponse.json(activeTheme);
}
