import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export interface AnimatedNumberProps extends Omit<ComponentProps<"span">, "children"> {
  value: number;
  decimals?: number;
  suffix?: string;
  /** Tween length in ms. */
  duration?: number;
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Counts from the previous value to the new one. Renders the final value on the
 * server and on first paint (content first, motion second) and only tweens on
 * change. Skips the tween under `prefers-reduced-motion`.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  duration = 600,
  className,
  ...props
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || from.current === value) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const current = origin + (value - origin) * easeOutExpo(t);
      from.current = current;
      setDisplay(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span data-slot="animated-number" className={cn("numeric", className)} {...props}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
