import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import Highlights from "../components/Highlights";
import TradeRequestModal from "../components/TradeRequestModal";
import Posts from "../components/Posts";

interface SkillEntry {
  id: string;
  skill_id: string;
  name: string;
  level: string;
}

interface FullProfile {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  city: string;
  country: string;
  mode: string;
  teach: SkillEntry[];
  learn: SkillEntry[];
  badges: {
    code: string;
    name: string;
    description: string;
  }[];
  rating: {
    average: number | null;
    count: number;
  };
}

interface Review {
  id: string;
  rating: number;
  body: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_username: string;
  created_at: string;
}

export default function Profile() {
  const { id } =
    useParams<{ id: string }>();

  const { user, refresh } =
    useAuth();

  const isOwn =
    user?.id === id;

  const [profile, setProfile] =
    useState<FullProfile | null>(
      null
    );

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [error, setError] =
    useState("");

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [form, setForm] =
    useState({
      name: "",
      bio: "",
      city: "",
      country: "",
      mode: "both",
    });

  const [newSkill, setNewSkill] =
    useState({
      name: "",
      direction:
        "teach" as "teach" | "learn",
    });

  const [showTradeModal, setShowTradeModal] =
    useState(false);

  const [avatarBusy, setAvatarBusy] =
    useState(false);

  const [myTeachSkills, setMyTeachSkills] =
    useState<
      {
        skill_id: string;
        name: string;
      }[]
    >([]);

  async function load() {
    if (!id) return;

    try {
      const data =
        await api.get<FullProfile>(
          `/api/users/${id}`
        );

      setProfile(data);

      setForm({
        name: data.name,
        bio: data.bio,
        city: data.city,
        country: data.country,
        mode: data.mode,
      });

      const r =
        await api.get<Review[]>(
          `/api/reviews/${id}`
        );

      setReviews(r);
    } catch {
      setError(
        "That profile couldn't be loaded."
      );
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isOwn) return;

    api
      .get<
        {
          skill_id: string;
          name: string;
          direction: string;
        }[]
      >("/api/skills/mine")
      .then((rows) =>
        setMyTeachSkills(
          rows.filter(
            (r) =>
              r.direction ===
              "teach"
          )
        )
      )
      .catch(() =>
        setMyTeachSkills([])
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn]);

  async function saveProfile() {
    if (!id) return;

    await api.put(
      `/api/users/${id}`,
      form
    );

    setEditingProfile(false);

    load();

    if (isOwn) {
      refresh();
    }
  }

  async function addSkill() {
    if (!newSkill.name.trim())
      return;

    try {
      await api.post(
        "/api/skills",
        {
          name:
            newSkill.name.trim(),
          direction:
            newSkill.direction,
        }
      );

      setNewSkill({
        name: "",
        direction:
          newSkill.direction,
      });

      load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't add that skill."
      );
    }
  }

  async function removeSkill(
    userSkillId: string
  ) {
    await api.delete(
      `/api/skills/${userSkillId}`
    );

    load();
  }

  async function onAvatarSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file || !id) return;

    setAvatarBusy(true);

    try {
      const { url } =
        await api.upload(file);

      await api.put(
        `/api/users/${id}`,
        {
          avatar_url: url,
        }
      );

      load();

      if (isOwn) {
        refresh();
      }
    } finally {
      setAvatarBusy(false);
      e.target.value = "";
    }
  }

  if (error) {
    return (
      <p className="font-body text-tangerine p-8">
        {error}
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="font-body text-ink/60 p-8">
        Loading profile…
      </p>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl">
      <div className="flex items-start gap-5">
        <label className="relative shrink-0 cursor-pointer">
          <span className="w-20 h-20 rounded-full ink-border overflow-hidden bg-clay flex items-center justify-center block">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <span className="font-display text-3xl">
                {profile.name[0]}
              </span>
            )}
          </span>

          {isOwn && (
            <>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={
                  onAvatarSelected
                }
              />

              <span className="absolute -bottom-1 -right-1 pill bg-ink text-bone text-[10px] px-2 py-0.5">
                {avatarBusy
                  ? "…"
                  : "Edit"}
              </span>
            </>
          )}
        </label>

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            {profile.name}
          </h1>

          <p className="font-body text-sm text-ink/50">
            @{profile.username}

            {profile.city
              ? ` · ${profile.city}${
                  profile.country
                    ? `, ${profile.country}`
                    : ""
                }`
              : ""}
          </p>

          {profile.rating.count >
            0 && (
            <p className="font-body text-sm mt-1">
              {profile.rating.average}{" "}
              average ·{" "}
              {profile.rating.count}{" "}
              review
              {profile.rating.count ===
              1
                ? ""
                : "s"}
            </p>
          )}
        </div>

        {isOwn ? (
          <button
            className="btn-secondary shrink-0"
            onClick={() =>
              setEditingProfile(
                (v) => !v
              )
            }
          >
            {editingProfile
              ? "Close"
              : "Edit profile"}
          </button>
        ) : (
          <button
            className="btn-primary shrink-0"
            onClick={() =>
              setShowTradeModal(
                true
              )
            }
          >
            Propose trade
          </button>
        )}
      </div>

      {profile.bio &&
        !editingProfile && (
          <p className="font-body text-ink/80 mt-4 max-w-md">
            {profile.bio}
          </p>
        )}

      {editingProfile && (
        <div className="card mt-4 flex flex-col gap-3">
          <input
            className="input"
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                name: e.target.value,
              }))
            }
            placeholder="Name"
          />

          <textarea
            className="input"
            rows={3}
            value={form.bio}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                bio: e.target.value,
              }))
            }
            placeholder="Bio"
          />

          <div className="flex gap-3">
            <input
              className="input"
              value={form.city}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  city: e.target.value,
                }))
              }
              placeholder="City"
            />

            <input
              className="input"
              value={form.country}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  country:
                    e.target.value,
                }))
              }
              placeholder="Country"
            />
          </div>

          <select
            className="input"
            value={form.mode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                mode: e.target.value,
              }))
            }
          >
            <option value="online">
              Online
            </option>
            <option value="in_person">
              In person
            </option>
            <option value="both">
              Both
            </option>
          </select>

          <button
            className="btn-primary"
            onClick={saveProfile}
          >
            Save changes
          </button>
        </div>
      )}

      <Highlights
        userId={profile.id}
        isOwn={isOwn}
      />

      <Posts
        userId={profile.id}
        showComposer={isOwn}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
        <SkillColumn
          title="Teaches"
          skills={profile.teach}
          isOwn={isOwn}
          onRemove={removeSkill}
        />

        <SkillColumn
          title="Wants to learn"
          skills={profile.learn}
          isOwn={isOwn}
          onRemove={removeSkill}
        />
      </div>

      {isOwn && (
        <div className="card mt-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="font-body text-sm block mb-1">
              Add a skill
            </label>

            <input
              className="input"
              value={newSkill.name}
              onChange={(e) =>
                setNewSkill(
                  (s) => ({
                    ...s,
                    name:
                      e.target.value,
                  })
                )
              }
              placeholder="e.g. Watercolor painting"
            />
          </div>

          <select
            className="input sm:w-40"
            value={
              newSkill.direction
            }
            onChange={(e) =>
              setNewSkill(
                (s) => ({
                  ...s,
                  direction:
                    e.target.value as
                      | "teach"
                      | "learn",
                })
              )
            }
          >
            <option value="teach">
              I can teach
            </option>

            <option value="learn">
              I want to learn
            </option>
          </select>

          <button
            className="btn-primary shrink-0"
            onClick={addSkill}
          >
            Add
          </button>
        </div>
      )}

      {profile.badges.length >
        0 && (
        <div className="mt-8">
          <h2 className="font-display text-xl mb-3">
            Badges
          </h2>

          <div className="flex flex-wrap gap-2">
            {profile.badges.map(
              (b) => (
                <span
                  key={b.code}
                  className="pill bg-clay"
                  title={
                    b.description
                  }
                >
                  {b.name}
                </span>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-8 mb-4">
        <h2 className="font-display text-xl mb-3">
          Reviews
        </h2>

        {reviews.length === 0 ? (
          <p className="font-body text-sm text-ink/50">
            No reviews yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="card"
              >
                <p className="font-body text-sm font-semibold">
                  <Link
                    to={`/profile/${r.reviewer_id}`}
                    className="hover:text-cobalt"
                  >
                    {r.reviewer_name}
                  </Link>{" "}
                  · {r.rating}/5
                </p>

                {r.body && (
                  <p className="font-body text-sm text-ink/70 mt-1">
                    {r.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showTradeModal && (
        <TradeRequestModal
          receiverId={profile.id}
          mySkills={myTeachSkills}
          theirSkills={profile.teach.map(
            (s) => ({
              skill_id:
                s.skill_id,
              name: s.name,
            })
          )}
          onClose={() =>
            setShowTradeModal(
              false
            )
          }
          onSent={() =>
            setShowTradeModal(
              false
            )
          }
        />
      )}
    </div>
  );
}

function SkillColumn({
  title,
  skills,
  isOwn,
  onRemove,
}: {
  title: string;
  skills: SkillEntry[];
  isOwn: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl mb-3">
        {title}
      </h2>

      {skills.length === 0 ? (
        <p className="font-body text-sm text-ink/50">
          Nothing listed yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s.id}
              className="pill flex items-center gap-2"
            >
              {s.name}

              {isOwn && (
                <button
                  onClick={() =>
                    onRemove(s.id)
                  }
                  className="font-display leading-none"
                  aria-label={`Remove ${s.name}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}