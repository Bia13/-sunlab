import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Product } from '@/data/products';
import { ProductCard } from '@/components/ProductCard';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';

/*
 * Carrossel de destaques (como na referência): cards lado a lado, setas brancas
 * redondas sobre as bordas das fotos e "Ver todos" no cabeçalho.
 * - Celular: arrasta com o dedo e o próximo card aparece pela metade (sinal de que rola).
 * - Desktop: setas, arrastar com o mouse e teclado (Tab leva cada card para a tela).
 * - Acessível: região rotulada, cada card anunciado como "3 de 8", setas com nome e
 *   desativadas nas pontas. Com "reduzir movimento" a troca é quase instantânea.
 */
export const FeaturedCarousel: React.FC<{ products: Product[] }> = ({ products }) => {
  const reduceMotion = useReducedMotion();
  const [viewportRef, api] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 'auto',
    duration: reduceMotion ? 10 : 28
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    if (!api) return;
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    sync();
    api.on('select', sync).on('reInit', sync);
    return () => { api.off('select', sync).off('reInit', sync); };
  }, [api, sync]);

  if (products.length === 0) return null;

  const arrow =
    'absolute top-[38%] z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0A2540] shadow-[0_8px_24px_-8px_rgba(10,37,64,0.32)] ring-1 ring-zinc-200 transition-[opacity,background-color] hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] disabled:pointer-events-none disabled:opacity-0 cursor-pointer md:grid';

  return (
    <section
      aria-labelledby="destaques-title"
      aria-roledescription="carrossel"
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        {/* Cabeçalho editorial em dois tons, igual às outras seções da Home. */}
        <div>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
            <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
            Destaques
          </p>
          <h2 id="destaques-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px] lg:text-[56px] lg:leading-[60px]">
            <span className="block">Escolhidos</span>
            <span className="block text-amber-700">pela SunLab.</span>
          </h2>
        </div>
        <ButtonWithIcon to="/catalog" variant="outline" className="shrink-0">
          Ver todos
        </ButtonWithIcon>
      </div>

      <div className="relative">
        {/* Viewport: sangra até a borda no celular para o card seguinte "espiar".
            -my-4/py-4: dá 16px de folga em cima e embaixo para a borda e a sombra do card
            não serem cortadas pelo overflow do carrossel. */}
        <div ref={viewportRef} className="-mx-4 -my-4 overflow-hidden px-4 py-4 sm:mx-0 sm:px-0">
          {/* items-stretch + h-full no card: todos os slides com a mesma altura. */}
          <div className="-ml-4 flex items-stretch touch-pan-y sm:-ml-6">
            {products.map((product, i) => (
              <div
                key={product.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${products.length}`}
                className="flex min-w-0 shrink-0 grow-0 basis-[72%] pl-4 sm:basis-1/2 sm:pl-6 md:basis-1/3 lg:basis-1/4"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => api?.scrollPrev()}
          disabled={!canPrev}
          aria-label="Destaques anteriores"
          className={cn(arrow, '-left-4 lg:-left-6')}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => api?.scrollNext()}
          disabled={!canNext}
          aria-label="Próximos destaques"
          className={cn(arrow, '-right-4 lg:-right-6')}
        >
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
