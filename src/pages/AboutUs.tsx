import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MapPin, MessageCircle, Layers, Send } from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { CATEGORIES } from '@/data/products';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { OdometerNumber } from '@/components/ui/odometer-number';
import { ServicesShowcase } from '@/components/About/ServicesShowcase';
import { TextGradientScroll } from '@/components/ui/text-gradient-scroll';
import { FaqSection } from '@/components/Home/FaqSection';
import { cn } from '@/lib/utils';

/*
 * Página "Sobre", no design da SunLab, misturando ideias das referências (Himal Journeys e Asme):
 * cabeçalho com foto, frase-manifesto grande, bento com chave "pronta entrega / sob medida",
 * "O que fazemos" (lista de serviços com foto, inspirada no Studiova), contadores que rolam como odômetro e chamada final.
 * Todo o conteúdo veio do texto que já existia na página e na arte "Prazer, somos a SunLab!".
 * Os números são reais: produtos no catálogo (ao vivo), coleções e tecnologias. Nada inventado.
 * Faixas de cor: marinho → areia → branco → marinho → branco → areia. Grid de 4px; contraste ≥ 4,5:1.
 */

const OFFERS = {
  ready: {
    label: 'Pronta entrega',
    text: (
      <>
        Peças do catálogo, impressas em 3D e prontas para decorar a casa ou presentear. É escolher,{' '}
        <strong className="font-semibold text-white">pedir e receber.</strong>
      </>
    ),
    cta: { label: 'Ver a loja', to: '/catalog' }
  },
  custom: {
    label: 'Sob medida',
    text: (
      <>
        Sua ideia, sua marca ou aquele projeto que só existia na sua cabeça, transformados em peça.{' '}
        <strong className="font-semibold text-white">Do seu jeito, na sua cor.</strong>
      </>
    ),
    cta: { label: 'Pedir orçamento', to: '/custom' }
  }
} as const;

const INFO = [
  { Icon: MapPin, label: 'Onde estamos', value: 'Santos, litoral paulista' },
  { Icon: MessageCircle, label: 'Atendimento', value: 'Pelo WhatsApp' },
  { Icon: Layers, label: 'O que fazemos', value: 'Impressão 3D e NFC' },
  { Icon: Send, label: 'Começa com', value: 'Uma mensagem com a sua ideia' }
];

const eyebrow = (text: string, dark = false) => (
  <p className={cn('flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em]', dark ? 'text-amber-300' : 'text-zinc-600')}>
    <span aria-hidden="true" className={cn('h-px w-6', dark ? 'bg-amber-300' : 'bg-amber-500')} />
    {text}
  </p>
);

