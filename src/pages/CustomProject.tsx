import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Armchair, Gift, Smartphone, Wrench, FlaskConical, Sparkles, Minus, Plus, Check, MessageCircle, ArrowLeft, Paperclip, Pencil
} from 'lucide-react';
import { FileDropzone, type PickedFile } from '@/components/ui/file-dropzone';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatDateLong } from '@/lib/format-date';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';

/*
 * Personalizados: pedido de orçamento em 3 etapas, no design da Home.
 * 1. Sua ideia (tipo da peça + descrição)  2. Detalhes e arquivos  3. Contato e revisão.
 * - O envio é pelo WhatsApp (canal real da SunLab): abre a conversa com a mensagem pronta.
 *   O link do WhatsApp não leva anexos, então a tela final lista os arquivos para anexar na conversa.
 *   Antes, o formulário dizia "nossa equipe já recebeu", mas não enviava nada para lugar nenhum.
 * - Validação por etapa, com mensagem perto do campo (aria-invalid + aria-describedby) e foco
 *   no primeiro campo com erro. Campos com 16px de fonte (o celular não dá zoom ao focar).
 * - Grid de 4px; contraste ≥ 4,5:1; alvos ≥ 44px.
 */

const WHATSAPP_NUMBER = '5513996061681';

const PROJECT_TYPES = [
  { id: 'decor', label: 'Decoração', hint: 'Peças para casa e eventos', Icon: Armchair },
  { id: 'gifts', label: 'Presente ou brinde', hint: 'Lembranças, troféus, kits', Icon: Gift },
  { id: 'tech', label: 'Suporte ou acessório', hint: 'Celular, setup, organização', Icon: Smartphone },
  { id: 'replacement', label: 'Peça de reposição', hint: 'Algo quebrou? A gente refaz', Icon: Wrench },
  { id: 'prototype', label: 'Protótipo', hint: 'Teste de forma e encaixe', Icon: FlaskConical },
  { id: 'other', label: 'Outra ideia', hint: 'Conte para a gente', Icon: Sparkles }
] as const;

// ⚠️ Lista de materiais que já estava no site: confirmar com a SunLab quais são oferecidos.
const MATERIALS = [
  { value: 'recommend', label: 'Não sei, me recomendem' },
  { value: 'pla', label: 'PLA (acabamento fosco)' },
  { value: 'petg', label: 'PETG (mais resistente)' },
  { value: 'tpu', label: 'TPU (flexível)' },
  { value: 'carbon', label: 'PETG com fibra de carbono' },
  { value: 'resin', label: 'Resina (muito detalhe)' }
] as const;
type Material = (typeof MATERIALS)[number]['value'];

const ACCEPT = ['.stl', '.obj', '.step', '.stp', '.3mf', '.zip', '.png', '.jpg', '.jpeg', '.webp', '.pdf'];

const STEPS = [
  { id: 'ideia', label: 'Sua ideia' },
  { id: 'detalhes', label: 'Detalhes e arquivos' },
  { id: 'contato', label: 'Contato e revisão' }
];

type Form = {
  projectType: string;
  description: string;
  quantity: number;
  material: Material;
  deadline: Date | null;
  name: string;
  whatsapp: string;
  email: string;
};

type Errors = Partial<Record<keyof Form, string>>;

const inputBase =
  'h-12 w-full rounded-2xl bg-white px-4 text-base text-zinc-900 ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-500 outline-none transition-shadow focus:ring-2 focus:ring-[#0A2540]';
const errorRing = 'ring-2 ring-rose-600 focus:ring-rose-600';

// (13) 99999-9999 enquanto a pessoa digita.
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

const Field: React.FC<{ id: string; label: string; optional?: boolean; error?: string; help?: string; children: React.ReactNode }> = ({
  id, label, optional, error, help, children
}) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium leading-5 text-zinc-800">
      {label} {optional && <span className="font-normal text-zinc-600">(opcional)</span>}
    </label>
    {children}
    {help && !error && <p id={`${id}-help`} className="text-sm leading-5 text-zinc-600">{help}</p>}
    {error && <p id={`${id}-error`} className="text-sm leading-5 text-rose-700">{error}</p>}
  </div>
);

