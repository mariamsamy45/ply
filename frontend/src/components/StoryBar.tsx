import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import StoryViewer from "./StoryViewer";

interface Story {
  id: string;
  owner_id: string;
  owner_username: string;
  owner_name: string;
  owner_avatar: string | null;
  media_url: string;
  media_type: "image" | "video";
  created_at: string;
}

export default function StoryBar() {
  const { user, refresh } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [openOwner, setOpenOwner] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const data = await api.get<Story[]>("/api/stories");
      setStories(data);
    } catch {
      setError("Couldn't load stories right now.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = Object.values(
    stories.reduce<Record<string, Story[]>>((acc, s) => {
      (acc[s.owner_id] ||= []).push(s);
      return acc;
    }, {})
  );

  async function onFileSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setError("");

    try {
      const { url } = await api.upload(file);

      const media_type = file.type.startsWith("video")
        ? "video"
        : "image";

      await api.post("/api/stories", {
        media_url: url,
        media_type,
      });

      await load();
    } catch {
      setError("Couldn't post that story. Try a smaller file.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="px-5 md:px-8 pt-6">
      <div className="flex gap-4 overflow-x-auto pb-2">
        <button
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-center gap-2 shrink-0"
        >
          <span className="relative w-16 h-16 rounded-full ink-border flex items-center justify-center bg-bone">
            <span className="font-display text-2xl leading-none">
              +
            </span>
          </span>

          <span className="font-body text-xs text-ink/70">
            Your story
          </span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={onFileSelected}
        />

        {grouped.map((group) => (
          <div
            key={group[0].owner_id}
            className="flex flex-col items-center gap-2 shrink-0"
          >
            <button
              onClick={() =>
                setOpenOwner(group[0].owner_id)
              }
              aria-label={`View ${group[0].owner_name}'s story`}
            >
              <span
                className="w-16 h-16 rounded-full p-[3px] block"
                style={{
                  background:
                    "linear-gradient(135deg, #2B4CFF, #FF7A3D)",
                }}
              >
                <span className="w-full h-full rounded-full bg-bone p-[2px] block">
                  <span className="w-full h-full rounded-full block overflow-hidden ink-border">
                    {group[0].owner_avatar ? (
                      <img
                        src={group[0].owner_avatar}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center font-display text-lg bg-clay">
                        {group[0].owner_name[0]}
                      </span>
                    )}
                  </span>
                </span>
              </span>
            </button>

            <Link
              to={`/profile/${group[0].owner_id}`}
              className="font-body text-xs text-ink/70 max-w-[64px] truncate hover:text-cobalt"
            >
              {group[0].owner_id === user?.id
                ? "You"
                : group[0].owner_name}
            </Link>
          </div>
        ))}
      </div>

      {error && (
        <p className="font-body text-xs text-tangerine mt-1">
          {error}
        </p>
      )}

      {openOwner && (
        <StoryViewer
          stories={
            grouped.find(
              (g) => g[0].owner_id === openOwner
            ) || []
          }
          isOwn={openOwner === user?.id}
          onClose={() => setOpenOwner(null)}
          onChanged={() => {
            load();
            refresh();
          }}
        />
      )}
    </div>
  );
}