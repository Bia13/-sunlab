import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'framer-motion';
import { cn } from '@/lib/utils';

/*
 * "Como é feito": processo da impressão 3D guiado pelo scroll (inspirado em "Implante, passo a passo").
 * - A seção é alta; o quadro fica preso na tela (sticky) e, conforme a pessoa rola, a imagem troca
 *   e o passo ativo acende. A página continua rolando normal: nada prende o scroll.
 * - Sem vídeo por enquanto: cada passo tem uma imagem. O passo 1 é um desenho em código (camadas
 *   se empilhando), porque não temos foto real do arquivo/fatiamento e não vamos inventar uma.
 *   Quando chegarem fotos do processo (impressora, fatiador), é só trocar `image` em cada passo.
 * - Acessível: os passos são botões que levam ao trecho certo; todo o texto está no HTML.
 *   Com "reduzir movimento", vira uma lista parada com imagem e texto de cada passo.
 * - Contraste sobre marinho: branco ≥ 15:1; passos inativos branco/64 ≈ 8:1. Grid de 4px.
 */

type Step = {
  id: string;
  label: string;
  title: string;
  text: string;
  /** Sem imagem: mostra o desenho das camadas. */
  image?: string;
  alt?: string;
};

// ⚠️ Textos para a SunLab confirmar (descrevem o processo de forma geral, sem números inventados).
const STEPS: Step[] = [
  {
    id: 'arquivo',
    label: 'Arquivo',
    title: 'Tudo começa num arquivo.',
    text: 'A peça é desenhada em 3D e dividida em centenas de camadas finas, como fatias empilhadas.'
  },
  {
    id: 'impressao',
    label: 'Impressão',
    title: 'Uma camada de cada vez.',
    text: 'O bico derrete o filamento e desenha cada camada sobre a anterior. De perto, dá para ver as linhas.',
    image: '/products/natal/01_vela_renas/03_macro_detalhe.jpg',
    alt: 'Detalhe das renas impressas em 3D, com as linhas de cada camada aparentes'
  },
  {
    id: 'acabamento',
    label: 'Acabamento',
    title: 'Detalhe que dá para sentir.',
    text: 'Relevo, encaixes e cores combinadas. Cada peça é conferida antes de seguir para você.',
    image: '/products/natal/05_enfeites_bicolores/03_macro_relevo.jpg',
    alt: 'Enfeites vermelhos e brancos impressos em 3D, com relevo em destaque'
  },
  {
    id: 'entrega',
    label: 'Na sua casa',
    title: 'Pronta para a sua mesa.',
    text: 'Do nosso ateliê em Santos para a sua casa, ou para presentear quem você gosta.',
    image: '/products/natal/02_presepio_familia/02_lifestyle_sala.jpg',
    alt: 'Presépio impresso em 3D sobre um móvel da sala, decorado para o Natal'
  }
];

