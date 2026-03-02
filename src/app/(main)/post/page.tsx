"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postTheme } from "@/actions/themes";
import { ThemeType } from "@prisma/client";

export default function PostPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ThemeType>("LIGHTNING_TALK");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const subject = formData.get("subject") as string;
    const content = formData.get("content") as string;
    const expectedDuration = parseInt(formData.get("expectedDuration") as string);

    if (!subject || !content) {
      setError("件名と本文を入力してください。");
      return;
    }

    if (!expectedDuration || expectedDuration <= 0) {
      setError("予想所要時間は正の数を入力してください。");
      return;
    }

    if (type === "LIGHTNING_TALK" && expectedDuration > 10) {
      setError("ライトニングトークの場合は10分以内で設定してください。");
      return;
    }

    startTransition(async () => {
      const result = await postTheme({
        subject,
        content,
        type,
        expectedDuration,
      });

      if (result.success) {
        router.push("/themes");
      } else {
        setError(result.error || "投稿に失敗しました。");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">✏️ お題を投稿</h1>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            件名 <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            className="input-field"
            placeholder="お題のタイトルを入力"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            本文 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={5}
            className="input-field resize-y"
            placeholder="お題の詳細を入力"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            お題タイプ <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType("LIGHTNING_TALK")}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                type === "LIGHTNING_TALK"
                  ? "border-yellow-500 bg-yellow-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">⚡️</div>
              <div className="font-semibold text-sm">LT</div>
              <div className="text-[10px] text-gray-500 mt-1">10分以内</div>
            </button>
            <button
              type="button"
              onClick={() => setType("PRESENTATION")}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                type === "PRESENTATION"
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">🎤</div>
              <div className="font-semibold text-sm">PRESENTATION</div>
              <div className="text-[10px] text-gray-500 mt-1">1人が発表</div>
            </button>
            <button
              type="button"
              onClick={() => setType("GROUP_TALK")}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                type === "GROUP_TALK"
                  ? "border-green-500 bg-green-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">💬</div>
              <div className="font-semibold text-sm">GROUP TALK</div>
              <div className="text-[10px] text-gray-500 mt-1">みんなで話す</div>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="expectedDuration" className="block text-sm font-medium text-gray-700 mb-1">
            予想所要時間（分） <span className="text-red-500">*</span>
          </label>
          <input
            id="expectedDuration"
            name="expectedDuration"
            type="number"
            required
            min={1}
            max={type === "LIGHTNING_TALK" ? 10 : 60}
            defaultValue={5}
            className="input-field w-32"
          />
          <p className="text-xs text-gray-400 mt-1">
            {type === "LIGHTNING_TALK" ? "1〜10分の範囲で入力してください" : "1〜60分の範囲で入力してください"}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? "投稿中..." : "📮 投稿する"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
