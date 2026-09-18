import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Story {
  id: string;
  owner_id?: string;
  media_url: string;
  media_type: "image" | "video";
  owner_name?: string;
  owner_username?: string;
}

interface Highlight {
  id: string;
  title: string;
}

export default function StoryViewer({
  stories,
  isOwn,
  onClose,
  onChanged,
}: {
  stories: Story[];
  isOwn: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [picker, setPicker] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const timer = useRef<number | null>(null);

  const current = stories[index];

  useEffect(() => {
    setProgress(0);

    if (!current) {
      onClose();
      return;
    }

    if (current.media_type === "image") {
      const start = Date.now();

      timer.current = window.setInterval(() => {
        const pct = Math.min(
          100,
          ((Date.now() - start) / 5000) * 100
        );

        setProgress(pct);

        if (pct >= 100) advance();
      }, 50);
    }

    return () => {
      if (timer.current) {
        window.clearInterval(timer.current);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function advance() {
    if (timer.current) {
      window.clearInterval(timer.current);
    }

    setIndex((i) =>
      i + 1 < stories.length ? i + 1 : stories.length
    );

    if (index + 1 >= stories.length) {
      onClose();
    }
  }

  function back() {
    if (timer.current) {
      window.clearInterval(timer.current);
    }

    setIndex((i) => Math.max(0, i - 1));
  }

  async function deleteStory() {
    await api.delete(`/api/stories/${current.id}`);
    onChanged();
    onClose();
  }

  async function loadHighlightsForPicker(
    ownerId: string
  ) {
    const list = await api.get<Highlight[]>(
      `/api/highlights/${ownerId}`
    );

    setHighlights(list as any);
    setPicker(true);
  }

  async function addToExisting(
    highlightId: string
  ) {
    await api.put(`/api/highlights/${highlightId}`, {
      add_story_ids: [current.id],
    });

    setPicker(false);
    onChanged();
  }

  async function createFromCurrent() {
    if (!newTitle.trim()) return;

    await api.post("/api/highlights", {
      title: newTitle.trim(),
      story_ids: [current.id],
    });

    setNewTitle("");
    setPicker(false);
    onChanged();
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-ink z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        <div className="flex gap-1 p-3">
          {stories.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 bg-bone/25 overflow-hidden"
            >
              <div
                className="h-full bg-bone"
                style={{
                  width:
                    i < index
                      ? "100%"
                      : i === index
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          {current.owner_id ? (
            <Link
              to={`/profile/${current.owner_id}`}
              onClick={onClose}
              className="font-body text-bone text-sm hover:underline"
            >
              {current.owner_name || "Your story"}
            </Link>
          ) : (
            <span className="font-body text-bone text-sm">
              {current.owner_name || "Your story"}
            </span>
          )}

          <button
            onClick={onClose}
            className="text-bone font-display text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {current.media_type === "image" ? (
            <img
              src={current.media_url}
              className="max-h-full max-w-full object-contain"
              alt=""
            />
          ) : (
            <video
              src={current.media_url}
              className="max-h-full max-w-full"
              autoPlay
              onEnded={advance}
            />
          )}

          <button
            onClick={back}
            className="absolute left-0 top-0 h-full w-1/3"
            aria-label="Previous"
          />

          <button
            onClick={advance}
            className="absolute right-0 top-0 h-full w-1/3"
            aria-label="Next"
          />
        </div>

        {isOwn && (
          <div className="flex gap-2 p-4">
            <button
              className="btn-secondary flex-1 !text-bone !border-bone"
              onClick={() =>
                loadHighlightsForPicker(
                  current.owner_id!
                )
              }
            >
              Add to highlight
            </button>

            <button
              className="btn-danger flex-1 !text-bone !border-bone"
              onClick={deleteStory}
            >
              Delete
            </button>
          </div>
        )}

        {picker && (
          <div className="absolute inset-0 bg-ink/95 flex items-end">
            <div className="bg-bone w-full p-5 max-h-[70%] overflow-y-auto">
              <h3 className="font-display text-xl mb-3">
                Add to highlight
              </h3>

              <div className="flex flex-col gap-2 mb-4">
                {highlights.length === 0 && (
                  <p className="font-body text-sm text-ink/60">
                    No highlights yet.
                  </p>
                )}

                {highlights.map((h) => (
                  <button
                    key={h.id}
                    onClick={() =>
                      addToExisting(h.id)
                    }
                    className="btn-secondary text-left"
                  >
                    {h.title}
                  </button>
                ))}
              </div>

              <p className="font-body text-sm mb-2">
                Or create a new highlight
              </p>

              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Highlight title"
                  value={newTitle}
                  onChange={(e) =>
                    setNewTitle(e.target.value)
                  }
                />

                <button
                  className="btn-primary shrink-0"
                  onClick={createFromCurrent}
                >
                  Create
                </button>
              </div>

              <button
                className="font-body text-sm text-ink/60 mt-4"
                onClick={() => setPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}