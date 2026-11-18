import * as React from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

/**
 * Abas de navegação no estilo Vercel: um realce que desliza até o item sob o mouse
 * (ou com foco do teclado) e uma linha fina que marca a página atual.
 *
 * Diferenças do componente original (que usava <div> clicável):
 * - Cada item é um link de verdade (<Link>) ou um <button>, então funciona com Tab/Enter
 *   e leitores de tela; a página atual recebe aria-current="page".
 * - A aba ativa vem de fora (rota atual), não de um estado interno.
 * - O realce também segue o foco do teclado, e as posições são recalculadas quando a
 *   largura muda (fonte carregando, janela redimensionada).
 * - Com "reduzir movimento", realce e linha mudam sem deslizar.
 */
export interface NavTab {
  id: string;
  label: string;
  /** Destino do link. Sem `to`, o item vira um botão (ex.: abrir um menu). */
  to?: string;
  onClick?: () => void;
  /** Conteúdo depois do rótulo (ex.: seta de menu). */
  trailing?: React.ReactNode;
  /** Painel ancorado no item (ex.: menu suspenso). */
  panel?: React.ReactNode;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: NavTab[];
  activeTab?: string | null;
}

type Box = { left: number; width: number };

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, tabs, activeTab, ...props }, ref) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const itemRefs = useRef<(HTMLElement | null)[]>([]);
    const listRef = useRef<HTMLDivElement>(null);

    const measure = useCallback(() => {
      setBoxes(itemRefs.current.map(el => (el ? { left: el.offsetLeft, width: el.offsetWidth } : { left: 0, width: 0 })));
    }, []);

    useLayoutEffect(() => {
      measure();
      const ro = new ResizeObserver(measure);
      if (listRef.current) ro.observe(listRef.current);
      document.fonts?.ready.then(measure).catch(() => {});
      return () => ro.disconnect();
    }, [measure, tabs.length]);

    const activeIndex = tabs.findIndex(t => t.id === activeTab);
    const hoverBox = hovered !== null ? boxes[hovered] : undefined;
    const activeBox = activeIndex >= 0 ? boxes[activeIndex] : undefined;

    const itemClass = (active: boolean) =>
      cn(
        'relative z-10 flex h-8 items-center gap-1 rounded-lg px-3 text-sm font-medium leading-5 whitespace-nowrap transition-colors duration-300 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]',
        active ? 'text-[#0A2540]' : 'text-slate-600 hover:text-[#0A2540]'
      );

    return (
      <div ref={ref} className={cn('relative flex items-center', className)} {...props}>
        <div ref={listRef} className="relative flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
          {/* Realce sob o mouse/foco */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-8 -translate-y-1/2 rounded-lg bg-[#0A2540]/6 transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ left: hoverBox?.left ?? 0, width: hoverBox?.width ?? 0, opacity: hoverBox ? 1 : 0 }}
          />

          {tabs.map((tab, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={tab.id}
                ref={el => { itemRefs.current[i] = el; }}
                className="relative"
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null); }}
              >
                {tab.to ? (
                  <Link
                    to={tab.to}
                    aria-current={active ? 'page' : undefined}
                    onClick={tab.onClick}
                    className={itemClass(active)}
                  >
                    {tab.label}
                    {tab.trailing}
                  </Link>
                ) : (
                  <button type="button" onClick={tab.onClick} {...tab.buttonProps} className={itemClass(active)}>
                    {tab.label}
                    {tab.trailing}
                  </button>
                )}
                {tab.panel}
              </div>
            );
          })}
        </div>

        {/* Linha da página atual: encosta na borda de baixo da barra. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px h-0.5 rounded-full bg-[#0A2540] transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ left: activeBox?.left ?? 0, width: activeBox?.width ?? 0, opacity: activeBox ? 1 : 0 }}
        />
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';

export default Tabs;
