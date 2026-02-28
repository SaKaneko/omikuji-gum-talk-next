"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/title.png"
              alt="ガムトーク"
              width={280}
              height={105}
              priority
            />
          </div>
          <p className="text-gray-500 mt-2">ログインしてください</p>
        </div>

        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="input-field"
              placeholder="ユーザー名を入力"
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input-field"
              placeholder="パスワードを入力"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full"
          >
            {isPending ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/register"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
          >
            アカウントをお持ちでない方はこちら →
          </Link>
        </div>
      </div>
    </div>
  );
}
