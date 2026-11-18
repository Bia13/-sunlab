import React, { useState } from 'react';
import { Sparkles, MessageCircle, Waves, ShieldCheck, MapPin, Pause, Play, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type TickerItem = { icon: LucideIcon; text: string; strong: string };

// "Material de qualidade" saiu daqui porque já aparece nos chips da hero.
const ITEMS: TickerItem[] = [
  { icon: Sparkles, text: 'Acabamento', strong: 'impecável e suave' },
  { icon: MessageCircle, text: 'Atendimento direto no', strong: 'WhatsApp' },
  { icon: ShieldCheck, text: 'Pagamento seguro via', strong: 'PIX' },
  { icon: Waves, text: 'Essência caiçara', strong: '& criatividade' },
  { icon: MapPin, text: 'Feito em', strong: 'Santos, SP' }
];

/**
 * Faixa de diferenciais logo abaixo da hero.
 * - Continua o marinho da hero, com borda sutil, em vez de uma barra solta.
 * - Texto 14/20 (antes 11px), branco 80% sobre #0A2540 ≈ 11:1; ícones âmbar.
 * - Espaçamentos no grid de 4px: faixa de 52px (py-4 + 20), 32px entre itens, ponto de 4px.
 * - WCAG 2.2.2: o movimento dura mais de 5s, então há botão de pausar (e pausa no hover/foco).
 *   Com "reduzir movimento", a faixa fica parada e os itens quebram linha.
 */
export const TrustTicker: React.FC = () => {
  const [paused, setPaused] = useState(false);

  const renderList = (hidden?: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className={cn(
        'flex shrink-0 items-center',
        hidden && 'motion-reduce:hidden',
        'motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-2'
      )}
    >
      {ITEMS.map(({ icon: Icon, text, strong }) => (
        <li
          key={strong}
          className="flex items-center gap-2 whitespace-nowrap pr-8 after:ml-8 after:h-1 after:w-1 after:rounded-full after:bg-amber-400/64 after:content-['']"
        >
          <Icon aria-hidden="true" className="h-4 w-4 text-amber-400" />
          <span>
            {text} <strong className="font-semibold text-white">{strong}</strong>
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label="Diferenciais da SunLab"
      className="group/ticker relative w-full bg-[#0A2540] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(255,255,255,0.08)] text-sm font-medium leading-5 text-white/80 select-none"
    >
      {/* Máscara nas bordas: os itens entram e saem em fade, sem corte seco. */}
      <div className="overflow-hidden py-4 pr-12 [mask-image:linear-gradient(90deg,transparent,#000_64px,#000_calc(100%-112px),transparent_calc(100%-48px))] motion-reduce:px-4 motion-reduce:[mask-image:none]">
        <div
          className={cn(
            'flex w-max animate-[marquee_48s_linear_infinite]',
            'group-hover/ticker:[animation-play-state:paused] group-focus-within/ticker:[animation-play-state:paused]',
            paused && '[animation-play-state:paused]',
            'motion-reduce:w-full motion-reduce:animate-none motion-reduce:justify-center'
          )}
        >
          {renderList()}
          {renderList(true)}
        </div>
      </div>

      {/* Pausar/continuar: alvo de 32px (acima dos 24px do WCAG 2.5.8). */}
      <button
        type="button"
        onClick={() => setPaused(p => !p)}
        aria-label={paused ? 'Continuar animação da faixa' : 'Pausar animação da faixa'}
        className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/16 bg-white/8 text-white/80 transition-colors hover:bg-white/16 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer motion-reduce:hidden"
      >
        {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
      </button>
    </section>
  );
};

export default TrustTicker;
