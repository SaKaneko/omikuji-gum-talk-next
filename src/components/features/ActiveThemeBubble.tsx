"use client";

import { useState, useEffect, useCallback } from "react";
import { ActiveTheme } from "@/types";
import { getThemeDisplay } from "@/lib/themeDisplay";
import { MarkdownRenderer } from "@/components/features/MarkdownRenderer";

const POLL_INTERVAL = 5000; // 5秒ごとにポーリング

export function ActiveThemeBubble() {
  const [activeTheme, setActiveTheme] = useState<ActiveTheme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchActiveTheme = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/themes/active`);
      if (res.ok) {
        const data = await res.json();
        setActiveTheme(data);
        // モーダル表示中に発表が終わった場合は閉じる
        if (!data) {
          setIsModalOpen(false);
        }
      }
    } catch {
      // ネットワークエラーは無視
    }
  }, []);

  useEffect(() => {
    fetchActiveTheme();
    const interval = setInterval(fetchActiveTheme, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActiveTheme]);

  if (!activeTheme) return null;

  const display = getThemeDisplay(activeTheme.type);

  return (
    <>
      {/* 吹き出しアイコン */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-2xl shadow-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-bounce-gentle"
        title="発表中のお題を見る"
      >
        <span className="text-2xl">💬</span>
        <span className="text-sm font-semibold max-w-[200px] truncate">
          発表中: {activeTheme.subject}
        </span>
      </button>

      {/* モーダル */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{display.emoji}</span>
                <span className={display.badgeClass}>{display.label}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
                  🔴 LIVE
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* コンテンツ */}
            <div className="px-6 py-5">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {activeTheme.subject}
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                <MarkdownRenderer content={activeTheme.content} />
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <p>
                  投稿者:{" "}
                  {activeTheme.author.deletedAt
                    ? "削除されたユーザー"
                    : activeTheme.author.displayName}
                </p>
                <p>⏱ 予想: {activeTheme.expectedDuration}分</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
