import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/data/products';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uxzzsdrwhucbivzufpzv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4enpzZHJ3aHVjYml2enVmcHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNzIxNzEsImV4cCI6MjEwOTg0ODE3MX0.JbkIw5mSmpDo7pikH1xaIZYS83cTrR8TbVKOoF7EA88';

// Nomes das tabelas isoladas para o SunLab (evita conflito com outros projetos)
export const PRODUCTS_TABLE = 'produtos1';
export const ORDERS_TABLE = 'pedidos1';
export const SETTINGS_TABLE = 'configuracoes1';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') && 
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey.length > 20
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

// ======================== PRODUTOS ======================== //

export const fetchSupabaseProducts = async (): Promise<Product[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Erro ao buscar produtos:', error);
      return null;
    }

    if (data && Array.isArray(data)) {
      return data.map((r: any): Product => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        tagline: r.tagline || 'Design & Fabricação 3D SunLab',
        description: r.description || '',
        story: r.story || r.description || '',
        price: Number(r.price),
        originalPrice: r.original_price ? Number(r.original_price) : undefined,
        category: (r.category || 'decor') as any,
        categoryLabel: r.category_label || (r.category === 'utility' ? 'Utilidades & Suportes' : r.category === 'tech' ? 'Tecnologia & Acessórios' : r.category === 'gifts' ? 'Presentes & Colecionáveis' : r.category === 'custom' ? 'Projetos Sob Medida' : 'Design & Decoração'),
        images: Array.isArray(r.images) ? r.images : (typeof r.images === 'string' ? JSON.parse(r.images || '[]') : []),
        colors: Array.isArray(r.colors) ? r.colors : (typeof r.colors === 'string' ? JSON.parse(r.colors || '[]') : []),
        sizes: Array.isArray(r.sizes) ? r.sizes : (typeof r.sizes === 'string' ? JSON.parse(r.sizes || '[]') : undefined),
        featured: Boolean(r.featured),
        bestseller: Boolean(r.bestseller),
        newArrival: Boolean(r.new_arrival),
        inStock: r.in_stock !== undefined ? Boolean(r.in_stock) : true,
        leadTime: r.lead_time || '2 a 4 dias úteis',
        rating: r.rating ? Number(r.rating) : 5.0,
        reviewsCount: r.reviews_count ? Number(r.reviews_count) : 0,
        specs: r.specs && typeof r.specs === 'object' ? r.specs : {
          material: r.material || 'PLA Premium Biodegradável',
          layerHeight: r.layer_height || '0.12mm (Ultra Definição)',
          dimensions: r.dimensions || 'Sob medida',
          weight: r.weight || '120g',
          infill: r.fill_density || '20% Gyroid',
          finish: 'Acabamento acetinado'
        },
        highlights: Array.isArray(r.highlights) ? r.highlights : ['Impressão 3D de alta precisão', 'Design autoral exclusivo SunLab', 'Material eco-friendly sustentável']
      }));
    }
  } catch (err) {
    console.warn('[Supabase] Falha de conexão ao buscar produtos:', err);
  }
  return null;
};

export const upsertSupabaseProduct = async (p: Partial<Product>): Promise<boolean> => {
  if (!supabase || !p.id) return false;
  try {
    const record = {
      id: p.id,
      name: p.name,
      slug: p.slug || p.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      tagline: p.tagline || 'Design & Fabricação 3D SunLab',
      description: p.description || '',
      story: p.story || p.description || '',
      price: Number(p.price) || 0,
      original_price: p.originalPrice ? Number(p.originalPrice) : null,
      category: p.category || 'decor',
      category_label: p.categoryLabel || 'Design & Decoração',
      images: p.images || [],
      colors: p.colors || [],
      sizes: p.sizes || null,
      featured: Boolean(p.featured),
      bestseller: Boolean(p.bestseller),
      new_arrival: Boolean(p.newArrival),
      in_stock: p.inStock !== undefined ? Boolean(p.inStock) : true,
      lead_time: p.leadTime || '2 a 4 dias úteis',
      rating: p.rating || 5.0,
      reviews_count: p.reviewsCount || 0,
      specs: p.specs || null,
      highlights: p.highlights || [],
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from(PRODUCTS_TABLE).upsert(record, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Erro ao salvar produto:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Falha ao enviar produto:', err);
    return false;
  }
};

export const deleteSupabaseProduct = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(PRODUCTS_TABLE).delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Erro ao deletar produto:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Falha ao deletar produto:', err);
    return false;
  }
};

