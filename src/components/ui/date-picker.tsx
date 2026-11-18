import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateLong } from '@/lib/format-date';

/*
 * Seletor de data (calendário) no design da SunLab.
 * - Campo em pílula branca com ícone; abre um painel com o mês em português.
 * - Dias antes de `min` ficam desativados; hoje tem anel âmbar; o dia escolhido fica marinho.
 * - Teclado (padrão de "date picker dialog" do WAI-ARIA): ← → ↑ ↓ andam pelos dias,
 *   Page Up/Down trocam o mês, Home/End vão ao começo/fim da semana, Enter/Espaço escolhem,
 *   Esc fecha e devolve o foco ao campo. Clique fora fecha.
 * - Botão de limpar (o campo é opcional). "Reduzir movimento": painel só aparece.
 * - Contraste: texto zinc-900 sobre branco; dia escolhido branco sobre marinho ≈ 15:1. Dias com 40px.
 */

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAYS_FULL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
};


interface DatePickerProps {
  id: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  min?: Date;
  placeholder?: string;
  describedBy?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ id, value, onChange, min, placeholder = 'Escolher data', describedBy }) => {
  const reduceMotion = useReducedMotion();
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDay = min ? startOfDay(min) : undefined;
  const [open, setOpen] = useState(false);
  const [focusDay, setFocusDay] = useState<Date>(value ?? today);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const isDisabled = (d: Date) => !!minDay && d < minDay;

  // Clique fora fecha.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Ao abrir, começa no dia escolhido (ou hoje / primeiro dia permitido).
  useEffect(() => {
    if (open) {
      const start = value ?? (minDay && today < minDay ? minDay : today);
      setFocusDay(start);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantém o foco do teclado no dia "ativo".
  useEffect(() => {
    if (!open) return;
    const btn = gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay.toDateString()}"]`);
    btn?.focus();
  }, [focusDay, open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(d);
    close();
  };

  // Dias do mês visível (semanas completas, começando no domingo).
  const month = new Date(focusDay.getFullYear(), focusDay.getMonth(), 1);
  const gridStart = addDays(month, -month.getDay());
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i));
    if (w > 3 && row[0].getMonth() !== month.getMonth()) break;
    weeks.push(row);
  }
  const monthLabel = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const prevDisabled = !!minDay && new Date(month.getFullYear(), month.getMonth(), 0) < minDay;

  const onGridKey = (e: React.KeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      PageUp: () => addMonths(focusDay, -1),
      PageDown: () => addMonths(focusDay, 1),
      Home: () => addDays(focusDay, -focusDay.getDay()),
      End: () => addDays(focusDay, 6 - focusDay.getDay())
    };
    if (map[e.key]) {
      e.preventDefault();
      const next = map[e.key]();
      setFocusDay(minDay && next < minDay ? minDay : next);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(focusDay);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); close(); } }}
    >
      <div className="flex h-12 w-full items-center rounded-2xl bg-white ring-1 ring-inset ring-zinc-300 transition-shadow focus-within:ring-2 focus-within:ring-[#0A2540]">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-describedby={describedBy}
          className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 text-left text-base outline-none cursor-pointer"
        >
          <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-600" />
          <span className={cn('truncate', value ? 'text-zinc-900' : 'text-zinc-500')}>
            {value ? formatDateLong(value) : placeholder}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); triggerRef.current?.focus(); }}
            aria-label="Limpar data"
            className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full z-30 mt-2 w-[320px] max-w-[calc(100vw-32px)] origin-top-left rounded-3xl bg-white p-4 shadow-[0_24px_48px_-16px_rgba(10,37,64,0.32)] ring-1 ring-zinc-200"
          >
            {/* Cabeçalho do mês */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setFocusDay(d => addMonths(d, -1))}
                disabled={prevDisabled}
                aria-label="Mês anterior"
                className="grid h-10 w-10 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-32 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
              >
                <ChevronLeft aria-hidden="true" className="h-5 w-5" />
              </button>
              <p id={titleId} aria-live="polite" className="text-base font-semibold leading-6 text-[#0A2540] first-letter:uppercase">
                {monthLabel}
              </p>
              <button
                type="button"
                onClick={() => setFocusDay(d => addMonths(d, 1))}
                aria-label="Próximo mês"
                className="grid h-10 w-10 place-items-center rounded-full text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
              >
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            {/* Grade de dias */}
            <div ref={gridRef} role="grid" aria-labelledby={titleId} onKeyDown={onGridKey} className="mt-3">
              <div role="row" className="grid grid-cols-7">
                {WEEKDAYS.map((w, i) => (
                  <span key={i} role="columnheader" aria-label={WEEKDAYS_FULL[i]} className="grid h-8 place-items-center text-xs font-semibold leading-4 text-zinc-600">
                    {w}
                  </span>
                ))}
              </div>
              {weeks.map((row, r) => (
                <div key={r} role="row" className="grid grid-cols-7">
                  {row.map(d => {
                    const inMonth = d.getMonth() === month.getMonth();
                    const disabled = isDisabled(d);
                    const selected = sameDay(d, value);
                    const isToday = sameDay(d, today);
                    const focused = sameDay(d, focusDay);
                    return (
                      <span key={d.toDateString()} role="gridcell" aria-selected={selected} className="grid place-items-center py-0.5">
                        <button
                          type="button"
                          data-day={d.toDateString()}
                          tabIndex={focused ? 0 : -1}
                          disabled={disabled}
                          onClick={() => choose(d)}
                          aria-label={`${formatDateLong(d)}${isToday ? ', hoje' : ''}`}
                          aria-current={isToday ? 'date' : undefined}
                          className={cn(
                            'grid h-10 w-10 place-items-center rounded-full text-sm leading-5 transition-colors cursor-pointer',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]',
                            selected
                              ? 'bg-[#0A2540] font-semibold text-white'
                              : disabled
                                ? 'cursor-not-allowed text-zinc-400 line-through decoration-zinc-300'
                                : inMonth
                                  ? 'text-zinc-900 hover:bg-[#F6F1E7]'
                                  : 'text-zinc-500 hover:bg-[#F6F1E7]',
                            isToday && !selected && 'ring-2 ring-inset ring-amber-400 font-semibold'
                          )}
                        >
                          {d.getDate()}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
              <button
                type="button"
                onClick={() => choose(minDay && today < minDay ? minDay : today)}
                className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-[#0A2540] hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatePicker;
