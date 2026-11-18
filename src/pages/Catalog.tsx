import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, X, RotateCcw, PackageOpen } from 'lucide-react';
import { CATEGORIES } from '@/data/products';
import { useProducts } from '@/context/ProductContext';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { Checkbox } from '@/components/ui/custom-checkbox';
import { DropdownSelect } from '@/components/ui/dropdown-select';

/*
 * Loja no mesmo design da Home:
 * - Cabeçalho marinho com título editorial em dois tons e a foto de detalhe sumindo no fundo.
 * - Filtros numa faixa areia: busca em pílula, ordenar e "Em estoque" em pílulas, categorias
 *   em pílulas contornadas (com contagem real) e faixas de preço.
 * - Grade numa faixa "mar" com o mesmo ProductCard e o mesmo "carregando" (esqueletos) ao trocar filtro.
 * - Faixa final marinho com chamada para peça sob medida.
 * Grid de 4px; alvos de toque ≥ 40px; contraste ≥ 4,5:1 em todo texto pequeno.
 */

type SortBy = 'featured' | 'price-asc' | 'price-desc' | 'name';
type PriceRange = 'all' | 'under-150' | '150-250' | 'over-250';

const SORTS: { id: SortBy; label: string }[] = [
  { id: 'featured', label: 'Destaques SunLab' },
  { id: 'price-asc', label: 'Menor preço' },
  { id: 'price-desc', label: 'Maior preço' },
  { id: 'name', label: 'Nome (A a Z)' }
];

const PRICES: { id: PriceRange; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'under-150', label: 'Até R$ 150' },
  { id: '150-250', label: 'R$ 150 a R$ 250' },
  { id: 'over-250', label: 'Acima de R$ 250' }
];

const WHATSAPP_URL = 'https://wa.me/5513996061681';

