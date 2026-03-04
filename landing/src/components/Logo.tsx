export default function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Orbit ring */}
      <ellipse
        cx="50"
        cy="55"
        rx="45"
        ry="18"
        stroke="url(#orbitGrad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        transform="rotate(-25, 50, 55)"
      />
      {/* Star / sparkle */}
      <path
        d="M50 10 C52 30, 58 38, 78 40 C58 42, 52 50, 50 70 C48 50, 42 42, 22 40 C42 38, 48 30, 50 10Z"
        fill="url(#starGrad)"
      />
      <defs>
        <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="50%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  )
}
