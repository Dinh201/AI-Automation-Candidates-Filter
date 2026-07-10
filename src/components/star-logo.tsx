export function StarLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <radialGradient id="sl-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0e2040" />
          <stop offset="100%" stopColor="#060d1a" />
        </radialGradient>
        <radialGradient id="sl-star" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="28%" stopColor="#40ccee" />
          <stop offset="62%" stopColor="#c8eeff" />
          <stop offset="100%" stopColor="#ffffff" />
        </radialGradient>
        <radialGradient id="sl-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#00aacc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#004466" stopOpacity="0" />
        </radialGradient>
        <filter id="sl-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="sl-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" />
        </filter>
        <filter id="sl-ring-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <circle cx="50" cy="50" r="50" fill="url(#sl-bg)" />

      {/* Outer ring glow halo */}
      <g filter="url(#sl-soft)" opacity="0.38">
        <path d="M 92.6,56.0 A 43,43 0 0,1 56.0,92.6" stroke="#38c8ee" strokeWidth="3.5" fill="none" />
        <path d="M 44.0,92.6 A 43,43 0 0,1 7.4,56.0" stroke="#38c8ee" strokeWidth="3.5" fill="none" />
        <path d="M 7.4,44.0 A 43,43 0 0,1 44.0,7.4" stroke="#38c8ee" strokeWidth="3.5" fill="none" />
        <path d="M 56.0,7.4 A 43,43 0 0,1 92.6,44.0" stroke="#38c8ee" strokeWidth="3.5" fill="none" />
      </g>

      {/* Outer ring crisp */}
      <g stroke="rgba(210,240,255,0.92)" strokeWidth="1.7" fill="none" filter="url(#sl-ring-glow)">
        <path d="M 92.6,56.0 A 43,43 0 0,1 56.0,92.6" />
        <path d="M 44.0,92.6 A 43,43 0 0,1 7.4,56.0" />
        <path d="M 7.4,44.0 A 43,43 0 0,1 44.0,7.4" />
        <path d="M 56.0,7.4 A 43,43 0 0,1 92.6,44.0" />
      </g>

      {/* Inner ring */}
      <g stroke="rgba(140,215,240,0.52)" strokeWidth="1.1" fill="none">
        <path d="M 86.64,55.15 A 37,37 0 0,1 55.15,86.64" />
        <path d="M 44.85,86.64 A 37,37 0 0,1 13.36,55.15" />
        <path d="M 13.36,44.85 A 37,37 0 0,1 44.85,13.36" />
        <path d="M 55.15,13.36 A 37,37 0 0,1 86.64,44.85" />
      </g>

      {/* Center ambient glow */}
      <circle cx="50" cy="50" r="22" fill="url(#sl-center)" />

      {/* Star glow blur */}
      <path
        filter="url(#sl-soft)"
        opacity="0.6"
        d="M 50,22 L 51.34,46.77 L 58.49,41.51 L 53.23,48.66
           L 78,50 L 53.23,51.34 L 58.49,58.49 L 51.34,53.23
           L 50,78 L 48.66,53.23 L 41.51,58.49 L 46.77,51.34
           L 22,50 L 46.77,48.66 L 41.51,41.51 L 48.66,46.77 Z"
        fill="#00c8f0"
      />

      {/* Main 8-pointed compass star */}
      <path
        d="M 50,22 L 51.34,46.77 L 58.49,41.51 L 53.23,48.66
           L 78,50 L 53.23,51.34 L 58.49,58.49 L 51.34,53.23
           L 50,78 L 48.66,53.23 L 41.51,58.49 L 46.77,51.34
           L 22,50 L 46.77,48.66 L 41.51,41.51 L 48.66,46.77 Z"
        fill="url(#sl-star)"
        filter="url(#sl-glow)"
      />

      {/* Center glow dot */}
      <circle cx="50" cy="50" r="5.5" fill="#00e8ff" opacity="0.75" filter="url(#sl-soft)" />
      <circle cx="50" cy="50" r="2.8" fill="white" />
    </svg>
  );
}