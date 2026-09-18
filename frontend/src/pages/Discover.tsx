import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PersonCard, { PersonCardData } from "../components/PersonCard";

export default function Discover() {
  const [results, setResults] = useState<PersonCardData[]>([]);
  const [skill, setSkill] = useState("");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function search() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (skill) params.set("skill", skill);
      if (city) params.set("city", city);
      if (mode) params.set("mode", mode);
      const data = await api.get<PersonCardData[]>(`/api/discover?${params.toString()}`);
      setResults(data);
    } catch {
      setError("Couldn't load Discover right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-5 md:px-8 py-8 max-w-4xl">
      <h1 className="font-display text-4xl font-semibold mb-6">Discover</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col sm:flex-row gap-3 mb-8"
      >
        <input className="input" placeholder="Skill (e.g. guitar)" value={skill} onChange={(e) => setSkill(e.target.value)} />
        <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">Any format</option>
          <option value="online">Online</option>
          <option value="in_person">In person</option>
          <option value="both">Both</option>
        </select>
        <button className="btn-primary shrink-0">Search</button>
      </form>

      {loading && <p className="font-body text-ink/60">Looking for people…</p>}
      {error && <p className="font-body text-tangerine">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="font-body text-ink/60">
          No one matches that search yet. Try a broader skill or clear the filters.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}
