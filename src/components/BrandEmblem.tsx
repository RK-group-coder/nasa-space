/** AURA-Space 醫療標誌：藍色醫療十字 + 紅色軌道環（向量重繪，任意尺寸皆清晰） */
export default function BrandEmblem({
  size = 64,
  className = '',
  animate = false,
}: {
  size?: number
  className?: string
  animate?: boolean
}) {
  const rot = 'translate(262 228) rotate(-28)'
  const ring =
    'M-252,0 A252,64 0 1 0 252,0 A252,64 0 1 0 -252,0 Z ' +
    'M-236,-14 A236,42 0 1 1 236,-14 A236,42 0 1 1 -236,-14 Z'
  const cross =
    'M216.5,66.5 H300.5 Q326.5,66.5 326.5,92.5 V154.5 Q326.5,168.5 340.5,168.5 H402.5 Q428.5,168.5 428.5,194.5 ' +
    'V278.5 Q428.5,304.5 402.5,304.5 H340.5 Q326.5,304.5 326.5,318.5 V380.5 Q326.5,406.5 300.5,406.5 H216.5 ' +
    'Q190.5,406.5 190.5,380.5 V318.5 Q190.5,304.5 176.5,304.5 H114.5 Q88.5,304.5 88.5,278.5 V194.5 ' +
    'Q88.5,168.5 114.5,168.5 H176.5 Q190.5,168.5 190.5,154.5 V92.5 Q190.5,66.5 216.5,66.5 Z'

  return (
    <svg
      className={`brand-emblem ${className}`}
      width={size}
      height={size * 0.9}
      viewBox="40 40 480 400"
      role="img"
      aria-label="AURA-Space 醫療標誌"
    >
      <defs>
        <linearGradient id="be-navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4f9a" />
          <stop offset="1" stopColor="#0f2f63" />
        </linearGradient>
        <linearGradient id="be-red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e23a48" />
          <stop offset="1" stopColor="#b3202e" />
        </linearGradient>
        <clipPath id="be-front">
          <rect x="-300" y="-2" width="600" height="120" />
        </clipPath>
      </defs>

      {/* 後半環（在十字後方） */}
      <g transform={rot}>
        <path d={ring} fill="url(#be-red)" fillRule="evenodd" className={animate ? 'be-anim-ring' : ''} />
      </g>

      {/* 醫療十字 */}
      <path
        d={cross}
        pathLength={1}
        fill="#ffffff"
        stroke="url(#be-navy)"
        strokeWidth="16"
        strokeLinejoin="round"
        className={animate ? 'be-anim-cross' : ''}
      />

      {/* 前半環（在十字前方） */}
      <g transform={rot}>
        <g clipPath="url(#be-front)">
          <path d={ring} fill="url(#be-red)" fillRule="evenodd" className={animate ? 'be-anim-ring' : ''} />
        </g>
      </g>
    </svg>
  )
}