// ======================== PEDIDOS ======================== //

export interface SupabaseOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  items: any[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export const fetchSupabaseOrders = async (email?: string): Promise<SupabaseOrder[] | null> => {
  if (!supabase) return null;
  try {
    let query = supabase.from(ORDERS_TABLE).select('*').order('created_at', { ascending: false });
    if (email) {
      query = query.ilike('customer_email', email.trim());
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase] Erro ao buscar pedidos:', error);
      return null;
    }
    if (data && Array.isArray(data)) {
      return data.map((r: any) => ({
        id: r.id,
        orderNumber: r.order_number,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone || '',
        shippingAddress: r.shipping_address,
        paymentMethod: r.payment_method,
        items: Array.isArray(r.items) ? r.items : (typeof r.items === 'string' ? JSON.parse(r.items || '[]') : []),
        totalAmount: Number(r.total_amount),
        status: r.status,
        createdAt: r.created_at
      }));
    }
  } catch (err) {
    console.warn('[Supabase] Falha ao buscar pedidos:', err);
  }
  return null;
};

export const upsertSupabaseOrder = async (order: Partial<SupabaseOrder>): Promise<boolean> => {
  if (!supabase || (!order.id && !order.orderNumber)) return false;
  try {
    const record = {
      id: order.id || `ord-${order.orderNumber || Date.now()}`,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_email: order.customerEmail?.toLowerCase(),
      customer_phone: order.customerPhone || '',
      shipping_address: order.shippingAddress || '',
      payment_method: order.paymentMethod || 'WhatsApp',
      items: order.items || [],
      total_amount: Number(order.totalAmount) || 0,
      status: order.status || 'Pendente',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from(ORDERS_TABLE).upsert(record, { onConflict: 'order_number' });
    if (error) {
      console.warn('[Supabase] Erro ao salvar pedido:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Falha ao enviar pedido:', err);
    return false;
  }
};

export const deleteSupabaseOrder = async (orderIdOrNumber: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from(ORDERS_TABLE)
      .delete()
      .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`);
    if (error) {
      console.warn('[Supabase] Erro ao excluir pedido:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Falha ao deletar pedido:', err);
    return false;
  }
};

// ======================== CONFIGURAÇÕES ======================== //

export const fetchSupabaseSettings = async (): Promise<Record<string, string> | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select('*');
    if (error) return null;
    if (data && Array.isArray(data)) {
      const settingsMap: Record<string, string> = {};
      for (const row of data) {
        settingsMap[row.key] = row.value;
      }
      return settingsMap;
    }
  } catch (err) {
    console.warn('[Supabase] Falha ao buscar configurações:', err);
  }
  return null;
};

export const saveSupabaseSetting = async (key: string, value: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return !error;
  } catch {
    return false;
  }
};

// ======================== INTEGRAÇÃO MEUGASTO3D (ERP3D) ======================== //

const ERP3D_SUPABASE_URL = 'https://ufrbkzkgcreetnstoybf.supabase.co';
const ERP3D_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcmJremtnY3JlZXRuc3RveWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1ODA4MjksImV4cCI6MjExMDE1NjgyOX0._HUcpAeaAodua7W9siUZTUDlWozPjUSnQexapHSzsOs';

export interface Erp3dOrderItemInput {
  productId?: string;
  kitId?: string;
  name: string;
  slug?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
}

export interface Erp3dOrderInput {
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  items: Erp3dOrderItemInput[];
  totalAmount?: number;
  status?: string;
  createdAt?: string;
}

const erpHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  'Content-Type': 'application/json',
  apikey: ERP3D_SUPABASE_KEY,
  Authorization: `Bearer ${ERP3D_SUPABASE_KEY}`,
  ...extra
});

const erpRound2 = (v: unknown): number => Math.round((Number(v) || 0) * 100) / 100;

const erpUid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const erpDateIso = (isoOrDate?: string): string => {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  valid.setMinutes(valid.getMinutes() - valid.getTimezoneOffset());
  return valid.toISOString().slice(0, 10);
};

const normalizeErpName = (text: string): string =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const computeErpProductUnitCost = (p: any, data: any): number => {
  if (!p) return 0;
  const s = data.settings || {};
  let material = 0;
  for (const c of p.components || []) {
    const m = (data.materials || []).find((x: any) => x.id === c.materialId);
    if (!m) continue;
    const q = Number(c.qty) || 0;
    material += m.kind === 'filamento' ? (q / 1000) * (Number(m.price) || 0) : q * (Number(m.price) || 0);
  }
  const pr = p.printerId ? (data.printers || []).find((x: any) => x.id === p.printerId) : null;
  const watts = Number(p.watts !== undefined && p.watts !== '' ? p.watts : (pr ? pr.watts : s.watts)) || 0;
  const hours = Number(p.hours) || 0;
  const kwh = Number(p.kwh ?? s.kwh ?? 0.95) || 0;
  const energy = (watts / 1000) * hours * kwh;

  let machine = 0;
  if (pr) {
    const items = (data.printer_items || []).filter((x: any) => x.printerId === pr.id);
    const depPerHour = pr.lifeHours > 0 ? (Number(pr.price) || 0) / Number(pr.lifeHours) : 0;
    const maintCostHour = Number(pr.maintCostHour || 0);
    const itemsPerHour = items.reduce(
      (a: number, x: any) => a + (x.lifeHours > 0 ? ((Number(x.price) || 0) * (Number(x.qty) || 1)) / Number(x.lifeHours) : 0),
      0
    );
    machine = (depPerHour + maintCostHour + itemsPerHour) * hours;
  }

  const total = material + energy + machine + (Number(p.labor) || 0) + (Number(p.other) || 0);
  if (total > 0) return erpRound2(total);
  return erpRound2(Number(p.cost) || 0);
};

const computeErpKitUnitCost = (k: any, data: any): number => {
  if (!k) return 0;
  let total = 0;
  for (const ki of k.items || []) {
    const p = (data.products || []).find((x: any) => x.id === ki.productId);
    if (!p) continue;
    const qty = Math.max(1, parseInt(String(ki.qty || 1), 10) || 1);
    total += computeErpProductUnitCost(p, data) * qty;
  }
  if (total > 0) return erpRound2(total);
  return erpRound2(Number(k.cost) || 0);
};

const findErpCatalogMatch = (item: Erp3dOrderItemInput, data: any): { product?: any; kit?: any } => {
  const kits: any[] = data.kits || [];
  const products: any[] = data.products || [];
  const rawProdId = String(item.productId || '').trim();
  const strippedProdId = rawProdId.replace(/^prt-/, '');
  const rawKitId = String(item.kitId || '').trim();

  if (rawKitId) {
    const k = kits.find(x => x.id === rawKitId);
    if (k) return { kit: k };
  }
  if (rawProdId) {
    const kById = kits.find(x => x.id === rawProdId || x.id === strippedProdId);
    if (kById) return { kit: kById };
    const pById = products.find(x => x.id === rawProdId || x.id === strippedProdId);
    if (pById) return { product: pById };
  }

  const normItem = normalizeErpName(item.name);
  const normSlug = normalizeErpName(item.slug || '');

  const kitExact = kits.find(k => {
    const nk = normalizeErpName(k.name);
    return (normItem && nk === normItem) || (normSlug && nk === normSlug);
  });
  if (kitExact) return { kit: kitExact };

  const prodExact = products.find(p => {
    const np = normalizeErpName(p.name);
    return (normItem && np === normItem) || (normSlug && np === normSlug);
  });
  if (prodExact) return { product: prodExact };

  // Fallback por prefixo/base quando o nome do site tem variação de personalização (ex: "Chaveiro NFC Personalizado" -> "chaveiro nfc")
  if (normItem.length >= 6) {
    const kitFuzzy = kits.find(k => {
      const nk = normalizeErpName(k.name);
      return nk.length >= 5 && (normItem.startsWith(nk + ' ') || nk.startsWith(normItem + ' '));
    });
    if (kitFuzzy) return { kit: kitFuzzy };

    const prodFuzzy = products.find(p => {
      const np = normalizeErpName(p.name);
      return np.length >= 5 && (normItem.startsWith(np + ' ') || np.startsWith(normItem + ' '));
    });
    if (prodFuzzy) return { product: prodFuzzy };
  }

  return {};
};

const computeConsumeMap = (items: any[], data: any): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const i of items) {
    const qty = Number(i.qty) || 1;
    if (i.kitId) {
      const k = (data.kits || []).find((x: any) => x.id === i.kitId);
      if (k) {
        for (const ki of k.items || []) {
          const p = (data.products || []).find((x: any) => x.id === ki.productId);
          if (!p) continue;
          const kQty = Math.max(1, parseInt(String(ki.qty || 1), 10) || 1);
          for (const c of p.components || []) {
            out[c.materialId] = erpRound2((out[c.materialId] || 0) + (Number(c.qty) || 0) * kQty * qty);
          }
        }
      }
      continue;
    }
    if (i.productId) {
      const p = (data.products || []).find((x: any) => x.id === i.productId);
      if (p) {
        for (const c of p.components || []) {
          out[c.materialId] = erpRound2((out[c.materialId] || 0) + (Number(c.qty) || 0) * qty);
        }
      }
    }
  }
  return out;
};

const mapsEqual = (a: Record<string, number>, b: Record<string, number>): boolean => {
  const ka = Object.keys(a || {}).filter(k => (a[k] || 0) > 0).sort();
  const kb = Object.keys(b || {}).filter(k => (b[k] || 0) > 0).sort();
  if (ka.length !== kb.length) return false;
  return ka.every((k, idx) => k === kb[idx] && erpRound2(a[k]) === erpRound2(b[k]));
};

const loadErp3dState = async (): Promise<any | null> => {
  const res = await fetch(`${ERP3D_SUPABASE_URL}/rest/v1/erp3d_store?id=eq.default&select=data`, {
    method: 'GET',
    headers: erpHeaders()
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length || !rows[0]?.data) return null;
  const d = rows[0].data;
  d.materials ||= [];
  d.movements ||= [];
  d.products ||= [];
  d.kits ||= [];
  d.sales ||= [];
  d.clients ||= [];
  d.printers ||= [];
  d.printer_items ||= [];
  return d;
};

const saveErp3dState = async (d: any): Promise<boolean> => {
  const res = await fetch(`${ERP3D_SUPABASE_URL}/rest/v1/erp3d_store`, {
    method: 'POST',
    headers: erpHeaders({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({
      id: 'default',
      data: d,
      updated_at: new Date().toISOString()
    })
  });
  return res.ok;
};

const mapSiteStatusToErp = (status?: string, total = 0): { status: 'pago' | 'pendente'; received: number } => {
  const s = String(status || '').toLowerCase();
  const isPaid =
    s.includes('confirmado') ||
    s.includes('pago') ||
    s.includes('produ') ||
    s.includes('enviado') ||
    s.includes('conclu') ||
    s.includes('entregue');
  return isPaid ? { status: 'pago', received: erpRound2(total) } : { status: 'pendente', received: 0 };
};

export const syncOrderToErp3d = async (order: Erp3dOrderInput): Promise<boolean> => {
  if (!order?.orderNumber) return false;
  try {
    const data = await loadErp3dState();
    if (!data) return false;

    const saleId = `site_${order.orderNumber}`;
    const saleDate = erpDateIso(order.createdAt);
    const clientName = String(order.customerName || '').trim();
    const clientPhone = String(order.customerPhone || '').trim();
    const clientLabel = clientPhone && clientName && !clientName.includes(clientPhone)
      ? `${clientName} (${clientPhone})`
      : clientName;

    // Cadastra/atualiza cliente no MeuGasto3D quando informado
    if (clientName && clientName !== 'Cliente' && clientName !== 'Venda Direta (Admin)') {
      const normClient = clientName.toLowerCase();
      const existingClient = (data.clients || []).find(
        (c: any) => String(c.name || '').trim().toLowerCase() === normClient || (clientPhone && c.phone === clientPhone)
      );
      if (existingClient) {
        if (clientPhone && !existingClient.phone) existingClient.phone = clientPhone;
      } else {
        const newClient = {
          id: erpUid(),
          name: clientName,
          phone: clientPhone,
          email: order.customerEmail && order.customerEmail !== 'visitante@sunlab.com.br' ? order.customerEmail : '',
          notes: `Pedido Site #${order.orderNumber}`,
          discount: 0
        };
        data.clients.push(newClient);
        fetch(`${ERP3D_SUPABASE_URL}/rest/v1/clients`, {
          method: 'POST',
          headers: erpHeaders({ Prefer: 'resolution=merge-duplicates' }),
          body: JSON.stringify(newClient)
        }).catch(() => {});
      }
    }

    const mappedItems = (order.items || []).map(it => {
      const match = findErpCatalogMatch(it, data);
      const qty = Math.max(1, parseInt(String(it.quantity || 1), 10) || 1);
      const unitPrice = erpRound2(it.unitPrice);
      const unitCost = match.kit
        ? computeErpKitUnitCost(match.kit, data)
        : match.product
          ? computeErpProductUnitCost(match.product, data)
          : erpRound2(it.unitCost || 0);

      return {
        productId: match.product ? match.product.id : '',
        kitId: match.kit ? match.kit.id : '',
        name: it.name,
        qty,
        unitPrice,
        unitCost
      };
    });

    const itemsTotal = mappedItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const effectiveTotal = itemsTotal > 0 ? erpRound2(itemsTotal) : erpRound2(order.totalAmount || 0);
    const { status, received } = mapSiteStatusToErp(order.status, effectiveTotal);

    const existingIdx = (data.sales || []).findIndex(
      (s: any) => s.id === saleId || (s.notes && String(s.notes).includes(`#${order.orderNumber}`))
    );
    const existingSale = existingIdx >= 0 ? data.sales[existingIdx] : null;

    const nextConsume = computeConsumeMap(mappedItems, data);
    const oldConsume = existingSale?.consume || {};

    if (!mapsEqual(oldConsume, nextConsume)) {
      // Estorna consumo anterior se houver edição
      for (const matId of Object.keys(oldConsume)) {
        const m = (data.materials || []).find((x: any) => x.id === matId);
        if (!m) continue;
        const qty = Number(oldConsume[matId]) || 0;
        const unitCost = m.kind === 'filamento' ? (Number(m.price) || 0) / 1000 : Number(m.price) || 0;
        m.stock = erpRound2((Number(m.stock) || 0) + qty);
        data.movements.push({
          id: erpUid(),
          materialId: m.id,
          date: saleDate,
          type: 'estorno',
          qty: erpRound2(qty),
          value: erpRound2(qty * unitCost),
          ref: saleId,
          note: `Estorno Pedido Site #${order.orderNumber}`,
          created: Date.now()
        });
      }

      // Aplica consumo atualizado
      for (const matId of Object.keys(nextConsume)) {
        const m = (data.materials || []).find((x: any) => x.id === matId);
        if (!m) continue;
        const qty = Number(nextConsume[matId]) || 0;
        const unitCost = m.kind === 'filamento' ? (Number(m.price) || 0) / 1000 : Number(m.price) || 0;
        m.stock = erpRound2((Number(m.stock) || 0) - qty);
        data.movements.push({
          id: erpUid(),
          materialId: m.id,
          date: saleDate,
          type: 'saida',
          qty: erpRound2(-qty),
          value: erpRound2(-qty * unitCost),
          ref: saleId,
          note: `Venda Site #${order.orderNumber}${clientName ? ' - ' + clientName : ''}`,
          created: Date.now()
        });
      }
    }

    const saleRecord = {
      id: existingSale?.id || saleId,
      date: existingSale?.date || saleDate,
      client: clientLabel,
      method: existingSale?.method || (String(order.paymentMethod || '').toLowerCase().includes('admin') ? 'outros' : 'pix'),
      status,
      received,
      notes: `Pedido Site #${order.orderNumber}`,
      items: mappedItems,
      consume: nextConsume
    };

    if (existingIdx >= 0) {
      data.sales[existingIdx] = saleRecord;
    } else {
      data.sales.push(saleRecord);
    }

    const saved = await saveErp3dState(data);
    if (saved) {
      fetch(`${ERP3D_SUPABASE_URL}/rest/v1/sales`, {
        method: 'POST',
        headers: erpHeaders({ Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify({
          id: saleRecord.id,
          date: saleRecord.date,
          client: saleRecord.client,
          method: saleRecord.method,
          status: saleRecord.status,
          received: saleRecord.received,
          notes: saleRecord.notes,
          items: JSON.stringify(saleRecord.items || []),
          consume: JSON.stringify(saleRecord.consume || {})
        })
      }).catch(() => {});
    }
    return saved;
  } catch (err) {
    console.warn('[ERP3D] Falha ao sincronizar venda do site:', err);
    return false;
  }
};

