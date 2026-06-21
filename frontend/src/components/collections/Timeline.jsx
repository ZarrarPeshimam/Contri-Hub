export default function Timeline({ children }) {
  return (
    <div className="relative">
      {/* Vertical Timeline Line */}
      <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white hidden md:block" />

      <div className="space-y-12 relative">   {/* Increased spacing a bit */}
        {children}
      </div>
    </div>
  );
}