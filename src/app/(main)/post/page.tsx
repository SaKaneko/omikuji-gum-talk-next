"use client";

import { useRouter } from "next/navigation";
import { postTheme } from "@/actions/themes";
import { ThemeForm } from "@/components/features/ThemeForm";
import { ThemeFormData } from "@/types";

export default function PostPage() {
  const router = useRouter();

  const handleSubmit = async (data: ThemeFormData) => {
    const result = await postTheme(data);
    if (result.success) {
      router.push("/themes");
    }
    return result;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">✏️ お題を投稿</h1>

      <div className="card">
        <ThemeForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="📮 投稿する"
          pendingLabel="投稿中..."
        />
      </div>
    </div>
  );
}
