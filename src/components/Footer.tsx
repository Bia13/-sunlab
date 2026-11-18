import React, { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Check, Mail, Plus } from 'lucide-react';
import SunLabLogo from './SunLabLogo';
import { CATEGORIES } from '@/data/products';
import { cn } from '@/lib/utils';

/*
 * Footer em duas partes (inspirado na referência "atelier forma"):
 * 1. Faixa marinho com a chamada de novidades e 10% off: título grande centralizado,
 *    campo de e-mail sublinhado e botão em texto com seta.
 * 2. Rodapé claro: logo + descrição, três colunas de links (sanfona no celular),
 *    linha de baixo e o "SunLab" grande sumindo no fundo (wordmark da versão anterior).
 * Contraste: branco/80 sobre marinho ≈ 12:1; links zinc-600 sobre branco ≈ 7:1.
 * Grid de 4px; alvos de toque com 40-48px.
 */

const WHATSAPP_URL = 'https://wa.me/5513996061681';
const INSTAGRAM_URL = 'https://www.instagram.com/sunlab013/';

type FooterLink = { label: string; to: string; external?: boolean };
type Column = { title: string; links: FooterLink[] };

const COLUMNS: Column[] = [
  {
    title: 'Explorar',
    links: [
      { label: 'Loja', to: '/catalog' },
      ...CATEGORIES.filter(c => c.id !== 'all').map(c => ({ label: c.name, to: `/catalog?cat=${c.id}` }))
    ]
  },
  {
    title: 'Ajuda',
    links: [
      { label: 'Meus pedidos', to: '/orders' },
      { label: 'Peça personalizada', to: '/custom' },
      { label: 'Contato', to: '/contact' },
      { label: 'Sobre a SunLab', to: '/aboutus' }
    ]
  },
  {
    title: 'Encontre a gente',
    links: [
      { label: 'Instagram', to: INSTAGRAM_URL, external: true },
      { label: 'WhatsApp', to: WHATSAPP_URL, external: true }
    ]
  }
];

const linkClass =
  'inline-flex min-h-10 items-center gap-1 text-sm leading-5 text-zinc-600 transition-colors hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] md:min-h-8';

const headingClass = 'text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-900';

