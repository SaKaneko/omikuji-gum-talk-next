import { ThemeType } from "@prisma/client";

export interface ThemeDisplayInfo {
  /** バッジ用CSSクラス (e.g. "badge-lightning") */
  badgeClass: string;
  /** 絵文字付きラベル (e.g. "⚡️ LT") */
  label: string;
  /** 長めのラベル (e.g. "⚡️ LT") */
  longLabel: string;
  /** 絵文字のみ (e.g. "⚡️") */
  emoji: string;
}

const THEME_DISPLAY_MAP: Record<ThemeType, ThemeDisplayInfo> = {
  LIGHTNING_TALK: {
    badgeClass: "badge-lightning",
    label: "⚡️ LT",
    longLabel: "⚡️ LT",
    emoji: "⚡️",
  },
  PRESENTATION: {
    badgeClass: "badge-presentation",
    label: "🎤 PRESEN",
    longLabel: "🎤 PRESENTATION",
    emoji: "🎤",
  },
  GROUP_TALK: {
    badgeClass: "badge-group-talk",
    label: "💬 GROUP",
    longLabel: "💬 GROUP TALK",
    emoji: "💬",
  },
};

/** ThemeType に対応する表示情報を返す */
export function getThemeDisplay(type: ThemeType): ThemeDisplayInfo {
  return THEME_DISPLAY_MAP[type];
}
