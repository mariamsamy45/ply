import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export interface Post {
  id: string;
  author_id: string;
  author_username: string;
  author_name: string;
  author_avatar: string | null;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

export default function Posts({
  userId,
  showComposer = false,
}: {
  userId?: string;
  showComposer?: boolean;
}) {
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [posting, setPosting] = useState(false);

  const [commentOpen, setCommentOpen] =
    useState<string | null>(null);

  const [comments, setComments] =
    useState<Record<string, Comment[]>>({});

  const [commentText, setCommentText] =
    useState("");

  const fileInput =
    useRef<HTMLInputElement>(null);

  async function load() {
    setError("");

    try {
      const data = await api.get<Post[]>(
        userId
          ? `/api/posts/user/${userId}`
          : "/api/posts"
      );

      setPosts(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't load posts right now."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function createPost() {
    if (!selectedFile) return;

    setPosting(true);
    setError("");

    try {
      const { url } =
        await api.upload(selectedFile);

      await api.post("/api/posts", {
        media_url: url,
        media_type:
          selectedFile.type.startsWith("video")
            ? "video"
            : "image",
        caption,
      });

      setSelectedFile(null);
      setCaption("");

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't publish your post."
      );
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(postId: string) {
    try {
      const result =
        await api.post<{
          liked: boolean;
          likes_count: number;
        }>(`/api/posts/${postId}/like`);

      setPosts((items) =>
        items.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked_by_me: result.liked,
                likes_count:
                  result.likes_count,
              }
            : p
        )
      );
    } catch {
      setError("Couldn't update that like.");
    }
  }

  async function toggleComments(
    postId: string
  ) {
    if (commentOpen === postId) {
      setCommentOpen(null);
      return;
    }

    setCommentOpen(postId);

    try {
      const data =
        await api.get<Comment[]>(
          `/api/posts/${postId}/comments`
        );

      setComments((c) => ({
        ...c,
        [postId]: data,
      }));
    } catch {
      setError("Couldn't load comments.");
    }
  }

  async function addComment(
    postId: string
  ) {
    if (!commentText.trim()) return;

    try {
      const comment =
        await api.post<Comment>(
          `/api/posts/${postId}/comments`,
          {
            body: commentText,
          }
        );

      setComments((c) => ({
        ...c,
        [postId]: [
          ...(c[postId] || []),
          comment,
        ],
      }));

      setPosts((items) =>
        items.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments_count:
                  p.comments_count + 1,
              }
            : p
        )
      );

      setCommentText("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't add that comment."
      );
    }
  }

  async function deletePost(
    postId: string
  ) {
    if (
      !window.confirm(
        "Delete this post?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/api/posts/${postId}`
      );

      setPosts((items) =>
        items.filter(
          (p) => p.id !== postId
        )
      );
    } catch {
      setError(
        "Couldn't delete that post."
      );
    }
  }

  return (
    <section className="mt-8">
      {showComposer && (
        <div className="card mb-6">
          <h2 className="font-display text-2xl mb-4">
            Create a post
          </h2>

          <div className="flex flex-col gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              onChange={(e) =>
                setSelectedFile(
                  e.target.files?.[0] ||
                    null
                )
              }
              className="input"
            />

            <textarea
              className="input"
              rows={3}
              maxLength={2200}
              value={caption}
              onChange={(e) =>
                setCaption(e.target.value)
              }
              placeholder="Write a caption…"
            />

            {selectedFile && (
              <p className="font-body text-xs text-ink/60">
                {selectedFile.name}
              </p>
            )}

            <button
              className="btn-primary"
              disabled={
                !selectedFile ||
                posting
              }
              onClick={createPost}
            >
              {posting
                ? "Publishing…"
                : "Share post"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <p className="font-body text-ink/60">
          Loading posts…
        </p>
      )}

      {error && (
        <p className="font-body text-sm text-tangerine mb-3">
          {error}
        </p>
      )}

      {!loading &&
        posts.length === 0 && (
          <p className="font-body text-sm text-ink/50">
            No posts yet.
          </p>
        )}

      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <article
            key={post.id}
            className="card p-0 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4">
              <Link
                to={`/profile/${post.author_id}`}
                className="flex items-center gap-3 min-w-0 hover:text-cobalt"
              >
                <span className="w-10 h-10 rounded-full ink-border overflow-hidden bg-clay flex items-center justify-center shrink-0">
                  {post.author_avatar ? (
                    <img
                      src={post.author_avatar}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <span className="font-display text-lg">
                      {post.author_name[0]}
                    </span>
                  )}
                </span>

                <span className="min-w-0">
                  <span className="font-body text-sm font-semibold block truncate">
                    {post.author_name}
                  </span>

                  <span className="font-body text-xs text-ink/50 block truncate">
                    @{post.author_username}
                  </span>
                </span>
              </Link>

              {post.author_id ===
                user?.id && (
                <button
                  className="font-body text-xs text-ink/50 hover:text-tangerine"
                  onClick={() =>
                    deletePost(post.id)
                  }
                >
                  Delete
                </button>
              )}
            </div>

            {post.media_type ===
            "image" ? (
              <img
                src={post.media_url}
                className="w-full max-h-[650px] object-cover bg-black"
                alt={
                  post.caption ||
                  "Ply post"
                }
              />
            ) : (
              <video
                src={post.media_url}
                controls
                className="w-full max-h-[650px] bg-black"
              />
            )}

            <div className="p-4">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() =>
                    toggleLike(
                      post.id
                    )
                  }
                  className={`font-body text-sm ${
                    post.liked_by_me
                      ? "text-tangerine font-semibold"
                      : "text-ink"
                  }`}
                >
                  ♥ {post.likes_count}
                </button>

                <button
                  onClick={() =>
                    toggleComments(
                      post.id
                    )
                  }
                  className="font-body text-sm text-ink"
                >
                  ♡ {post.comments_count}{" "}
                  comments
                </button>
              </div>

              {post.caption && (
                <p className="font-body text-sm">
                  <Link
                    to={`/profile/${post.author_id}`}
                    className="font-semibold hover:text-cobalt"
                  >
                    {post.author_username}
                  </Link>

                  {" "}

                  {post.caption}
                </p>
              )}

              {commentOpen ===
                post.id && (
                <div className="mt-4 pt-4 border-t-2 border-ink/20">
                  <div className="flex flex-col gap-2 mb-3">
                    {(comments[
                      post.id
                    ] || []).map(
                      (comment) => (
                        <p
                          key={
                            comment.id
                          }
                          className="font-body text-sm"
                        >
                          <Link
                            to={`/profile/${comment.user_id}`}
                            className="font-semibold hover:text-cobalt"
                          >
                            {
                              comment.username
                            }
                          </Link>

                          {" "}

                          {comment.body}
                        </p>
                      )
                    )}

                    {comments[
                      post.id
                    ]?.length === 0 && (
                      <p className="font-body text-xs text-ink/50">
                        No comments yet.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      className="input"
                      value={
                        commentText
                      }
                      onChange={(e) =>
                        setCommentText(
                          e.target.value
                        )
                      }
                      placeholder="Add a comment…"
                      onKeyDown={(e) => {
                        if (
                          e.key ===
                          "Enter"
                        ) {
                          addComment(
                            post.id
                          );
                        }
                      }}
                    />

                    <button
                      className="btn-primary shrink-0"
                      onClick={() =>
                        addComment(
                          post.id
                        )
                      }
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}