import React, { useState } from 'react';
import { ArrowUpRight, AtSign, Clock, Mail, MapPin, MessageCircle, Pencil } from 'lucide-react';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { FaqSection } from '@/components/Home/FaqSection';
import { cn } from '@/lib/utils';

/*
 * Página de contato no padrão do site:
 * - Cabeçalho marinho com sobrancelha e título em dois tons (igual a Personalizados).
 * - Faixa areia: canais reais à esquerda e o formulário à direita.
 * - O formulário não finge enviar nada: ele monta a mensagem e abre o WhatsApp da SunLab
 *   com o texto pronto (o site não tem servidor de e-mail). O botão diz isso com clareza.
 * - Faixa mar: o mesmo FAQ da Home e do Sobre (fonte única em src/data/faq.ts).
 * - Acessível: rótulos visíveis, erros ligados ao campo (aria-describedby), foco no primeiro erro,
 *   aviso final em role="status". Grid de 4px, alvos ≥ 44px.
 */

const WHATSAPP_NUMBER = '5513996061681';
const INSTAGRAM_URL = 'https://www.instagram.com/sunlab013/';
const EMAIL = 'contato@sunlab.com.br';

const SUBJECTS = [
  { value: 'produto', label: 'Produto do catálogo' },
  { value: 'pedido', label: 'Pedido em andamento' },
  { value: 'personalizado', label: 'Peça personalizada' },
  { value: 'parceria', label: 'Parceria ou empresa' },
  { value: 'outro', label: 'Outro assunto' }
] as const;
type Subject = (typeof SUBJECTS)[number]['value'];

const CHANNELS = [
  {
    Icon: MessageCircle,
    label: 'WhatsApp',
    value: '(13) 99606-1681',
    note: 'O jeito mais rápido de falar com a gente.',
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá, SunLab! Gostaria de tirar uma dúvida.')}`
  },
  { Icon: AtSign, label: 'Instagram', value: '@sunlab013', note: 'Novidades, bastidores e peças recém-saídas da impressora.', href: INSTAGRAM_URL },
  { Icon: Mail, label: 'E-mail', value: EMAIL, note: 'Para empresas, parcerias e imprensa.', href: `mailto:${EMAIL}` }
];

const inputBase =
  'h-12 w-full rounded-2xl bg-white px-4 text-base text-zinc-900 ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-500 outline-none transition-shadow focus:ring-2 focus:ring-[#0A2540]';
const errorRing = 'ring-2 ring-rose-600 focus:ring-rose-600';

type Errors = Partial<Record<'name' | 'message', string>>;

