import React, { createContext, useState, useEffect, useContext } from 'react';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';
import { trackAddToCart } from '../utils/pixelTracker';

const CartContext = createContext();

export function getOptionPrice(optionItem, basePrice) {
  basePrice = Number(basePrice) || 0;
  if (!optionItem) return basePrice;
  
  if (typeof optionItem === 'object' && optionItem !== null) {
    if (optionItem.price !== undefined && optionItem.price !== null && !isNaN(optionItem.price)) {
      return Number(optionItem.price);
    }
    optionItem = optionItem.name || optionItem.title || '';
  }
  
  const str = String(optionItem).trim();
  if (!str) return basePrice;
  
  // 1. Explicit price in parentheses: ($1.50) or (+0.50) or (-0.50)
  const explicitMatch = str.match(/\(\s*([+-]?)\s*\$?\s*([0-9.]+)\s*\$?_?\)/);
  if (explicitMatch) {
    const sign = explicitMatch[1];
    const val = parseFloat(explicitMatch[2]);
    if (!isNaN(val)) {
      if (sign === '+') return Math.round((basePrice + val) * 100) / 100;
      if (sign === '-') return Math.round(Math.max(0.01, basePrice - val) * 100) / 100;
      return Math.round(val * 100) / 100;
    }
  }

  // 2. Quantity / Pack Multipliers
  const packMatch = str.match(/(?:Pack of|طقم|علبة|مجموعة)?\s*(\d+)\s*(?:Pcs?|Pieces?|قطع|قطعة|حبات|حبة|Rolls?|لفة|لفات)/i)
    || str.match(/\((\d+)\s*(?:Pc|Pcs|Pieces?|قطع|قطعة|حبة)\)/i)
    || str.match(/^(\d+)\s*(?:Pc|Pcs|قطع|قطعة|حبة)$/i);
    
  if (packMatch) {
    const count = parseInt(packMatch[1], 10);
    if (count > 0) {
      return Math.round(basePrice * count * 100) / 100;
    }
  }

  if (/دزينة|Dozen/i.test(str)) {
    return Math.round(basePrice * 12 * 100) / 100;
  }
  if (/نصف دزينة|Half Dozen/i.test(str)) {
    return Math.round(basePrice * 6 * 100) / 100;
  }
  if (/زوج|Pair/i.test(str)) {
    return Math.round(basePrice * 2 * 100) / 100;
  }

  // 3. Bedding sizes (Single / King / Super King)
  if (/مفرد|Single/i.test(str) && /120|Twin/i.test(str)) {
    return Math.round(basePrice * 0.85 * 100) / 100;
  }
  if (/سوبر كينغ|Super King/i.test(str)) {
    return Math.round(basePrice * 1.20 * 100) / 100;
  }

  // 4. Cable lengths
  if (/1\.2\s*(?:Meters?|متر)/i.test(str)) {
    return Math.round(basePrice * 1.15 * 100) / 100;
  }
  if (/2(?:\.0)?\s*(?:Meters?|متر)/i.test(str)) {
    return Math.round(basePrice * 1.50 * 100) / 100;
  }
  if (/3(?:\.0)?\s*(?:Meters?|متر)/i.test(str)) {
    return Math.round(basePrice * 2.00 * 100) / 100;
  }

  // 5. Power Banks
  if (/20[,.]?000\s*mAh/i.test(str)) {
    return Math.round(basePrice * 1.65 * 100) / 100;
  }
  if (/30[,.]?000\s*mAh/i.test(str)) {
    return Math.round(basePrice * 2.30 * 100) / 100;
  }

  // 6. Fast Chargers
  if (/30W/i.test(str)) {
    return Math.round(basePrice * 1.35 * 100) / 100;
  }
  if (/65W/i.test(str)) {
    return Math.round(basePrice * 2.10 * 100) / 100;
  }

  // 7. Complete Sets
  if (/طقم متكامل|Complete Set/i.test(str)) {
    return Math.round(basePrice * 1.85 * 100) / 100;
  }

  return basePrice;
}

