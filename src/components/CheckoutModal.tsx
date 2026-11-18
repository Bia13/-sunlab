import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { X, QrCode, Copy, Check, MessageCircle, Clock, Key, Package, LogIn, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ButtonWithIcon } from '@/components/ui/button-with-icon';
import { cn } from '@/lib/utils';
import { useCart, type CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { fetchSupabaseSettings, isSupabaseConfigured, upsertSupabaseOrder, syncOrderToErp3d } from '@/lib/supabase';
import {
  generatePixPayload,
  generatePixQRCode,
  DEFAULT_PIX_CONFIG,
  type PixConfig
} from '../utils/pix';

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { isCheckoutOpen, closeCheckout, total, clearCart, cart } = useCart();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeEmail, setStoreEmail] = useState('sunlab013@gmail.com');
  const [pixConfig, setPixConfig] = useState<PixConfig>(DEFAULT_PIX_CONFIG);
  const [pixPayload, setPixPayload] = useState('');
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState('');
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
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
      productId?: string;
      name: string;
      slug?: string;
      image?: string;
      color?: string;
      size?: string;
      quantity: number;
      unitPrice: number;
      unitCost?: number;
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

  // Dados mínimos de identificação e contato
  const [formData, setFormData] = useState(() => {
    const saved = user?.email ? loadSavedProfile(user.email) : null;
    return {
      name: saved?.name || (user?.name && user.name !== 'SunLab Admin' && !user.name.includes('@') ? user.name : ''),
      email: user?.email || '',
      phone: saved?.phone || ''
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
        phone: saved?.phone || prev.phone || ''
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
      setTimeLeft(15 * 60);
      setCopiedPix(false);
      setCopiedPixKey(false);
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
        closeCheckout();
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

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (step === 'payment' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  // Carregar configurações oficiais do Pix (Supabase prioritário, fallback API local)
  useEffect(() => {
    const loadPixSettings = async () => {
      try {
        if (isSupabaseConfigured()) {
          const s = await fetchSupabaseSettings();
          if (s) {
            if (s.store_email) setStoreEmail(s.store_email);
            if (s.pix_key) {
              setPixConfig({
                key: s.pix_key,
                keyType: (s.pix_key_type as PixConfig['keyType']) || 'phone',
                merchantName: s.pix_merchant_name || DEFAULT_PIX_CONFIG.merchantName,
                merchantCity: s.pix_merchant_city || DEFAULT_PIX_CONFIG.merchantCity,
                whatsapp: s.store_whatsapp || DEFAULT_PIX_CONFIG.whatsapp
              });
              return;
            }
          }
        }
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.store_email) setStoreEmail(data.store_email);
            if (data.pix_key) {
              setPixConfig({
                key: data.pix_key,
                keyType: data.pix_key_type || 'phone',
                merchantName: data.pix_merchant_name || DEFAULT_PIX_CONFIG.merchantName,
                merchantCity: data.pix_merchant_city || DEFAULT_PIX_CONFIG.merchantCity,
                whatsapp: data.store_whatsapp || DEFAULT_PIX_CONFIG.whatsapp
              });
            }
          }
        }
      } catch (e) {
        console.warn('Usando configurações padrão para o Pix:', e);
      }
    };
    if (isCheckoutOpen) {
      loadPixSettings();
    }
  }, [isCheckoutOpen]);

  const payableAmount = completedOrderData?.totalAmount || total;

  // Gerar dinamicamente o código Pix Copia e Cola e o QR Code oficial com o valor exato do pedido
  useEffect(() => {
    if (payableAmount > 0 && isCheckoutOpen) {
      try {
        setIsGeneratingPix(true);
        const payload = generatePixPayload({
          key: pixConfig.key,
          keyType: pixConfig.keyType,
          name: pixConfig.merchantName,
          city: pixConfig.merchantCity,
          amount: payableAmount,
          txid: '***'
        });
        setPixPayload(payload);
        generatePixQRCode(payload)
          .then(url => {
            setPixQrCodeUrl(url);
            setIsGeneratingPix(false);
          })
          .catch(() => setIsGeneratingPix(false));
      } catch (err) {
        console.error('Erro gerando Pix BRCode:', err);
        setIsGeneratingPix(false);
      }
    }
  }, [payableAmount, pixConfig, isCheckoutOpen, step]);

  const formatFriendlyKey = (k: string) => {
    const raw = k.replace(/\D/g, '');
    if (raw.length === 13 && raw.startsWith('55')) {
      return `(${raw.slice(2, 4)}) ${raw.slice(4, 9)}-${raw.slice(9)}`;
    }
    if (raw.length === 11) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    return k;
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  const handleCloseModal = () => {
    setStep('form');
    setCompletedOrderData(null);
    setOrderNumber('');
    closeCheckout();
  };

  const phoneDigits = formData.phone.replace(/\D/g, '');
  const isProfileComplete = isAdmin
    ? true
    : Boolean(formData.name.trim() && phoneDigits.length >= 10);

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

  const handleCompleteOrder = async (e?: React.FormEvent, mode: 'pix' | 'admin_direct' = 'pix') => {
    if (e) e.preventDefault();
    if (!isProfileComplete || isProcessing) return;

    setIsProcessing(true);
    const itemsPayload = cart.map((item: CartItem) => ({
      productId: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.images[0] || '',
      color: item.selectedColor.name,
      size: item.selectedSize || 'Padrão',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: Number((item.product.specs as any)?.cost) || 0
    }));

    let confirmedOrderNumber = orderNumber || `SLB-${Math.floor(100000 + Math.random() * 900000)}`;
    const isDirectAdminSave = isAdmin && mode === 'admin_direct';
    const finalPaymentMethodLabel = isDirectAdminSave ? 'Venda Direta (Admin)' : 'Pix';
    const payableTotal = total;

    const finalCustomerName = formData.name.trim() || (isAdmin ? 'Venda Direta (Admin)' : 'Cliente');
    const finalCustomerEmail = formData.email.trim() || user?.email || (isAdmin ? 'admin@sunlab.com.br' : 'visitante@sunlab.com.br');
    const finalCustomerPhone = formData.phone.trim();
    const shippingAddr = isDirectAdminSave && !finalCustomerPhone
      ? 'Venda Direta (Admin)'
      : 'Contato via Telefone / WhatsApp';

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

    const initialOrderStatus = isDirectAdminSave ? 'Em Produção 3D' : 'Pendente';

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
        status: initialOrderStatus
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

    // Sincronizar venda com o MeuGasto3D (ERP3D) apenas quando já confirmada/paga (ex: Venda Direta Admin)
    // Pedidos via Pix ("Pendente") entram no MeuGasto3D somente após confirmação do pagamento no painel Admin
    const erpSyncTask = isDirectAdminSave
      ? syncOrderToErp3d({
          ...fullOrder,
          status: initialOrderStatus
        }).catch(err => console.warn('[ERP3D] Falha na sincronização da venda:', err))
      : Promise.resolve(false);

    const emailTask = (async () => {
      if (!storeEmail || !storeEmail.includes('@')) return;
      try {
        const cleanDigits = finalCustomerPhone.replace(/\D/g, '');
        const itemsDetailed = itemsPayload
          .map((it, idx) => {
            const tamPart = it.size && it.size !== 'Padrão' ? ` | Tam: ${it.size}` : '';
            return `${idx + 1}. ${it.name} | Cor: ${it.color || 'Padrão'}${tamPart} | Qtd: ${it.quantity} un. | Valor: R$ ${(it.quantity * it.unitPrice).toFixed(2).replace('.', ',')}`;
          })
          .join('\n');
        const whatsappMessage = generateWhatsAppMessage(fullOrder);

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(storeEmail.trim())}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            _subject: `🌊 NOVO PEDIDO REALIZADO — SUNLAB 3D (#${confirmedOrderNumber})`,
            _template: 'box',
            _captcha: 'false',
            Mensagem_Completa: whatsappMessage,
            Pedido: `#${confirmedOrderNumber}`,
            Nome_do_Cliente: finalCustomerName,
            Telefone_WhatsApp: finalCustomerPhone || 'Não informado',
            Chamar_Cliente_no_WhatsApp: cleanDigits ? `https://wa.me/55${cleanDigits}` : 'Não informado',
            Produtos_Escolhidos: itemsDetailed,
            Valor_Total: `R$ ${payableTotal.toFixed(2).replace('.', ',')}`
          })
        });
        clearTimeout(timer);
      } catch (mailErr) {
        console.warn('Aviso ao enviar formulário por e-mail:', mailErr);
      }
    })();

    await Promise.allSettled([erpSyncTask, emailTask]);

    clearCart();
    setIsProcessing(false);
    if (isDirectAdminSave) {
      setStep('success');
    } else {
      setTimeLeft(15 * 60);
      setStep('payment');
    }
  };

  const copyPixCode = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const copyDirectPixKey = () => {
    const rawToCopy = pixConfig.key.startsWith('+55') ? pixConfig.key.slice(3) : pixConfig.key;
    navigator.clipboard.writeText(rawToCopy);
    setCopiedPixKey(true);
    setTimeout(() => setCopiedPixKey(false), 2500);
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

  // Erros dos campos (só aparecem depois da primeira tentativa de enviar).
  const fieldErrors: Partial<Record<'name' | 'phone', string>> = {};
  if (!isAdmin) {
    if (!formData.name.trim()) fieldErrors.name = 'Diga como podemos te chamar.';
    if (phoneDigits.length < 10) fieldErrors.phone = 'Informe um telefone com DDD.';
  }
  const errorOf = (key: 'name' | 'phone') => (showErrors ? fieldErrors[key] : undefined);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProfileComplete) {
      setShowErrors(true);
      const first = Object.keys(fieldErrors)[0];
      if (first) document.getElementById(`co-${first}`)?.focus();
      return;
    }
    handleCompleteOrder(undefined, 'pix');
  };

  const field = (key: 'name' | 'phone') => ({
    id: `co-${key}`,
    'aria-invalid': errorOf(key) ? true : undefined,
    'aria-describedby': errorOf(key) ? `co-${key}-error` : undefined,
    className: cn(inputBase, errorOf(key) && errorRing)
  });

  const itemCount = cart.reduce((n, i) => n + i.quantity, 0);
  const whatsappOrderUrl = completedOrderData
    ? `https://wa.me/5513996061681?text=${encodeURIComponent(generateWhatsAppMessage(completedOrderData))}`
    : 'https://wa.me/5513996061681';

  const eyebrow = step === 'form' ? 'Finalizar pedido' : `Pedido #${orderNumber}`;
  const title =
    step === 'form' ? <>Quase <span className="text-amber-700">pronto.</span></>
    : step === 'payment' ? <>Pague com <span className="text-amber-700">Pix.</span></>
    : <>Venda <span className="text-amber-700">salva.</span></>;

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
            onClick={() => step === 'form' && !isProcessing && handleCloseModal()}
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
                  {eyebrow}
                </p>
                <h2 id="checkout-title" className="mt-3 font-display text-[28px] font-light leading-9 tracking-tight text-[#0A2540]">
                  {title}
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
              {/* 1. Identificação */}
              {step === 'form' && (
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
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
                      <p className="text-sm leading-5 text-zinc-800">Só precisamos do seu nome e telefone.</p>
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
                      <strong className="font-semibold">Modo admin:</strong> dá para salvar uma venda direta sem nome ou telefone.
                    </p>
                  )}

                  <div className="flex flex-col gap-4">
                    <Field id="co-name" label="Seu nome" error={errorOf('name')}>
                      <input {...field('name')} type="text" autoComplete="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </Field>
                    <Field id="co-phone" label="Telefone ou WhatsApp" error={errorOf('phone')} help="É por ele que confirmamos o pedido.">
                      <input {...field('phone')} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(13) 99999-9999" value={formData.phone} onChange={e => handlePhoneChange(e.target.value)} />
                    </Field>
                  </div>

                  <dl className="flex items-end justify-between gap-4 border-t border-zinc-200 pt-6">
                    <div>
                      <dt className="text-sm leading-5 text-zinc-600">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</dt>
                      <dd className="text-sm leading-5 text-zinc-600">Pagamento por Pix</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-xs font-semibold uppercase leading-4 tracking-[0.16em] text-zinc-600">Total</dt>
                      <dd className="mt-1 font-display text-[28px] font-light leading-8 tabular-nums text-[#0A2540]">{brl(total)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-3">
                    <ButtonWithIcon type="submit" icon={isProcessing ? Loader2 : QrCode} disabled={isProcessing} className="w-full">
                      {isProcessing ? 'Gerando o Pix…' : 'Gerar Pix para pagar'}
                    </ButtonWithIcon>
                    {isAdmin && (
                      <ButtonWithIcon variant="outline" icon={Check} disabled={isProcessing} onClick={() => handleCompleteOrder(undefined, 'admin_direct')} className="w-full">
                        Salvar venda direta, sem Pix
                      </ButtonWithIcon>
                    )}
                    <p className="text-center text-sm leading-5 text-zinc-600">
                      Na próxima tela aparecem o QR Code e o Pix Copia e Cola no valor exato.
                    </p>
                  </div>
                </form>
              )}

              {/* 2. Pagamento por Pix */}
              {step === 'payment' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p role="status" className="inline-flex items-center gap-2 text-sm font-medium leading-5 text-amber-900">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
                      Aguardando pagamento
                    </p>
                    <p className="inline-flex items-center gap-2 rounded-full bg-[#F6F1E7] px-3 py-1 text-sm leading-5 text-zinc-800">
                      <Clock aria-hidden="true" className="h-4 w-4 text-amber-700" />
                      Vale por <span className="font-mono font-semibold tabular-nums">{formatTimer(timeLeft)}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#F6F1E7] p-6 text-center">
                    <div className="grid h-52 w-52 place-items-center rounded-2xl bg-white p-3 ring-1 ring-inset ring-black/8">
                      {isGeneratingPix || !pixQrCodeUrl ? (
                        <span className="flex flex-col items-center gap-2 text-sm leading-5 text-zinc-600">
                          <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-[#0A2540] motion-reduce:animate-none" />
                          Gerando QR Code…
                        </span>
                      ) : (
                        <img src={pixQrCodeUrl} alt={`QR Code Pix de ${brl(payableAmount)} para a SunLab`} className="h-full w-full select-none object-contain" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm leading-5 text-zinc-600">Valor exato</p>
                      <p className="font-display text-[40px] font-light leading-[44px] tabular-nums text-[#0A2540]">{brl(payableAmount)}</p>
                    </div>
                  </div>

                  {pixPayload && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="co-pix" className="text-sm font-medium leading-5 text-zinc-800">Pix Copia e Cola</label>
                      <textarea
                        id="co-pix"
                        readOnly
                        rows={3}
                        value={pixPayload}
                        onFocus={e => e.currentTarget.select()}
                        className="w-full resize-none rounded-2xl bg-white px-4 py-3 font-mono text-xs leading-5 text-zinc-700 ring-1 ring-inset ring-zinc-300 outline-none focus:ring-2 focus:ring-[#0A2540]"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonWithIcon variant="dark" icon={copiedPix ? Check : Copy} onClick={copyPixCode} className="w-full sm:w-auto">
                      {copiedPix ? 'Código copiado' : 'Copiar código Pix'}
                    </ButtonWithIcon>
                    <ButtonWithIcon variant="outline" icon={copiedPixKey ? Check : Key} onClick={copyDirectPixKey} className="w-full sm:w-auto">
                      {copiedPixKey ? 'Chave copiada' : 'Copiar chave Pix'}
                    </ButtonWithIcon>
                  </div>
                  <p aria-live="polite" className="sr-only">
                    {copiedPix ? 'Código Pix copiado.' : copiedPixKey ? 'Chave Pix copiada.' : ''}
                  </p>

                  <dl className="flex flex-col gap-2 border-y border-zinc-200 py-4 text-sm leading-5">
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-600">Chave Pix</dt>
                      <dd className="font-mono font-semibold text-zinc-900">{formatFriendlyKey(pixConfig.key)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-600">Favorecido</dt>
                      <dd className="text-right font-medium text-zinc-900">{pixConfig.merchantName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-zinc-600">Cidade</dt>
                      <dd className="text-right text-zinc-900">{pixConfig.merchantCity}</dd>
                    </div>
                  </dl>

                  <p className="text-base leading-6 text-zinc-600">
                    Seu pedido já está registrado. Assim que o Pix cair na conta, confirmamos e falamos com você pelo telefone informado.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <ButtonWithIcon to="/orders" variant="outline" icon={Package} onClick={handleCloseModal}>
                      Meus pedidos
                    </ButtonWithIcon>
                    <a
                      href={whatsappOrderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-[#0A2540] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#0A2540]"
                    >
                      <MessageCircle aria-hidden="true" className="h-4 w-4" />
                      Mandar o comprovante no WhatsApp
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </div>
                </div>
              )}

              {/* 3. Venda direta salva (admin) */}
              {step === 'success' && (
                <div className="flex flex-col gap-6">
                  <div role="status" className="flex items-start gap-4">
                    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                      <Check className="h-6 w-6" />
                    </span>
                    <p className="text-base leading-6 text-zinc-600">A venda foi salva e já entrou como em produção.</p>
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
                          <dt className="text-zinc-600">Cliente</dt>
                          <dd className="text-right font-medium text-zinc-900">{completedOrderData.customerName}</dd>
                        </div>
                        <div className="flex items-end justify-between gap-4 pt-2">
                          <dt className="font-semibold text-zinc-900">Total</dt>
                          <dd className="font-display text-2xl font-light leading-8 tabular-nums text-[#0A2540]">{brl(completedOrderData.totalAmount)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <ButtonWithIcon to="/orders" variant="dark" icon={Package} onClick={handleCloseModal}>
                      Ver pedidos
                    </ButtonWithIcon>
                    <button
                      type="button"
                      onClick={copyWhatsAppDetails}
                      className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-[#0A2540] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                    >
                      {copiedWhatsAppText ? <Check aria-hidden="true" className="h-4 w-4 text-emerald-700" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                      <span aria-live="polite">{copiedWhatsAppText ? 'Texto copiado' : 'Copiar texto do pedido'}</span>
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
    {help && !error && <p className="text-sm leading-5 text-zinc-600">{help}</p>}
    {error && <p id={`${id}-error`} className="text-sm leading-5 text-rose-700">{error}</p>}
  </div>
);
