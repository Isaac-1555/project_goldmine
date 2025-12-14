import React, { useId } from 'react'

type Variant = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
type Theme = 'gradient' | 'mono'

export interface SatBrainMarkProps {
  variant?: Variant
  theme?: Theme
  size?: number | string
  detail?: 'low' | 'med' | 'high'
  title?: string
  className?: string
}

export const SatBrainMark: React.FC<SatBrainMarkProps> = ({
  variant = 'f',
  theme = 'mono',
  size = 24,
  detail = 'med',
  title = 'Sat‑Brain',
  className,
}) => {
  const id = useId()
  const gradId = `sb-grad-${id}`
  const gradient = (
    <defs>
      <linearGradient id={gradId} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6"/>
        <stop offset="1" stopColor="#22d3ee"/>
      </linearGradient>
    </defs>
  )
  const stroke = theme === 'gradient' ? `url(#${gradId})` : 'currentColor'
  const fill = theme === 'gradient' ? `url(#${gradId})` : 'currentColor'

  const common = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    viewBox: '0 0 24 24',
    role: 'img' as const,
    'aria-label': title,
    className,
  }

  if (variant === 'a') {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
        {gradient}
        <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.4" fill={fill} />
        <circle cx="19.7" cy="8.4" r="1.2" fill={fill} />
        <circle cx="4.3" cy="15.6" r="1.2" fill={fill} />
        <circle cx="12" cy="20.5" r="1.2" fill={fill} />
        <path d="M7.2 10.3c1.3-2 4.5-2.7 6.7-.9c.9.7 1.2 1.6 1.2 2.7" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
  }
  if (variant === 'b') {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
        {gradient}
        <path d="M5 14.5c2.2-3.4 6.8-4.2 10.2-2.3c.9.5 1.7 1.1 2.3 1.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M6 14.5h12" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M12 9.3v-2.1" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="12" cy="5.7" r="1.2" fill={fill} />
        <ellipse cx="12" cy="12" rx="8.5" ry="7.2" stroke={stroke} strokeWidth="1.4" fill="none" opacity="0.65"/>
      </svg>
    )
  }
  if (variant === 'c') {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
        {gradient}
        <path d="M16.5 7.8c-1.2-1.4-3.5-2.2-5.5-1.5c-1.2.4-2 .9-2 1.9c0 1.7 2.2 2 4.2 2.4c2.2.5 4.2 1 4.2 3c0 1.6-1.4 2.6-3.1 3c-2.1.5-4.9-.1-6.8-1.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth="1.4" fill="none" opacity="0.7"/>
        <circle cx="6.2" cy="7.6" r="1.2" fill={fill} />
        <circle cx="17.8" cy="16.2" r="1.2" fill={fill} />
      </svg>
    )
  }
  if (variant === 'd') {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
        {gradient}
        <ellipse cx="12" cy="12.2" rx="8.6" ry="6.2" stroke={stroke} strokeWidth="1.2" opacity="0.35" fill="none"/>
        <path d="M12 4.6v1.4" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M17.5 4.8h1.2M18.1 4.2v1.2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M12 6.3c-2.3 0-4.1 1.6-4.1 3.6c0 1.1.5 1.9 1.3 2.5c.8.6 1.2 1.2 1.2 2.3v3.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <path d="M12 8.1c-1.3-.1-2.5.7-3 1.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M12 6.3c2.3 0 4.1 1.6 4.1 3.6c0 1.1-.5 1.9-1.3 2.5c-.8.6-1.2 1.2-1.2 2.3v3.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <path d="M12 8.1c1.3-.1 2.5.7 3 1.8" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    )
  }
  if (variant === 'e') {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
        {gradient}
        <ellipse cx="12" cy="12.2" rx="8.3" ry="6.0" stroke={stroke} strokeWidth="1.2" opacity="0.35" fill="none"/>
        <g fill={fill}>
          <circle cx="9.0" cy="7.9" r="0.9"/>
          <circle cx="7.6" cy="10.0" r="0.9"/>
          <circle cx="8.6" cy="12.0" r="0.9"/>
          <circle cx="10.2" cy="13.2" r="0.9"/>
          <circle cx="15.0" cy="7.9" r="0.9"/>
          <circle cx="16.4" cy="10.0" r="0.9"/>
          <circle cx="15.4" cy="12.0" r="0.9"/>
          <circle cx="13.8" cy="13.2" r="0.9"/>
        </g>
        <path d="M10.4 9.2c-.9.5-1.5 1.2-1.5 2.1c0 1.2 1 2.1 2.4 2.7" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M13.6 9.2c.9.5 1.5 1.2 1.5 2.1c0 1.2-1 2.1-2.4 2.7" stroke={stroke} strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="19.2" cy="7.4" r="0.9" fill={fill} />
      </svg>
    )
  }
  if (variant === 'f') {
    // Monochrome network graph (bilobed cluster + faint ring), no gradients
    const nodes: [number, number][] = [
      [8.2,8.0],[7.0,10.0],[8.4,11.6],[9.6,9.8],[9.1,13.0],[7.6,12.5],[8.7,14.0],[10.0,14.6],[10.6,12.0],[9.0,15.8],
      [15.8,8.0],[17.0,10.0],[15.6,11.6],[14.4,9.8],[14.9,13.0],[16.4,12.5],[15.3,14.0],[14.0,14.6],[13.4,12.0],[15.0,15.8],
      [12.0,9.2],[12.0,12.0],[12.0,14.8]
    ]
    const thresh = detail === 'low' ? 2.2 : detail === 'high' ? 3.0 : 2.6
    const lineW = detail === 'low' ? 0.55 : 0.6
    const nodeR = detail === 'low' ? 0.65 : 0.7

    const lines: React.ReactElement[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [x1, y1] = nodes[i];
        const [x2, y2] = nodes[j];
        const dx = x1 - x2, dy = y1 - y2
        const d = Math.hypot(dx, dy)
        if (d < thresh) {
          lines.push(
            <line key={`l-${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="currentColor" strokeWidth={lineW} strokeOpacity={0.45} />
          )
        }
      }
    }

    // Faint dotted ring around cluster (12 dots)
    const orbit: React.ReactElement[] = []
    for (let k = 0; k < 12; k++) {
      const ang = (Math.PI * 2 * k) / 12
      const rx = 8.4, ry = 6.0
      const x = 12 + Math.cos(ang) * rx
      const y = 12.2 + Math.sin(ang) * ry
      orbit.push(<circle key={`o-${k}`} cx={x} cy={y} r={0.45} fill="currentColor" opacity={0.35} />)
    }

    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
        <g>{lines}</g>
        <g>
          {nodes.map(([x, y], idx) => (
            <circle key={`n-${idx}`} cx={x} cy={y} r={nodeR} fill="currentColor" />
          ))}
        </g>
        <g>{orbit}</g>
      </svg>
    )
  }
  return (
    <svg {...common} xmlns="http://www.w3.org/2000/svg" fill="none">
      {gradient}
      <path d="M16.5 7.8c-1.2-1.4-3.5-2.2-5.5-1.5c-1.2.4-2 .9-2 1.9c0 1.7 2.2 2 4.2 2.4c2.2.5 4.2 1 4.2 3c0 1.6-1.4 2.6-3.1 3c-2.1.5-4.9-.1-6.8-1.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="8.5" stroke={stroke} strokeWidth="1.4" fill="none" opacity="0.7"/>
      <circle cx="6.2" cy="7.6" r="1.2" fill={fill} />
      <circle cx="17.8" cy="16.2" r="1.2" fill={fill} />
    </svg>
  )
}

export default SatBrainMark