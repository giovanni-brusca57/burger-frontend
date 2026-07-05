import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Target value to count up to */
  value: number;
  /** Formatter applied to each frame's value (default: en-US locale string) */
  format?: (n: number) => string;
  /** Count-up duration in ms */
  duration?: number;
}

/**
 * One-shot ease-out count-up for headline metrics.
 *
 * Scroll-safety note: this animates for ~1s on mount / value change and then
 * stops — it is NOT an infinite animation, so it cannot cause the
 * repaint-during-scroll ghosting that continuous shadow animations do.
 * Respects prefers-reduced-motion (jumps straight to the target).
 */
export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 }),
  duration = 900,
}: Props) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
      setDisplay(from + (value - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{format(display)}</>;
}
