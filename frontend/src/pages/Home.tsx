import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import StoryBar from "../components/StoryBar";
import Posts from "../components/Posts";

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <StoryBar />

      <div className="px-5 md:px-8 py-10 max-w-2xl">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-3 leading-tight">
          Good to see you, {user?.name.split(" ")[0]}.
        </h1>

        <p className="font-body text-ink/70 mb-8 max-w-md">
          Ply works best once your skills are listed. Add what you can teach and what you want to learn,
          then head to Discover to find your first trade.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to={`/profile/${user?.id}`}
            className="card hover:bg-clay transition-colors"
          >
            <h3 className="font-display text-lg mb-1">
              Your skills
            </h3>

            <p className="font-body text-sm text-ink/60">
              List what you teach and want to learn.
            </p>
          </Link>

          <Link
            to="/discover"
            className="card hover:bg-clay transition-colors"
          >
            <h3 className="font-display text-lg mb-1">
              Discover
            </h3>

            <p className="font-body text-sm text-ink/60">
              Search for people to trade with.
            </p>
          </Link>

          <Link
            to="/matches"
            className="card hover:bg-clay transition-colors"
          >
            <h3 className="font-display text-lg mb-1">
              Matches
            </h3>

            <p className="font-body text-sm text-ink/60">
              See your best compatibility scores.
            </p>
          </Link>
        </div>

        <Posts showComposer />
      </div>
    </div>
  );
}