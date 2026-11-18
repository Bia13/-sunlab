import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Product, ProductColor } from '@/data/products';
import { useAuth } from '@/context/AuthContext';

export interface CartItem {
  id: string; // unique item id (productId + color + size)
  product: Product;
  quantity: number;
  selectedColor: ProductColor;
  selectedSize?: string;
  unitPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, color?: ProductColor, size?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  /** Troca a cor de um item; se já existir o mesmo produto nessa cor, junta as quantidades. */
  changeItemColor: (itemId: string, color: ProductColor) => void;
  clearCart: () => void;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  appliedCoupon: string | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  totalItems: number;
  freeShippingThreshold: number;
  amountNeededForFreeShipping: number;
  
  // UI states
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;

  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;

  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'sunlab_cart_v1';
const FREE_SHIPPING_LIMIT = 0;
const STANDARD_SHIPPING_RATE = 0;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isInitialLoad = useRef(true);
  const syncTimer = useRef<any>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isFreeShippingCoupon, setIsFreeShippingCoupon] = useState<boolean>(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const previousUserRef = useRef<string | null>(user?.email || null);

  // Ao deslogar, limpa imediatamente os itens do carrinho e cache local
  useEffect(() => {
    if (previousUserRef.current && !user) {
      setCart([]);
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch (_) {}
    }
    previousUserRef.current = user?.email || null;
  }, [user]);

  // Auto-abrir checkout se veio de redirecionamento de login (?checkout=true)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'true') {
        setIsCheckoutOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('checkout');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    } catch (_) {}
  }, []);

  // 1. Sincronização multi-dispositivo: Ao logar na conta (PC ou Celular), carrega o carrinho salvo no banco
  useEffect(() => {
    if (!user?.email) return;

    const fetchUserCart = async () => {
      try {
        const res = await fetch(`/api/cart?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            setCart(prev => {
              const map = new Map<string, CartItem>();
              data.items.forEach((it: CartItem) => map.set(it.id, it));
              prev.forEach(it => {
                if (!map.has(it.id)) map.set(it.id, it);
              });
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar carrinho da conta:', err);
      } finally {
        isInitialLoad.current = false;
      }
    };

    fetchUserCart();
  }, [user?.email]);

  // 2. Salva localmente e sincroniza na nuvem/banco da conta do usuário
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }

    if (user?.email && !isInitialLoad.current) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        try {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              items: cart
            })
          });
        } catch (err) {
          console.warn('Falha ao salvar carrinho no banco de dados:', err);
        }
      }, 500);
    }
  }, [cart, user?.email]);

  const addToCart = (
    product: Product,
    quantity: number = 1,
    color?: ProductColor,
    size?: string
  ) => {
    const selectedColor = color || product.colors[0] || { name: 'Padrão', hex: '#18181B' };
    const selectedSize = size || (product.sizes ? product.sizes[0] : undefined);
    const itemId = `${product.id}-${selectedColor.name}-${selectedSize || 'std'}`;

    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          product,
          quantity,
          selectedColor,
          selectedSize,
          unitPrice: product.price
        }
      ];
    });
    // Não abre mais o carrinho a cada produto adicionado: o retorno é a foto voando até o
    // ícone do carrinho e o contador subindo. O carrinho abre quando a pessoa clica nele.
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const changeItemColor = (itemId: string, color: ProductColor) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const newId = `${item.product.id}-${color.name}-${item.selectedSize || 'std'}`;
      if (newId === itemId) return prev;
      const existing = prev.find(i => i.id === newId);
      if (existing) {
        // Mesmo produto já está no carrinho nessa cor: junta numa linha só.
        return prev
          .filter(i => i.id !== itemId)
          .map(i => (i.id === newId ? { ...i, quantity: i.quantity + item.quantity } : i));
      }
      return prev.map(i => (i.id === itemId ? { ...i, id: newId, selectedColor: color } : i));
    });
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setIsFreeShippingCoupon(false);
  };

  const applyCoupon = (_code: string) => {
    setAppliedCoupon(null);
    setIsFreeShippingCoupon(false);
    return { success: false, message: 'Cupons de desconto desativados.' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setIsFreeShippingCoupon(false);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const discount = 0;
  
  const rawShipping = subtotal === 0
    ? 0
    : (subtotal >= FREE_SHIPPING_LIMIT || isFreeShippingCoupon)
      ? 0
      : STANDARD_SHIPPING_RATE;

  const shipping = rawShipping;
  const total = Math.max(0, subtotal - discount + shipping);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_LIMIT - subtotal);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        changeItemColor,
        clearCart,
        subtotal,
        discount,
        shipping,
        total,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        totalItems,
        freeShippingThreshold: FREE_SHIPPING_LIMIT,
        amountNeededForFreeShipping,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        isCheckoutOpen,
        openCheckout: () => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        },
        closeCheckout: () => setIsCheckoutOpen(false),
        quickViewProduct,
        openQuickView: (product: Product) => setQuickViewProduct(product),
        closeQuickView: () => setQuickViewProduct(null),
        isSearchOpen,
        openSearch: () => setIsSearchOpen(true),
        closeSearch: () => setIsSearchOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
