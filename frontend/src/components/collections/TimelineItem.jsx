import { forwardRef, useEffect, useRef, useState } from "react";

const TimelineItem = forwardRef(function TimelineItem(
  { index, children, showDot = true },
  ref
) {
  const isLeft = index % 2 === 0;

  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Safety net in case onTransitionEnd never fires (e.g. prefers-reduced-motion,
  // where the transition/transform is already suppressed by the motion-reduce
  // classes and no transitionend event is dispatched).
  useEffect(() => {
    if (!isVisible || animationDone) return;
    const timeout = setTimeout(() => setAnimationDone(true), 750);
    return () => clearTimeout(timeout);
  }, [isVisible, animationDone]);

  const handleTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    setAnimationDone(true);
  };

  // Left card translates in from left to right (-translate-x -> 0)
  // Right card translates in from right to left (translate-x -> 0)
  // Falls back to simple fade on mobile screens to prevent horizontal overflow
  const initialSlideClass = isLeft
    ? "md:-translate-x-8"
    : "md:translate-x-8";

  // Once the entrance animation has finished, drop the transition/transform
  // utility classes entirely so no lingering transform context restricts or
  // clips this card's own hover effects (e.g. a hover lift or action icons).
  const motionClass = animationDone
    ? "w-full"
    : `w-full transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:transform-none ${
        isVisible
          ? "opacity-100 translate-x-0"
          : `opacity-0 ${initialSlideClass}`
      }`;

  return (
    <div ref={ref} className="relative flex items-center w-full">
      {/* Node dot */}
      {showDot && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-[#93304A]" />
        </div>
      )}

      {/* Left side */}
      {isLeft && (
        <div className="w-full md:w-1/2 md:pr-8 flex justify-end">
          <div
            ref={cardRef}
            className={motionClass}
            onTransitionEnd={handleTransitionEnd}
          >
            {children}
          </div>
        </div>
      )}

      {/* Right side */}
      {!isLeft && (
        <div className="w-full md:w-1/2 md:pl-8 md:ml-auto">
          <div
            ref={cardRef}
            className={motionClass}
            onTransitionEnd={handleTransitionEnd}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
});

export default TimelineItem;