export const deleteOrderFromErp3d = async (orderNumber: string): Promise<boolean> => {
  if (!orderNumber) return false;
  try {
    const data = await loadErp3dState();
    if (!data) return false;

    const saleId = `site_${orderNumber}`;
    const existing = (data.sales || []).find(
      (s: any) => s.id === saleId || (s.notes && String(s.notes).includes(`#${orderNumber}`))
    );
    if (!existing) return true;

    const todayStr = erpDateIso();
    for (const matId of Object.keys(existing.consume || {})) {
      const m = (data.materials || []).find((x: any) => x.id === matId);
      if (!m) continue;
      const qty = Number(existing.consume[matId]) || 0;
      const unitCost = m.kind === 'filamento' ? (Number(m.price) || 0) / 1000 : Number(m.price) || 0;
      m.stock = erpRound2((Number(m.stock) || 0) + qty);
      data.movements.push({
        id: erpUid(),
        materialId: m.id,
        date: todayStr,
        type: 'estorno',
        qty: erpRound2(qty),
        value: erpRound2(qty * unitCost),
        ref: existing.id,
        note: `Cancelamento/Exclusão Pedido Site #${orderNumber}`,
        created: Date.now()
      });
    }

    data.sales = (data.sales || []).filter((s: any) => s.id !== existing.id);
    const saved = await saveErp3dState(data);
    if (saved) {
      fetch(`${ERP3D_SUPABASE_URL}/rest/v1/sales?id=eq.${encodeURIComponent(existing.id)}`, {
        method: 'DELETE',
        headers: erpHeaders()
      }).catch(() => {});
    }
    return saved;
  } catch (err) {
    console.warn('[ERP3D] Falha ao excluir venda do site:', err);
    return false;
  }
};
