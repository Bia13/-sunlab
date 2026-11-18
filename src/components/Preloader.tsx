import React, { useEffect, useState } from 'react';

/*
 * Preloader "logo em camadas": a logo da SunLab é "impressa" de baixo para cima em 24 camadas,
 * com a linha âmbar do bico subindo a cada camada e um contador "camada 08/24".
 * No fim, a tela sobe como a mesa da impressora e revela o site.
 *
 * Regras (skill site-sem-cara-de-ia + WCAG):
 * - Só na 1ª visita da sessão (sessionStorage); trocar de página não mostra de novo.
 * - ~1,2 s de animação; sai assim que a página terminou de carregar (no máximo ~2,2 s).
 *   Nunca segura um site que já está pronto por mais tempo que isso.
 * - "Reduzir movimento" ligado: não aparece.
 * - aria-hidden: é só visual; o conteúdo da página já está no HTML por baixo.
 * - Fundo areia: a logo tem texto marinho, e no fundo claro mantém o contraste.
 */

const LAYERS = 24;
const LAYER_MS = 48; // 24 × 48ms ≈ 1,15 s
const MAX_MS = 2200;
const STORAGE_KEY = 'sunlab-preloader-shown';

const shouldShow = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
};

export const Preloader: React.FC = () => {
  const [visible] = useState(shouldShow);
  const [layer, setLayer] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(!visible);

  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* sem storage: tudo bem */ }

    // Uma camada por vez.
    const tick = window.setInterval(() => {
      setLayer(l => {
        if (l >= LAYERS) { window.clearInterval(tick); return l; }
        return l + 1;
      });
    }, LAYER_MS);

    // Sai quando a animação acabou E a página carregou; ou no tempo máximo.
    let printed = false;
    let loaded = document.readyState === 'complete';
    const leave = () => setLeaving(true);
    const tryLeave = () => { if (printed && loaded) leave(); };
    const onLoad = () => { loaded = true; tryLeave(); };
    window.addEventListener('load', onLoad);
    const doneTimer = window.setTimeout(() => { printed = true; tryLeave(); }, LAYERS * LAYER_MS + 250);
    const maxTimer = window.setTimeout(leave, MAX_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(doneTimer);
      window.clearTimeout(maxTimer);
      window.removeEventListener('load', onLoad);
    };
  }, [visible]);

  // Depois de subir, sai da página de vez.
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(t);
  }, [leaving]);

  if (gone) return null;

  const progress = layer / LAYERS; // 0 → 1
  const hidden = `${(1 - progress) * 100}%`;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#F6F1E7] transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)]"
      style={{ transform: leaving ? 'translateY(-100%)' : 'translateY(0)' }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-[200px] sm:w-[240px]">
          {/* Contorno "fantasma" da peça ainda não impressa */}
          <img src="/sunlab-logo.png" alt="" className="block w-full opacity-[0.08] grayscale" draggable={false} />

          {/* Parte já impressa: revelada de baixo para cima, camada por camada */}
          <div className="absolute inset-0" style={{ clipPath: `inset(${hidden} 0 0 0)` }}>
            <img src="/sunlab-logo.png" alt="" className="block w-full" draggable={false} />
            {/* Linhas de camada por cima da parte impressa */}
            <div className="absolute inset-0 [background-image:repeating-linear-gradient(to_bottom,transparent_0px,transparent_3px,rgba(246,241,231,0.35)_3px,rgba(246,241,231,0.35)_4px)]" />
          </div>

          {/* Bico: linha âmbar na altura da camada atual, com o "bico" indo e voltando */}
          {layer < LAYERS && (
            <div className="absolute inset-x-[-12px] h-0.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" style={{ top: hidden }}>
              <span className="absolute -top-2 h-3 w-3 rotate-45 rounded-[2px] bg-[#0A2540] animate-[nozzle_0.32s_ease-in-out_infinite_alternate]" />
            </div>
          )}
        </div>

        <p className="font-mono text-xs leading-4 tracking-[0.16em] text-[#0A2540]/72">
          {layer < LAYERS ? `CAMADA ${String(layer).padStart(2, '0')}/${LAYERS}` : 'PRONTO'}
        </p>
      </div>
    </div>
  );
};

export default Preloader;
