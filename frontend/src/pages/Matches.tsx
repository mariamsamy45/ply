import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PersonCard, {
  PersonCardData,
} from "../components/PersonCard";

export default function Matches() {
  const [matches, setMatches] =
    useState<PersonCardData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    api
      .get<PersonCardData[]>("/api/matches")
      .then(setMatches)
      .catch(() =>
        setError(
          "Couldn't load your matches right now."
        )
      )
      .finally(() =>
        setLoading(false)
      );
  }, []);

  return (
    <div className="px-5 md:px-8 py-8 max-w-4xl">
      <h1 className="font-display text-4xl font-semibold mb-2">
        Matches
      </h1>

      <p className="font-body text-ink/60 mb-8 max-w-md">
        People whose skills reciprocate yours, ranked by real compatibility.
      </p>

      {loading && (
        <p className="font-body text-ink/60">
          Calculating matches…
        </p>
      )}

      {error && (
        <p className="font-body text-tangerine">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        matches.length === 0 && (
          <p className="font-body text-ink/60">
            No matches yet. Start discovering people to find your perfect skill trade.
          </p>
        )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {matches.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
          />
        ))}
      </div>
    </div>
  );
}