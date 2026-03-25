"use client";

import { useState, useTransition, useEffect } from "react";
import { CommentWithAuthor } from "@/types";
import { getComments, addComment, deleteComment } from "@/actions/comments";
import { MarkdownRenderer } from "@/components/features/MarkdownRenderer";

interface CommentModalProps {
  themeId: string;
  themeSubject: string;
  currentUserId: string;
  canDeleteOthers: boolean;
  commentCount: number;
  onClose: () => void;
}

export function CommentModal({
  themeId,
  themeSubject,
  currentUserId,
  canDeleteOthers,
  commentCount,
  onClose,
}: CommentModalProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadComments = async () => {
    setLoading(true);
    const result = await getComments(themeId);
    if (result.success && result.comments) {
      setComments(result.comments);
    } else {
      setError(result.error || "コメントの取得に失敗しました。");
    }
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const result = await getComments(themeId);
      if (ignore) return;
      if (result.success && result.comments) {
        setComments(result.comments);
      } else {
        setError(result.error || "コメントの取得に失敗しました。");
      }
      setLoading(false);
      setLoaded(true);
    })();
    return () => { ignore = true; };
  }, [themeId]);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    setError("");
    startTransition(async () => {
      const result = await addComment(themeId, newComment);
      if (result.success) {
        setNewComment("");
        await loadComments();
      } else {
        setError(result.error || "コメントの投稿に失敗しました。");
      }
    });
  };

  const handleDelete = (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result.success) {
        await loadComments();
      } else {
        setError(result.error || "コメントの削除に失敗しました。");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              💬 コメント ({loaded ? comments.length : commentCount})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1 truncate">{themeSubject}</p>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && !loaded ? (
            <div className="text-center py-8 text-gray-400">読み込み中...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">💭</p>
              <p>まだコメントはありません</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isOwn = comment.authorId === currentUserId;
              const canDelete = isOwn || canDeleteOthers;
              return (
                <div key={comment.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {comment.author
                          ? comment.author.displayName
                          : "削除されたユーザー"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <MarkdownRenderer content={comment.content} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <div className="p-6 border-t border-gray-100">
          {error && (
            <p className="text-sm text-red-500 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Markdown形式でコメントを入力..."
              rows={2}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={isPending || !newComment.trim()}
              className="self-end px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "送信中..." : "送信"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
