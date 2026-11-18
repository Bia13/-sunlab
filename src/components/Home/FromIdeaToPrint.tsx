import React from 'react';
import { ImageCompare } from '@/components/ui/image-compare';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';

/*
 * "Da referência à peça": mostra como o cliente manda a ideia e como a peça sai da impressora,
 * com um comparador antes/depois arrastável.
 *
 * ⚠️ IMAGENS: por enquanto é um PAR DE EXEMPLO (a mesma foto, com filtro de "rascunho" no lado
 * de antes). Não é uma referência real de cliente, então a seção NÃO aparece no site publicado
 * (só no ambiente de desenvolvimento) até `isPlaceholder` virar false com fotos reais:
 *   1. Coloque as fotos em public/antes-depois/ (ex.: referencia.jpg e impresso.jpg, mesmo enquadramento).
 *   2. Troque `before.src` e `after.src` abaixo, ajuste os textos alternativos e mude isPlaceholder para false.
 */
const COMPARE = {
  isPlaceholder: true,
  before: {
    src: '/products/natal/05_enfeites_bicolores/01_flatlay_catalogo.jpg',
    alt: 'Exemplo de referência: desenho dos enfeites de Natal',
    label: 'Referência',
    // Só para o exemplo: simula um rascunho a partir da foto. Remova ao usar a referência real.
    className: 'grayscale contrast-150 brightness-110'
  },
  after: {
    src: '/products/natal/05_enfeites_bicolores/01_flatlay_catalogo.jpg',
    alt: 'Enfeites de Natal vermelhos e brancos impressos em 3D',
    label: 'Impresso'
  }
};

const STEPS = [
  { title: 'Você manda a referência', text: 'Foto, desenho ou print da ideia, direto no WhatsApp.' },
  { title: 'A gente transforma em 3D', text: 'Ajustamos formato, tamanho e cores com você.' },
  { title: 'Imprimimos e enviamos', text: 'A peça sai da impressora, ganha acabamento e vai até você.' }
];

/** A Home usa isto para não desenhar a faixa de fundo vazia quando a seção está escondida. */
export const fromIdeaToPrintVisible = !(COMPARE.isPlaceholder && import.meta.env.PROD);

export const FromIdeaToPrint: React.FC = () => {
  // Nunca publica o par de exemplo: só aparece em desenvolvimento.
  if (!fromIdeaToPrintVisible) return null;

  return (
    <section aria-labelledby="ideia-title" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
            <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
            Como funciona
          </p>
          <h2 id="ideia-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px] lg:text-[56px] lg:leading-[60px]">
            <span className="block">Da referência</span>
            <span className="block text-amber-700">à peça impressa.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-6 text-zinc-600">
            Arraste a linha na imagem para comparar a ideia que chegou com a peça que saiu da impressora.
          </p>

          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0A2540] font-mono text-xs font-semibold leading-4 text-amber-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-base font-semibold leading-6 text-zinc-900">{s.title}</p>
                  <p className="mt-1 text-sm leading-5 text-zinc-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <ButtonWithIcon to="/custom" variant="dark" className="w-full sm:w-auto">Pedir orçamento</ButtonWithIcon>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ImageCompare before={COMPARE.before} after={COMPARE.after} className="aspect-[4/3] w-full shadow-[0_24px_64px_-32px_rgba(10,37,64,0.4)]" />
          {COMPARE.isPlaceholder && (
            <p className="mt-3 text-sm leading-5 text-amber-800">
              Imagens de exemplo (só aparecem em desenvolvimento). Troque por uma referência real e a foto da peça impressa.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default FromIdeaToPrint;
