/*
 * "Voar para o carrinho": ao adicionar um produto, uma cópia da foto sai de onde ela está,
 * faz um arco para cima, encolhe virando um círculo e "entra" no botão do carrinho da barra do topo
 * (marcado com data-cart-target). No fim, o carrinho dá um pulinho.
 *
 * - Usa a Web Animations API (sem biblioteca) e só anima transform/opacity (leve).
 * - É decorativo: a cópia tem aria-hidden e não recebe clique. O aviso para leitor de tela
 *   continua sendo o texto "adicionado ao carrinho" de quem chamou.
 * - Com "reduzir movimento" ligado, não anima nada.
 */
export function flyToCart(source: HTMLElement | null, imageSrc: string) {
  if (!source || typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Mede a foto agora; o carrinho é medido logo depois, quando o contador já atualizou
  // (o botão fica mais largo com o número e o centro dele muda).
  const from = source.getBoundingClientRect();
  if (!from.width) return;
  window.setTimeout(() => launch(from, imageSrc), 0);
}

function launch(from: DOMRect, imageSrc: string) {
  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  if (!target) return;
  const to = target.getBoundingClientRect();
  if (!to.width) return;

  // A cópia começa quadrada, centrada na foto (no máximo 160px para não cobrir a tela).
  const size = Math.min(from.width, from.height, 160);
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - (startX + size / 2);
  const dy = to.top + to.height / 2 - (startY + size / 2);

  const flyer = document.createElement('img');
  flyer.src = imageSrc;
  flyer.alt = '';
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '16px',
    zIndex: '70',
    pointerEvents: 'none',
    boxShadow: '0 16px 40px -12px rgba(6, 26, 48, 0.5)',
    willChange: 'transform, opacity'
  } as CSSStyleDeclaration);
  document.body.appendChild(flyer);

  // Arco: no meio do caminho sobe um pouco acima da linha reta.
  const lift = Math.min(160, Math.abs(dy) * 0.4 + 60);
  const animation = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '16px' },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.55)`, opacity: 1, borderRadius: '32px', offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.4, borderRadius: '50%' }
    ],
    { duration: 820, easing: 'cubic-bezier(0.55, 0, 0.45, 1)', fill: 'forwards' }
  );

  const finish = () => {
    flyer.remove();
    // Pulinho do carrinho ao "receber" o produto.
    target.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'ease-out' }
    );
  };
  animation.onfinish = finish;
  animation.oncancel = () => flyer.remove();
}
