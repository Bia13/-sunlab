import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Eye, Plus, Check } from 'lucide-react';
import type { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { flyToCart } from '@/lib/fly-to-cart';

interface ProductCardProps {
  product: Product;
}

/*
 * Card de produto: o mesmo em todo o site (Home, carrossel, Loja, relacionados).
 * - Foto quadrada sobre fundo neutro; selos retangulares em caixa alta (no máx. 2).
 * - Bolinhas de cor, categoria, nome (1 linha), descrição curta (1 linha), preço e botão "+" redondo.
 * - Alturas fixas em cada linha: todos os cards de uma grade ficam com a mesma altura.
 * - Sem borda que acende nem card que "pula" no hover: só um zoom leve na foto.
 * - Grid de 4px; botão de 40px; bolinhas com alvo de 24px.
 * - Contraste: textos zinc-900/zinc-600 sobre branco; selos ≥ 7:1; botão branco sobre marinho ≈ 15:1.
 */
export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, openQuickView } = useCart();
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [added, setAdded] = useState(false);
  const timer = useRef<number>(undefined);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const href = `/product/${product.slug}`;
  const hasPrice = product.price > 0;
  // A foto só muda quando a pessoa escolhe uma cor (nunca no hover).
  // Usa a foto cadastrada na cor; sem ela, a foto na mesma posição da cor
  // (quando há uma foto por cor); senão, a foto principal.
  const colorIndex = product.colors?.findIndex(c => c.name === selectedColor?.name) ?? 0;
  const mainImage =
    selectedColor?.image ||
    (product.colors?.length > 1 && product.images.length >= product.colors.length
      ? product.images[colorIndex]
      : undefined) ||
    product.images[0];
  const formatPrice = (v: number) => v.toFixed(2).replace('.', ',');

  // Desconto real, calculado do preço antigo (nunca inventado).
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  const badges = [
    discount > 0 && { label: `−${discount}%`, tone: 'bg-[#0A2540] text-white' },
    product.bestseller && { label: 'Mais vendido', tone: 'bg-white/92 text-[#0A2540] ring-1 ring-inset ring-black/8 backdrop-blur-sm' },
    product.newArrival && { label: 'Lançamento', tone: 'bg-white/92 text-[#0A2540] ring-1 ring-inset ring-black/8 backdrop-blur-sm' },
    product.category === 'custom' && { label: 'Sob medida', tone: 'bg-white/92 text-[#0A2540] ring-1 ring-inset ring-black/8 backdrop-blur-sm' }
  ].filter(Boolean) as { label: string; tone: string }[];

  const handleAdd = () => {
    // Produto sem cor cadastrada: o carrinho usa a cor "Padrão".
    addToCart(product, 1, selectedColor);
    // A foto do card voa até o carrinho do topo.
    flyToCart(imageRef.current, mainImage);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(10,37,64,0.04)] ring-1 ring-zinc-200/70 transition-shadow duration-300 hover:shadow-[0_12px_32px_-12px_rgba(10,37,64,0.16)]">
      {/* Foto */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-[#E7E5E0] to-[#F5F4F1]">
        <Link to={href} tabIndex={-1} aria-hidden="true" className="block h-full w-full">
          <img
            ref={imageRef}
            key={mainImage}
            src={mainImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </Link>

        {/* right-14: os selos quebram linha antes do botão de espiar; no máximo 2 para não cobrir a foto. */}
        {badges.length > 0 && (
          <div className="pointer-events-none absolute left-3 right-14 top-3 flex flex-wrap gap-1">
            {badges.slice(0, 2).map(b => (
              <span key={b.label} className={cn('rounded-full px-3 py-1 text-xs font-medium leading-4 tabular-nums', b.tone)}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Espiar: sempre visível no toque; no desktop aparece no hover ou com o foco do teclado. */}
        <button
          type="button"
          onClick={() => openQuickView(product)}
          aria-label={`Ver detalhes rápidos de ${product.name}`}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/88 text-[#0A2540] ring-1 ring-inset ring-[#0A2540]/12 backdrop-blur-sm transition-opacity hover:bg-white focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] cursor-pointer md:opacity-0 md:group-hover:opacity-100"
        >
          <Eye aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {/* Informações */}
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        {/* Linha de cores sempre reserva 16px, com ou sem cores. */}
        <div className="flex h-4 items-center">
          {product.colors?.length > 1 && (
            <div role="group" aria-label="Cores disponíveis" className="relative z-10 -mx-1 flex w-fit items-center">
              {product.colors.slice(0, 5).map(col => {
                const active = selectedColor?.name === col.name;
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    aria-label={`Cor ${col.name}`}
                    aria-pressed={active}
                    title={col.name}
                    className="grid h-6 w-6 place-items-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0A2540]"
                  >
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full ring-1 ring-inset ring-black/12 transition-shadow',
                        active && 'shadow-[0_0_0_2px_#fff,0_0_0_3px_#0A2540]'
                      )}
                      style={{ backgroundColor: col.hex }}
                    />
                  </button>
                );
              })}
              {product.colors.length > 5 && (
                <span className="ml-1 text-xs leading-4 text-zinc-600">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>

        {/* Categoria, nome e descrição curta: alturas fixas (16/24/20) para alinhar a grade. */}
        <div className="flex flex-col gap-1">
          <p className="h-4 truncate text-xs font-semibold uppercase leading-4 tracking-[0.12em] text-zinc-600">
            {product.categoryLabel}
          </p>
          <h3 className="h-6 text-sm font-medium leading-6 text-zinc-900 sm:text-base">
            <Link
              to={href}
              className="block truncate rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]"
            >
              {product.name}
            </Link>
          </h3>
          <p className="h-5 truncate text-sm leading-5 text-zinc-600">{product.tagline}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          {hasPrice ? (
            <p className="flex min-w-0 items-baseline gap-x-2 leading-6">
              <span className="whitespace-nowrap text-base font-bold text-zinc-900 sm:text-lg">R$ {formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span className="min-w-0 truncate text-xs text-zinc-600 line-through">
                  <span className="sr-only">de </span>R$ {formatPrice(product.originalPrice)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm font-semibold leading-5 text-zinc-900">Sob orçamento</p>
          )}

          {/* z-10: fica acima do link que cobre o card inteiro. */}
          {hasPrice ? (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={added ? `${product.name} adicionado ao carrinho` : `Adicionar ${product.name} ao carrinho`}
              className={cn(
                'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors cursor-pointer',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]',
                added ? 'bg-emerald-700' : 'bg-[#0A2540] hover:bg-[#0F3A66]'
              )}
            >
              {added ? <Check aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
            </button>
          ) : (
            <Link
              to="/custom"
              className="relative z-10 flex h-10 shrink-0 items-center rounded-full bg-[#0A2540] px-4 text-sm font-semibold leading-5 text-white transition-colors hover:bg-[#0F3A66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]"
            >
              Orçar
            </Link>
          )}
        </div>
        <span role="status" className="sr-only">{added ? `${product.name} adicionado ao carrinho` : ''}</span>
      </div>
    </article>
  );
};

export default ProductCard;