function safeGetItem(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

export const CartProvider = ({ children }) => {
  const { settings, apiBase } = useApp();
  const { user } = useAuth();
  
  const cartKey = user ? `cart_${user.username}` : 'cart_guest';
  const [loadedKey, setLoadedKey] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    const localData = safeGetItem(cartKey);
    if (localData) {
      try {
        setCartItems(JSON.parse(localData));
      } catch (e) {
        setCartItems([]);
      }
      setLoadedKey(cartKey);
    } else {
      setCartItems([]);
      setLoadedKey(cartKey);

      // If logged-in user has no local cart, check backend for saved cart
      const token = safeGetItem('token');
      if (user && token && apiBase) {
        fetch(`${apiBase}/cart/my-cart`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data.items) && data.items.length > 0) {
              const restoredItems = data.items.map(it => ({
                product: {
                  id: it.product_id,
                  name_ar: it.name_ar,
                  name_en: it.name_en,
                  image: it.image,
                  image_url: it.image_url || it.image,
                  price_usd: it.price_usd,
                  stock: 999
                },
                quantity: Number(it.quantity) || 1,
                selectedColor: it.selectedColor,
                selectedSize: it.selectedSize,
                customerNote: it.customerNote || it.customer_note || ''
              }));
              setCartItems(restoredItems);
            }
          })
          .catch(() => {});
      }
    }
  }, [cartKey, user, apiBase]);

  useEffect(() => {
    if (loadedKey === cartKey) {
      safeSetItem(cartKey, JSON.stringify(cartItems));
    }
  }, [cartItems, cartKey, loadedKey]);

  const addToCart = (product, quantity = 1, selectedColor = null, selectedSize = null, customerNote = '') => {
    trackAddToCart(product, quantity, selectedColor, selectedSize);

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => 
        item.product.id === product.id && 
        item.selectedColor === selectedColor && 
        item.selectedSize === selectedSize
      );
      if (existingItem) {
        // Ensure quantity doesn't exceed stock
        const newQty = Math.min(existingItem.quantity + quantity, product.stock);
        const mergedNote = customerNote ? customerNote : (existingItem.customerNote || '');
        return prevItems.map((item) =>
          (item.product.id === product.id && 
           item.selectedColor === selectedColor && 
           item.selectedSize === selectedSize) 
            ? { ...item, quantity: newQty, customerNote: mergedNote } 
            : item
        );
      }
      return [...prevItems, { 
        product, 
        quantity: Math.min(quantity, product.stock), 
        selectedColor, 
        selectedSize,
        customerNote: customerNote || ''
      }];
    });
  };

  const updateItemNote = (productId, selectedColor = null, selectedSize = null, note = '') => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        (item.product.id === productId && 
         item.selectedColor === selectedColor && 
         item.selectedSize === selectedSize)
          ? { ...item, customerNote: note }
          : item
      )
    );
  };

  const removeFromCart = (productId, selectedColor = null, selectedSize = null) => {
    setCartItems((prevItems) => 
      prevItems.filter((item) => 
        !(item.product.id === productId && 
          item.selectedColor === selectedColor && 
          item.selectedSize === selectedSize)
      )
    );
  };

  const updateQuantity = (productId, quantity, selectedColor = null, selectedSize = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedColor, selectedSize);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        (item.product.id === productId && 
         item.selectedColor === selectedColor && 
         item.selectedSize === selectedSize) 
          ? { ...item, quantity: Math.min(quantity, item.product.stock) } 
          : item
      )
    );
  };

  // Subtotal in USD
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = getOptionPrice(item.selectedSize, item.product.price_usd);
    return sum + itemPrice * item.quantity;
  }, 0);

  // Auto-sync cart to server if user is logged in
  useEffect(() => {
    if (!user || loadedKey !== cartKey || !apiBase) return;

    const timer = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const itemsToSync = cartItems
        .filter(item => item && item.product)
        .map(item => ({
          product_id: item.product.id,
          name_ar: item.product.name_ar,
          name_en: item.product.name_en,
          image: item.product.image || item.product.image_url,
          price_usd: getOptionPrice(item.selectedSize, item.product.price_usd),
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize
        }));

      fetch(`${apiBase}/cart/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: itemsToSync,
          total_usd: subtotal
        })
      }).catch(() => {});
    }, 800);

    return () => clearTimeout(timer);
  }, [cartItems, user, loadedKey, cartKey, subtotal, apiBase]);

  const clearCart = () => {
    setCartItems([]);
    if (user && apiBase) {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${apiBase}/cart/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ items: [], total_usd: 0 })
        }).catch(() => {});
      }
    }
  };

  // Delivery calculations
  const freeThreshold = settings ? settings.free_delivery_threshold : 50;
  const baseDeliveryFee = settings ? settings.delivery_fee : 4;
  const deliveryFee = subtotal >= freeThreshold || subtotal === 0 ? 0 : baseDeliveryFee;

  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider value={{
      cartItems,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateItemNote,
      orderNotes,
      setOrderNotes,
      clearCart,
      subtotal,
      deliveryFee,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
export default CartContext;
