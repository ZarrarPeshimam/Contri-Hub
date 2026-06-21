import { useNavigate } from "react-router-dom";

/**
 * CollectionCard
 *
 * Now receives `username` as an explicit prop from CollectionsGrid
 * instead of reading useParams() internally.
 * This makes the component reusable in any context (not just inside a
 * route that has :username in the URL), and avoids a subtle bug where
 * useParams() would return undefined if the card is ever rendered
 * outside a matched route.
 */
export default function CollectionCard({ collection, username }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/${username}/${collection.slug}`)}
      className="
        rounded-xl
        border border-white/10
        bg-gradient-to-br from-amber-700/50 via-amber-500/50 to-amber-700/50
        p-6 pb-13
        cursor-pointer
        transition-all duration-200 ease-out
        hover:bg-none
        hover:scale-[1.04]
        hover:border-amber-400/40
        hover:bg-amber-400/10
        hover:shadow-[0_8px_30px_rgba(251,191,36,0.2)]
      "
    >
      <h3 className="text-xl font-semibold text-white">{collection.title}</h3>

      <p className="text-sm text-gray-400">{collection.year}</p>

      <p className="text-l py-3 pt-5 text-gray-200">
        {collection.description || "No description provided."}
      </p>

      <div className="mt-4 text-sm font-medium text-amber-400">
        {(collection.contributionsCount ?? 0) === 1
          ? "1 contribution →"
          : `${collection.contributionsCount ?? 0} contributions →`}
      </div>
    </div>
  );
}