export const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<Subject>('produto');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const subjectLabel = SUBJECTS.find(s => s.value === subject)?.label ?? '';
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Olá, SunLab! Meu nome é ${name.trim()}.\nAssunto: ${subjectLabel}\n\n${message.trim()}`
  )}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Diga como podemos te chamar.';
    if (message.trim().length < 10) next.message = 'Escreva sua mensagem (pelo menos 10 caracteres).';
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`c-${first}`)?.focus();
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  const errProps = (key: keyof Errors) => ({
    id: `c-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `c-${key}-error` : undefined
  });

  return (
    <div className="flex w-full flex-col overflow-x-clip">
      {/* Cabeçalho marinho */}
      <section aria-labelledby="contact-title" className="relative isolate overflow-hidden bg-[#061A30] text-white">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-3/5 lg:block">
          <img
            src="/products/natal/05_enfeites_bicolores/02_lifestyle_sino.jpg"
            alt=""
            className="h-full w-full object-cover opacity-64 [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.5)_40%,black_75%)]"
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
            <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
            Contato
          </p>
          <h1 id="contact-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight sm:text-5xl sm:leading-[52px] lg:text-[64px] lg:leading-[68px]">
            <span className="block">Fale com</span>
            <span className="block text-amber-300">a SunLab.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-6 text-white/80 lg:text-lg lg:leading-7">
            Dúvida sobre medida, cor, prazo ou um pedido? Responde quem cria e imprime as peças.
          </p>
        </div>
      </section>

      {/* Canais + formulário (faixa areia) */}
      <section aria-label="Canais e formulário de contato" className="bg-[#F6F1E7] py-12 sm:py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* Canais */}
          <div className="lg:col-span-5">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
              <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
              Canais
            </p>
            <h2 className="mt-4 font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540]">
              Escolha onde <span className="text-amber-700">preferir.</span>
            </h2>

            <ul className="mt-8 flex flex-col divide-y divide-zinc-300/70 border-y border-zinc-300/70">
              {CHANNELS.map(({ Icon, label, value, note, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noreferrer' : undefined}
                    className="group flex items-center gap-4 rounded-2xl py-5 outline-none focus-visible:ring-2 focus-visible:ring-[#0A2540]"
                  >
                    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0A2540] text-amber-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-600">{label}</span>
                      <span className="mt-1 block truncate text-lg font-semibold leading-7 text-[#0A2540] group-hover:underline group-hover:underline-offset-4">
                        {value}
                      </span>
                      <span className="block text-sm leading-5 text-zinc-600">{note}</span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0A2540] motion-reduce:transition-none"
                    />
                    {href.startsWith('http') && <span className="sr-only">(abre em nova aba)</span>}
                  </a>
                </li>
              ))}
            </ul>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <dt className="text-sm font-semibold leading-5 text-zinc-800">Atendimento</dt>
                  <dd className="text-sm leading-5 text-zinc-600">Segunda a sexta, das 9h às 18h</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <dt className="text-sm font-semibold leading-5 text-zinc-800">Ateliê</dt>
                  <dd className="text-sm leading-5 text-zinc-600">Santos, litoral paulista. Enviamos para todo o Brasil.</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Formulário */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white p-6 shadow-[0_24px_64px_-32px_rgba(10,37,64,0.32)] ring-1 ring-zinc-200/70 sm:p-10">
              {sent ? (
                <div className="flex flex-col items-start gap-6">
                  <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                    <MessageCircle className="h-7 w-7" />
                  </span>
                  <div role="status">
                    <h2 className="font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540]">
                      Falta só enviar no WhatsApp.
                    </h2>
                    <p className="mt-3 max-w-lg text-base leading-6 text-zinc-600">
                      Abrimos a conversa com a SunLab com a sua mensagem já escrita. É só tocar em enviar. Se a janela não abriu, use o botão abaixo.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonWithIcon href={whatsappUrl} variant="dark">Abrir o WhatsApp</ButtonWithIcon>
                    <ButtonWithIcon variant="outline" icon={Pencil} onClick={() => setSent(false)}>
                      Editar mensagem
                    </ButtonWithIcon>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                  <div>
                    <h2 className="font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540]">
                      Mande sua <span className="text-amber-700">mensagem.</span>
                    </h2>
                    <p className="mt-2 text-sm leading-5 text-zinc-600">
                      Ao enviar, abrimos o WhatsApp com o texto pronto. Nada fica guardado no site.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="c-name" className="text-sm font-medium leading-5 text-zinc-800">Seu nome</label>
                    <input
                      {...errProps('name')}
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className={cn(inputBase, errors.name && errorRing)}
                    />
                    {errors.name && <p id="c-name-error" className="text-sm leading-5 text-rose-700">{errors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium leading-5 text-zinc-800">Sobre o que é</span>
                    <DropdownSelect label="Assunto" options={[...SUBJECTS]} value={subject} onChange={setSubject} className="self-start" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="c-message" className="text-sm font-medium leading-5 text-zinc-800">Mensagem</label>
                    <textarea
                      {...errProps('message')}
                      rows={5}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Ex.: a árvore de Natal vem em outras cores? Preciso de 10 unidades até dezembro."
                      className={cn(inputBase, 'h-auto resize-y py-3 leading-6', errors.message && errorRing)}
                    />
                    {errors.message && <p id="c-message-error" className="text-sm leading-5 text-rose-700">{errors.message}</p>}
                  </div>

                  <ButtonWithIcon type="submit" className="self-start">Enviar pelo WhatsApp</ButtonWithIcon>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Perguntas frequentes (mar): mesmo componente da Home e do Sobre */}
      <div className="bg-[#EAF3F9] py-16 sm:py-24">
        <FaqSection />
      </div>
    </div>
  );
};

export default Contact;
