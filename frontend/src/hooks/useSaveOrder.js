import { useCallback, useRef } from "react";
import api from "../lib/api";

/**
 * useSaveOrder
 *
 * Optimistic persistence for a re-ordered card list — same approach as the
 * Collections grid (update UI immediately, PUT the order, revert on failure),
 * plus two guards that matter when cards can be dragged quickly:
 *
 *  • Requests are sent one at a time, in the order they were made, so a slow
 *    earlier request can never overwrite a later one on the server.
 *  • A failure only reverts the UI if it belongs to the most recent drag,
 *    and reverts to the last order the server confirmed.
 *
 * `orderField` is the Contribution field this list is ordered by. Its values
 * are kept in step locally (position → index), matching what the server
 * stores, so "is this list manually arranged?" stays accurate without a
 * refetch.
 *
 * Returns saveOrder(nextItems, previousItems).
 */
export default function useSaveOrder({ endpoint, orderField, setItems, onError }) {
  const chainRef = useRef(Promise.resolve());
  const latestSeqRef = useRef(0);
  const inflightRef = useRef(0);
  const confirmedRef = useRef(null); // Map(id → { index, value }) — last server-confirmed state

  return useCallback(
    (nextItems, previousItems) => {
      const ids = nextItems.map((c) => c._id);

      // Nothing in flight → `previousItems` IS the server's current state.
      if (inflightRef.current === 0) {
        confirmedRef.current = new Map(
          previousItems.map((c, index) => [c._id, { index, value: c[orderField] }])
        );
      }

      setItems(nextItems.map((c, index) => ({ ...c, [orderField]: index })));

      const seq = ++latestSeqRef.current;
      inflightRef.current += 1;

      chainRef.current = chainRef.current.then(async () => {
        try {
          await api.put(endpoint, { orderedIds: ids });
          confirmedRef.current = new Map(ids.map((id, index) => [id, { index, value: index }]));
        } catch (err) {
          if (seq === latestSeqRef.current) {
            const confirmed = confirmedRef.current;
            setItems((current) => {
              if (!confirmed) return current;
              const known = current
                .filter((c) => confirmed.has(c._id))
                .sort((a, b) => confirmed.get(a._id).index - confirmed.get(b._id).index)
                .map((c) => ({ ...c, [orderField]: confirmed.get(c._id).value }));
              return [...known, ...current.filter((c) => !confirmed.has(c._id))];
            });
            onError?.(err);
          }
        } finally {
          inflightRef.current -= 1;
        }
      });
    },
    [endpoint, orderField, setItems, onError]
  );
}
