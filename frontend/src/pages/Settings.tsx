import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type Tab =
  | "account"
  | "appearance"
  | "notifications"
  | "privacy";

export default function Settings() {
  const { user, logout } =
    useAuth();

  const navigate =
    useNavigate();

  const [tab, setTab] =
    useState<Tab>("account");

  const [dark, setDark] =
    useState(
      () =>
        localStorage.getItem(
          "ply_theme"
        ) === "dark"
    );

  const [notifications, setNotifications] =
    useState({
      trades: true,
      matches: true,
      messages: true,
    });

  const [visibility, setVisibility] =
    useState("public");

  const [confirmingDelete, setConfirmingDelete] =
    useState(false);

  const [confirmText, setConfirmText] =
    useState("");

  const [error, setError] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

  function toggleDarkMode() {
    setDark((current) => {
      const next = !current;

      document.documentElement.classList.toggle(
        "dark",
        next
      );

      localStorage.setItem(
        "ply_theme",
        next ? "dark" : "light"
      );

      return next;
    });
  }

  async function deleteAccount() {
    setDeleting(true);
    setError("");

    try {
      await api.delete(
        "/api/auth/account"
      );

      logout();
      navigate("/login");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't delete your account. Try again."
      );

      setDeleting(false);
    }
  }

  const tabs: {
    id: Tab;
    label: string;
  }[] = [
    {
      id: "account",
      label: "Account",
    },
    {
      id: "appearance",
      label: "Appearance",
    },
    {
      id: "notifications",
      label: "Notifications",
    },
    {
      id: "privacy",
      label: "Privacy",
    },
  ];

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl">
      <h1 className="font-display text-4xl font-semibold mb-6">
        Settings
      </h1>

      <div className="flex gap-2 mb-8 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() =>
              setTab(t.id)
            }
            className={`btn-secondary ${
              tab === t.id
                ? "bg-ink text-bone"
                : ""
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="flex flex-col gap-6">
          <div className="card">
            <p className="font-body text-sm text-ink/60 mb-1">
              Signed in as
            </p>

            <p className="font-body font-medium">
              {user?.email}
            </p>
          </div>

          <div>
            <button
              className="btn-secondary"
              onClick={() =>
                navigate(
                  `/profile/${user?.id}`
                )
              }
            >
              Edit profile
            </button>
          </div>

          <div>
            <button
              className="btn-secondary"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          </div>

          <div className="ink-border p-5 border-tangerine">
            <h3 className="font-display text-xl mb-2">
              Delete account
            </h3>

            <p className="font-body text-sm text-ink/70 mb-4">
              This permanently removes your profile, skills, trades, messages, reviews, badges, stories, and
              highlights. This action is permanent and cannot be undone.
            </p>

            {!confirmingDelete ? (
              <button
                className="btn-danger"
                onClick={() =>
                  setConfirmingDelete(
                    true
                  )
                }
              >
                Delete your account
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-body text-sm font-medium">
                  Type DELETE to confirm.
                </p>

                <input
                  className="input"
                  value={
                    confirmText
                  }
                  onChange={(e) =>
                    setConfirmText(
                      e.target.value
                    )
                  }
                />

                {error && (
                  <p className="font-body text-sm text-tangerine">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    className="btn-secondary flex-1"
                    onClick={() => {
                      setConfirmingDelete(
                        false
                      );
                      setConfirmText("");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn-danger flex-1"
                    disabled={
                      confirmText !==
                        "DELETE" ||
                      deleting
                    }
                    onClick={
                      deleteAccount
                    }
                  >
                    {deleting
                      ? "Deleting…"
                      : "Permanently delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "appearance" && (
        <div className="card flex items-center justify-between max-w-sm">
          <div>
            <p className="font-body font-medium">
              Dark mode
            </p>

            <p className="font-body text-sm text-ink/60">
              Applies across Ply.
            </p>
          </div>

          <button
            onClick={
              toggleDarkMode
            }
            className={`w-14 h-8 ink-border relative transition-colors ${
              dark
                ? "bg-ink"
                : "bg-bone"
            }`}
            aria-pressed={dark}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 ink-border bg-bone transition-transform ${
                dark
                  ? "translate-x-6"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}

      {tab === "notifications" && (
        <div className="flex flex-col gap-4 max-w-sm">
          {(
            [
              [
                "trades",
                "Trade requests",
              ],
              [
                "matches",
                "New matches",
              ],
              [
                "messages",
                "Messages",
              ],
            ] as const
          ).map(
            ([key, label]) => (
              <div
                key={key}
                className="card flex items-center justify-between"
              >
                <p className="font-body font-medium">
                  {label}
                </p>

                <button
                  onClick={() =>
                    setNotifications(
                      (n) => ({
                        ...n,
                        [key]:
                          !n[key],
                      })
                    )
                  }
                  className={`w-14 h-8 ink-border relative transition-colors ${
                    notifications[
                      key
                    ]
                      ? "bg-ink"
                      : "bg-bone"
                  }`}
                  aria-pressed={
                    notifications[
                      key
                    ]
                  }
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 ink-border bg-bone transition-transform ${
                      notifications[
                        key
                      ]
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {tab === "privacy" && (
        <div className="flex flex-col gap-4 max-w-sm">
          <div className="card">
            <p className="font-body font-medium mb-2">
              Profile visibility
            </p>

            <select
              className="input"
              value={visibility}
              onChange={(e) =>
                setVisibility(
                  e.target.value
                )
              }
            >
              <option value="public">
                Visible to everyone on Ply
              </option>

              <option value="matches">
                Visible to matches only
              </option>
            </select>
          </div>

          <p className="font-body text-xs text-ink/50">
            Online/in-person preference is set from your profile editor.
          </p>
        </div>
      )}
    </div>
  );
}