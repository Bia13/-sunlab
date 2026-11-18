import React, { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { FAQS } from '@/data/faq';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';

/*
 * FAQ em duas colunas (inspirado no "FAQ Section" do 21st.dev):
 * - Esquerda: título editorial, texto curto e atalho para o WhatsApp (fica preso no desktop).
 * - Direita: perguntas em sanfona; a primeira começa aberta e só uma fica aberta por vez.
 * - Acessível: cada pergunta é um <button> com aria-expanded/aria-controls; a resposta é uma região
 *   ligada ao botão. Abre e fecha com Enter/Espaço. Animação de altura some com "reduzir movimento".
 * - SEO: dados estruturados FAQPage com as mesmas perguntas e respostas visíveis.
 * - Grid de 4px; alvo de cada pergunta ≥ 56px.
 */

const WHATSAPP_URL = 'https://wa.me/5513996061681';

export const FaqSection: React.FC = () => {
  // Sanfona de verdade: só uma pergunta aberta por vez. Abrir uma fecha a outra;
  // clicar na que está aberta fecha ela.
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };

  return (
    <section aria-labelledby="faq-title" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Cabeçalho */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
              <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
              Dúvidas
            </p>
            <h2 id="faq-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight text-[#0A2540] sm:text-5xl sm:leading-[52px] lg:text-[56px] lg:leading-[60px]">
              <span className="block">Perguntas</span>
              <span className="block text-amber-700">frequentes.</span>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-6 text-zinc-600">
              Prazos, cores, peças sob medida e trocas. Não achou o que procurava? Fale com a gente.
            </p>
            <ButtonWithIcon href={WHATSAPP_URL} variant="dark" className="mt-8">
              Tirar dúvida no WhatsApp
            </ButtonWithIcon>
          </div>
        </div>

        {/* Perguntas */}
        <div className="lg:col-span-7">
          <ul className="border-t border-zinc-200">
            {FAQS.map((f, i) => {
              const isOpen = openIndex === i;
              const btnId = `${baseId}-q${i}`;
              const panelId = `${baseId}-a${i}`;
              return (
                <li key={f.q} className="border-b border-zinc-200">
                  <h3>
                    <button
                      id={btnId}
                      type="button"
                      onClick={() => toggle(i)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="group flex min-h-14 w-full items-center justify-between gap-6 py-6 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]"
                    >
                      <span className="flex gap-4">
                        <span aria-hidden="true" className="pt-1 font-mono text-xs leading-4 text-zinc-500">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className={cn('text-base font-medium leading-6 transition-colors sm:text-lg sm:leading-7', isOpen ? 'text-[#0A2540]' : 'text-zinc-800 group-hover:text-[#0A2540]')}>
                          {f.q}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-300 motion-reduce:transition-none',
                          isOpen ? 'rotate-45 bg-amber-400 text-[#061A30]' : 'bg-zinc-100 text-[#0A2540] group-hover:bg-zinc-200'
                        )}
                      >
                        <Plus className="h-5 w-5" />
                      </span>
                    </button>
                  </h3>
                  {/* Altura animada com grid-rows (0fr → 1fr). */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}
                  >
                    <div className="overflow-hidden" inert={!isOpen}>
                      <p className="max-w-2xl pb-6 pl-8 pr-16 text-base leading-6 text-zinc-600">{f.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
