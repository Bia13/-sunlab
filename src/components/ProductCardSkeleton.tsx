import React from 'react';

/*
 * Esqueleto do ProductCard: mesma estrutura e medidas (foto 1:1, cores 16px,
 * categoria 16 + nome 24 + descrição 20 com 4px entre, botão 40px). Assim a grade
 * não pula de altura quando os produtos chegam.
 * O brilho que passa usa o keyframe `shimmer` do index.css e some com "reduzir movimento".
 */
const bar = 'rounded-md bg-zinc-200/80';

export const ProductCardSkeleton: React.FC = () => (
  <div aria-hidden="true" className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70">
    <div className="aspect-square w-full bg-gradient-to-b from-[#E7E5E0] to-[#F5F4F1]" />
    <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
      <div className="flex h-4 items-center gap-2">
        <span className="h-4 w-4 rounded-full bg-zinc-200/80" />
        <span className="h-4 w-4 rounded-full bg-zinc-200/80" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="flex h-4 items-center"><span className={`${bar} h-3 w-20`} /></span>
        <span className="flex h-6 items-center"><span className={`${bar} h-4 w-3/4`} /></span>
        <span className="flex h-5 items-center"><span className={`${bar} h-3 w-11/12`} /></span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className={`${bar} h-5 w-20`} />
        <span className="h-10 w-10 rounded-full bg-zinc-200/80" />
      </div>
    </div>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,transparent_20%,rgba(255,255,255,0.64)_50%,transparent_80%)] bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite] motion-reduce:hidden" />
  </div>
);

export default ProductCardSkeleton;
