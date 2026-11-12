import { useEffect, useId, useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { animate, motion, useInView, type HTMLMotionProps } from 'motion/react'
import clsx from 'clsx'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

/* ---------- Button with shimmer sweep ---------- */
type BtnProps = HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'ghost' | 'subtle' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, children, disabled, ...p }: BtnProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled}
      className={clsx(
        'group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3.5 text-[13px]',
        size === 'md' && 'h-10 px-5 text-sm',
        size === 'lg' && 'h-12 px-7 text-[15px]',
        variant === 'primary' && 'bg-sun text-ink shadow-[0_8px_30px_-8px_rgb(255_201_40/0.55)] hover:bg-[#ffd24d]',
        variant === 'ghost' && 'border border-line bg-white/[0.02] text-cloud hover:border-white/20 hover:bg-white/[0.06]',
        variant === 'subtle' && 'bg-ink-3 text-cloud hover:bg-ink-4',
        variant === 'danger' && 'border border-err/30 text-err hover:bg-err/10',
        className,
      )}
      {...p}
    >
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children as ReactNode}</span>
    </motion.button>
  )
}

/* ---------- Spotlight card: radial glow follows the cursor ---------- */
export function SpotlightCard({ children, className, glow = 'rgb(255 201 40 / 0.10)' }: {
  children: ReactNode; className?: string; glow?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${e.clientX - r.left}px`)
    el.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={clsx(
        'group relative overflow-hidden rounded-3xl border border-line bg-ink-2/80 transition-colors hover:border-white/15',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(420px circle at var(--x) var(--y), ${glow}, transparent 45%)` }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  )
}

/* ---------- Card (static) ---------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-2xl border border-line bg-ink-2', className)}>{children}</div>
}

/* ---------- Number ticker ---------- */
export function NumberTicker({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(v) })
    return () => c.stop()
  }, [inView, value])
  return <span ref={ref} className={clsx('tabular-nums', className)}>{Math.round(n).toLocaleString()}{suffix}</span>
}

/* ---------- Live counter (animates between changing values) ---------- */
export function LiveNumber({ value }: { value: number }) {
  const [n, setN] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const c = animate(prev.current, value, { duration: 0.6, onUpdate: (v) => setN(v) })
    prev.current = value
    return () => c.stop()
  }, [value])
  return <span className="tabular-nums">{Math.round(n).toLocaleString()}</span>
}

/* ---------- Blur-in word reveal ---------- */
export function BlurText({ text, className, delay = 0, highlight = [] as string[] }: {
  text: string; className?: string; delay?: number; highlight?: string[]
}) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, delay: delay + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          className={clsx('inline-block whitespace-pre', highlight.includes(w.replace(/[.,!]/g, '')) && 'text-sun')}
        >
          {w}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  )
}

/* ---------- Scroll reveal wrapper ---------- */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ---------- Marquee ---------- */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]', className)}>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>{children}</div>
      </div>
    </div>
  )
}

/* ---------- Eyebrow (DREAM · PLAN · ACHIEVE style) ---------- */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-mute">
      <span>{children}</span>
      <span className="h-px w-10 bg-sun" />
    </div>
  )
}

/* ---------- Badge ---------- */
export function Badge({ children, color = '#9d9f9a', className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider', className)}
      style={{ color, background: `${color}1a`, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      {children}
    </span>
  )
}

/* ---------- Status dot with pulse ---------- */
export function PulseDot({ color, active }: { color: string; active?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  )
}

/* ---------- Markdown ---------- */
export function Markdown({ text, small }: { text: string; small?: boolean }) {
  const html = DOMPurify.sanitize(marked.parse(text || '', { async: false, gfm: true, breaks: false }) as string)
  return <div className={clsx('md', small && 'md-sm')} dangerouslySetInnerHTML={{ __html: html }} />
}

/* ---------- Logo ---------- */
/** Hivewright monogram: a hive hexagon framing an "H" whose crossbar is a honeycomb cell. */
export function Logo({ size = 28 }: { size?: number }) {
  const gid = `hw-gold-${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset=".55" stopColor="#FFC928" />
          <stop offset="1" stopColor="#E9A800" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#1C1D20" />
      <rect x=".5" y=".5" width="31" height="31" rx="8.5" fill="none" stroke="#F2F4F1" strokeOpacity=".08" />
      <path d="M16 4.6 25.9 10.3V21.7L16 27.4 6.1 21.7V10.3Z" fill="none" stroke={`url(#${gid})`} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M11.6 11.2V20.8M20.4 11.2V20.8M11.6 16H13.7M18.3 16H20.4" stroke="#F2F4F1" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 13.4 18.3 14.7V17.3L16 18.6 13.7 17.3V14.7Z" fill={`url(#${gid})`} />
    </svg>
  )
}

/** Logo + wordmark. */
export function Wordmark({ size = 28, name }: { size?: number; name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">{name}</span>
    </span>
  )
}
