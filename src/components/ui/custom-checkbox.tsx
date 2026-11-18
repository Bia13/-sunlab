import * as React from 'react';
import { cn } from '@/lib/utils';

/*
 * Checkbox (adaptado do "Custom Checkbox" de Edil-ozi, variante padrão), nas cores da SunLab.
 * - É um <input type="checkbox"> de verdade: funciona com clique, Espaço, leitor de tela e formulários.
 * - Caixa de 24px com cantos arredondados; ao marcar, fundo marinho e o "check" branco cresce.
 * - Ao clicar para marcar, um anel âmbar pulsa para fora (o ::after), como na referência.
 * - Foco do teclado visível (contorno âmbar escuro). Com "reduzir movimento", sem animação.
 * - Contraste: borda zinc-400 sobre branco ≈ 3:1 (WCAG 1.4.11); check branco sobre marinho ≈ 15:1.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        // Caixa
        'relative box-border block h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-md border border-zinc-400 bg-white transition-all duration-300',
        // Check (desenhado com bordas do ::before), escondido até marcar
        "before:absolute before:left-1/2 before:top-[42%] before:h-[10px] before:w-[6px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:scale-0 before:border-b-2 before:border-r-2 before:border-solid before:border-b-white before:border-r-white before:opacity-0 before:transition-all before:delay-100 before:duration-100 before:ease-in before:content-['']",
        // Anel que pulsa no clique
        "after:absolute after:inset-0 after:rounded-[7px] after:opacity-0 after:shadow-[0_0_0_12px_rgba(251,191,36,0.55)] after:transition-all after:duration-500 after:ease-in after:content-['']",
        // Marcado
        'checked:border-transparent checked:bg-[#0A2540] checked:before:scale-[1.4] checked:before:opacity-100 checked:before:delay-100 checked:before:duration-200',
        // Hover, foco e clique
        'hover:border-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600',
        '[&:active:not(:checked)]:after:opacity-100 [&:active:not(:checked)]:after:shadow-none [&:active:not(:checked)]:after:transition-none',
        // Desativado e "reduzir movimento"
        'disabled:cursor-not-allowed disabled:opacity-50',
        'motion-reduce:transition-none motion-reduce:before:transition-none motion-reduce:after:hidden',
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