export const Catalog: React.FC = () => {
  const { products, loading } = useProducts();
  const reduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('cat') || 'all';

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  // "Carregando" curto ao trocar filtro (igual à Home). A busca por texto é instantânea.
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(switchTimer.current), []);
  const withLoading = (fn: () => void) => {
    fn();
    if (reduceMotion) return;
    setSwitching(true);
    window.clearTimeout(switchTimer.current);
    switchTimer.current = window.setTimeout(() => setSwitching(false), 480);
  };

  // Sincroniza a categoria com a URL (?cat=)
  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const handleCategoryChange = (catId: string) =>
    withLoading(() => {
      setSelectedCategory(catId);
      if (catId === 'all') {
        searchParams.delete('cat');
        setSearchParams(searchParams);
      } else {
        setSearchParams({ cat: catId });
      }
    });

  const handleResetFilters = () =>
    withLoading(() => {
      setSelectedCategory('all');
      setSearchQuery('');
      setSortBy('featured');
      setPriceRange('all');
      setInStockOnly(false);
      searchParams.delete('cat');
      setSearchParams(searchParams);
    });

  const countFor = (catId: string) => (catId === 'all' ? products.length : products.filter(p => p.category === catId).length);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matches =
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.categoryLabel.toLowerCase().includes(query) ||
            p.specs.material.toLowerCase().includes(query);
          if (!matches) return false;
        }

        if (priceRange === 'under-150' && (p.price <= 0 || p.price > 150)) return false;
        if (priceRange === '150-250' && (p.price < 150 || p.price > 250)) return false;
        if (priceRange === 'over-250' && p.price < 250) return false;

        if (inStockOnly && !p.inStock) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, selectedCategory, searchQuery, sortBy, priceRange, inStockOnly]);

  const hasActiveFilters = selectedCategory !== 'all' || searchQuery !== '' || priceRange !== 'all' || inStockOnly;
  const showSkeleton = (loading && products.length === 0) || switching;

  return (
    <div className="flex w-full flex-col overflow-x-clip">
      {/* 1. Cabeçalho marinho */}
      <section aria-labelledby="loja-title" className="relative isolate overflow-hidden bg-[#061A30] text-white">
        {/* Foto na metade direita, sumindo com máscara (a própria imagem fica transparente à
            esquerda), então não existe borda para aparecer como emenda. */}
        <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-3/5 lg:block">
          <img
            src="/products/natal/04_flocos_neve/03_macro_textura.jpg"
            alt=""
            className="h-full w-full object-cover opacity-64 [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.5)_40%,black_75%)]"
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
            <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
            Loja
          </p>
          <h1 id="loja-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight sm:text-5xl sm:leading-[52px] lg:text-[64px] lg:leading-[68px]">
            <span className="block">Tudo que a gente</span>
            <span className="block text-amber-300">imprime.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-6 text-white/80 lg:text-lg lg:leading-7">
            Peças de design autoral, decoração e presentes impressos em 3D em Santos.
          </p>
        </div>
      </section>

      {/* 2. Filtros (faixa areia) */}
      <section aria-label="Filtros" className="bg-[#F6F1E7] py-8 sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
          {/* Tudo numa linha (desktop): busca, Categoria, Preço, Ordenar, Em estoque e Limpar.
              No celular: busca em cima e os filtros em duas colunas embaixo. */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <div className="col-span-2 flex h-12 min-w-0 items-center gap-2 rounded-full bg-white pl-4 pr-1 ring-1 ring-inset ring-zinc-300 transition-shadow focus-within:ring-2 focus-within:ring-[#0A2540] lg:flex-1">
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-500" />
              <label htmlFor="busca-loja" className="sr-only">Buscar na loja</label>
              <input
                id="busca-loja"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, categoria ou material"
                className="h-full min-w-0 flex-1 bg-transparent text-base text-zinc-900 placeholder:text-zinc-500 outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Categoria (com contagem real de produtos) */}
            <DropdownSelect
              label="Categoria"
              value={selectedCategory}
              onChange={v => handleCategoryChange(v)}
              options={CATEGORIES.map(c => ({ value: c.id as string, label: c.id === 'all' ? 'Todas' : c.name, hint: countFor(c.id) }))}
              className="lg:shrink-0"
            />

            <DropdownSelect
              label="Preço"
              value={priceRange}
              onChange={v => withLoading(() => setPriceRange(v))}
              options={PRICES.map(p => ({ value: p.id, label: p.label }))}
              align="right"
              className="lg:shrink-0"
            />

            <DropdownSelect
              label="Ordenar"
              value={sortBy}
              onChange={v => withLoading(() => setSortBy(v))}
              options={SORTS.map(o => ({ value: o.id, label: o.label }))}
              align="right"
              className="lg:shrink-0"
            />

            {/* "Em estoque": checkbox de verdade dentro de uma pílula (o rótulo inteiro é clicável). */}
            <label className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-full bg-white px-5 text-sm leading-5 text-zinc-800 ring-1 ring-inset ring-zinc-300 transition-colors hover:ring-[#0A2540]">
              <Checkbox checked={inStockOnly} onChange={e => withLoading(() => setInStockOnly(e.target.checked))} />
              Em estoque
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                aria-label="Limpar filtros"
                title="Limpar filtros"
                className="col-span-2 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-white hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] cursor-pointer lg:col-span-1 lg:w-12 lg:px-0"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                <span className="lg:sr-only">Limpar filtros</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Resultados (faixa mar) */}
      <section aria-label="Produtos" className="bg-[#EAF3F9] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p role="status" className="mb-6 text-sm leading-5 text-zinc-600 sm:mb-8">
            {showSkeleton ? (
              'Carregando produtos'
            ) : (
              <>
                Mostrando <strong className="font-semibold text-zinc-900">{filteredProducts.length}</strong> de{' '}
                <strong className="font-semibold text-zinc-900">{products.length}</strong> produtos
              </>
            )}
          </p>

          {showSkeleton ? (
            // Mesmo número de esqueletos que de cards que vão aparecer: a grade não pula de altura.
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6" aria-busy="true">
              {[...Array(Math.max(1, switching ? filteredProducts.length : 8))].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={`${selectedCategory}-${priceRange}-${inStockOnly}-${sortBy}-${product.id}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className="flex"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-zinc-200">
              <PackageOpen aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-500" />
              <h2 className="mt-4 text-lg font-semibold leading-7 text-zinc-900">
                {products.length === 0 ? 'Catálogo vazio' : 'Nenhum produto encontrado'}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
                {products.length === 0
                  ? 'Ainda não há produtos cadastrados. Você pode pedir uma peça sob medida.'
                  : 'Tente outra busca ou ajuste os filtros.'}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {products.length > 0 && (
                  <ButtonWithIcon variant="dark" icon={RotateCcw} onClick={handleResetFilters}>
                    Limpar filtros
                  </ButtonWithIcon>
                )}
                <ButtonWithIcon to="/custom" variant="outline">
                  Pedir orçamento
                </ButtonWithIcon>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Chamada final (marinho) */}
      <section aria-labelledby="sob-medida-title" className="bg-[#061A30] py-16 text-white lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
              <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
              Sob medida
            </p>
            <h2 id="sob-medida-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight sm:text-5xl sm:leading-[52px]">
              <span className="block">Não achou o que procurava?</span>
              <span className="block text-amber-300">A gente imprime.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-6 text-white/80">
              Mande sua ideia ou referência e a gente transforma em peça.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonWithIcon to="/custom" className="w-full sm:w-auto">Pedir orçamento</ButtonWithIcon>
            <ButtonWithIcon href={WHATSAPP_URL} variant="secondary" className="w-full sm:w-auto">Falar no WhatsApp</ButtonWithIcon>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Catalog;