export const CustomProject: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    projectType: '', description: '', quantity: 1, material: 'recommend', deadline: null, name: '', whatsapp: '', email: ''
  });
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = (s: number): Errors => {
    const e: Errors = {};
    if (s === 0) {
      if (!form.projectType) e.projectType = 'Escolha o tipo de peça.';
      if (form.description.trim().length < 10) e.description = 'Conte um pouco mais da ideia (pelo menos 10 caracteres).';
    }
    if (s === 1 && (!form.quantity || form.quantity < 1)) e.quantity = 'A quantidade precisa ser pelo menos 1.';
    if (s === 2) {
      if (form.name.trim().length < 2) e.name = 'Digite seu nome.';
      if (form.whatsapp.replace(/\D/g, '').length < 10) e.whatsapp = 'Digite o WhatsApp com DDD, ex.: (13) 99999-9999.';
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Confira o e-mail.';
    }
    return e;
  };

  const scrollToForm = () =>
    formTopRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });

  const next = () => {
    const e = validate(step);
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      document.getElementById(`f-${firstKey}`)?.focus();
      return;
    }
    setStep(s => s + 1);
    scrollToForm();
  };

  const back = () => {
    setErrors({});
    setStep(s => Math.max(0, s - 1));
    scrollToForm();
  };

  const typeLabel = PROJECT_TYPES.find(t => t.id === form.projectType)?.label ?? '';
  const materialLabel = MATERIALS.find(m => m.value === form.material)?.label ?? '';

  const message =
    `Olá, SunLab! Quero um orçamento de peça personalizada.\n\n` +
    `*Tipo:* ${typeLabel}\n` +
    `*Ideia:* ${form.description.trim()}\n` +
    `*Quantidade:* ${form.quantity}\n` +
    `*Material:* ${materialLabel}\n` +
    (form.deadline ? `*Para quando:* ${formatDateLong(form.deadline)}\n` : '') +
    `\n*Nome:* ${form.name.trim()}\n*WhatsApp:* ${form.whatsapp}\n` +
    (form.email.trim() ? `*E-mail:* ${form.email.trim()}\n` : '') +
    (files.length ? `\n*Arquivos (vou anexar aqui na conversa):*\n${files.map(f => `- ${f.file.name}`).join('\n')}` : '');
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const submit = () => {
    const e = validate(2);
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      document.getElementById(`f-${firstKey}`)?.focus();
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setSent(true);
    scrollToForm();
  };

  const stepMotion = {
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }
  };

  const errProps = (key: keyof Form) => ({
    id: `f-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `f-${key}-error` : undefined
  });

  return (
    <div className="flex w-full flex-col overflow-x-clip">
      {/* Cabeçalho marinho */}
      <section aria-labelledby="custom-title" className="relative isolate overflow-hidden bg-[#061A30] text-white">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-3/5 lg:block">
          <img
            src="/products/natal/05_enfeites_bicolores/03_macro_relevo.jpg"
            alt=""
            className="h-full w-full object-cover opacity-64 [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.5)_40%,black_75%)]"
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-amber-300">
            <span aria-hidden="true" className="h-px w-6 bg-amber-300" />
            Personalizados
          </p>
          <h1 id="custom-title" className="mt-4 font-display text-[40px] font-light leading-[44px] tracking-tight sm:text-5xl sm:leading-[52px] lg:text-[64px] lg:leading-[68px]">
            <span className="block">Sua ideia,</span>
            <span className="block text-amber-300">impressa em 3D.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-6 text-white/80 lg:text-lg lg:leading-7">
            Conte o que você imagina, mande fotos ou o arquivo 3D e receba o orçamento pelo WhatsApp. Sem compromisso.
          </p>
        </div>
      </section>

      {/* Formulário (faixa areia) */}
      <section aria-label="Pedido de orçamento" className="bg-[#F6F1E7] py-12 sm:py-16 lg:py-24">
        <div ref={formTopRef} className="mx-auto grid max-w-7xl scroll-mt-24 gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* Lateral: etapas (só desktop; no celular a barra de progresso do cartão já mostra a etapa) */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="lg:sticky lg:top-24">
              <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
                <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
                Como funciona
              </p>
              <h2 className="mt-4 font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540]">
                Três passos <span className="text-amber-700">e pronto.</span>
              </h2>

              <ol className="relative mt-8 flex flex-col gap-2" aria-label="Etapas do pedido">
                <span aria-hidden="true" className="absolute bottom-6 left-4 top-6 w-px bg-zinc-300" />
                {STEPS.map((s, i) => {
                  const done = sent || i < step;
                  const current = !sent && i === step;
                  return (
                    <li key={s.id} aria-current={current ? 'step' : undefined} className="relative flex items-center gap-4 py-2">
                      <span
                        className={cn(
                          'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold leading-4 transition-colors duration-300',
                          done ? 'bg-[#0A2540] text-amber-300' : current ? 'bg-amber-400 text-[#061A30]' : 'bg-white text-zinc-600 ring-1 ring-zinc-300'
                        )}
                      >
                        {done ? <Check aria-hidden="true" className="h-4 w-4" /> : String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={cn('text-base leading-6', current ? 'font-semibold text-[#0A2540]' : done ? 'text-zinc-800' : 'text-zinc-600')}>
                        {s.label}
                        {done && <span className="sr-only"> (concluída)</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-8 text-sm leading-5 text-zinc-600">Prefere conversar direto?</p>
              <ButtonWithIcon href={`https://wa.me/${WHATSAPP_NUMBER}`} variant="dark" className="mt-3">
                Chame no WhatsApp
              </ButtonWithIcon>
            </div>
          </aside>

          {/* Cartão do formulário */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl bg-white p-6 shadow-[0_24px_64px_-32px_rgba(10,37,64,0.32)] ring-1 ring-zinc-200/70 sm:p-10">
              {/* Barra de progresso */}
              {!sent && (
                <div className="mb-8">
                  <p className="font-mono text-xs leading-4 text-zinc-600">
                    Etapa {step + 1} de {STEPS.length} · <span className="font-sans font-semibold text-[#0A2540]">{STEPS[step].label}</span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Progresso do pedido"
                    aria-valuemin={1}
                    aria-valuemax={STEPS.length}
                    aria-valuenow={step + 1}
                    className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-200"
                  >
                    <motion.span
                      className="block h-full rounded-full bg-amber-400"
                      initial={false}
                      animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait" initial={false}>
                {sent ? (
                  /* Tela final */
                  <motion.div key="sent" {...stepMotion} className="flex flex-col items-start gap-6">
                    <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                      <MessageCircle className="h-7 w-7" />
                    </span>
                    <div role="status">
                      <h2 className="font-display text-[32px] font-light leading-10 tracking-tight text-[#0A2540]">
                        Falta só enviar no WhatsApp.
                      </h2>
                      <p className="mt-3 max-w-lg text-base leading-6 text-zinc-600">
                        Abrimos a conversa com a SunLab com o seu pedido já escrito. É só tocar em enviar.
                        {files.length > 0 && ' Depois, anexe os arquivos abaixo na mesma conversa (o link do WhatsApp não leva anexos).'}
                      </p>
                    </div>

                    {files.length > 0 && (
                      <ul aria-label="Arquivos para anexar" className="flex w-full flex-col gap-2">
                        {files.map(f => (
                          <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-[#F6F1E7] px-4 py-3 text-sm leading-5 text-zinc-800">
                            <Paperclip aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0A2540]" />
                            <span className="truncate">{f.file.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <ButtonWithIcon href={whatsappUrl} variant="dark">Abrir o WhatsApp de novo</ButtonWithIcon>
                      <ButtonWithIcon
                        variant="outline"
                        icon={Pencil}
                        onClick={() => { setSent(false); setStep(2); }}
                      >
                        Editar pedido
                      </ButtonWithIcon>
                    </div>
                  </motion.div>
                ) : step === 0 ? (
                  /* Etapa 1 */
                  <motion.div key="s0" {...stepMotion} className="flex flex-col gap-8">
                    <fieldset>
                      <legend className="text-sm font-medium leading-5 text-zinc-800">Que tipo de peça você quer?</legend>
                      <div
                        id="f-projectType"
                        tabIndex={-1}
                        role="radiogroup"
                        aria-invalid={errors.projectType ? true : undefined}
                        aria-describedby={errors.projectType ? 'f-projectType-error' : undefined}
                        className="mt-3 grid grid-cols-2 gap-3 outline-none sm:grid-cols-3"
                      >
                        {PROJECT_TYPES.map(({ id, label, hint, Icon }) => {
                          const active = form.projectType === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => set('projectType', id)}
                              className={cn(
                                'flex min-h-28 flex-col items-start gap-2 rounded-2xl p-4 text-left transition-[box-shadow,background-color] cursor-pointer',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]',
                                active ? 'bg-[#0A2540] text-white' : 'bg-white ring-1 ring-inset ring-zinc-300 hover:ring-[#0A2540]',
                                errors.projectType && !active && 'ring-rose-300'
                              )}
                            >
                              <span className={cn('grid h-8 w-8 place-items-center rounded-full', active ? 'bg-amber-400 text-[#061A30]' : 'bg-[#F6F1E7] text-[#0A2540]')}>
                                <Icon aria-hidden="true" className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-semibold leading-5">{label}</span>
                              <span className={cn('text-xs leading-4', active ? 'text-white/80' : 'text-zinc-600')}>{hint}</span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.projectType && <p id="f-projectType-error" className="mt-2 text-sm leading-5 text-rose-700">{errors.projectType}</p>}
                    </fieldset>

                    <Field id="f-description" label="Conte sua ideia" error={errors.description} help="Para que serve, tamanho aproximado, cores e qualquer detalhe que ajude.">
                      <textarea
                        {...errProps('description')}
                        rows={5}
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Ex.: um suporte para dois controles de videogame, uns 20 cm de largura, em preto."
                        className={cn(inputBase, 'h-auto resize-y py-3 leading-6', errors.description && errorRing)}
                      />
                    </Field>
                  </motion.div>
                ) : step === 1 ? (
                  /* Etapa 2 */
                  <motion.div key="s1" {...stepMotion} className="flex flex-col gap-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <span id="qty-label" className="text-sm font-medium leading-5 text-zinc-800">Quantidade</span>
                        <div className="flex h-12 w-fit items-center rounded-full bg-white ring-1 ring-inset ring-zinc-300" role="group" aria-labelledby="qty-label">
                          <button
                            type="button"
                            onClick={() => set('quantity', Math.max(1, form.quantity - 1))}
                            aria-label="Diminuir quantidade"
                            className="grid h-12 w-12 place-items-center rounded-l-full text-zinc-700 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                          >
                            <Minus aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <input
                            {...errProps('quantity')}
                            type="number"
                            min={1}
                            inputMode="numeric"
                            aria-label="Quantidade"
                            value={form.quantity}
                            onChange={e => set('quantity', Math.max(1, Number(e.target.value) || 1))}
                            className="w-12 bg-transparent text-center text-base font-semibold text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => set('quantity', form.quantity + 1)}
                            aria-label="Aumentar quantidade"
                            className="grid h-12 w-12 place-items-center rounded-r-full text-zinc-700 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                          >
                            <Plus aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium leading-5 text-zinc-800">Material</span>
                        <DropdownSelect label="Material" value={form.material} onChange={v => set('material', v)} options={MATERIALS.map(m => ({ value: m.value, label: m.label }))} />
                      </div>
                    </div>

                    <Field id="f-deadline" label="Para quando você precisa?" optional help="Se for para uma data especial, escolha o dia.">
                      <DatePicker
                        id="f-deadline"
                        value={form.deadline}
                        onChange={d => set('deadline', d)}
                        min={new Date()}
                        describedBy="f-deadline-help"
                      />
                    </Field>

                    <FileDropzone
                      label="Fotos de referência ou arquivo 3D (opcional)"
                      files={files}
                      onChange={setFiles}
                      accept={ACCEPT}
                      hint="STL, OBJ, STEP, 3MF, ZIP, fotos ou PDF · até 50 MB cada"
                    />
                  </motion.div>
                ) : (
                  /* Etapa 3 */
                  <motion.div key="s2" {...stepMotion} className="flex flex-col gap-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field id="f-name" label="Seu nome" error={errors.name}>
                        <input
                          {...errProps('name')}
                          type="text"
                          autoComplete="name"
                          value={form.name}
                          onChange={e => set('name', e.target.value)}
                          className={cn(inputBase, errors.name && errorRing)}
                        />
                      </Field>
                      <Field id="f-whatsapp" label="WhatsApp com DDD" error={errors.whatsapp}>
                        <input
                          {...errProps('whatsapp')}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          value={form.whatsapp}
                          onChange={e => set('whatsapp', maskPhone(e.target.value))}
                          placeholder="(13) 99999-9999"
                          className={cn(inputBase, errors.whatsapp && errorRing)}
                        />
                      </Field>
                    </div>
                    <Field id="f-email" label="E-mail" optional error={errors.email} help="Se quiser receber o orçamento também por e-mail.">
                      <input
                        {...errProps('email')}
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        className={cn(inputBase, errors.email && errorRing)}
                      />
                    </Field>

                    {/* Revisão */}
                    <div className="rounded-2xl bg-[#F6F1E7] p-6">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-700">Resumo do pedido</h2>
                        <button
                          type="button"
                          onClick={() => { setStep(0); scrollToForm(); }}
                          className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-[#0A2540] underline underline-offset-4 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                          Editar
                        </button>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm leading-5 sm:grid-cols-2">
                        <div><dt className="text-zinc-600">Tipo</dt><dd className="font-semibold text-zinc-900">{typeLabel}</dd></div>
                        <div><dt className="text-zinc-600">Quantidade</dt><dd className="font-semibold text-zinc-900">{form.quantity}</dd></div>
                        <div><dt className="text-zinc-600">Material</dt><dd className="font-semibold text-zinc-900">{materialLabel}</dd></div>
                        {form.deadline && (
                          <div><dt className="text-zinc-600">Para quando</dt><dd className="font-semibold text-zinc-900">{formatDateLong(form.deadline)}</dd></div>
                        )}
                        <div><dt className="text-zinc-600">Arquivos</dt><dd className="font-semibold text-zinc-900">{files.length ? `${files.length} para anexar` : 'Nenhum'}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-zinc-600">Ideia</dt><dd className="line-clamp-3 text-zinc-900">{form.description}</dd></div>
                      </dl>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navegação entre etapas */}
              {!sent && (
                <div className="mt-10 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  {step > 0 ? (
                    <button
                      type="button"
                      onClick={back}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540] cursor-pointer"
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      Voltar
                    </button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  {step < STEPS.length - 1 ? (
                    <ButtonWithIcon variant="dark" onClick={next} className="w-full sm:w-auto">Continuar</ButtonWithIcon>
                  ) : (
                    <ButtonWithIcon onClick={submit} icon={MessageCircle} className="w-full sm:w-auto">Enviar pelo WhatsApp</ButtonWithIcon>
                  )}
                </div>
              )}
            </div>

            {/* Alternativa no celular (no desktop fica na lateral) */}
            <div className="mt-8 flex flex-col items-center gap-3 lg:hidden">
              <p className="text-sm leading-5 text-zinc-600">Prefere conversar direto?</p>
              <ButtonWithIcon href={`https://wa.me/${WHATSAPP_NUMBER}`} variant="dark">
                Chame no WhatsApp
              </ButtonWithIcon>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomProject;
