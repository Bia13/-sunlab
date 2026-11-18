import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/*
 * Texto que "acende" com o scroll (inspirado no "Text Gradient Scroll" da bundui):
 * cada palavra começa apagada e ganha cor conforme a frase passa pela tela, uma depois da outra.
 * - Trechos com `strong` acendem na cor de destaque (marinho, negrito).
 * - Acessível: o texto é real e contínuo (leitor de tela lê a frase normal);
 *   com "reduzir movimento", aparece já aceso, sem efeito.
 * - Apagado = 24% de opacidade; aceso = 100% (contraste final ≥ 7:1 sobre a areia).
 */
export type TextSegment = { text: string; strong?: boolean };

const Word: React.FC<{ word: string; strong?: boolean; progress: MotionValue<number>; range: [number, number] }> = ({ word, strong, progress, range }) => {
  const opacity = useTransform(progress, range, [0.24, 1]);
  return (
    <motion.span style={{ opacity }} className={cn(strong && 'font-semibold text-[#0A2540]')}>
      {word}
    </motion.span>
  );
};

export const TextGradientScroll: React.FC<{ segments: TextSegment[]; className?: string }> = ({ segments, className }) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  // Começa quando o topo do texto entra (85% da tela) e termina quando o fim chega a 45%.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });

  const words = segments.flatMap(seg =>
    seg.text.split(/(\s+)/).filter(Boolean).map(w => ({ w, strong: seg.strong }))
  );
  const total = words.filter(x => x.w.trim()).length;
  let index = 0;

  if (reduceMotion) {
    return (
      <p className={className}>
        {segments.map((s, i) => (s.strong ? <strong key={i} className="font-semibold text-[#0A2540]">{s.text}</strong> : <span key={i}>{s.text}</span>))}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      {words.map(({ w, strong }, i) => {
        if (!w.trim()) return <React.Fragment key={i}>{w}</React.Fragment>;
        const start = index / total;
        const end = (index + 1) / total;
        index++;
        return <Word key={i} word={w} strong={strong} progress={scrollYProgress} range={[start, end]} />;
      })}
    </p>
  );
};

export default TextGradientScroll;
