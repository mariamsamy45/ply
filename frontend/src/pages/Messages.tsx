import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

interface ConversationSummary {
  conversation_id: string;
  other_user_id: string;
  other_name: string;
  other_username: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function Messages() {
  const { conversationId } =
    useParams<{
      conversationId: string;
    }>();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] =
    useState<ConversationSummary[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [draft, setDraft] =
    useState("");

  const [error, setError] =
    useState("");

  const bottomRef =
    useRef<HTMLDivElement>(null);

  async function loadConversations() {
    try {
      const data =
        await api.get<ConversationSummary[]>(
          "/api/messages"
        );

      setConversations(data);
    } catch {
      setError(
        "Couldn't load your conversations."
      );
    }
  }

  async function loadThread(id: string) {
    try {
      const data =
        await api.get<Message[]>(
          `/api/messages/${id}`
        );

      setMessages(data);

      setTimeout(
        () =>
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
          }),
        50
      );
    } catch {
      setError(
        "Couldn't load that conversation."
      );
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadThread(conversationId);
    }
  }, [conversationId]);

  async function send() {
    if (
      !draft.trim() ||
      !conversationId
    ) {
      return;
    }

    const body = draft.trim();
    setDraft("");

    try {
      await api.post("/api/messages", {
        conversation_id:
          conversationId,
        body,
      });

      loadThread(conversationId);
      loadConversations();
    } catch {
      setError(
        "That message didn't send. Try again."
      );
    }
  }

  const active =
    conversations.find(
      (c) =>
        c.conversation_id ===
        conversationId
    );

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen">
      <div
        className={`w-full md:w-80 border-r-2 border-ink shrink-0 overflow-y-auto ${
          conversationId
            ? "hidden md:block"
            : ""
        }`}
      >
        <div className="px-5 py-6">
          <h1 className="font-display text-3xl font-semibold mb-4">
            Messages
          </h1>

          {error && (
            <p className="font-body text-tangerine text-sm mb-3">
              {error}
            </p>
          )}

          {conversations.length ===
          0 ? (
            <p className="font-body text-sm text-ink/60">
              No conversations yet.
            </p>
          ) : (
            <div className="flex flex-col">
              {conversations.map(
                (c) => (
                  <div
                    key={
                      c.conversation_id
                    }
                    onClick={() =>
                      navigate(
                        `/messages/${c.conversation_id}`
                      )
                    }
                    className={`flex items-center gap-3 py-3 border-b border-ink/10 text-left cursor-pointer ${
                      c.conversation_id ===
                      conversationId
                        ? "bg-clay px-2"
                        : ""
                    }`}
                  >
                    <span className="w-10 h-10 rounded-full ink-border overflow-hidden bg-clay shrink-0 flex items-center justify-center">
                      {c.other_avatar ? (
                        <img
                          src={
                            c.other_avatar
                          }
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <span className="font-display">
                          {
                            c.other_name[0]
                          }
                        </span>
                      )}
                    </span>

                    <span className="min-w-0">
                      <Link
                        to={`/profile/${c.other_user_id}`}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        className="font-body text-sm font-medium block truncate hover:text-cobalt"
                      >
                        {c.other_name}
                      </Link>

                      <span className="font-body text-xs text-ink/50 block truncate">
                        {c.last_message ||
                          "Say hello"}
                      </span>
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {active ? (
          <>
            <div className="px-5 py-4 border-b-2 border-ink flex items-center gap-3">
              <button
                className="md:hidden font-display text-xl"
                onClick={() =>
                  navigate(
                    "/messages"
                  )
                }
              >
                ‹
              </button>

              <Link
                to={`/profile/${active.other_user_id}`}
                className="font-display text-lg hover:text-cobalt"
              >
                {active.other_name}
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[75%] px-4 py-2 font-body text-sm ink-border ${
                    m.sender_id ===
                    user?.id
                      ? "self-end bg-cobalt text-bone border-cobalt"
                      : "self-start bg-bone"
                  }`}
                >
                  {m.body}
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t-2 border-ink flex gap-2">
              <input
                className="input"
                placeholder="Write a message"
                value={draft}
                onChange={(e) =>
                  setDraft(
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  send()
                }
              />

              <button
                className="btn-primary shrink-0"
                onClick={send}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <p className="font-body text-ink/50">
              Select a conversation to start messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}