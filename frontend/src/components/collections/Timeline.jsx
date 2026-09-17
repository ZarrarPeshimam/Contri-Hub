import {
  Children,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export default function Timeline({ children }) {
  const items = Children.toArray(children).filter(isValidElement);
  const total = items.length;
  const showMarkers = total > 1;

  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [line, setLine] = useState({ top: 0, height: 0 });

  itemRefs.current = [];
  const setItemRef = (el, index) => {
    itemRefs.current[index] = el;
  };

  useLayoutEffect(() => {
    if (!showMarkers) return;

    const container = containerRef.current;
    if (!container) return;

    const updateLine = () => {
      const nodes = itemRefs.current.filter(Boolean);
      if (nodes.length < 2) return;

      const containerRect = container.getBoundingClientRect();
      const firstRect = nodes[0].getBoundingClientRect();
      const lastRect = nodes[nodes.length - 1].getBoundingClientRect();

      const top = firstRect.top - containerRect.top + firstRect.height / 2;
      const bottom = lastRect.top - containerRect.top + lastRect.height / 2;

      setLine({ top, height: Math.max(bottom - top, 0) });
    };

    updateLine();

    const rafId = requestAnimationFrame(updateLine);
    const resizeObserver = new ResizeObserver(updateLine);
    resizeObserver.observe(container);
    itemRefs.current.filter(Boolean).forEach((el) => resizeObserver.observe(el));
    window.addEventListener("resize", updateLine);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLine);
    };
  }, [showMarkers, total]);

  return (
    <div ref={containerRef} className="relative overflow-x-hidden py-6">
      {/* Single continuous vertical line */}
      {showMarkers && line.height > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-white/20 hidden md:block pointer-events-none"
          style={{ top: `${line.top}px`, height: `${line.height}px` }}
        />
      )}

      <div className="space-y-12 relative">
        {items.map((child, index) =>
          cloneElement(child, {
            key: child.key ?? index,
            ref: (el) => setItemRef(el, index),
            showDot: showMarkers,
          })
        )}
      </div>
    </div>
  );
}