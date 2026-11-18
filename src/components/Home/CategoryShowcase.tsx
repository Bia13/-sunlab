import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/data/products';

/*
 * Vitrine de categorias (inspirada na seção "O teu ritual, começa aqui."):
 * título editorial em dois tons, "Ver todas" e três cards altos com foto e nome por cima.
 * - Fundo claro (o marinho fica na hero e no footer), para o site não ficar escuro demais.
 * - A contagem de produtos é real, calculada do catálogo; sem número inventado.
 * - Celular: cards rolam de lado com encaixe (o próximo aparece pela metade); desktop: 3 colunas.
 * - Contraste: texto branco sobre degradê marinho ≥ 80% na base do card; título âmbar-700 ≈ 5:1.
 */

type CategoryCard = { id: string; name: string; image: string; alt: string };

const CARDS: CategoryCard[] = [
  {
    id: 'decor',
    name: 'Decoração de Natal',
    image: '/products/natal/02_presepio_familia/02_lifestyle_sala.jpg',
    alt: 'Presépio impresso em 3D sobre um móvel da sala, com luzes de Natal ao fundo'
  },
  {
    id: 'gifts',
    name: 'Enfeites & Lembranças',
    image: '/products/natal/04_flocos_neve/02_lifestyle_arvore.jpg',
    alt: 'Flocos de neve impressos em 3D pendurados na árvore de Natal'
  },
  {
    id: 'custom',
    name: 'Personalizados',
    image: '/products/natal/05_enfeites_bicolores/01_flatlay_catalogo.jpg',
    alt: 'Enfeites vermelhos e brancos impressos em 3D, vistos de cima'
  }
];

export const CategoryShowcase: React.FC<{ products: Product[] }> = ({ products }) => {
  const countFor = (id: string) => products.filter(p => p.category === id).length;

  return (
    <section aria-labelledby="categorias-title" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4 sm:mb-12">
        <div>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
            <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
            Categorias
          </p>
          <h2 id="categorias-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px] lg:text-[56px] lg:leading-[60px]">
            <span className="block">Escolha por onde</span>
            <span className="block text-amber-700">começar.</span>
          </h2>
        </div>
        <Link
          to="/catalog"
          className="group hidden h-10 shrink-0 items-center gap-2 text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-700 transition-colors hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A2540] sm:inline-flex"
        >
          Ver todas
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      </div>

      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {CARDS.map(card => {
          const count = countFor(card.id);
          return (
            <li key={card.id} className="w-[80%] shrink-0 snap-start sm:w-[48%] md:w-auto">
              <Link
                to={`/catalog?cat=${card.id}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-200 ring-1 ring-zinc-200/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A2540]"
              >
                <img
                  src={card.image}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#061A30]/88 via-[#061A30]/48 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                  <div>
                    {count > 0 && (
                      <p className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-amber-300">
                        {count} {count === 1 ? 'produto' : 'produtos'}
                      </p>
                    )}
                    <p className="mt-2 text-xl font-medium leading-7 text-white">{card.name}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/16 text-white ring-1 ring-inset ring-white/24 backdrop-blur-md transition-colors group-hover:bg-amber-400 group-hover:text-[#061A30] group-hover:ring-amber-400"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* "Ver todas" no celular fica embaixo dos cards, perto do polegar. */}
      <Link
        to="/catalog"
        className="mt-6 inline-flex h-10 items-center gap-2 text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A2540] sm:hidden"
      >
        Ver todas as categorias
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
};

export default CategoryShowcase;
