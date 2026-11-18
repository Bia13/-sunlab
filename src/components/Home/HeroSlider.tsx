import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Box, Pause, Play, Sparkles, Truck } from 'lucide-react';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { DiaText } from '@/components/ui/text-dia';
import { cn } from '@/lib/utils';

/*
 * Hero em slider de coleções (inspirado no template "Luno", sem copiar):
 * - Foto de detalhe em tela cheia (mostra as camadas da impressão 3D), texto editorial à esquerda,
 *   índice das coleções à direita e linhas de progresso embaixo.
 * - O que NÃO trouxemos da referência: a roda do mouse presa no slider. Aqui a página rola normal;
 *   o slide troca sozinho, por clique, por toque (arrastar) ou pelas setas do teclado.
 * - WCAG 2.2.2: troca automática com botão de pausar; pausa no hover e com foco dentro.
 *   Com "reduzir movimento", começa parado e sem zoom.
 * - Contraste: texto sobre marinho ≥ 88% (desktop) / degradê de baixo (celular) ≥ 7:1.
 * - Grid de 4px.
 */

type Slide = {
  id: string;
  label: string;
  eyebrow: string;
  line1: string;
  line2: string;
  text: string;
  image: string;
  alt: string;
  /** Posição da foto no celular (onde o produto está). */
  mobilePosition: string;
  cta: { label: string; to: string };
};

const SLIDES: Slide[] = [
  {
    id: 'natal',
    label: 'Decoração de Natal',
    eyebrow: 'Coleção de Natal',
    line1: 'Ideias que',
    line2: 'ganham forma.',
    text: 'Renas, porta-velas e pinheiros impressos em 3D para a mesa de fim de ano.',
    image: '/products/natal/01_vela_renas/03_macro_detalhe.jpg',
    alt: 'Detalhe das renas e do porta-vela impressos em 3D, com as camadas da impressão aparentes',
    mobilePosition: 'object-[40%_center]',
    cta: { label: 'Ver decoração', to: '/catalog?cat=decor' }
  },
  {
    id: 'enfeites',
    label: 'Enfeites & Lembranças',
    eyebrow: 'Enfeites & Lembranças',
    line1: 'Cada camada',
    line2: 'à vista.',
    text: 'Flocos, tags e enfeites com o relevo da impressão 3D. Leves para pendurar na árvore.',
    image: '/products/natal/04_flocos_neve/03_macro_textura.jpg',
    alt: 'Floco de neve branco impresso em 3D sobre fundo escuro',
    mobilePosition: 'object-center',
    cta: { label: 'Ver enfeites', to: '/catalog?cat=gifts' }
  },
  {
    id: 'personalizados',
    label: 'Personalizados',
    eyebrow: 'Sob medida',
    line1: 'Do seu jeito,',
    line2: 'na sua cor.',
    text: 'Mande a sua ideia pelo WhatsApp. A gente ajusta formato e cores e imprime a peça para você.',
    image: '/products/natal/05_enfeites_bicolores/03_macro_relevo.jpg',
    alt: 'Enfeites vermelhos e brancos em relevo, em formato de pinheiro e presente',
    mobilePosition: 'object-[60%_center]',
    cta: { label: 'Pedir orçamento', to: '/custom' }
  }
];

const CHIPS = [
  { icon: Sparkles, label: 'Design autoral' },
  { icon: Box, label: 'Material de qualidade' },
  { icon: Truck, label: 'Envio em 48h' }
];

const DURATION = 7000;

