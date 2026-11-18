import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, ShoppingBag, ArrowRight, Check, Clock, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';
import { imageIndexForColor } from '@/lib/color-image';
import { flyToCart } from '@/lib/fly-to-cart';

/*
 * Detalhe rápido do produto (inspirado no modal de referência):
 * - Foto ocupando a metade esquerda, sem moldura; miniaturas por cima, na base da foto.
 * - Painel marinho à direita: selo, categoria, título grande e leve, descrição, quadro com o prazo,
 *   chips técnicos (material, acabamento), cores, e embaixo preço + quantidade + botão.
 * - Sem estrelas/avaliações: o site não tem avaliações reais (a nota vem 5,0 por padrão).
 * - Acessível: role="dialog", título ligado, Esc fecha, foco vai para o botão de fechar e
 *   fica preso dentro do modal; a página por trás não rola. Com "reduzir movimento", só aparece.
 * - Contraste sobre marinho: branco ≥ 15:1, branco/72 ≈ 10:1. Grid de 4px.
 */
export const QuickViewModal: React.FC = () => {
  const { quickViewProduct: product, closeQuickView, addToCart } = useCart();
  const reduceMotion = useReducedMotion();
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product?.colors[0]);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product?.sizes?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!product) return;
    setImageIndex(0);
    setSelectedColor(product.colors[0]);
    setSelectedSize(product.sizes?.[0]);
    setQuantity(1);
    setAdded(false);

    // Trava a rolagem da página, foca o "fechar" e devolve o foco ao sair.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuickView();
      if (e.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex]:not([tabindex="-1"])');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [product, closeQuickView]);

  const handleAdd = () => {
    if (!product) return;
    addToCart(product, quantity, selectedColor, selectedSize);
    // A foto do modal voa até o carrinho do topo (por cima do fundo escurecido).
    flyToCart(imageRef.current, mainImage);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      closeQuickView();
    }, 900);
  };

  const goTo = (path: string) => {
    closeQuickView();
    navigate(path);
  };

  const formatPrice = (v: number) => v.toFixed(2).replace('.', ',');

  const discount =
    product?.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
  const badges = product
    ? ([
        // No painel marinho: desconto em âmbar para não sumir no fundo.
        discount > 0 && { label: `−${discount}%`, tone: 'bg-amber-400 text-[#061A30]' },
        product.bestseller && { label: 'Mais vendido', tone: 'bg-white/92 text-[#0A2540] ring-1 ring-inset ring-black/8 backdrop-blur-sm' },
        product.newArrival && { label: 'Lançamento', tone: 'bg-white/92 text-[#0A2540] ring-1 ring-inset ring-black/8 backdrop-blur-sm' },
        product.category === 'custom' && { label: 'Sob medida', tone: 'bg-white/92 text-[#0A2540] ring-1 ring-inset ring-black/8 backdrop-blur-sm' }
      ].filter(Boolean) as { label: string; tone: string }[])
    : [];
  const chips = product ? [product.specs?.material, product.specs?.finish].filter(c => c && c.trim()) as string[] : [];
  const mainImage = product ? selectedColor?.image || product.images[imageIndex] || product.images[0] : '';

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          {/* Fundo escurecido: clique fecha */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[#061A30]/64 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuickView}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quickview-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative grid max-h-[92svh] w-full max-w-5xl grid-rows-[auto_1fr] overflow-hidden rounded-t-3xl bg-[#061A30] text-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.6)] ring-1 ring-white/8 sm:rounded-3xl md:h-[min(640px,88svh)] md:grid-cols-2 md:grid-rows-1"
          >
            {/* Fechar */}
            <button
              ref={closeRef}
              type="button"
              onClick={closeQuickView}
              aria-label="Fechar detalhes do produto"
              className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-[#061A30]/64 text-white ring-1 ring-inset ring-white/24 backdrop-blur-md transition-colors hover:bg-white hover:text-[#061A30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            {/* Foto */}
            <div className="relative h-[36svh] bg-gradient-to-b from-[#E7E5E0] to-[#F5F4F1] md:h-full">
              <img ref={imageRef} key={mainImage} src={mainImage} alt={product.name} className="h-full w-full object-cover" />
              {product.images.length > 1 && !selectedColor?.image && (
                <div className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-gradient-to-t from-[#061A30]/64 to-transparent p-4 pt-12">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setImageIndex(idx); const col = product.colors[idx]; if (col && imageIndexForColor(product, col.name) === idx) setSelectedColor(col); }}
                      aria-label={`Ver foto ${idx + 1} de ${product.images.length}`}
                      aria-current={imageIndex === idx ? 'true' : undefined}
                      className={cn(
                        'h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-2 transition-[box-shadow,opacity] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
                        imageIndex === idx ? 'ring-amber-300' : 'opacity-72 ring-white/32 hover:opacity-100'
                      )}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Painel */}
            <div className="flex min-h-0 flex-col overflow-y-auto p-6 sm:p-8 lg:p-12">
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badges.slice(0, 2).map(b => (
                    <span key={b.label} className={cn('rounded-full px-3 py-1 text-xs font-medium leading-4 tabular-nums', b.tone)}>
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              <p className={cn('text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-white/72', badges.length > 0 && 'mt-6')}>
                {product.categoryLabel}
              </p>
              <h2 id="quickview-title" className="mt-3 pr-12 font-display text-[28px] font-light leading-9 tracking-tight sm:text-[32px] sm:leading-10">
                {product.name}
              </h2>
              <p className="mt-4 text-base leading-6 text-white/80">{product.tagline || product.description}</p>

              {/* Prazo (dado da peça cadastrado no admin) */}
              {product.leadTime && (
                <div className="mt-6 rounded-2xl bg-white/4 p-4 ring-1 ring-inset ring-white/12">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-amber-300">
                    <Clock aria-hidden="true" className="h-4 w-4" />
                    Prazo de produção
                  </p>
                  <p className="mt-2 text-base italic leading-6 text-white/88">{product.leadTime}</p>
                </div>
              )}

              {chips.length > 0 && (
                <ul aria-label="Características" className="mt-6 flex flex-wrap gap-2">
                  {chips.map(c => (
                    <li key={c} className="rounded-md bg-white/8 px-3 py-1 text-xs leading-5 text-white/80 ring-1 ring-inset ring-white/12">{c}</li>
                  ))}
                </ul>
              )}

              {product.colors.length > 1 && (
                <div className="mt-6">
                  <p className="text-sm leading-5 text-white/72">
                    Cor: <strong className="font-semibold text-white">{selectedColor?.name}</strong>
                  </p>
                  <div role="group" aria-label="Cores disponíveis" className="mt-3 flex flex-wrap gap-2">
                    {product.colors.map(col => {
                      const active = selectedColor?.name === col.name;
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => { setSelectedColor(col); const idx = imageIndexForColor(product, col.name); if (idx >= 0) setImageIndex(idx); }}
                          aria-label={`Cor ${col.name}`}
                          aria-pressed={active}
                          className="grid h-10 w-10 place-items-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                        >
                          <span
                            className={cn('h-7 w-7 rounded-full ring-1 ring-inset ring-white/24', active && 'shadow-[0_0_0_2px_#061A30,0_0_0_4px_#FCD34D]')}
                            style={{ backgroundColor: col.hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rodapé do painel: preço, quantidade e ação.
                  No celular fica preso embaixo (sticky), para o botão de comprar estar sempre à vista. */}
              <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto bg-[#061A30] px-6 pb-6 pt-8 sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8 md:static md:mx-0 md:mb-0 md:bg-transparent md:px-0 md:pb-0">
                <div className="flex flex-col gap-4 border-t border-white/12 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  {product.price > 0 ? (
                    <div>
                      <p className="flex items-baseline gap-3">
                        <span className="font-display text-[32px] font-light leading-10">R$ {formatPrice(product.price)}</span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-white/64 line-through">
                            <span className="sr-only">de </span>R$ {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs leading-4 text-amber-300">5% off no Pix</p>
                    </div>
                  ) : (
                    <p className="font-display text-2xl font-light leading-8">Sob orçamento</p>
                  )}

                  {product.price > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 items-center rounded-full ring-1 ring-inset ring-white/24">
                        <button
                          type="button"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          aria-label="Diminuir quantidade"
                          className="grid h-12 w-10 place-items-center rounded-l-full text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300 cursor-pointer"
                        >
                          <Minus aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <span aria-live="polite" className="w-6 text-center text-base font-semibold">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(q => q + 1)}
                          aria-label="Aumentar quantidade"
                          className="grid h-12 w-10 place-items-center rounded-r-full text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300 cursor-pointer"
                        >
                          <Plus aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                      <ButtonWithIcon onClick={handleAdd} icon={added ? Check : ShoppingBag} className="flex-1 sm:flex-none">
                        {added ? 'Adicionado' : 'Adicionar'}
                      </ButtonWithIcon>
                    </div>
                  ) : (
                    <ButtonWithIcon onClick={() => goTo('/custom')}>Pedir orçamento</ButtonWithIcon>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goTo(`/product/${product.slug}`)}
                  className="mt-6 inline-flex h-10 items-center gap-2 text-xs font-semibold uppercase leading-4 tracking-[0.12em] text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer"
                >
                  Ver página completa
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
