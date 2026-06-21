export default function TimelineItem({ index, children }) {
  const isLeft = index % 2 === 0;

  return (
    <div className="relative flex items-center w-full">
      {/* Left side */}
      {isLeft && (
        <div className="w-1/2 pr-8 flex justify-end">
          {children}
        </div>
      )}

      {/* Right side */}
      {!isLeft && (
        <div className="w-1/2 pl-8 ml-auto">
          {children}
        </div>
      )}
    </div>
  );
}