const FooterColumn: React.FC<{ column: Column }> = ({ column }) => {
  const [open, setOpen] = useState(false);
  const id = `footer-${column.title.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`;
  return (
    <div className="border-b border-zinc-200 md:border-0">
      <h3>
        {/* Celular: sanfona. Desktop: só o título. */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={id}
          className={cn(headingClass, 'flex h-12 w-full items-center justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] md:hidden')}
        >
          {column.title}
          <Plus aria-hidden="true" className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', open && 'rotate-45')} />
        </button>
        <span className={cn(headingClass, 'hidden md:block')}>{column.title}</span>
      </h3>
      <ul id={id} className={cn('pb-4 md:mt-4 md:block md:pb-0', open ? 'block' : 'hidden')}>
        {column.links.map(l => (
          <li key={l.label}>
            {l.external ? (
              <a href={l.to} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {l.label}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            ) : (
              <Link to={l.to} className={linkClass}>{l.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  // Só para o visual do botão ("acende" quando o e-mail parece válido); a validação real é a do navegador.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 6000);
      setEmail('');
    }
  };

  return (
    <footer className="mt-auto w-full">
      {/* 1. Chamada de novidades */}
      <section aria-labelledby="newsletter-title" className="bg-[#061A30] text-white">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6 lg:py-24">
          <p className="text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
            Direto no seu e-mail
          </p>
          <h2
            id="newsletter-title"
            className="mt-4 font-display text-[32px] font-extrabold leading-10 tracking-tight sm:text-5xl sm:leading-[56px]"
          >
            Novidades e 10% off
          </h2>
          <p className="mt-4 text-base leading-6 text-white/80">
            Deixe seu e-mail e ganhe um cupom para a primeira compra.
          </p>

          <form onSubmit={handleSubscribe} className="mt-8 w-full max-w-md">
            <label htmlFor="footer-email" className="sr-only">Seu e-mail</label>
            {/* Campo em pílula (inspirado no "AI Input"): fundo suave, botão dentro à direita que
                "acende" em âmbar quando o e-mail está válido. Foco: anel âmbar no campo todo.
                Altura 56px; botão 44px (acima dos 24px do WCAG 2.5.8). */}
            <div
              className={cn(
                'group/field flex h-14 items-center gap-2 rounded-full bg-white/8 p-1.5 pl-4 ring-1 sm:pl-6 ring-inset transition-[box-shadow,background-color] duration-300 motion-reduce:transition-none',
                'focus-within:bg-white/12 focus-within:ring-2 focus-within:ring-amber-300',
                emailValid ? 'ring-white/32' : 'ring-white/16 hover:ring-white/24'
              )}
            >
              <Mail aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-white/64 sm:block transition-colors group-focus-within/field:text-amber-300" />
              <input
                id="footer-email"
                required
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-full min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/64 outline-none"
              />
              <button
                type="submit"
                className={cn(
                  'inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold uppercase leading-4 tracking-[0.06em] sm:px-4 sm:tracking-[0.12em] transition-[background-color,color,box-shadow] duration-300 cursor-pointer motion-reduce:transition-none',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
                  // Vazio/ inválido: discreto. Válido: âmbar cheio (marinho sobre âmbar ≈ 11:1).
                  emailValid
                    ? 'bg-amber-400 text-[#061A30] shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)] hover:bg-amber-300'
                    : 'bg-white/8 text-white/80 hover:bg-white/16 hover:text-white'
                )}
              >
                Quero o cupom
                <ArrowUpRight
                  aria-hidden="true"
                  className={cn('h-4 w-4 transition-transform duration-300 motion-reduce:transition-none', emailValid && 'translate-x-0.5 -translate-y-0.5')}
                />
              </button>
            </div>
            <p role="status" className="mt-4 min-h-6 text-base leading-6 text-emerald-300">
              {subscribed && (
                <span className="inline-flex items-center gap-2">
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Pronto! Use o cupom <strong className="font-semibold text-white">SUNLAB10</strong> no carrinho.
                </span>
              )}
            </p>
          </form>
        </div>
      </section>

      {/* 2. Rodapé claro */}
      <div className="relative overflow-hidden bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <Link
                to="/"
                aria-label="SunLab, voltar ao início"
                className="inline-block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A2540]"
              >
                <SunLabLogo size="md" />
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-600">
                Impressão 3D feita em Santos, SP. Peças autorais e personalizadas para você e para a sua marca.
              </p>
              <p className="mt-4 flex items-center gap-2 text-sm leading-5 text-zinc-600">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                Pedidos e orçamentos pelo WhatsApp
              </p>
            </div>

            <nav aria-label="Rodapé" className="grid md:grid-cols-3 md:gap-8 lg:col-span-8">
              {COLUMNS.map(col => <FooterColumn key={col.title} column={col} />)}
            </nav>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-zinc-200 py-6 text-xs leading-4 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} SunLab Impressões 3D. Todos os direitos reservados.</p>
            <p>Pagamento combinado direto no WhatsApp</p>
          </div>
        </div>

        {/* Wordmark: "SunLab" grande sumindo no fundo. Decorativo. */}
        <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden">
          <p className="mx-auto max-w-7xl translate-y-[16%] px-2 text-center font-display text-[clamp(96px,24vw,360px)] font-extrabold leading-[0.8] tracking-[-0.06em]">
            <span className="bg-gradient-to-b from-[#0A2540]/12 to-[#0A2540]/0 bg-clip-text text-transparent">Sun</span>
            <span className="bg-gradient-to-b from-amber-400/32 to-amber-400/0 bg-clip-text text-transparent">Lab</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
