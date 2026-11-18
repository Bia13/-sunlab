import React, { useId, useState } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Comparador "antes e depois" (inspirado no Image Compare do 21st.dev).
 * - A imagem "antes" fica por cima e é cortada até a posição da alça; a "depois" fica embaixo.
 * - Acessível: o controle é um <input type="range"> de verdade, invisível por cima de tudo.
 *   Funciona com mouse (clicar/arrastar em qualquer ponto), toque e teclado (setas, Home, End).
 * - Etiquetas nos cantos dizem o que é cada lado; a alça tem 48px (alvo de toque confortável).
 */
type Side = { src: string; alt: string; label: string; className?: string };

interface ImageCompareProps {
  before: Side;
  after: Side;
  /** Posição inicial da alça, em % (0 a 100). */
  initial?: number;
  className?: string;
}

export const ImageCompare: React.FC<ImageCompareProps> = ({ before, after, initial = 50, className }) => {
  const [pos, setPos] = useState(initial);
  const id = useId();

  return (
    <div className={cn('relative isolate select-none overflow-hidden rounded-2xl bg-zinc-200', className)}>
      {/* Depois (embaixo) */}
      <img src={after.src} alt={after.alt} loading="lazy" decoding="async" className={cn('absolute inset-0 h-full w-full object-cover', after.className)} draggable={false} />

      {/* Antes (por cima, cortada) */}
      <img
        src={before.src}
        alt={before.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn('absolute inset-0 h-full w-full object-cover', before.className)}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      {/* Etiquetas */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-4 top-4 rounded-full bg-[#061A30]/72 px-3 py-1 text-xs font-semibold uppercase leading-4 tracking-[0.12em] text-white backdrop-blur-md transition-opacity duration-200',
          pos < 16 && 'opacity-0'
        )}
      >
        {before.label}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold uppercase leading-4 tracking-[0.12em] text-[#061A30] transition-opacity duration-200',
          pos > 84 && 'opacity-0'
        )}
      >
        {after.label}
      </span>

      {/* Linha e alça */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(6,26,48,0.4)]" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0A2540] shadow-[0_8px_24px_-8px_rgba(6,26,48,0.48)] ring-1 ring-zinc-200">
          <ChevronsLeftRight className="h-5 w-5" />
        </span>
      </div>

      {/* Controle real (invisível): mouse, toque e teclado. */}
      <label htmlFor={id} className="sr-only">
        Comparar {before.label.toLowerCase()} e {after.label.toLowerCase()}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        aria-valuetext={`${pos}% ${before.label.toLowerCase()}, ${100 - pos}% ${after.label.toLowerCase()}`}
        className="peer absolute inset-0 z-10 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0 focus-visible:opacity-0"
      />
      {/* Foco do teclado visível no quadro inteiro. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-amber-300 ring-inset peer-focus-visible:ring-4" />
    </div>
  );
};

export default ImageCompare;
