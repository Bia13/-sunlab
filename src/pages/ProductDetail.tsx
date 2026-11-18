import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingBag, ChevronRight, Clock, MessageCircle, Minus, Plus, Check, PackageOpen } from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { useCart } from '@/context/CartContext';
import { ProductCard } from '@/components/ProductCard';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { flyToCart } from '@/lib/fly-to-cart';
import { cn } from '@/lib/utils';
import { imageIndexForColor } from '@/lib/color-image';

/*
 * Página de produto no design da SunLab:
 * - Galeria (foto grande quadrada + miniaturas + selos iguais aos do card) e painel de compra
 *   que fica preso na tela no desktop (categoria, nome em título leve, preço, cores, quantidade,
 *   "Adicionar ao carrinho" com a foto voando até o carrinho, "Comprar agora", prazo e pagamento).
 * - Detalhes em sanfona (descrição e especificações). Só aparecem campos com dado real.
 * - Relacionados numa faixa "mar"; barra de compra marinho presa embaixo no celular.
 * - Sem estrelas/avaliações: o site não tem avaliações reais.
 * - Grid de 4px; contraste ≥ 4,5:1; alvos ≥ 44px.
 */

type KitItem = { name: string; qty?: number };

const SPEC_LABELS: Record<string, string> = {
  material: 'Material',
  finish: 'Acabamento',
  dimensions: 'Dimensões',
  weight: 'Peso',
  layerHeight: 'Altura de camada',
  infill: 'Preenchimento'
};

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products } = useProducts();
  const { addToCart, openCheckout } = useCart();
  const imageRef = useRef<HTMLImageElement>(null);

  const product = products.find(p => p.slug === slug || p.id === slug);

  const [imageIndex, setImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product?.colors[0]);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product?.sizes?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('descricao');

  useEffect(() => {
    if (product) {
      setImageIndex(0);
      setSelectedColor(product.colors[0]);
      setSelectedSize(product.sizes?.[0]);
      setQuantity(1);
    }
  }, [slug, product]);

  if (!product) {
    return (
      <section className="bg-[#F6F1E7] py-24">
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 text-center">
          <PackageOpen aria-hidden="true" className="h-10 w-10 text-zinc-500" />
          <h1 className="mt-6 font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540]">Produto não encontrado</h1>
          <p className="mt-3 text-base leading-6 text-zinc-600">Esta peça não está mais disponível ou mudou de endereço.</p>
          <ButtonWithIcon to="/catalog" variant="dark" className="mt-8">Voltar para a loja</ButtonWithIcon>
        </div>
      </section>
    );
  }

  // Cor e foto andam juntas (ver src/lib/color-image.ts).
  const chooseColor = (col: (typeof product.colors)[number]) => {
    setSelectedColor(col);
    const idx = imageIndexForColor(product, col.name);
    if (idx >= 0) setImageIndex(idx);
  };
  const chooseImage = (i: number) => {
    setImageIndex(i);
    const col = product.colors[i];
    if (col && imageIndexForColor(product, col.name) === i) setSelectedColor(col);
  };

  const hasPrice = product.price > 0;
  const formatPrice = (v: number) => v.toFixed(2).replace('.', ',');
  const mainImage = selectedColor?.image || product.images[imageIndex] || product.images[0];

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

  const specs = Object.entries(SPEC_LABELS)
    .map(([key, label]) => ({ label, value: (product.specs as unknown as Record<string, unknown>)?.[key] }))
    .filter((s): s is { label: string; value: string } => typeof s.value === 'string' && s.value.trim() !== '');
  const kitItems = (product.specs as unknown as { kitItems?: KitItem[] })?.kitItems ?? [];

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
    flyToCart(imageRef.current, mainImage);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
    openCheckout();
  };

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const sections = [
    { id: 'descricao', title: 'Descrição', content: <p className="whitespace-pre-line">{product.description || product.tagline}</p> },
    ...(specs.length
      ? [{
          id: 'especificacoes',
          title: 'Especificações',
          content: (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {specs.map(s => (
                <div key={s.label}>
                  <dt className="text-xs font-semibold uppercase leading-4 tracking-[0.12em] text-zinc-600">{s.label}</dt>
                  <dd className="mt-1 text-zinc-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          )
        }]
      : []),
    ...(kitItems.length
      ? [{
          id: 'kit',
          title: 'Peças inclusas no kit',
          content: (
            <ul className="flex flex-col gap-2">
              {kitItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{item.qty && item.qty > 1 ? <strong className="text-zinc-900">{item.qty}x </strong> : null}{item.name}</span>
                </li>
              ))}
            </ul>
          )
        }]
      : [])
  ];

  const quantityControl = (
    <div className="flex h-12 items-center rounded-full bg-white ring-1 ring-inset ring-zinc-300" role="group" aria-label="Quantidade">
      <button
        type="button"
        onClick={() => setQuantity(q => Math.max(1, q - 1))}
        aria-label="Diminuir quantidade"
        className="grid h-12 w-11 place-items-center rounded-l-full text-zinc-700 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="w-8 text-center text-base font-semibold text-zinc-900">{quantity}</span>
      <button
        type="button"
        onClick={() => setQuantity(q => q + 1)}
        aria-label="Aumentar quantidade"
        className="grid h-12 w-11 place-items-center rounded-r-full text-zinc-700 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="flex w-full flex-col overflow-x-clip pb-24 md:pb-0">
      {/* 1. Produto */}
      <section aria-labelledby="produto-title" className="bg-white py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Caminho */}
          <nav aria-label="Você está em" className="mb-6 sm:mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-sm leading-5 text-zinc-600">
              <li><Link to="/" className="hover:text-[#0A2540] hover:underline underline-offset-4">Início</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-4 w-4" /></li>
              <li><Link to="/catalog" className="hover:text-[#0A2540] hover:underline underline-offset-4">Loja</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-4 w-4" /></li>
              <li><Link to={`/catalog?cat=${product.category}`} className="hover:text-[#0A2540] hover:underline underline-offset-4">{product.categoryLabel}</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-4 w-4" /></li>
              <li aria-current="page" className="max-w-[200px] truncate font-semibold text-zinc-900">{product.name}</li>
            </ol>
          </nav>

          <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-16">
            {/* Galeria */}
            <div className="lg:col-span-7">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-b from-[#E7E5E0] to-[#F5F4F1]">
                <img ref={imageRef} key={mainImage} src={mainImage} alt={product.name} className="h-full w-full object-cover" />
                {badges.length > 0 && (
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                    {badges.slice(0, 2).map(b => (
                      <span key={b.label} className={cn('rounded-full px-3 py-1 text-xs font-medium leading-4 tabular-nums', b.tone)}>{b.label}</span>
                    ))}
                  </div>
                )}
              </div>
              {product.images.length > 1 && !selectedColor?.image && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => chooseImage(i)}
                      aria-label={`Ver foto ${i + 1} de ${product.images.length}`}
                      aria-current={imageIndex === i ? 'true' : undefined}
                      className={cn(
                        'h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 transition-[box-shadow,opacity] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] sm:h-24 sm:w-24',
                        imageIndex === i ? 'ring-[#0A2540]' : 'opacity-72 ring-transparent hover:opacity-100'
                      )}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Painel de compra */}
            <div className="lg:sticky lg:top-24 lg:col-span-5">
              <p className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-600">{product.categoryLabel}</p>
              <h1 id="produto-title" className="mt-3 font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540] sm:text-[40px] sm:leading-[48px]">
                {product.name}
              </h1>
              {/* Resumo só aparece se não repetir a descrição (vários produtos têm o mesmo texto nos dois campos). */}
              {product.tagline && !(product.description || '').trim().startsWith(product.tagline.trim().slice(0, 40)) && (
                <p className="mt-4 text-base leading-6 text-zinc-600">{product.tagline}</p>
              )}

              {/* Preço */}
              <div className="mt-6 border-t border-zinc-200 pt-6">
                {hasPrice ? (
                  <>
                    <p className="flex items-baseline gap-3">
                      <span className="font-display text-[40px] font-light leading-[48px] text-zinc-900">R$ {formatPrice(product.price)}</span>
                      {discount > 0 && (
                        <span className="text-base text-zinc-600 line-through">
                          <span className="sr-only">de </span>R$ {formatPrice(product.originalPrice!)}
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="font-display text-[32px] font-light leading-10 text-zinc-900">Sob orçamento</p>
                )}
              </div>

              {/* Cores */}
              {product.colors.length > 1 && (
                <div className="mt-6">
                  <p className="text-sm leading-5 text-zinc-700">
                    Cor: <strong className="font-semibold text-zinc-900">{selectedColor?.name}</strong>
                  </p>
                  <div role="group" aria-label="Cores disponíveis" className="mt-3 flex flex-wrap gap-2">
                    {product.colors.map(col => {
                      const active = selectedColor?.name === col.name;
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => chooseColor(col)}
                          aria-label={`Cor ${col.name}`}
                          aria-pressed={active}
                          className="grid h-11 w-11 place-items-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]"
                        >
                          <span
                            className={cn('h-8 w-8 rounded-full ring-1 ring-inset ring-black/12', active && 'shadow-[0_0_0_2px_#fff,0_0_0_4px_#0A2540]')}
                            style={{ backgroundColor: col.hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="mt-8 flex flex-col gap-3">
                {hasPrice ? (
                  <>
                    <div className="flex gap-3">
                      {quantityControl}
                      <ButtonWithIcon onClick={handleAddToCart} icon={added ? Check : ShoppingBag} className="flex-1">
                        {added ? 'Adicionado' : 'Adicionar ao carrinho'}
                      </ButtonWithIcon>
                    </div>
                    <ButtonWithIcon onClick={handleBuyNow} variant="dark" className="w-full">Comprar agora</ButtonWithIcon>
                  </>
                ) : (
                  <ButtonWithIcon to="/custom" variant="dark" className="w-full">Pedir orçamento desta peça</ButtonWithIcon>
                )}
                <span role="status" className="sr-only">{added ? `${product.name} adicionado ao carrinho` : ''}</span>
              </div>

              {/* Prazo e pagamento */}
              <ul className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#F6F1E7] p-4">
                {product.leadTime && (
                  <li className="flex items-center gap-3 text-sm leading-5 text-zinc-800">
                    <Clock aria-hidden="true" className="h-5 w-5 shrink-0 text-[#0A2540]" />
                    <span>Prazo de produção: <strong className="font-semibold">{product.leadTime}</strong></span>
                  </li>
                )}
                <li className="flex items-center gap-3 text-sm leading-5 text-zinc-800">
                  <MessageCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-[#0A2540]" />
                  <span>Pagamento e entrega combinados pelo WhatsApp</span>
                </li>
              </ul>

              {/* Detalhes em sanfona */}
              <div className="mt-8 border-t border-zinc-200">
                {sections.map(s => {
                  const open = openSection === s.id;
                  return (
                    <div key={s.id} className="border-b border-zinc-200">
                      <h2>
                        <button
                          type="button"
                          onClick={() => setOpenSection(open ? null : s.id)}
                          aria-expanded={open}
                          aria-controls={`sec-${s.id}`}
                          className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold leading-6 text-zinc-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]"
                        >
                          {s.title}
                          <span
                            aria-hidden="true"
                            className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-300 motion-reduce:transition-none', open ? 'rotate-45 bg-amber-400 text-[#061A30]' : 'bg-zinc-100 text-[#0A2540]')}
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                        </button>
                      </h2>
                      <div
                        id={`sec-${s.id}`}
                        className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
                      >
                        <div className="overflow-hidden" inert={!open}>
                          <div className="pb-6 text-base leading-6 text-zinc-700">{s.content}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Relacionados (mar) */}
      {related.length > 0 && (
        <section aria-labelledby="relacionados-title" className="bg-[#EAF3F9] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
                  <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
                  Da mesma coleção
                </p>
                <h2 id="relacionados-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px]">
                  <span className="block">Você também</span>
                  <span className="block text-amber-700">pode gostar.</span>
                </h2>
              </div>
              <ButtonWithIcon to={`/catalog?cat=${product.category}`} variant="outline">Ver a coleção</ButtonWithIcon>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {related.map(rel => (
                <div key={rel.id} className="flex"><ProductCard product={rel} /></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Barra de compra no celular */}
      {hasPrice && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-[#061A30] px-4 py-3 text-white shadow-[0_-8px_24px_rgba(6,26,48,0.24)] md:hidden">
          <div className="min-w-0">
            <span className="block text-xs leading-4 text-white/72">{quantity > 1 ? `${quantity} unidades` : 'Preço'}</span>
            <span className="block whitespace-nowrap text-lg font-semibold leading-7">R$ {formatPrice(product.price * quantity)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={added ? `${product.name} adicionado ao carrinho` : `Adicionar ${product.name} ao carrinho`}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/8 text-white ring-1 ring-inset ring-white/24 focus-visible:outline-2 focus-visible:outline-amber-300 cursor-pointer"
            >
              {added ? <Check aria-hidden="true" className="h-5 w-5 text-amber-300" /> : <ShoppingBag aria-hidden="true" className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="inline-flex h-12 items-center rounded-full bg-amber-400 px-6 text-sm font-semibold leading-5 text-[#061A30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer"
            >
              Comprar agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
