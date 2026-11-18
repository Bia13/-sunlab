import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';
import { imageIndexForColor } from '@/lib/color-image';

/*
 * Carrinho lateral no design da SunLab (sem a "cara de IA" de caixas cinza e azuis soltos):
 * - Painel claro; título leve com contador âmbar; itens em lista com linhas finas (sem cartões),
 *   foto com o fundo neutro dos cards, quantidade em pílula (igual à página de produto).
 * - Fechamento numa faixa areia: resumo e o botão padrão do site.
 * - Acessível: role="dialog" + aria-modal, título ligado, Esc fecha, foco preso no painel e
 *   devolvido ao sair, página por trás não rola. "Reduzir movimento": aparece sem deslizar.
 * - Contraste ≥ 4,5:1; alvos ≥ 40px; grid de 4px.
 */
const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export const CartDrawer: React.FC = () => {
  const {
    cart, isCartOpen, closeCart, removeFromCart, updateQuantity, clearCart,
    changeItemColor, subtotal, total, totalItems, openCheckout
  } = useCart();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [confirmClear, setConfirmClear] = useState(false);

  // Trava a rolagem, foca o "fechar", Esc fecha e o Tab fica dentro do painel.
  useEffect(() => {
    if (!isCartOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]:not([tabindex="-1"])');
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
  }, [isCartOpen, closeCart]);

  const handleClearCart = () => {
    if (confirmClear) {
      clearCart();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[#061A30]/56 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="carrinho-title"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[-24px_0_64px_-24px_rgba(6,26,48,0.4)] sm:max-w-md"
          >
            {/* Cabeçalho */}
            <header className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <h2 id="carrinho-title" className="font-display text-[28px] font-light leading-9 tracking-tight text-[#0A2540]">
                  Seu carrinho
                </h2>
                {totalItems > 0 && (
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-amber-400 px-2 text-xs font-bold leading-4 text-[#061A30]">
                    {totalItems}
                    <span className="sr-only"> {totalItems === 1 ? 'item' : 'itens'}</span>
                  </span>
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                aria-label="Fechar carrinho"
                className="grid h-10 w-10 place-items-center rounded-full text-zinc-700 ring-1 ring-inset ring-zinc-200 transition-colors hover:bg-[#0A2540] hover:text-white hover:ring-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] cursor-pointer"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </header>

            {/* Itens */}
            <div className="flex-1 overflow-y-auto px-6">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                  <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-[#F6F1E7] text-[#0A2540]">
                    <ShoppingBag className="h-7 w-7" />
                  </span>
                  <p className="mt-6 font-display text-2xl font-light leading-8 text-[#0A2540]">Seu carrinho está vazio</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-600">Dá uma olhada nas peças da loja ou peça uma sob medida.</p>
                  <ButtonWithIcon variant="dark" className="mt-8" onClick={() => { closeCart(); navigate('/catalog'); }}>
                    Ver a loja
                  </ButtonWithIcon>
                </div>
              ) : (
                <>
                  <ul className="border-t border-zinc-200">
                    {cart.map(item => (
                      <li key={item.id} className="flex gap-4 border-b border-zinc-200 py-5">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[#E7E5E0] to-[#F5F4F1]">
                          {/* A foto acompanha a cor escolhida (mesma regra do card e da página do produto). */}
                          <img
                            key={item.id}
                            src={
                              item.selectedColor?.image ||
                              item.product.images[Math.max(0, imageIndexForColor(item.product, item.selectedColor?.name))] ||
                              item.product.images[0]
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-medium leading-5 text-zinc-900">{item.product.name}</p>
                              {item.product.colors.length > 1 ? (
                                /* Produto com várias cores: dá para trocar aqui mesmo. */
                                <div className="mt-1">
                                  <p className="text-xs leading-4 text-zinc-600">
                                    Cor: <span className="font-semibold text-zinc-800">{item.selectedColor?.name}</span>
                                  </p>
                                  <div role="group" aria-label={`Cor de ${item.product.name}`} className="-ml-1 mt-1 flex flex-wrap">
                                    {item.product.colors.map(col => {
                                      const active = item.selectedColor?.name === col.name;
                                      return (
                                        <button
                                          key={col.name}
                                          type="button"
                                          onClick={() => changeItemColor(item.id, col)}
                                          aria-label={`Cor ${col.name}`}
                                          aria-pressed={active}
                                          className="grid h-8 w-8 place-items-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0A2540]"
                                        >
                                          <span
                                            className={cn('h-5 w-5 rounded-full ring-1 ring-inset ring-black/12', active && 'shadow-[0_0_0_2px_#fff,0_0_0_4px_#0A2540]')}
                                            style={{ backgroundColor: col.hex }}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                item.selectedColor?.name && item.selectedColor.name !== 'Padrão' && (
                                  <p className="mt-1 flex items-center gap-2 text-xs leading-4 text-zinc-600">
                                    <span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/12" style={{ backgroundColor: item.selectedColor.hex }} />
                                    {item.selectedColor.name}
                                  </p>
                                )
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              aria-label={`Remover ${item.product.name} do carrinho`}
                              className="-mr-2 -mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                            <div className="flex h-10 items-center rounded-full ring-1 ring-inset ring-zinc-300" role="group" aria-label={`Quantidade de ${item.product.name}`}>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                aria-label="Diminuir quantidade"
                                className="grid h-10 w-10 place-items-center rounded-l-full text-zinc-700 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                              >
                                <Minus aria-hidden="true" className="h-4 w-4" />
                              </button>
                              <span aria-live="polite" className="w-6 text-center text-sm font-semibold text-zinc-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                aria-label="Aumentar quantidade"
                                className="grid h-10 w-10 place-items-center rounded-r-full text-zinc-700 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                              >
                                <Plus aria-hidden="true" className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="whitespace-nowrap text-base font-semibold text-zinc-900">{formatPrice(item.unitPrice * item.quantity)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-end py-3">
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer',
                        confirmClear ? 'bg-rose-700 text-white' : 'text-zinc-600 hover:bg-rose-50 hover:text-rose-700'
                      )}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      {confirmClear ? 'Toque de novo para esvaziar' : 'Esvaziar carrinho'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Fechamento (areia) */}
            {cart.length > 0 && (
              <footer className="bg-[#F6F1E7] px-6 pb-6 pt-5">
                <dl className="flex flex-col gap-2 text-sm leading-5 text-zinc-700">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-medium text-zinc-900">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between border-t border-zinc-300/80 pt-4">
                    <dt className="text-base font-semibold text-zinc-900">Total</dt>
                    <dd className="font-display text-[32px] font-light leading-10 text-[#0A2540]">{formatPrice(total)}</dd>
                  </div>
                </dl>

                <ButtonWithIcon onClick={openCheckout} className="mt-5 w-full">Finalizar pedido</ButtonWithIcon>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-2 inline-flex h-10 w-full items-center justify-center text-sm font-semibold text-[#0A2540] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                >
                  Continuar comprando
                </button>
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