export const HeroSlider: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const touchX = useRef<number | null>(null);

  // Com "reduzir movimento", começa pausado.
  useEffect(() => {
    if (reduceMotion) setUserPaused(true);
  }, [reduceMotion]);

  const paused = userPaused || hoverPaused;
  const slide = SLIDES[index];

  const goTo = useCallback((i: number) => {
    setIndex((i + SLIDES.length) % SLIDES.length);
    setProgressKey(k => k + 1);
  }, []);

  // A troca automática acontece quando a linha de progresso termina de encher
  // (onAnimationEnd). Pausar congela a linha e, com ela, a troca.

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  };

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Coleções da SunLab"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoverPaused(false); }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 48) goTo(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      className="!mb-0 relative isolate flex h-[calc(100svh-64px)] min-h-[600px] max-h-[880px] w-full overflow-hidden bg-[#061A30] text-white"
    >
      {/* H1 estável para o Google e leitores de tela; os títulos dos slides são h2. */}
      <h1 className="sr-only">SunLab: impressão 3D em Santos, peças autorais e personalizadas</h1>

      {/* Fotos empilhadas: troca por fade; a ativa faz um zoom lento (desligado com "reduzir movimento"). */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          aria-hidden="true"
          className={cn(
            // Desktop: foto nos 60% da direita, perto do tamanho real (1024px), sem esticar e borrar.
            'absolute inset-0 -z-20 overflow-hidden transition-opacity duration-1000 ease-out motion-reduce:transition-none lg:left-auto lg:w-[60%]',
            i === index ? 'opacity-100' : 'opacity-0'
          )}
        >
          <img
            src={s.image}
            alt=""
            width={1024}
            height={1024}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            className={cn(
              'h-full w-full object-cover lg:object-center transition-transform ease-out motion-reduce:transition-none',
              s.mobilePosition,
              i === index && !reduceMotion ? 'scale-100 duration-[8000ms]' : 'scale-[1.06] duration-0'
            )}
          />
        </div>
      ))}

      {/* Overlays: celular escurece de baixo; desktop escurece da esquerda (coluna de texto) e um pouco da direita (índice). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#061A30] from-24% via-[#061A30]/72 via-56% to-[#061A30]/24 lg:hidden" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-[#061A30] from-20% via-[#061A30]/88 via-40% to-transparent to-64% lg:block" />
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-1/3 bg-gradient-to-l from-[#061A30]/72 to-transparent lg:block" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#061A30]/80 to-transparent" />

      {/* Texto do slide */}
      <div className="relative mx-auto flex w-full max-w-7xl items-end px-4 pb-28 sm:px-6 lg:items-center lg:px-8 lg:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${SLIDES.length}: ${slide.label}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[560px]"
          >
            <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
              <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
              {slide.eyebrow}
            </p>
            <h2 className="mt-6 font-display text-[48px] font-light leading-[52px] tracking-tight sm:text-[64px] sm:leading-[68px] lg:text-[80px] lg:leading-[84px]">
              <span className="block">{slide.line1}</span>
              {slide.id === 'natal' ? (
                <>
                  <span className="sr-only">{slide.line2}</span>
                  <DiaText
                    aria-hidden="true"
                    words={['saem do papel.', 'viram peças.', 'ganham forma.']}
                    duration={1600}
                    sweepColors={['#38BDF8', '#7DD3FC', '#FCD34D']}
                    className="text-amber-300"
                  />
                </>
              ) : (
                <span className="block text-amber-300">{slide.line2}</span>
              )}
            </h2>
            <p className="mt-6 max-w-md text-base leading-6 text-white/80 lg:text-lg lg:leading-7">{slide.text}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <ButtonWithIcon to={slide.cta.to} className="w-full sm:w-auto">
                {slide.cta.label}
              </ButtonWithIcon>
              <ButtonWithIcon to="/catalog" variant="secondary" className="w-full sm:w-auto">
                Ver catálogo
              </ButtonWithIcon>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Índice das coleções (desktop), como na referência */}
      <nav aria-label="Escolher coleção" className="absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
        <ol className="flex flex-col items-end gap-2">
          {SLIDES.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === index ? 'true' : undefined}
                className={cn(
                  // Sombra no texto: mantém a leitura mesmo quando a parte clara da foto passa por trás.
                  'group flex h-8 items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.16em] [text-shadow:0_1px_8px_rgba(6,26,48,0.9)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300',
                  i === index ? 'text-white' : 'text-white/72 hover:text-white'
                )}
              >
                {s.label}
                <span
                  aria-hidden="true"
                  className={cn('h-px transition-all duration-300 motion-reduce:transition-none', i === index ? 'w-8 bg-amber-300' : 'w-4 bg-white/48 group-hover:w-6')}
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Chips de diferenciais: vidro só aqui, sobre a foto. Aparecem uma vez. */}
      <ul
        aria-label="Diferenciais"
        className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap gap-2 sm:inset-x-6 sm:top-6 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:top-auto"
      >
        {CHIPS.map(({ icon: Icon, label }, i) => (
          <motion.li
            key={label}
            initial={reduceMotion ? false : { opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.6 + i * 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 rounded-full bg-[#061A30]/56 py-1 pl-1 pr-3 text-xs font-semibold leading-4 text-white ring-1 ring-inset ring-white/24 shadow-[0_8px_32px_rgba(6,26,48,0.32)] backdrop-blur-xl sm:pr-4 sm:text-sm sm:leading-5"
          >
            <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[#061A30] sm:h-7 sm:w-7">
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
            {label}
          </motion.li>
        ))}
      </ul>

      {/* Controles: linhas de progresso (clicáveis), contador e pausar. */}
      <div className="absolute bottom-6 left-0 right-0 mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:bottom-8 lg:px-8">
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir para ${s.label}`}
              aria-current={i === index ? 'true' : undefined}
              className="group flex h-6 w-12 items-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <span className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/32 group-hover:bg-white/48">
                {i < index && <span className="absolute inset-0 bg-white" />}
                {/* Linha ativa: enche em 7s; congela quando pausa. Com "reduzir movimento", fica cheia e parada. */}
                {i === index && (
                  <span
                    key={progressKey}
                    onAnimationEnd={() => goTo(index + 1)}
                    className="absolute inset-y-0 left-0 bg-amber-300"
                    style={
                      reduceMotion
                        ? { width: '100%' }
                        : {
                            width: 0,
                            animation: `hero-progress ${DURATION}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running'
                          }
                    }
                  />
                )}
              </span>
            </button>
          ))}
        </div>
        <p aria-hidden="true" className="font-mono text-xs leading-4 text-white/72">
          {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </p>
        <button
          type="button"
          onClick={() => setUserPaused(p => !p)}
          aria-label={userPaused ? 'Continuar troca automática' : 'Pausar troca automática'}
          className="grid h-8 w-8 place-items-center rounded-full text-white/80 ring-1 ring-inset ring-white/24 transition-colors hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer"
        >
          {userPaused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>

      {/* Leitor de tela: anuncia a troca só quando a pessoa está no controle (pausado). */}
      <p aria-live={paused ? 'polite' : 'off'} className="sr-only">
        {`Slide ${index + 1} de ${SLIDES.length}: ${slide.label}`}
      </p>
    </section>
  );
};

export default HeroSlider;
