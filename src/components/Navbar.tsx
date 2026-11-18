import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Search, ShoppingBag, Menu, X, ChevronDown, User, ShieldCheck, LogOut, Package } from 'lucide-react';
import SunLabLogo from './SunLabLogo';
import { Tabs, type NavTab } from '@/components/ui/vercel-tabs';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { CATEGORIES } from '@/data/products';
import { cn } from '@/lib/utils';

/*
 * Barra do topo: limpa e direta.
 * - Mesma largura e respiro do conteúdo (max-w-7xl + px-4/6/8), então logo e título da hero se alinham.
 * - Altura fixa de 64px; todos os alvos de toque com 40px (acima dos 24px do WCAG 2.5.8).
 * - Desktop: abas no estilo Vercel (realce que desliza + linha na página atual).
 * - Ações à direita só com ícone e nome acessível; o carrinho é o único botão cheio (ação principal).
 * - Nada piscando: saíram o ponto pulsando de "Personalizados" e o pulo do contador do carrinho.
 */

const CATEGORY_LINKS = CATEGORIES.filter(c => c.id !== 'all');

const iconButton =
  'relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] cursor-pointer';

export const Navbar: React.FC = () => {
  const { totalItems, openCart, openSearch } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fecha menus ao trocar de página.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoryOpen(false);
  }, [location.pathname, location.search]);

  // Página nova sempre abre no topo (o React Router não faz isso sozinho).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Clique na logo, numa aba, numa categoria ou no menu do celular que aponta para a página
  // em que a pessoa JÁ está: rola suave até o topo. Um handler só, no <header> inteiro.
  const handleSamePageClick = (e: React.MouseEvent<HTMLElement>) => {
    const link = (e.target as HTMLElement).closest('a');
    if (!link || link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' });
      setIsMobileMenuOpen(false);
      setIsCategoryOpen(false);
    }
  };

  // Esc fecha qualquer menu aberto; clique fora fecha o de categorias.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setIsCategoryOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const path = location.pathname;
  const activeTab =
    path === '/' || path === '/home' ? 'home'
    : path.startsWith('/catalog') || path.startsWith('/product') ? 'catalog'
    : path === '/custom' ? 'custom'
    : path === '/aboutus' ? 'about'
    : path === '/contact' ? 'contact'
    : null;

  const tabs: NavTab[] = [
    { id: 'home', label: 'Início', to: '/' },
    { id: 'catalog', label: 'Loja', to: '/catalog' },
    {
      id: 'categories',
      label: 'Categorias',
      onClick: () => setIsCategoryOpen(o => !o),
      buttonProps: { 'aria-expanded': isCategoryOpen, 'aria-controls': 'menu-categorias' },
      trailing: (
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 text-slate-500 transition-transform motion-reduce:transition-none', isCategoryOpen && 'rotate-180')}
        />
      ),
      panel: isCategoryOpen ? (
        <div
          id="menu-categorias"
          className="absolute left-0 top-full z-50 mt-4 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_48px_-16px_rgba(10,37,64,0.24)] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {CATEGORY_LINKS.map(cat => (
            <Link
              key={cat.id}
              to={`/catalog?cat=${cat.id}`}
              className="flex flex-col gap-0.5 rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0A2540]"
            >
              <span className="text-sm font-semibold leading-5 text-[#0A2540]">{cat.name}</span>
              <span className="text-xs leading-4 text-slate-600">{cat.label}</span>
            </Link>
          ))}
        </div>
      ) : null
    },
    { id: 'custom', label: 'Personalizados', to: '/custom' },
    { id: 'about', label: 'Sobre', to: '/aboutus' },
    { id: 'contact', label: 'Contato', to: '/contact' }
  ];

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-12 items-center rounded-xl px-4 text-base font-medium transition-colors',
      isActive ? 'bg-slate-100 text-[#0A2540] font-semibold' : 'text-slate-700 hover:bg-slate-50'
    );

  return (
    <header
      onClick={handleSamePageClick}
      className={cn(
        // Linha de baixo feita com sombra (não soma altura): a barra fica com 64px exatos.
        'sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl transition-shadow duration-300',
        scrolled
          ? 'shadow-[0_1px_0_#e2e8f0,0_4px_16px_rgba(10,37,64,0.06)]'
          : 'shadow-[0_1px_0_rgba(226,232,240,0.8)]'
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        {/* Logo: sempre volta ao início. */}
        <Link
          to="/"
          aria-label="SunLab, voltar ao início"
          className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A2540]"
        >
          <SunLabLogo size="sm" />
        </Link>

        {/* Abas (desktop) */}
        <nav aria-label="Principal" className="hidden h-full lg:flex" ref={categoryRef}>
          <Tabs tabs={tabs} activeTab={activeTab} className="h-full" />
        </nav>

        {/* Ações */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={openSearch} className={iconButton} aria-label="Buscar produtos" title="Buscar produtos">
            <Search aria-hidden="true" className="h-5 w-5" />
          </button>

          <NavLink
            to="/orders"
            className={cn(iconButton, 'hidden sm:grid')}
            aria-label="Meus pedidos"
            title="Meus pedidos"
          >
            <Package aria-hidden="true" className="h-5 w-5" />
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className={cn(iconButton, 'hidden sm:grid')} aria-label="Painel administrativo" title="Painel administrativo">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </NavLink>
          )}

          {user ? (
            <button
              type="button"
              onClick={logout}
              className={cn(iconButton, 'hidden sm:grid hover:bg-red-50 hover:text-red-700')}
              aria-label={`Sair da conta de ${user.name.split(' ')[0]}`}
              title="Sair da conta"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </button>
          ) : (
            <NavLink to="/login" className={cn(iconButton, 'hidden sm:grid')} aria-label="Entrar na conta" title="Entrar na conta">
              <User aria-hidden="true" className="h-5 w-5" />
            </NavLink>
          )}

          {/* Carrinho: única ação cheia da barra. Contador marinho sobre âmbar ≈ 11:1. */}
          <button
            type="button"
            onClick={openCart}
            data-cart-target
            aria-label={`Abrir carrinho, ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
            className="relative flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#0A2540] px-3 text-sm font-semibold leading-5 text-white transition-colors hover:bg-[#0F3A66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] cursor-pointer sm:px-4"
          >
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            <span className="hidden xl:inline">Carrinho</span>
            {totalItems > 0 && (
              <span aria-hidden="true" className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-xs font-bold leading-4 text-[#061A30]">
                {totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(o => !o)}
            className={cn(iconButton, 'lg:hidden')}
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="menu-mobile"
          >
            {isMobileMenuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu do celular/tablet */}
      {isMobileMenuOpen && (
        <div id="menu-mobile" className="max-h-[calc(100svh-64px)] overflow-y-auto border-t border-slate-200 bg-white lg:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <nav aria-label="Principal" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            <NavLink to="/" end className={mobileLink}>Início</NavLink>
            <NavLink to="/catalog" className={mobileLink}>Loja</NavLink>

            <p className="px-4 pb-2 pt-4 text-xs font-semibold uppercase leading-4 tracking-wider text-slate-600">Categorias</p>
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {CATEGORY_LINKS.map(cat => (
                <Link
                  key={cat.id}
                  to={`/catalog?cat=${cat.id}`}
                  className="flex h-10 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#0A2540] hover:text-[#0A2540]"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <NavLink to="/custom" className={mobileLink}>Personalizados</NavLink>
            <NavLink to="/aboutus" className={mobileLink}>Sobre</NavLink>
            <NavLink to="/contact" className={mobileLink}>Contato</NavLink>

            <div className="my-2 h-px bg-slate-200" />

            <NavLink to="/orders" className={mobileLink}>
              <Package aria-hidden="true" className="mr-3 h-5 w-5 text-slate-500" />
              Meus pedidos
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={mobileLink}>
                <ShieldCheck aria-hidden="true" className="mr-3 h-5 w-5 text-slate-500" />
                Painel administrativo
              </NavLink>
            )}
            {user ? (
              <button
                type="button"
                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                className="flex h-12 items-center rounded-xl px-4 text-base font-medium text-red-700 transition-colors hover:bg-red-50 cursor-pointer"
              >
                <LogOut aria-hidden="true" className="mr-3 h-5 w-5" />
                Sair da conta ({user.name.split(' ')[0]})
              </button>
            ) : (
              <NavLink to="/login" className={mobileLink}>
                <User aria-hidden="true" className="mr-3 h-5 w-5 text-slate-500" />
                Entrar ou criar conta
              </NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
