import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Star,
  Flame,
  Package
} from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { ProductCard } from '@/components/ProductCard';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { HeroSlider } from '@/components/Home/HeroSlider';
import { TrustTicker } from '@/components/Home/TrustTicker';
import { CategoryShowcase } from '@/components/Home/CategoryShowcase';
import { PrintProcess } from '@/components/Home/PrintProcess';
import { FaqSection } from '@/components/Home/FaqSection';
import { FromIdeaToPrint, fromIdeaToPrintVisible } from '@/components/Home/FromIdeaToPrint';
import { FeaturedCarousel } from '@/components/Home/FeaturedCarousel';

/*
 * Faixas de fundo da Home: cada dobra tem um tom, para a página não ficar "plana".
 * Tons tirados da logo SunLab:
 * - marinho (#061A30): hero, faixa de diferenciais e "Como é feito" (fora daqui, no próprio componente)
 * - areia  (#F6F1E7): o sol/praia, quente e suave
 * - mar    (#EAF3F9): a onda, azul bem clarinho
 * - branco: respiro entre as cores
 * Contraste conferido: zinc-600 sobre areia/mar ≥ 6:1; âmbar-700 (títulos grandes) ≥ 4:1; marinho ≥ 14:1.
 * O espaçamento vertical fica dentro da faixa (py-16/24), para não sobrar fresta branca entre as cores.
 */
const BAND = {
  sand: 'bg-[#F6F1E7]',
  sea: 'bg-[#EAF3F9]',
  white: 'bg-white'
} as const;

const Band: React.FC<{ tone: keyof typeof BAND; children: React.ReactNode }> = ({ tone, children }) => (
  <div className={`w-full py-16 sm:py-24 ${BAND[tone]}`}>{children}</div>
);

type GridFilter = 'all' | 'bestsellers' | 'newArrivals';

const GRID_FILTERS: { id: GridFilter; label: string; icon?: typeof Star }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'bestsellers', label: 'Mais vendidos', icon: Flame },
  { id: 'newArrivals', label: 'Lançamentos', icon: Sparkles }
];

export const Home: React.FC = () => {
  const { products, loading } = useProducts();
  const [activeTab, setActiveTab] = useState<GridFilter>('all');
  // Troca de filtro com um "carregando" curto (esqueletos) antes dos cards entrarem.
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<number>(undefined);

  const reduceMotion = useReducedMotion();

  useEffect(() => () => window.clearTimeout(switchTimer.current), []);

  const changeFilter = (id: GridFilter) => {
    if (id === activeTab) return;
    setActiveTab(id);
    // Com "reduzir movimento", troca direto, sem esqueleto.
    if (reduceMotion) return;
    setSwitching(true);
    window.clearTimeout(switchTimer.current);
    switchTimer.current = window.setTimeout(() => setSwitching(false), 480);
  };

  // Destaques vão para o carrossel; a grade mostra o catálogo com filtro.
  const featuredProducts = products.filter(p => p.featured);
  const gridProducts = products.filter(p => {
    if (activeTab === 'bestsellers') return p.bestseller;
    if (activeTab === 'newArrivals') return p.newArrival;
    return true;
  }).slice(0, 8);

  return (
    <div className="flex w-full flex-col overflow-x-clip">
      
      {/* 1. HERO: slider de coleções */}
      <HeroSlider />

      {/* Faixa de diferenciais: continua o marinho da hero. */}
      <TrustTicker />

      {/* Vitrine de categorias */}
      <Band tone="sand">
        <CategoryShowcase products={products} />
      </Band>

      {/* 2. DESTAQUES EM CARROSSEL (com "Ver todos") */}
      <Band tone="white">
        <FeaturedCarousel products={featuredProducts} />
      </Band>

      {/* 3. GRADE DO CATÁLOGO COM FILTRO */}
      <Band tone="sea">
      <section id="produtos" aria-labelledby="catalogo-title" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho editorial em dois tons (mesmo padrão da vitrine de categorias). */}
        <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
          <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
          Catálogo
        </p>
        <h2 id="catalogo-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px] lg:text-[56px] lg:leading-[60px]">
          <span className="block">Explore o</span>
          <span className="block text-amber-700">catálogo.</span>
        </h2>

        {/* Filtro: pílulas contornadas em caixa alta; a escolhida fica marinho (texto branco ≈ 15:1). */}
        <div role="group" aria-label="Filtrar produtos" className="-mx-4 mb-8 mt-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-12 sm:px-0 sm:pb-0">
          {GRID_FILTERS.map(f => {
            const active = activeTab === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => changeFilter(f.id)}
                aria-pressed={active}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase leading-4 tracking-[0.12em] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] ${
                  active
                    ? 'bg-[#0A2540] text-white'
                    : 'bg-transparent text-zinc-700 ring-1 ring-inset ring-zinc-300 hover:ring-[#0A2540] hover:text-[#0A2540]'
                }`}
              >
                {f.icon && <f.icon aria-hidden="true" className="h-4 w-4" />}
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Aviso para leitor de tela quando o filtro termina de carregar. */}
        <p role="status" className="sr-only">
          {switching || (loading && products.length === 0)
            ? 'Carregando produtos'
            : `${gridProducts.length} ${gridProducts.length === 1 ? 'produto' : 'produtos'}`}
        </p>

        {(loading && products.length === 0) || switching ? (
          // Mesmo número de esqueletos que de cards que vão aparecer: a grade não muda de altura.
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6" aria-busy="true">
            {[...Array(Math.max(gridProducts.length, switching ? 1 : 4))].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ProductCardSkeleton />
              </motion.div>
            ))}
          </div>
        ) : gridProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {gridProducts.map((product, i) => (
              // key com o filtro: os cards entram de novo a cada troca, um depois do outro.
              <motion.div
                key={`${activeTab}-${product.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="flex"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-zinc-200">
            <Package aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-500" />
            <h3 className="mt-4 text-base font-bold text-zinc-900">Nenhum produto neste filtro</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Veja todas as peças ou peça um orçamento de uma peça sob medida.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonWithIcon variant="dark" onClick={() => setActiveTab('all')}>
                Ver todas as peças
              </ButtonWithIcon>
              <ButtonWithIcon to="/custom" variant="outline">
                Pedir orçamento
              </ButtonWithIcon>
            </div>
          </div>
        )}

        {products.length > gridProducts.length && (
          <div className="mt-8 flex justify-center sm:mt-12">
            <ButtonWithIcon to="/catalog" variant="outline">
              Ver os {products.length} produtos
            </ButtonWithIcon>
          </div>
        )}
      </section>
      </Band>

      {/* Como é feito: processo guiado pelo scroll */}
      <PrintProcess />

      {/* Como funciona: da referência à peça impressa (antes e depois) */}
      {fromIdeaToPrintVisible && (
        <Band tone="sand">
          <FromIdeaToPrint />
        </Band>
      )}

      {/* Perguntas frequentes */}
      <Band tone="white">
        <FaqSection />
      </Band>

    </div>
  );
};

export default Home;