export const AboutUs: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { products } = useProducts();
  const [mode, setMode] = useState<'ready' | 'custom'>('custom');
  const offer = OFFERS[mode];
  const collections = CATEGORIES.filter(c => c.id !== 'all').length;

  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  };

  return (
    <div className="flex w-full flex-col overflow-x-clip">
      {/* 1. Cabeçalho marinho com foto */}
      <section aria-labelledby="sobre-title" className="relative isolate overflow-hidden bg-[#061A30] text-white">
        <div aria-hidden="true" className="absolute -left-40 -top-40 -z-10 h-[480px] w-[480px] rounded-full bg-[#0284C7]/24 blur-[120px]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-24">
          <div className="lg:col-span-6">
            {eyebrow('Sobre a SunLab', true)}
            <h1 id="sobre-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight sm:text-5xl sm:leading-[52px] lg:text-[64px] lg:leading-[68px]">
              <span className="block">Prazer,</span>
              <span className="block text-amber-300">somos a SunLab.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-6 text-white/80 lg:text-lg lg:leading-7">
              Nascemos em Santos, no litoral paulista, trazendo um pouco da nossa essência caiçara para um universo cheio de criatividade e tecnologia.
            </p>
          </div>
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/12">
              {/* Recorte da arte: o sol e a onda impressos em 3D na praia de Santos */}
              <img
                src="/sunlab-sobre.jpg"
                alt="Sol e onda da logo SunLab impressos em 3D, sobre uma mureta com a praia de Santos ao fundo"
                // Recorte exato da arte (1024×1024): mostra só a área x 540–1024 / y 520–880,
                // onde estão o sol e a onda impressos, sem pegar os textos da arte.
                className="absolute max-w-none"
                style={{ width: '211.5%', left: '-111.5%', top: '-143%' }}
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#061A30]/56 px-4 py-2 text-sm font-semibold leading-5 text-white ring-1 ring-inset ring-white/24 backdrop-blur-xl">
                <MapPin aria-hidden="true" className="h-4 w-4 text-amber-300" />
                Santos · Litoral paulista
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Manifesto (areia) */}
      {/* As palavras acendem uma a uma conforme a frase passa pela tela. */}
      <section aria-label="Manifesto" className="bg-[#F6F1E7] py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {eyebrow('Manifesto')}
          <TextGradientScroll
            className="mt-6 font-display text-[28px] font-light leading-9 tracking-tight text-zinc-800 sm:text-[40px] sm:leading-[48px] lg:text-[48px] lg:leading-[56px]"
            segments={[
              { text: 'A SunLab surgiu da vontade de transformar ideias em algo real. Mais do que imprimir objetos, queremos ' },
              { text: 'criar, personalizar, experimentar e dar vida a novas ideias.', strong: true }
            ]}
          />
        </div>
      </section>

      {/* 3. Bento (branco) */}
      <section aria-labelledby="bento-title" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div {...reveal}>
            {eyebrow('Como trabalhamos')}
            <h2 id="bento-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px]">
              <span className="block">Peças com identidade,</span>
              <span className="block text-amber-700">feitas para fazer sentido.</span>
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
            {/* A: cartão marinho com a chave */}
            <motion.article {...reveal} className="relative flex min-h-80 flex-col overflow-hidden rounded-3xl bg-[#061A30] p-6 text-white sm:p-8 lg:col-span-2">
              <div aria-hidden="true" className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/16 blur-[80px]" />
              <div className="relative flex items-center justify-between gap-4">
                <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-white/8 ring-1 ring-inset ring-white/16">
                  <Layers className="h-5 w-5 text-amber-300" />
                </span>
                {/* Chave pronta entrega ⇄ sob medida: as duas opções ficam visíveis, a ativa acesa.
                    A trilha é block (span é inline e ignoraria largura/altura) e a bolinha anda
                    exatamente 20px (48 de trilha − 20 de bolinha − 2×4 de folga). */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={mode === 'custom'}
                  aria-label="Sob medida"
                  onClick={() => setMode(m => (m === 'custom' ? 'ready' : 'custom'))}
                  className="inline-flex items-center gap-3 rounded-full py-1 text-sm leading-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
                >
                  <span aria-hidden="true" className={cn('transition-colors', mode === 'ready' ? 'font-semibold text-white' : 'text-white/56')}>
                    Pronta entrega
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative block h-7 w-12 shrink-0 rounded-full transition-colors duration-300 motion-reduce:transition-none',
                      mode === 'custom' ? 'bg-amber-400' : 'bg-white/24'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-transform duration-300 motion-reduce:transition-none',
                        mode === 'custom' ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </span>
                  <span aria-hidden="true" className={cn('transition-colors', mode === 'custom' ? 'font-semibold text-white' : 'text-white/56')}>
                    Sob medida
                  </span>
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={mode}
                  aria-live="polite"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="relative mt-8 max-w-xl text-lg leading-7 text-white/80 sm:text-xl sm:leading-8"
                >
                  {offer.text}
                </motion.p>
              </AnimatePresence>

              <div className="relative mt-auto pt-8">
                <ButtonWithIcon to={offer.cta.to} variant="secondary" className="w-full">
                  {offer.cta.label}
                </ButtonWithIcon>
              </div>
            </motion.article>

            {/* B: foto alta */}
            <motion.figure {...reveal} className="relative min-h-80 overflow-hidden rounded-3xl lg:row-span-2">
              <img
                src="/products/natal/03_pinheiro_natal/02_lifestyle_mesa.jpg"
                alt="Pinheiro de Natal impresso em 3D sobre uma mesa decorada"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#061A30]/80 to-transparent" />
              <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl bg-[#061A30]/56 p-4 text-white ring-1 ring-inset ring-white/24 backdrop-blur-xl">
                <span className="block text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-amber-300">Feito em Santos</span>
                <span className="mt-1 block text-sm leading-5 text-white/88">Cada peça sai da nossa impressora para a sua casa.</span>
              </figcaption>
            </motion.figure>

            {/* C: informações */}
            <motion.article {...reveal} className="rounded-3xl bg-[#F6F1E7] p-6 sm:p-8 lg:col-span-2">
              <dl className="grid gap-6 sm:grid-cols-2">
                {INFO.map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-4">
                    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0A2540] ring-1 ring-inset ring-zinc-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <dt className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-600">{label}</dt>
                      <dd className="mt-1 text-base font-medium leading-6 text-zinc-900">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </motion.article>
          </div>
        </div>
      </section>

      {/* 4. O que fazemos (marinho): serviços com foto que troca */}
      <ServicesShowcase />

      {/* 5. Números reais que rolam (branco) */}
      <section aria-label="SunLab em números" className="bg-white py-16 sm:py-24">
        <dl className="mx-auto grid max-w-5xl gap-12 px-4 text-center sm:grid-cols-3 sm:px-6 lg:px-8">
          <div>
            <dt className="order-2 mt-3 text-sm leading-5 text-zinc-600">peças no catálogo</dt>
            <dd className="font-display text-[56px] font-light leading-[56px] tracking-tight text-[#0A2540]">
              {products.length > 0 ? <OdometerNumber value={products.length} /> : '·'}
            </dd>
          </div>
          <div>
            <dt className="mt-3 text-sm leading-5 text-zinc-600">coleções</dt>
            <dd className="font-display text-[56px] font-light leading-[56px] tracking-tight text-[#0A2540]">
              <OdometerNumber value={collections} />
            </dd>
          </div>
          <div>
            <dt className="mt-3 text-sm leading-5 text-zinc-600">tecnologias: 3D e NFC</dt>
            <dd className="font-display text-[56px] font-light leading-[56px] tracking-tight text-[#0A2540]">
              <OdometerNumber value={2} />
            </dd>
          </div>
        </dl>
      </section>

      {/* Perguntas frequentes (mar) — mesmo componente da Home */}
      <div className="bg-[#EAF3F9] py-16 sm:py-24">
        <FaqSection />
      </div>

      {/* 6. Chamada final (areia) */}
      <section aria-labelledby="sobre-cta" className="bg-[#F6F1E7] py-16 sm:py-24">
        <motion.div {...reveal} className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            {eyebrow('Perto do mar')}
            <h2 id="sobre-cta" className="mt-4 font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540] sm:text-[40px] sm:leading-[48px]">
              Tudo isso com criatividade, curiosidade e aquele toque de quem{' '}
              <span className="text-amber-700">nasceu perto do mar.</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonWithIcon to="/catalog" variant="dark" className="w-full sm:w-auto">Ver a loja</ButtonWithIcon>
            <ButtonWithIcon to="/custom" variant="outline" className="w-full sm:w-auto">Pedir orçamento</ButtonWithIcon>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default AboutUs;
