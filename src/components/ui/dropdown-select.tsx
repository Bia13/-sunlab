import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Dropdown de escolha única (adaptado do "Dropdown Menu" de chetanverma16, com framer-motion):
 * - Botão em pílula com a seta que gira; o painel abre saindo de um desfoque, levemente menor
 *   e subindo, e as opções entram uma a uma vindo da direita (como na referência).
 * - Painel marinho (como o modal de produto), opção escolhida com check âmbar.
 * - Acessível (padrão "listbox"): botão com aria-haspopup/aria-expanded; lista com role="listbox"
 *   e opções role="option" + aria-selected. Teclado: ↑ ↓ Home End para andar, Enter/Espaço escolhe,
 *   Esc fecha e devolve o foco ao botão. Clique fora fecha. "Reduzir movimento": só aparece.
 * - Contraste: texto branco sobre marinho ≥ 15:1. Alvos de 48px (botão) e 40px (opções).
 */
export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  /** Texto à direita da opção (ex.: quantidade de produtos). */
  hint?: string | number;
};

interface DropdownSelectProps<T extends string> {
  /** Nome do filtro, visível no botão e lido pelo leitor de tela. */
  label: string;
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Alinha o painel à esquerda ou à direita do botão. */
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownSelect<T extends string>({ label, options, value, onChange, align = 'left', className }: DropdownSelectProps<T>) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find(o => o.value === value) ?? options[0];
  const isDefault = value === options[0]?.value;

  // Clique fora fecha.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Ao abrir, foca a lista e marca a opção escolhida.
  useEffect(() => {
    if (open) {
      setActiveIndex(Math.max(0, options.findIndex(o => o.value === value)));
      listRef.current?.focus();
    }
  }, [open, options, value]);

  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIndex(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIndex(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(activeIndex); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); if (e.key === 'Escape') buttonRef.current?.focus(); }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className={cn(
          'inline-flex h-12 w-full items-center justify-between gap-2 whitespace-nowrap rounded-full px-5 text-sm leading-5 transition-colors cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]',
          isDefault
            ? 'bg-white text-zinc-800 ring-1 ring-inset ring-zinc-300 hover:ring-[#0A2540]'
            : 'bg-[#0A2540] text-white'
        )}
      >
        {/* Em botões estreitos (celular) o texto corta com "…" e a seta continua à vista. */}
        <span className="min-w-0 truncate">
          <span className={cn(isDefault ? 'text-zinc-600' : 'text-white/72')}>{label}: </span>
          <span className="font-semibold">{selected?.label}</span>
        </span>
        <motion.span aria-hidden="true" className="shrink-0" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-opt-${activeIndex}`}
            onKeyDown={onListKey}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: 'circInOut', type: 'spring' }}
            className={cn(
              'absolute top-full z-30 mt-2 flex min-w-full w-max max-w-72 flex-col gap-1 rounded-2xl bg-[#061A30]/96 p-1 text-white shadow-[0_16px_40px_-12px_rgba(6,26,48,0.5)] ring-1 ring-white/8 backdrop-blur-md outline-none',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
            )}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              const isActive = i === activeIndex;
              return (
                <motion.li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActiveIndex(i)}
                  initial={reduceMotion ? false : { opacity: 0, x: 10, scale: 0.95, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={reduceMotion ? undefined : { opacity: 0, x: 10, scale: 0.95, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, delay: reduceMotion ? 0 : i * 0.06, ease: 'easeInOut', type: 'spring' }}
                  className={cn(
                    'flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm leading-5 transition-colors',
                    isActive ? 'bg-white/12' : 'hover:bg-white/8',
                    isSelected ? 'font-semibold text-white' : 'text-white/88'
                  )}
                >
                  <span aria-hidden="true" className="grid h-4 w-4 place-items-center text-amber-300">
                    {isSelected && <Check className="h-4 w-4" strokeWidth={2.5} />}
                  </span>
                  <span className="flex-1">{o.label}</span>
                  {o.hint !== undefined && <span className="font-mono text-xs leading-4 text-white/64">{o.hint}</span>}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DropdownSelect;
