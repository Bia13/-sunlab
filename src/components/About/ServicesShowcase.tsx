import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useProducts } from '@/context/ProductContext';
import { cn } from '@/lib/utils';

/*
 * "O que fazemos" (inspirado no "What we do" do Studiova), no marinho da SunLab:
 * - Esquerda: título, texto e uma foto que troca conforme o serviço escolhido.
 * - Direita: lista de serviços em letra grande, com linha fina entre eles; o ativo fica âmbar.
 * - Troca no clique, no hover (mouse) e no foco do teclado. Cada serviço é um botão com aria-pressed
 *   ligado à foto (aria-controls); a foto tem texto alternativo do serviço ativo.
 * - Fotos reais da SunLab; a do NFC vem do produto "Chaveiro NFC" do catálogo.
 * - Contraste: branco/72 sobre marinho ≈ 10:1; âmbar-300 ≈ 11:1. Grid de 4px.
 */

type Service = { id: string; title: string; text: string; image: string; alt: string };

export const ServicesShowcase: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { products } = useProducts();
  const nfcImage = products.find(p => p.slug === 'chaveiros-nfc-personalizados')?.images[0];

  const services: Service[] = [
    {
      id: 'decor',
      title: 'Decoração',
      text: 'Renas, porta-velas, presépios e pinheiros para a casa e para a mesa de fim de ano.',
      image: '/products/natal/01_vela_renas/02_lifestyle_45graus.jpg',
      alt: 'Renas, porta-vela e pinheiro impressos em 3D sobre uma mesa decorada'
    },
    {
      id: 'gifts',
      title: 'Presentes e lembranças',
      text: 'Enfeites, tags e lembrancinhas para presentear, decorar a árvore ou marcar uma data.',
      image: '/products/natal/04_flocos_neve/02_lifestyle_arvore.jpg',
      alt: 'Flocos de neve impressos em 3D pendurados na árvore de Natal'
    },
    {
      id: 'custom',
      title: 'Sob medida',
      text: 'Sua ideia, uma foto ou o arquivo 3D, transformados em peça do seu jeito e na sua cor.',
      image: '/products/natal/05_enfeites_bicolores/03_macro_relevo.jpg',
      alt: 'Enfeites vermelhos e brancos com relevo, impressos em 3D sob medida'
    },
    {
      id: 'nfc',
      title: 'Tecnologia NFC',
      text: 'Chaveiros e peças que abrem um link no celular com um toque, como um perfil ou um cartão de visita.',
      image: nfcImage || '/products/natal/03_pinheiro_natal/03_macro_detalhe.jpg',
      alt: nfcImage ? 'Chaveiros NFC personalizados da SunLab' : 'Detalhe de peça impressa em 3D'
    }
  ];

  const [activeId, setActiveId] = useState(services[0].id);
  const active = services.find(s => s.id === activeId) ?? services[0];

  return (
    <section aria-labelledby="servicos-title" className="relative isolate overflow-hidden bg-[#061A30] py-16 text-white sm:py-24">
      <div aria-hidden="true" className="absolute -right-40 top-1/3 -z-10 h-[480px] w-[480px] rounded-full bg-amber-400/8 blur-[120px]" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        {/* Título + foto */}
        <div className="lg:col-span-5">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
            <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
            O que fazemos
          </p>
          <h2 id="servicos-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight sm:text-5xl sm:leading-[52px]">
            <span className="block">Do catálogo</span>
            <span className="block text-amber-300">ao sob medida.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-6 text-white/72">
            Unimos impressão 3D, personalização e tecnologia NFC para criar peças que tenham identidade e façam sentido para quem recebe.
          </p>

          <div id="servicos-foto" className="relative mt-8 aspect-[4/3] overflow-hidden rounded-3xl bg-[#0F3A66] ring-1 ring-white/8">
            <AnimatePresence initial={false}>
              <motion.img
                key={active.id}
                src={active.image}
                alt={active.alt}
                loading="lazy"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
            <span className="absolute left-4 top-4 rounded-full bg-[#061A30]/64 px-3 py-1 font-mono text-xs leading-4 text-white backdrop-blur-md">
              {String(services.indexOf(active) + 1).padStart(2, '0')} · {active.title}
            </span>
          </div>
        </div>

        {/* Lista de serviços */}
        <ul className="self-end lg:col-span-7">
          {services.map((s, i) => {
            const on = s.id === activeId;
            return (
              <li key={s.id} className="border-t border-white/12 last:border-b">
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  onMouseEnter={() => setActiveId(s.id)}
                  onFocus={() => setActiveId(s.id)}
                  aria-pressed={on}
                  aria-controls="servicos-foto"
                  className="group grid w-full gap-2 py-6 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:grid-cols-[1fr_1fr] sm:items-center sm:gap-8 sm:py-8"
                >
                  <span className="flex items-baseline gap-4">
                    <span aria-hidden="true" className={cn('font-mono text-xs leading-4 transition-colors', on ? 'text-amber-300' : 'text-white/56')}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={cn(
                        'font-display text-[28px] font-light leading-9 tracking-tight transition-colors duration-300 sm:text-[32px] sm:leading-10',
                        on ? 'text-amber-300' : 'text-white/80 group-hover:text-white'
                      )}
                    >
                      {s.title}
                    </span>
                  </span>
                  <span className={cn('text-base leading-6 transition-colors duration-300', on ? 'text-white/88' : 'text-white/64')}>
                    {s.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default ServicesShowcase;