/* Desenho do passo 1: camadas surgindo de baixo para cima e formando um vaso. */
const LayersDrawing: React.FC<{ play: boolean }> = ({ play }) => {
  const widths = [52, 60, 66, 70, 72, 72, 70, 66, 60, 54, 48, 44, 42, 44, 50, 58];
  return (
    <div aria-hidden="true" className="relative grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_60%,#0F3A66_0%,#061A30_70%)]">
      {/* Grade técnica de fundo */}
      <div className="absolute inset-0 opacity-24 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative flex w-1/2 flex-col-reverse items-center gap-1">
        {widths.map((w, i) => (
          <motion.span
            key={i}
            className={cn('block h-2 rounded-full', i % 4 === 3 ? 'bg-amber-300' : 'bg-white/88')}
            style={{ width: `${w}%` }}
            initial={false}
            animate={play ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0.4 }}
            transition={{ duration: 0.4, delay: play ? i * 0.06 : 0, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <p className="absolute bottom-4 left-4 font-mono text-xs leading-4 text-white/72">camadas de filamento, de baixo para cima</p>
    </div>
  );
};

const StepVisual: React.FC<{ step: Step; active: boolean; reduceMotion: boolean | null }> = ({ step, active, reduceMotion }) =>
  step.image ? (
    <img
      src={step.image}
      alt={step.alt}
      loading="lazy"
      decoding="async"
      className={cn(
        'h-full w-full object-cover transition-transform duration-[1200ms] ease-out motion-reduce:transition-none',
        active && !reduceMotion ? 'scale-100' : 'scale-[1.06]'
      )}
    />
  ) : (
    <LayersDrawing play={active || !!reduceMotion} />
  );

export const PrintProcess: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  // Passo ativo calculado no próprio evento de scroll (robusto mesmo com a aba em segundo plano).
  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const travel = el.offsetHeight - window.innerHeight;
      const v = travel > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / travel)) : 0;
      const i = Math.min(STEPS.length - 1, Math.floor(v * STEPS.length));
      setActive(prev => (prev === i ? prev : i));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Leva a página até o trecho do passo escolhido.
  const goToStep = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (travel * (i + 0.5)) / STEPS.length, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  // O cabeçalho aparece em dois lugares (desktop e celular); só um leva o id usado pelo aria-labelledby.
  const renderHeader = (withId = true) => (
    <>
      <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
        <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
        Como é feito
      </p>
      <h2 id={withId ? 'processo-title' : undefined} className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-white sm:text-5xl sm:leading-[52px] lg:text-[56px] lg:leading-[60px]">
        <span className="block">Da ideia,</span>
        <span className="block text-amber-300">camada por camada.</span>
      </h2>
    </>
  );

  // "Reduzir movimento": lista parada, sem quadro preso.
  if (reduceMotion) {
    return (
      <section aria-labelledby="processo-title" className="bg-[#061A30] py-16 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {renderHeader()}
          <ol className="mt-12 grid gap-8 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.id} className="overflow-hidden rounded-2xl bg-white/4 ring-1 ring-white/8">
                <div className="aspect-[4/3]"><StepVisual step={s} active reduceMotion={reduceMotion} /></div>
                <div className="p-6">
                  <p className="font-mono text-xs leading-4 text-amber-300">{String(i + 1).padStart(2, '0')} · {s.label}</p>
                  <h3 className="mt-2 text-xl font-medium leading-7">{s.title}</h3>
                  <p className="mt-2 text-base leading-6 text-white/80">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  const current = STEPS[active];

  return (
    <section
      ref={sectionRef}
      aria-labelledby="processo-title"
      className="relative bg-[#061A30] text-white"
      // Cada passo ganha ~70% da altura da tela de rolagem, mais uma tela para o quadro preso.
      style={{ height: `calc(${STEPS.length} * 70svh + 100svh)` }}
    >
      <div className="sticky top-16 flex h-[calc(100svh-64px)] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-8">
          {/* Texto */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <div className="hidden lg:block">{renderHeader()}</div>

            {/* Passos (desktop): lista com o ativo aceso e linha de progresso ao lado */}
            <ol className="relative mt-12 hidden flex-col gap-2 lg:flex">
              <span aria-hidden="true" className="absolute bottom-4 left-4 top-4 w-px bg-white/16" />
              <motion.span
                aria-hidden="true"
                className="absolute left-4 top-4 w-px origin-top bg-amber-300"
                style={{ height: 'calc(100% - 32px)', scaleY: scrollYProgress }}
              />
              {STEPS.map((s, i) => {
                const on = i === active;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goToStep(i)}
                      aria-current={on ? 'step' : undefined}
                      className="group flex w-full gap-4 rounded-xl py-2 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                    >
                      <span
                        className={cn(
                          'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold leading-4 transition-colors duration-300',
                          on ? 'bg-amber-300 text-[#061A30]' : 'bg-[#0F3A66] text-white/80 ring-1 ring-white/16'
                        )}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="pt-1">
                        <span className={cn('block text-lg font-medium leading-6 transition-colors duration-300', on ? 'text-white' : 'text-white/64 group-hover:text-white/88')}>
                          {s.title}
                        </span>
                        <span
                          className={cn(
                            'grid transition-[grid-template-rows,opacity] duration-500 ease-out',
                            on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          )}
                        >
                          <span className="overflow-hidden">
                            <span className="block pt-2 text-base leading-6 text-white/80">{s.text}</span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Passo atual (celular) */}
            <div className="lg:hidden" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="font-mono text-xs leading-4 text-amber-300">
                    {String(active + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} · {current.label}
                  </p>
                  <h3 className="mt-2 text-2xl font-medium leading-8">{current.title}</h3>
                  <p className="mt-2 text-base leading-6 text-white/80">{current.text}</p>
                </motion.div>
              </AnimatePresence>
              <div aria-hidden="true" className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-white/16">
                <motion.span className="block h-full origin-left bg-amber-300" style={{ scaleX: scrollYProgress }} />
              </div>
            </div>
          </div>

          {/* Quadro com as imagens (troca por fade) */}
          <div className="order-1 lg:order-2 lg:col-span-7">
            <div className="lg:hidden">{renderHeader(false)}</div>
            <div className="relative mt-6 aspect-[4/3] max-h-[44svh] w-full overflow-hidden rounded-2xl bg-[#0F3A66] ring-1 ring-white/8 lg:mt-0 lg:max-h-none">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn('absolute inset-0 transition-opacity duration-700 ease-out', i === active ? 'opacity-100' : 'opacity-0')}
                  aria-hidden={i !== active}
                >
                  <StepVisual step={s} active={i === active} reduceMotion={reduceMotion} />
                </div>
              ))}
              <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-[#061A30]/72 px-3 py-1 font-mono text-xs leading-4 text-white backdrop-blur-md">
                {String(active + 1).padStart(2, '0')} · {current.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrintProcess;
