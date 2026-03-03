import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireTimedOutThemes } from "@/actions/themes";

export async function GET() {
  // 発表中タイムアウトチェック
  await expireTimedOutThemes();

  const unusedThemes = await prisma.theme.findMany({
    where: { status: "PENDING" },
    select: {
      expectedDuration: true,
      author: {
        select: {
          timeBiasCoefficient: true,
        },
      },
    },
  });

  const count = unusedThemes.length;

  const totalExpectedDuration = unusedThemes.reduce(
    (sum, theme) => sum + theme.expectedDuration,
    0
  );

  const totalCorrectedDuration = unusedThemes.reduce(
    (sum, theme) =>
      sum + theme.expectedDuration * Math.exp(theme.author.timeBiasCoefficient),
    0
  );

  return NextResponse.json({
    count,
    totalExpectedDuration,
    totalCorrectedDuration: Math.round(totalCorrectedDuration * 100) / 100,
  });
}
