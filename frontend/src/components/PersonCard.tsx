import { Link } from "react-router-dom";

export interface PersonCardData {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  city: string;
  country: string;
  compatibility?: number;
  theyTeach?: string[];
}

export default function PersonCard({ person }: { person: PersonCardData }) {
  return (
    <Link to={`/profile/${person.id}`} className="card flex flex-col gap-3 hover:bg-clay transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-full ink-border overflow-hidden shrink-0 bg-clay flex items-center justify-center">
          {person.avatar_url ? (
            <img src={person.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="font-display text-lg">{person.name[0]}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight truncate">{person.name}</p>
          <p className="font-body text-xs text-ink/50 truncate">
            @{person.username}
            {person.city ? ` · ${person.city}` : ""}
          </p>
        </div>
        {typeof person.compatibility === "number" && (
          <span className="ml-auto pill bg-cobalt text-bone border-cobalt shrink-0">
            {person.compatibility}% match
          </span>
        )}
      </div>
      {person.bio && <p className="font-body text-sm text-ink/70 line-clamp-2">{person.bio}</p>}
      {person.theyTeach && person.theyTeach.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {person.theyTeach.slice(0, 4).map((s) => (
            <span key={s} className="pill">
              {s}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
