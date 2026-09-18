import { useEffect, useState } from "react";
import { api } from "../lib/api";
import StoryViewer from "./StoryViewer";

interface HighlightStory {
  id: string;
  media_url: string;
  media_type: "image" | "video";
}
interface Highlight {
  id: string;
  title: string;
  cover: string | null;
  stories: HighlightStory[];
}
interface Archived {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  expired: boolean;
}

export default function Highlights({ userId, isOwn }: { userId: string; isOwn: boolean }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [viewing, setViewing] = useState<Highlight | null>(null);
  const [editing, setEditing] = useState(false);
  const [archive, setArchive] = useState<Archived[]>([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const data = await api.get<Highlight[]>(`/api/highlights/${userId}`);
    setHighlights(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function openEditor() {
    setError("");
    const data = await api.get<Archived[]>("/api/stories/archive");
    setArchive(data);
    setTitle("");
    setSelected([]);
    setEditing(true);
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function create() {
    if (!title.trim() || selected.length === 0) {
      setError("Give it a title and pick at least one story.");
      return;
    }
    await api.post("/api/highlights", { title: title.trim(), story_ids: selected });
    setEditing(false);
    load();
  }

  async function deleteHighlight(id: string) {
    await api.delete(`/api/highlights/${id}`);
    setViewing(null);
    load();
  }

  return (
    <div className="mt-6">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {highlights.map((h) => (
          <button key={h.id} onClick={() => setViewing(h)} className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="w-16 h-16 rounded-full ink-border overflow-hidden bg-clay flex items-center justify-center">
              {h.cover ? (
                <img src={h.cover} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="font-display text-xl">{h.title[0]}</span>
              )}
            </span>
            <span className="font-body text-xs text-ink/70 max-w-[64px] truncate">{h.title}</span>
          </button>
        ))}

        {isOwn && (
          <button onClick={openEditor} className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="w-16 h-16 rounded-full ink-border flex items-center justify-center">
              <span className="font-display text-2xl leading-none">+</span>
            </span>
            <span className="font-body text-xs text-ink/70">New</span>
          </button>
        )}
      </div>

      {highlights.length === 0 && !isOwn && (
        <p className="font-body text-sm text-ink/50 mt-2">No highlights yet.</p>
      )}

      {viewing && (
        <StoryViewer
          stories={viewing.stories.map((s) => ({ ...s, owner_id: userId }))}
          isOwn={false}
          onClose={() => setViewing(null)}
          onChanged={load}
        />
      )}

      {viewing && isOwn && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
          <button className="btn-danger bg-bone" onClick={() => deleteHighlight(viewing.id)}>
            Delete highlight
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center px-5">
          <div className="card bg-bone w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="font-display text-2xl mb-4">Create a highlight</h3>
            <input
              className="input mb-4"
              placeholder="Highlight title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {archive.length === 0 ? (
              <p className="font-body text-sm text-ink/60 mb-4">
                Post a story first, then come back to build a highlight from it.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {archive.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`aspect-[3/4] ink-border overflow-hidden relative ${
                      selected.includes(s.id) ? "ring-4 ring-cobalt" : ""
                    }`}
                  >
                    {s.media_type === "image" ? (
                      <img src={s.media_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <video src={s.media_url} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="font-body text-sm text-tangerine mb-3">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary flex-1" onClick={create}>
                Save highlight
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
