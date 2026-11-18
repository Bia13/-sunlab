import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  X,
  CheckCircle,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  MessageCircle,
  Clock,
  Lock,
  Key,
  Printer,
  Package,
  LogIn,
  Loader2
} from 'lucide-react';
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
    }
  }, [isCheckoutOpen]);

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

    // Sincronizar venda com o MeuGasto3D (ERP3D) e enviar formulário para o e-mail configurado do lojista
    const erpSyncTask = syncOrderToErp3d({
      ...fullOrder,
      status: initialOrderStatus
    }).catch(err => console.warn('[ERP3D] Falha na sincronização da venda:', err));

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

  if (!isCheckoutOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-700/30 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (step !== 'success' && !isProcessing) handleCloseModal();
        }}
      />

      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white border border-zinc-200 shadow-2xl overflow-hidden z-10 my-auto sm:my-8 max-h-[96vh] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-blue-950 truncate max-w-[260px] sm:max-w-none">
              {step === 'form' && 'Finalizar Pedido — Identificação'}
              {step === 'payment' && 'Pagamento via Pix'}
              {step === 'success' && 'Pedido Registrado com Sucesso!'}
            </h3>
          </div>
          {step !== 'success' && (
            <button
              onClick={handleCloseModal}
              className="p-1 rounded-lg text-blue-500 hover:text-blue-950 hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <>
              {/* STEP 1: Identificação */}
              {step === 'form' && (
                <form onSubmit={(e) => handleCompleteOrder(e, 'pix')} noValidate={isAdmin || !user} className="space-y-4">
                  {/* Banner de Identificação do Usuário */}
                  {user ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-blue-950 block">{user.name}</span>
                          <span className="text-blue-700 text-[11px]">{user.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-blue-200 text-blue-800 font-medium">
                        {isAdmin ? 'Admin (Sem Validação)' : 'Conta Conectada'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs gap-2">
                      <span className="text-blue-950 font-medium">
                        Informe seu nome e telefone de contato para concluir o pedido.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          closeCheckout();
                          navigate('/login?redirect=checkout');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 shrink-0 cursor-pointer underline underline-offset-2"
                      >
                        <LogIn className="w-3 h-3" />
                        <span>Entrar</span>
                      </button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <strong>Modo Admin ativo:</strong> Você pode salvar a compra direta mesmo sem preencher nome ou telefone.
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Seu Nome *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Digite seu nome completo"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Telefone / WhatsApp de Contato *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(13) 99999-9999"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Order Mini Summary */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs text-zinc-700">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Qualidade e garantia SunLab</span>
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-400 text-[10px] block">Valor Total</span>
                      <span className="font-bold text-zinc-900 text-sm">
                        R$ {total.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={!isProfileComplete || isProcessing}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          <span>Gerando Código Pix...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Gerar Código Pix para Pagamento →</span>
                        </>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleCompleteOrder(undefined, 'admin_direct')}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs transition-all cursor-pointer"
                      >
                        {isProcessing ? 'Salvando venda...' : 'Salvar Compra Direta (Admin — Sem Pix)'}
                      </button>
                    )}

                    <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5 pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Na próxima tela exibiremos o QR Code e o código Pix Copia e Cola no valor exato do pedido.</span>
                    </p>
                  </div>
                </form>
              )}

              {/* STEP 2: Pagamento Exclusivo via Pix */}
              {step === 'payment' && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Trust Badge do Pix + Número do Pedido */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900">
                          Pedido #{orderNumber} — Aguardando Pagamento
                        </div>
                        <p className="text-[10px] text-zinc-600">
                          Escaneie o QR Code ou copie o código Pix abaixo para pagar
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium self-start sm:self-auto">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pix Oficial BCB</span>
                    </div>
                  </div>

                  {/* PIX AREA */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col items-center text-center space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-zinc-300 text-zinc-700 text-xs font-mono font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Válido por: {formatTimer(timeLeft)}</span>
                    </div>

                    {/* QR Code Pix */}
                    <div className="w-48 h-48 bg-white p-3 rounded-2xl flex items-center justify-center shadow-sm border-2 border-emerald-500/30 relative">
                      {isGeneratingPix || !pixQrCodeUrl ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                          <span className="text-[11px] font-medium text-zinc-500">Gerando QR Code Pix...</span>
                        </div>
                      ) : (
                        <img
                          src={pixQrCodeUrl}
                          alt="QR Code Pix SunLab"
                          className="w-full h-full object-contain rounded-xl select-none"
                        />
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-zinc-500">Valor exato para pagamento Pix:</span>
                      <h4 className="text-3xl font-extrabold text-zinc-900 font-display mt-0.5">
                        R$ {payableAmount.toFixed(2).replace('.', ',')}
                      </h4>
                    </div>

                    {/* Código Pix Copia e Cola visível */}
                    {pixPayload && (
                      <div className="w-full max-w-md space-y-1.5 text-left">
                        <label className="block text-[11px] font-semibold text-zinc-600">
                          Código Pix Copia e Cola:
                        </label>
                        <div className="p-2.5 rounded-xl bg-white border border-zinc-300 text-[11px] font-mono text-zinc-700 break-all select-all max-h-20 overflow-y-auto">
                          {pixPayload}
                        </div>
                      </div>
                    )}

                    {/* Informações da Chave Pix */}
                    <div className="w-full max-w-md p-3.5 rounded-xl bg-white border border-zinc-200 text-left text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium">Chave Pix:</span>
                        <strong className="text-zinc-900 font-mono font-bold">
                          {formatFriendlyKey(pixConfig.key)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Favorecido:</span>
                        <span className="text-zinc-800 font-semibold">{pixConfig.merchantName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Cidade:</span>
                        <span className="text-zinc-700">{pixConfig.merchantCity}</span>
                      </div>
                    </div>

                    {/* Botões de Cópia */}
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-md">
                      <button
                        type="button"
                        onClick={copyPixCode}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-300" />
                            <span>Pix Copia e Cola Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copiar Pix Copia e Cola</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={copyDirectPixKey}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        {copiedPixKey ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>Chave Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-4 h-4 text-zinc-500" />
                            <span>Copiar Chave Pix</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Aviso de conferência e ações pós-Pix */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed text-center">
                    Seu pedido foi registrado como <strong>Pendente</strong>. Realize o pagamento via QR Code ou Pix Copia e Cola acima — assim que identificarmos o Pix em nossa conta, confirmaremos seu pedido e entraremos em contato pelo telefone/WhatsApp informado.
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal();
                        navigate('/orders');
                      }}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-blue-700" />
                      <span>Ver Meus Pedidos</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <span>Fechar e voltar à loja</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Pedido Registrado e Aguardando Conferência */}
              {step === 'success' && (
                <div className="text-center py-6 space-y-6 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold mb-2 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pedido Registrado • Aguardando Conferência do Pix</span>
                    </div>
                    <div className="block mt-1">
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-700 uppercase tracking-widest">
                        Pedido #{orderNumber}
                      </span>
                    </div>
                    <h4 className="text-2xl font-extrabold text-zinc-900 font-display mt-3">
                      Pedido Realizado com Sucesso!
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Seu pedido já foi salvo no sistema da SunLab! Assim que verificarmos que o Pix caiu na conta, confirmaremos o pedido e iniciaremos o preparo.
                    </p>
                  </div>

                  {/* Order Receipt Box with Products Breakdown */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 max-w-lg mx-auto text-left space-y-3">
                    <div className="flex justify-between pb-2 border-b border-zinc-200">
                      <span className="text-zinc-500">Pagamento / Status:</span>
                      <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>{completedOrderData?.paymentMethod || 'Pix'} • Pendente de confirmação</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Destinatário:</span>
                      <span className="text-zinc-900 font-medium">{completedOrderData?.customerName || formData.name}</span>
                    </div>
                    {(completedOrderData?.customerPhone || formData.phone) && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">WhatsApp / Telefone:</span>
                        <span className="text-zinc-900 font-medium font-mono">{completedOrderData?.customerPhone || formData.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Entrega:</span>
                      <span className="text-zinc-900 font-medium text-right max-w-[260px] truncate" title={completedOrderData?.shippingAddress || ''}>
                        {completedOrderData?.shippingAddress || 'A combinar via WhatsApp'}
                      </span>
                    </div>

                    {/* Purchased Products Detailed List */}
                    {completedOrderData && completedOrderData.items && completedOrderData.items.length > 0 && (
                      <div className="pt-2 border-t border-zinc-200 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                          Itens do Pedido ({completedOrderData.items.length}):
                        </span>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {completedOrderData.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-zinc-200">
                              <div className="flex items-center gap-2.5">
                                {it.image && (
                                  <img src={it.image} alt={it.name} className="w-8 h-8 rounded-lg object-cover border border-zinc-200" />
                                )}
                                <div>
                                  <div className="font-semibold text-zinc-900 text-xs">{it.name}</div>
                                  <div className="text-[10px] text-zinc-500">
                                    {it.color && `Cor: ${it.color}`} {it.size && `• Tam: ${it.size}`} • {it.quantity}x
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-zinc-900 text-xs">
                                R$ {(it.quantity * it.unitPrice).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-zinc-200">
                      <span className="font-bold text-zinc-900">Total a Pagar:</span>
                      <span className="text-zinc-900 font-extrabold text-base">
                        R$ {(completedOrderData?.totalAmount || total).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for WhatsApp & Orders Page */}
                  <div className="space-y-2.5 max-w-lg mx-auto pt-1">
                    {/* Primary: Send Full Order Details to WhatsApp */}
                    <a
                      href={`https://wa.me/5513996061681?text=${encodeURIComponent(
                        completedOrderData ? generateWhatsAppMessage(completedOrderData) : ''
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
                    >
                      <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                      <span>Enviar Comprovante no WhatsApp (Opcional)</span>
                    </a>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={copyWhatsAppDetails}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-colors cursor-pointer border border-zinc-200"
                      >
                        {copiedWhatsAppText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-600" />}
                        <span>{copiedWhatsAppText ? 'Copiado!' : 'Copiar Texto'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleCloseModal();
                          navigate('/orders');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold text-xs transition-colors cursor-pointer border border-blue-200"
                      >
                        <Package className="w-3.5 h-3.5 text-blue-700" />
                        <span>Ver Meus Pedidos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-xs transition-colors cursor-pointer border border-zinc-200"
                      >
                        <Printer className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Imprimir</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-4 cursor-pointer"
                      >
                        Concluir e voltar à loja
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>

        </div>
      </div>
    </div>
  );
};
