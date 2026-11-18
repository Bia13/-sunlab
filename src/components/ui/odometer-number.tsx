import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/*
 * Número que "rola" como um odômetro ao aparecer na tela (inspirado nos contadores da referência).
 * - Cada dígito é uma coluna 0–9 que desliza até o valor; os dígitos chegam um depois do outro.
 * - Leitor de tela lê só o número final (aria-label); as colunas são decorativas.
 * - "Reduzir movimento": mostra o número parado.
 */
export const OdometerNumber: React.FC<{ value: number; suffix?: string; className?: string }> = ({ value, suffix, className }) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const digits = String(value).split('');
  const label = `${value}${suffix ?? ''}`;

  if (reduceMotion) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span ref={ref} aria-label={label} role="img" className={cn('inline-flex items-baseline', className)}>
      {digits.map((d, i) => (
        <span key={i} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden leading-none">
          <span
            className="flex flex-col transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transform: `translateY(-${shown ? Number(d) * 10 : 0}%)`,
              transitionDelay: `${i * 120}ms`
            }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n} className="h-[1em] leading-none">{n}</span>
            ))}
          </span>
        </span>
      ))}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
};

export default OdometerNumber;
