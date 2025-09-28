import React from "react";
import { Search } from "lucide-react";

export interface Props {
  onClick: () => void;
  ariaLabel?: string;
  size?: number; // diameter in px
  label?: string;
  className?: string;
}

// Reusable circular gradient scan button with glow and inner ring
// Accessible: keyboard focus, aria-label, and Enter/Space activation built-in via <button>
export const ScanButton: React.FC<Props> = ({
  onClick,
  ariaLabel = "Start skin scan",
  size = 260,
  label = "SCAN",
  className,
}) => {
  const style: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className ?? ""}`} style={style}>
      {/* Soft outer glow */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, rgba(34,211,238,0.35) 0%, rgba(59,130,246,0.25) 50%, rgba(132,204,22,0.20) 100%)",
        }}
      />

      {/* Main circular button */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className="relative w-full h-full rounded-full text-white font-extrabold tracking-wider select-none
                   bg-[radial-gradient(120%_120%_at_20%_20%,#22d3ee_0%,#60a5fa_45%,#a3e635_100%)]
                   border-2 border-white/70 shadow-2xl
                   transition-transform duration-200 ease-out hover:scale-[1.03]
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
      >
        {/* Subtle inner ring for depth */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[10px] rounded-full ring-1 ring-white/30"
        />
        <div className="relative z-[1] flex flex-col items-center justify-center h-full">
          <span className="drop-shadow-sm text-3xl md:text-4xl">{label}</span>
          <Search className="mt-2 opacity-95" size={28} strokeWidth={2.5} />
        </div>
      </button>
    </div>
  );
};
