import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { X, Check, Copy, MessageCircle, Package, LogIn, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';
import { useCart, type CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, upsertSupabaseOrder } from '@/lib/supabase';

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { isCheckoutOpen, closeCheckout, total, clearCart, cart } = useCart();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const [completedOrderData, setCompletedOrderData] = useState<{
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    items: Array<{
      name: string;
      slug?: string;
      image?: string;
      color?: string;
      size?: string;
      quantity: number;
      unitPrice: number;
    }>;
    totalAmount: number;
  } | null>(null);

  // Chave de armazenamento por conta de usuário
  const getUserProfileKey = (userEmail: string) => `sunlab_checkout_profile_${userEmail.toLowerCase().trim()}`;

  const loadSavedProfile = (userEmail?: string) => {
    if (!userEmail) return null;
    try {
      const stored = localStorage.getItem(getUserProfileKey(userEmail));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return null;
  };

  // Address & Payer Form States (inicia vazio ou com os dados salvos da conta do usuário)
  const [formData, setFormData] = useState(() => {
    const saved = user?.email ? loadSavedProfile(user.email) : null;
    return {
      name: saved?.name || (user?.name && user.name !== 'SunLab Admin' && !user.name.includes('@') ? user.name : ''),
      email: user?.email || '',
      phone: saved?.phone || '',
      cpf: saved?.cpf || '',
      cep: saved?.cep || '',
      street: saved?.street || '',
      number: saved?.number || '',
      complement: saved?.complement || '',
      neighborhood: saved?.neighborhood || '',
      city: saved?.city || '',
      state: saved?.state || ''
    };
  });

  // Salvar perfil do usuário para compras futuras
  const saveUserProfile = (data: typeof formData) => {
    if (!user?.email) return;
    try {
      localStorage.setItem(getUserProfileKey(user.email), JSON.stringify(data));
      localStorage.setItem('sunlab_customer_email', user.email);
    } catch (_) {}
  };

  // Carregar dados salvos da conta sempre que o modal abre ou usuário loga
  useEffect(() => {
    if (user?.email) {
      const saved = loadSavedProfile(user.email);
      setFormData(prev => ({
        ...prev,
        name: saved?.name || (user.name && user.name !== 'SunLab Admin' && !user.name.includes('@') ? user.name : prev.name || ''),
        email: user.email,
        phone: saved?.phone || prev.phone || '',
        cpf: saved?.cpf || prev.cpf || '',
        cep: saved?.cep || prev.cep || '',
        street: saved?.street || prev.street || '',
        number: saved?.number || prev.number || '',
        complement: saved?.complement || prev.complement || '',
        neighborhood: saved?.neighborhood || prev.neighborhood || '',
        city: saved?.city || prev.city || '',
        state: saved?.state || prev.state || ''
      }));
    }
  }, [user, isCheckoutOpen]);

  // Resetar modal para nova compra sempre que for aberto (impede reaparecer compra anterior)
  useEffect(() => {
    if (isCheckoutOpen) {
      setStep('form');
      setCompletedOrderData(null);
      setOrderNumber('');
      setIsProcessing(false);
      setCopiedWhatsAppText(false);
      setShowErrors(false);
    }
  }, [isCheckoutOpen]);

  // Diálogo acessível: trava a rolagem do fundo, foco no primeiro campo, Esc fecha e Tab fica preso no modal.
  useEffect(() => {
    if (!isCheckoutOpen) return;
    const prevOverflow = document.body.style.overflow;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    }, 60);
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === 'Escape') {
        if (!panel.querySelector('[role="status"]')) closeCheckout();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [isCheckoutOpen, closeCheckout]);

  // Formatação de CPF com máscara
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  // Formatação de Telefone / WhatsApp com máscara
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    } else if (raw.length > 6) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  // Busca automática de endereço por CEP (ViaCEP)
  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 5) {
      formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    setFormData(prev => ({ ...prev, cep: formatted }));

    if (raw.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              street: data.logradouro || prev.street,
              neighborhood: data.bairro || prev.neighborhood,
              city: data.localidade || prev.city,
              state: data.uf || prev.state
            }));
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar ViaCEP:', e);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // Validação simples de CPF
  const isValidCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(9), 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(clean.charAt(10), 10);
  };

  const handleCloseModal = () => {
    setStep('form');
    setCompletedOrderData(null);
    setOrderNumber('');
    closeCheckout();
  };

  const isProfileComplete = isAdmin
    ? true
    : !user
      ? Boolean(formData.name.trim())
      : Boolean(
          formData.name.trim() &&
          formData.phone.trim() &&
          formData.cpf.trim() &&
          isValidCPF(formData.cpf) &&
          formData.cep.trim() &&
          formData.street.trim() &&
          formData.number.trim() &&
          formData.city.trim() &&
          formData.state.trim()
        );

  // Gerador da mensagem completa e detalhada para o WhatsApp
  const generateWhatsAppMessage = (order: NonNullable<typeof completedOrderData>) => {
    const itemsText = order.items
      .map(
        (it, idx) =>
          `*${idx + 1}. ${it.name}*\n` +
          `   🎨 Cor: ${it.color || 'Padrão'}${it.size && it.size !== 'Padrão' ? ` | Tam: ${it.size}` : ''}\n` +
          `   🔢 Qtd: ${it.quantity} un. | Valor: R$ ${(it.quantity * it.unitPrice).toFixed(2).replace('.', ',')}`
      )
      .join('\n\n');

    const emailLine = order.customerEmail && order.customerEmail !== 'visitante@sunlab.com.br'
      ? `• *E-mail:* ${order.customerEmail}\n`
      : '';

    return (
      `🌊 *NOVO PEDIDO REALIZADO — SUNLAB 3D*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔖 *PEDIDO:* #${order.orderNumber}\n` +
      `📅 *DATA:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n` +
      `👤 *DADOS DO CLIENTE:*\n` +
      `• *Nome:* ${order.customerName}\n` +
      emailLine +
      `• *Telefone/WhatsApp:* ${order.customerPhone || 'Não informado'}\n\n` +
      `📍 *ENTREGA / ENDEREÇO:*\n` +
      `• ${order.shippingAddress}\n\n` +
      `📦 *PRODUTOS ESCOLHIDOS:*\n` +
      `${itemsText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *VALOR TOTAL: R$ ${order.totalAmount.toFixed(2).replace('.', ',')}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💬 *Olá SunLab! Gostaria de confirmar meu pedido #${order.orderNumber} e receber as informações para pagamento e envio!*\n` +
      `_SunLab • Ideias que ganham forma_`
    );
  };

  const handleCompleteOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isProfileComplete || isProcessing) return;

    setIsProcessing(true);
    const itemsPayload = cart.map((item: CartItem) => ({
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.images[0] || '',
      color: item.selectedColor.name,
      size: item.selectedSize || 'Padrão',
      quantity: item.quantity,
      unitPrice: item.unitPrice
    }));

    let confirmedOrderNumber = orderNumber || `SLB-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalPaymentMethodLabel = isAdmin ? 'Venda Direta (Admin)' : 'WhatsApp (A Combinar)';
    const payableTotal = total;

    const finalCustomerName = formData.name.trim() || (isAdmin ? 'Venda Direta (Admin)' : 'Cliente');
    const finalCustomerEmail = formData.email.trim() || user?.email || (isAdmin ? 'admin@sunlab.com.br' : 'visitante@sunlab.com.br');
    const finalCustomerPhone = formData.phone.trim();

    const hasAddress = Boolean(formData.street.trim() || formData.city.trim() || formData.cep.trim());
    const shippingAddr = hasAddress
      ? `${formData.street || 'Não informado'}, nº ${formData.number || 'S/N'}${formData.complement ? ' (' + formData.complement + ')' : ''}${formData.neighborhood ? ', ' + formData.neighborhood : ''} — ${formData.city || ''}/${formData.state || ''}${formData.cep ? ` (CEP: ${formData.cep})` : ''}`
      : (isAdmin ? 'Venda Direta / Sem endereço informado' : 'A combinar via WhatsApp');

    // Sincronizar criação do pedido com a API de pedidos (Vercel e Express)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: confirmedOrderNumber,
          customerName: finalCustomerName,
          customerEmail: finalCustomerEmail,
          customerPhone: finalCustomerPhone,
          shippingAddress: shippingAddr,
          paymentMethod: finalPaymentMethodLabel,
          items: itemsPayload,
          totalAmount: payableTotal
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.orderNumber) {
          confirmedOrderNumber = data.orderNumber;
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar pedido com a API:', err);
    }

    const fullOrder = {
      customerName: finalCustomerName,
      customerEmail: finalCustomerEmail,
      customerPhone: finalCustomerPhone,
      shippingAddress: shippingAddr,
      paymentMethod: finalPaymentMethodLabel,
      items: itemsPayload,
      totalAmount: payableTotal,
      orderNumber: confirmedOrderNumber,
      createdAt: new Date().toISOString()
    };

    setCompletedOrderData(fullOrder);
    setOrderNumber(confirmedOrderNumber);
    saveUserProfile(formData);

    // Salvar permanentemente no Supabase (Nuvem) se configurado
    if (isSupabaseConfigured()) {
      upsertSupabaseOrder({
        id: `ord-${confirmedOrderNumber}`,
        orderNumber: confirmedOrderNumber,
        customerName: finalCustomerName,
        customerEmail: finalCustomerEmail,
        customerPhone: finalCustomerPhone,
        shippingAddress: shippingAddr,
        paymentMethod: finalPaymentMethodLabel,
        items: itemsPayload,
        totalAmount: payableTotal,
        status: 'Pendente'
      }).catch(err => console.warn('[Supabase] Falha ao enviar pedido:', err));
    }

    // Salvar localmente para visualização instantânea na página "Meus Pedidos"
    try {
      const stored = JSON.parse(localStorage.getItem('sunlab_my_orders') || '[]');
      stored.unshift(fullOrder);
      localStorage.setItem('sunlab_my_orders', JSON.stringify(stored));
      localStorage.setItem('sunlab_customer_email', finalCustomerEmail);
    } catch (e) {
      console.warn('Erro ao salvar localmente:', e);
    }

    clearCart();
    setIsProcessing(false);
    setStep('success');

    // Redirecionar / Abrir conversa no WhatsApp automaticamente apenas para clientes
    if (!isAdmin) {
      const msg = generateWhatsAppMessage(fullOrder);
      const waUrl = `https://wa.me/5513996061681?text=${encodeURIComponent(msg)}`;
      try {
        window.open(waUrl, '_blank');
      } catch (_) {}
    }
  };

  const copyWhatsAppDetails = () => {
    if (!completedOrderData) return;
    const text = generateWhatsAppMessage(completedOrderData);
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedWhatsAppText(true);
      setTimeout(() => setCopiedWhatsAppText(false), 3000);
    }
  };

  // Campos obrigatórios que faltam (só aparecem depois da primeira tentativa de enviar).
  const fieldErrors: Partial<Record<keyof typeof formData, string>> = {};
  if (!isAdmin) {
    if (!formData.name.trim()) fieldErrors.name = 'Diga como podemos te chamar.';
    if (user) {
      if (!formData.phone.trim()) fieldErrors.phone = 'Informe um WhatsApp com DDD.';
      if (!formData.cpf.trim()) fieldErrors.cpf = 'Informe o CPF.';
      else if (!isValidCPF(formData.cpf)) fieldErrors.cpf = 'Esse CPF não é válido.';
      if (!formData.cep.trim()) fieldErrors.cep = 'Informe o CEP.';
      if (!formData.street.trim()) fieldErrors.street = 'Informe a rua.';
      if (!formData.number.trim()) fieldErrors.number = 'Informe o número.';
      if (!formData.city.trim()) fieldErrors.city = 'Informe a cidade.';
      if (!formData.state.trim()) fieldErrors.state = 'UF';
    }
  }
  const errorOf = (key: keyof typeof formData) => (showErrors ? fieldErrors[key] : undefined);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileComplete) {
      setShowErrors(true);
      const first = Object.keys(fieldErrors)[0];
      if (first) document.getElementById(`co-${first}`)?.focus();
      return;
    }
    handleCompleteOrder();
  };

  const field = (key: keyof typeof formData) => ({
    id: `co-${key}`,
    'aria-invalid': errorOf(key) ? true : undefined,
    'aria-describedby': errorOf(key) ? `co-${key}-error` : undefined,
    className: cn(inputBase, errorOf(key) && errorRing)
  });

  const itemCount = cart.reduce((n, i) => n + i.quantity, 0);
  const canClose = step !== 'success' && !isProcessing;

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[#061A30]/48 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => canClose && handleCloseModal()}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_32px_80px_-24px_rgba(6,26,48,0.48)] sm:rounded-3xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
              <div>
                <p className="flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
                  <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
                  {step === 'form' ? 'Finalizar pedido' : `Pedido #${orderNumber}`}
                </p>
                <h2 id="checkout-title" className="mt-3 font-display text-[28px] font-light leading-9 tracking-tight text-[#0A2540]">
                  {step === 'form' ? (
                    <>Quase <span className="text-amber-700">pronto.</span></>
                  ) : (
                    <>Pedido <span className="text-amber-700">registrado.</span></>
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isProcessing}
                aria-label="Fechar"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-600 ring-1 ring-inset ring-zinc-200 transition-colors hover:bg-zinc-100 hover:text-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] disabled:opacity-48 cursor-pointer"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8">
              {step === 'form' ? (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
                  {/* Quem está comprando */}
                  {user ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-[#F6F1E7] p-4">
                      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0A2540] text-sm font-semibold text-amber-300">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-5 text-zinc-900">{user.name}</span>
                        <span className="block truncate text-sm leading-5 text-zinc-600">{user.email}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium leading-4 text-[#0A2540] ring-1 ring-inset ring-black/8">
                        {isAdmin ? 'Admin' : 'Conta conectada'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F6F1E7] p-4">
                      <p className="text-sm leading-5 text-zinc-800">
                        Compra rápida: só o seu nome é obrigatório.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          closeCheckout();
                          navigate('/login?redirect=checkout');
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#0A2540] ring-1 ring-inset ring-zinc-300 transition-colors hover:ring-[#0A2540] focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                      >
                        <LogIn aria-hidden="true" className="h-4 w-4" />
                        Entrar
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-5 text-amber-900 ring-1 ring-inset ring-amber-200">
                      <strong className="font-semibold">Modo admin:</strong> dá para salvar a venda sem CPF, telefone ou endereço.
                    </p>
                  )}

                  {/* Dados */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="co-name" label={user ? 'Nome de quem recebe' : 'Seu nome'} error={errorOf('name')} className="sm:col-span-2">
                      <input {...field('name')} type="text" autoComplete="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </Field>
                    <Field id="co-phone" label="WhatsApp" optional={!user} error={errorOf('phone')} className={user ? '' : 'sm:col-span-2'}>
                      <input {...field('phone')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(13) 99999-9999" value={formData.phone} onChange={e => handlePhoneChange(e.target.value)} />
                    </Field>
                    {user && (
                      <Field id="co-cpf" label="CPF" error={errorOf('cpf') || (formData.cpf && !isValidCPF(formData.cpf) ? 'Esse CPF não é válido.' : undefined)}>
                        <input {...field('cpf')} type="text" inputMode="numeric" placeholder="000.000.000-00" value={formData.cpf} onChange={e => handleCpfChange(e.target.value)} />
                      </Field>
                    )}
                  </div>

                  {/* Endereço (só com conta) */}
                  {user && (
                    <fieldset className="flex flex-col gap-4">
                      <legend className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase leading-4 tracking-[0.2em] text-zinc-600">
                        <span aria-hidden="true" className="h-px w-6 bg-amber-500" />
                        Endereço de entrega
                      </legend>
                      <div className="grid grid-cols-6 gap-4">
                        <Field id="co-cep" label="CEP" error={errorOf('cep')} help={isLoadingCep ? 'Buscando endereço…' : undefined} className="col-span-6 sm:col-span-2">
                          <input {...field('cep')} type="text" inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={formData.cep} onChange={e => handleCepChange(e.target.value)} />
                        </Field>
                        <Field id="co-street" label="Rua" error={errorOf('street')} className="col-span-6 sm:col-span-4">
                          <input {...field('street')} type="text" autoComplete="address-line1" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} />
                        </Field>
                        <Field id="co-number" label="Número" error={errorOf('number')} className="col-span-2">
                          <input {...field('number')} type="text" inputMode="numeric" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                        </Field>
                        <Field id="co-complement" label="Complemento" optional className="col-span-4">
                          <input {...field('complement')} type="text" autoComplete="address-line2" placeholder="Apto, bloco…" value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} />
                        </Field>
                        <Field id="co-neighborhood" label="Bairro" optional className="col-span-6 sm:col-span-2">
                          <input {...field('neighborhood')} type="text" value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} />
                        </Field>
                        <Field id="co-city" label="Cidade" error={errorOf('city')} className="col-span-4 sm:col-span-3">
                          <input {...field('city')} type="text" autoComplete="address-level2" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                        </Field>
                        <Field id="co-state" label="UF" error={errorOf('state')} className="col-span-2 sm:col-span-1">
                          <input {...field('state')} type="text" autoComplete="address-level1" maxLength={2} value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })} />
                        </Field>
                      </div>
                    </fieldset>
                  )}

                  {/* Resumo */}
                  <dl className="flex items-end justify-between gap-4 border-t border-zinc-200 pt-6">
                    <div>
                      <dt className="text-sm leading-5 text-zinc-600">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</dt>
                      <dd className="text-sm leading-5 text-zinc-600">Pagamento e entrega combinados no WhatsApp</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-600">Total</dt>
                      <dd className="mt-1 font-display text-[28px] font-light leading-8 tabular-nums text-[#0A2540]">{brl(total)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-3">
                    <ButtonWithIcon type="submit" icon={isProcessing ? Loader2 : MessageCircle} disabled={isProcessing} className="w-full">
                      {isProcessing ? 'Registrando pedido…' : isAdmin ? 'Salvar venda direta' : 'Enviar pedido pelo WhatsApp'}
                    </ButtonWithIcon>
                    {!isAdmin && (
                      <p className="text-center text-sm leading-5 text-zinc-600">
                        O pedido fica salvo e o WhatsApp da SunLab abre com tudo escrito.
                      </p>
                    )}
                  </div>
                </form>
              ) : (
                /* Pedido registrado */
                <div className="flex flex-col gap-6">
                  <div role="status" className="flex items-start gap-4">
                    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                      <Check className="h-6 w-6" />
                    </span>
                    <p className="text-base leading-6 text-zinc-600">
                      {isAdmin
                        ? 'A venda foi salva.'
                        : 'Abrimos o WhatsApp da SunLab com o pedido escrito. É só enviar a mensagem para combinar pagamento e entrega.'}
                    </p>
                  </div>

                  {completedOrderData && (
                    <div className="rounded-2xl bg-[#F6F1E7] p-4 sm:p-6">
                      <ul className="flex flex-col divide-y divide-zinc-300/60">
                        {completedOrderData.items.map((it, idx) => (
                          <li key={idx} className="flex items-center gap-3 py-3 first:pt-0">
                            {it.image && <img src={it.image} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover" />}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold leading-5 text-zinc-900">{it.name}</span>
                              <span className="block text-sm leading-5 text-zinc-600">
                                {it.quantity}× {it.color && it.color !== 'Padrão' ? `· ${it.color}` : ''}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold leading-5 tabular-nums text-zinc-900">{brl(it.quantity * it.unitPrice)}</span>
                          </li>
                        ))}
                      </ul>
                      <dl className="mt-3 flex flex-col gap-2 border-t border-zinc-300/60 pt-4 text-sm leading-5">
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-600">Para</dt>
                          <dd className="text-right font-medium text-zinc-900">{completedOrderData.customerName}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-zinc-600">Entrega</dt>
                          <dd className="text-right font-medium text-zinc-900">{completedOrderData.shippingAddress}</dd>
                        </div>
                        <div className="flex items-end justify-between gap-4 pt-2">
                          <dt className="font-semibold text-zinc-900">Total</dt>
                          <dd className="font-display text-2xl font-light leading-8 tabular-nums text-[#0A2540]">{brl(completedOrderData.totalAmount)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {!isAdmin && completedOrderData && (
                      <ButtonWithIcon
                        href={`https://wa.me/5513996061681?text=${encodeURIComponent(generateWhatsAppMessage(completedOrderData))}`}
                        variant="dark"
                        icon={MessageCircle}
                      >
                        Abrir o WhatsApp
                      </ButtonWithIcon>
                    )}
                    <ButtonWithIcon to="/orders" variant="outline" icon={Package} onClick={handleCloseModal}>
                      Meus pedidos
                    </ButtonWithIcon>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={copyWhatsAppDetails}
                        className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-[#0A2540] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                      >
                        {copiedWhatsAppText ? <Check aria-hidden="true" className="h-4 w-4 text-emerald-700" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                        <span aria-live="polite">{copiedWhatsAppText ? 'Texto copiado' : 'Copiar texto do pedido'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="inline-flex h-10 items-center text-sm font-semibold text-zinc-600 underline-offset-4 hover:text-[#0A2540] hover:underline focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                    >
                      Voltar para a loja
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const inputBase =
  'h-12 w-full rounded-2xl bg-white px-4 text-base text-zinc-900 ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-500 outline-none transition-shadow focus:ring-2 focus:ring-[#0A2540]';
const errorRing = 'ring-2 ring-rose-600 focus:ring-rose-600';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Field: React.FC<{ id: string; label: string; optional?: boolean; error?: string; help?: string; className?: string; children: React.ReactNode }> = ({
  id, label, optional, error, help, className, children
}) => (
  <div className={cn('flex flex-col gap-2', className)}>
    <label htmlFor={id} className="text-sm font-medium leading-5 text-zinc-800">
      {label} {optional && <span className="font-normal text-zinc-600">(opcional)</span>}
    </label>
    {children}
    {help && !error && <p className="text-sm leading-5 text-zinc-600" aria-live="polite">{help}</p>}
    {error && <p id={`${id}-error`} className="text-sm leading-5 text-rose-700">{error}</p>}
  </div>
);
