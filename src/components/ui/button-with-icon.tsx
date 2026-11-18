import React from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Botão com ícone (adaptado do "Button with Icon" da ShadcnSpace):
 * pílula com o texto e uma bolinha com ícone à direita. No hover (ou foco do teclado) a bolinha
 * desliza para a esquerda girando 45° e o texto troca de lado.
 *
 * Variantes nas cores da SunLab:
 * - primary:   âmbar com bolinha marinho (fundos escuros e claros). Marinho sobre âmbar ≈ 11:1.
 * - secondary: vidro sobre o marinho com bolinha branca (só em fundo escuro). Branco sobre marinho ≈ 15:1.
 * - dark:      marinho com bolinha âmbar (fundos claros). Branco sobre marinho ≈ 15:1.
 * - outline:   contorno cinza com bolinha marinho (ação secundária em fundo claro).
 *
 * Medidas no grid de 4px: altura 48, bolinha 40, respiro 4, texto com 24 de um lado e 56 do outro.
 * Com "reduzir movimento", nada desliza: só a cor muda.
 */
type Variant = 'primary' | 'secondary' | 'dark' | 'outline';

type CommonProps = {
  children: React.ReactNode;
  variant?: Variant;
  icon?: LucideIcon;
  className?: string;
};

type ButtonWithIconProps =
  | (CommonProps & { to: string; href?: never; type?: never; onClick?: () => void })
  | (CommonProps & { href: string; to?: never; type?: never; onClick?: () => void })
  | (CommonProps & { type?: 'button' | 'submit'; to?: never; href?: never; onClick?: () => void; disabled?: boolean });

const variants: Record<Variant, { root: string; badge: string; focus: string }> = {
  primary: {
    root: 'bg-amber-400 text-[#061A30] hover:bg-amber-300',
    badge: 'bg-[#061A30] text-amber-300',
    focus: 'focus-visible:outline-amber-300'
  },
  secondary: {
    root: 'bg-white/8 text-white ring-1 ring-inset ring-white/24 hover:bg-white/16',
    badge: 'bg-white text-[#061A30]',
    focus: 'focus-visible:outline-white'
  },
  dark: {
    root: 'bg-[#0A2540] text-white hover:bg-[#0F3A66]',
    badge: 'bg-amber-400 text-[#061A30]',
    focus: 'focus-visible:outline-[#0A2540]'
  },
  outline: {
    root: 'bg-transparent text-[#0A2540] ring-1 ring-inset ring-zinc-300 hover:ring-[#0A2540]',
    badge: 'bg-[#0A2540] text-white',
    focus: 'focus-visible:outline-[#0A2540]'
  }
};

export const ButtonWithIcon: React.FC<ButtonWithIconProps> = props => {
  const { children, variant = 'primary', icon: Icon = ArrowUpRight, className, onClick } = props;
  const v = variants[variant];

  const classes = cn(
    'group relative inline-flex h-12 w-fit items-center justify-center overflow-hidden whitespace-nowrap rounded-full p-1 ps-6 pe-14',
    'text-sm font-semibold leading-5 transition-all duration-500 ease-out cursor-pointer',
    'hover:ps-14 hover:pe-6 focus-visible:ps-14 focus-visible:pe-6',
    'focus-visible:outline-2 focus-visible:outline-offset-4',
    'motion-reduce:transition-colors motion-reduce:hover:ps-6 motion-reduce:hover:pe-14 motion-reduce:focus-visible:ps-6 motion-reduce:focus-visible:pe-14',
    v.root,
    v.focus,
    className
  );

  const content = (
    <>
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          'absolute right-1 grid h-10 w-10 place-items-center rounded-full transition-all duration-500 ease-out',
          'group-hover:right-[calc(100%-44px)] group-hover:rotate-45 group-focus-visible:right-[calc(100%-44px)] group-focus-visible:rotate-45',
          'motion-reduce:transition-none motion-reduce:group-hover:right-1 motion-reduce:group-hover:rotate-0 motion-reduce:group-focus-visible:right-1 motion-reduce:group-focus-visible:rotate-0',
          v.badge
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
    </>
  );

  if ('to' in props && props.to) {
    return <Link to={props.to} onClick={onClick} className={classes}>{content}</Link>;
  }
  if ('href' in props && props.href) {
    const external = /^https?:/.test(props.href);
    return (
      <a
        href={props.href}
        onClick={onClick}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {content}
        {external && <span className="sr-only">(abre em nova aba)</span>}
      </a>
    );
  }
  return (
    <button
      type={('type' in props && props.type) || 'button'}
      onClick={onClick}
      disabled={'disabled' in props ? props.disabled : undefined}
      className={cn(classes, 'disabled:cursor-wait disabled:opacity-72')}
    >
      {content}
    </button>
  );
};

export default ButtonWithIcon;
