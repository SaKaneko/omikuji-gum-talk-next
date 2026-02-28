"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { ThemeType } from "@prisma/client";
import { ThemeWithAuthor, DrawFilters } from "@/types";
import { drawOmikuji, passTheme, completeTheme } from "@/actions/themes";

type DrawState = "idle" | "drawing" | "result" | "presenting" | "completed";

export function DrawMachine() {
  const [state, setState] = useState<DrawState>("idle");
  const [drawnTheme, setDrawnTheme] = useState<ThemeWithAuthor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actualDuration, setActualDuration] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Filters
  const [filterType, setFilterType] = useState<ThemeType | "">("");
  const [filterMinDuration, setFilterMinDuration] = useState<string>("");
  const [filterMaxDuration, setFilterMaxDuration] = useState<string>("");

  const handleDraw = useCallback(() => {
    setError(null);
    setState("drawing");

    const filters: DrawFilters = {};
    if (filterType) filters.type = filterType as ThemeType;
    if (filterMinDuration) filters.minDuration = parseInt(filterMinDuration);
    if (filterMaxDuration) filters.maxDuration = parseInt(filterMaxDuration);

    // Simulate slot animation delay
    setTimeout(() => {
      startTransition(async () => {
        const result = await drawOmikuji(filters);
        if (result.success && result.theme) {
          setDrawnTheme(result.theme);
          setState("result");
        } else {
          setError(result.error || "抽選に失敗しました。");
          setState("idle");
        }
      });
    }, 3000);
  }, [filterType, filterMinDuration, filterMaxDuration]);

  const handleStartPresentation = useCallback(() => {
    setState("presenting");
    startTimeRef.current = Date.now();
    // Hidden timer - update actual duration in background
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 60000;
      setActualDuration(Math.round(elapsed * 10) / 10);
    }, 1000);
  }, []);

  const handleComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
    const roundedDuration = Math.round(elapsedMinutes * 10) / 10;
    setActualDuration(roundedDuration || 1);
    setState("completed");
  }, []);

  const handleSubmitComplete = useCallback(
    (finalDuration: number) => {
      if (!drawnTheme) return;
      startTransition(async () => {
        const result = await completeTheme(drawnTheme.id, finalDuration);
        if (result.success) {
          setDrawnTheme(null);
          setState("idle");
          setActualDuration(0);
        } else {
          setError(result.error || "完了処理に失敗しました。");
        }
      });
    },
    [drawnTheme]
  );

  const handleSubmitCompleteWithoutRecording = useCallback(() => {
    if (!drawnTheme) return;
    startTransition(async () => {
      const result = await passTheme(drawnTheme.id);
      if (result.success) {
        setDrawnTheme(null);
        setState("idle");
        setActualDuration(0);
      } else {
        setError(result.error || "完了処理に失敗しました。");
      }
    });
  }, [drawnTheme]);

  const handlePass = useCallback(() => {
    if (!drawnTheme) return;
    if (!confirm("このお題をパスして引き直しますか？")) return;
    startTransition(async () => {
      const result = await passTheme(drawnTheme.id);
      if (result.success) {
        setDrawnTheme(null);
        setState("idle");
      } else {
        setError(result.error || "パスに失敗しました。");
      }
    });
  }, [drawnTheme]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🎰 くじ引き</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Idle state - Show filters and draw button */}
      {state === "idle" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">🔍 フィルタ条件</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  お題タイプ
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as ThemeType | "")}
                  className="input-field text-sm"
                >
                  <option value="">すべて</option>
                  <option value="SOLO">🎤 SOLO</option>
                  <option value="GROUP">💬 GROUP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  最小時間（分）
                </label>
                <input
                  type="number"
                  min={0}
                  value={filterMinDuration}
                  onChange={(e) => setFilterMinDuration(e.target.value)}
                  className="input-field text-sm"
                  placeholder="指定なし"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  最大時間（分）
                </label>
                <input
                  type="number"
                  min={0}
                  value={filterMaxDuration}
                  onChange={(e) => setFilterMaxDuration(e.target.value)}
                  className="input-field text-sm"
                  placeholder="指定なし"
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleDraw}
              disabled={isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-12 py-4 rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              🎯 くじを引く！
            </button>
          </div>
        </div>
      )}

      {/* Drawing animation */}
      {state === "drawing" && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
          <img
            src="/images/omikuji.gif"
            alt="おみくじ抽選中"
            className="absolute inset-0 w-full h-full object-contain"
          />
          <div className="relative z-10 mt-auto mb-16 text-3xl font-bold text-white animate-pulse drop-shadow-lg">
            抽選中...
          </div>
        </div>
      )}

      {/* Result display */}
      {state === "result" && drawnTheme && (
        <div className="space-y-4">
          <div
            className={`card ${
              drawnTheme.type === "SOLO"
                ? "animate-spotlight border-2 border-amber-300"
                : "border-2 border-green-300"
            }`}
          >
            {drawnTheme.type === "SOLO" ? (
              // SOLO spotlight effect
              <div className="text-center animate-fade-in">
                <div className="text-5xl mb-4">🎤✨</div>
                <div className="badge-solo text-sm mb-3">SOLO</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  {drawnTheme.subject}
                </h2>
                <p className="text-gray-600 whitespace-pre-wrap mb-4 text-left">
                  {drawnTheme.content}
                </p>
                <div className="text-left mt-6">
                  <p className="text-sm text-gray-500">
                    投稿者:{" "}
                    {drawnTheme.author.deletedAt
                      ? "削除されたユーザー"
                      : drawnTheme.author.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    予想: {drawnTheme.expectedDuration}分
                  </p>
                </div>
              </div>
            ) : (
              // GROUP bubble effect
              <div className="text-center animate-bubble">
                <div className="text-5xl mb-4">💬🗣️💬</div>
                <div className="badge-group text-sm mb-3">GROUP</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  {drawnTheme.subject}
                </h2>
                <div className="bg-green-50 rounded-2xl p-4 mb-4 relative">
                  <p className="text-gray-600 whitespace-pre-wrap text-left">
                    {drawnTheme.content}
                  </p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-green-50 rotate-45" />
                </div>
                <div className="text-left mt-6">
                  <p className="text-sm text-gray-500">
                    投稿者:{" "}
                    {drawnTheme.author.deletedAt
                      ? "削除されたユーザー"
                      : drawnTheme.author.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    予想: {drawnTheme.expectedDuration}分
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={handleStartPresentation}
              className="btn-primary text-lg px-8"
            >
              🎙️ このお題で話す
            </button>
            <button
              onClick={handlePass}
              disabled={isPending}
              className="btn-secondary"
            >
              🔄 パス（引き直し）
            </button>
          </div>
        </div>
      )}

      {/* Presenting state - timer running in background */}
      {state === "presenting" && drawnTheme && (
        <div className="space-y-4">
          <div className="card text-center">
            <div className="text-5xl mb-4">
              {drawnTheme.type === "SOLO" ? "🎤" : "💬"}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-left">
              {drawnTheme.subject}
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap mb-4 text-left">
              {drawnTheme.content}
            </p>
            <p className="text-gray-500 text-sm mb-6">発表中...</p>
          </div>

          <div className="text-center">
            <button
              onClick={handleComplete}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-3 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              ✅ 話し終わった！
            </button>
          </div>
        </div>
      )}

      {/* Completed state - record actual duration */}
      {state === "completed" && drawnTheme && (
        <div className="card max-w-md mx-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            🎉 おつかれさまでした！
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">お題</p>
              <p className="font-medium">{drawnTheme.subject}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">予想所要時間</p>
              <p className="font-medium">{drawnTheme.expectedDuration}分</p>
            </div>
            <div>
              <label
                htmlFor="actualDuration"
                className="block text-sm text-gray-500 mb-1"
              >
                実際にかかった時間（分）
              </label>
              <input
                id="actualDuration"
                type="number"
                step="0.1"
                min="0.1"
                value={actualDuration}
                onChange={(e) =>
                  setActualDuration(parseFloat(e.target.value) || 0)
                }
                className="input-field w-32"
              />
              <p className="text-xs text-gray-400 mt-1">
                タイマー計測値が初期値にセットされています
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => handleSubmitComplete(actualDuration)}
                disabled={isPending || actualDuration <= 0}
                className="btn-primary w-full"
              >
                {isPending ? "記録中..." : "📊 記録して完了"}
              </button>
              <button
                onClick={handleSubmitCompleteWithoutRecording}
                disabled={isPending}
                className="btn-secondary w-full"
              >
                {isPending ? "処理中..." : "⏭️ 記録せずに完了"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
