'use client';

interface LifeOSLogoProps {
  className?: string;
  size?: number;
}

export default function LifeOSLogo({ className = 'w-8 h-8', size = 32 }: LifeOSLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
      >
        <defs>
          <linearGradient id="lifeos-grad-1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="lifeos-spark" x1="0" y1="0" x2="12" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* Rounded Outer Badge Container */}
        <rect x="2" y="2" width="28" height="28" rx="9" fill="#0F172A" stroke="url(#lifeos-grad-1)" strokeWidth="1.5" />
        
        {/* Geometric Stylized 'L' Mark */}
        <path
          d="M10 9V22C10 22.5523 10.4477 23 11 23H21"
          stroke="url(#lifeos-grad-1)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* AI Spark Pulse Node */}
        <path
          d="M21 10C21.8 11.8 22.2 12.2 24 13C22.2 13.8 21.8 14.2 21 16C20.2 14.2 19.8 13.8 18 13C19.8 12.2 20.2 11.8 21 10Z"
          fill="url(#lifeos-spark)"
        />
      </svg>
    </div>
  );
}
