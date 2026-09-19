import React, { createContext, useState, useEffect, useContext } from 'react';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function getOptionPrice(optionItem, basePrice) {
  if (!optionItem) return basePrice;
  if (typeof optionItem === 'object' && optionItem !== null) {
    if (optionItem.price !== undefined && optionItem.price !== null && !isNaN(optionItem.price)) {
      return Number(optionItem.price);
    }
    return basePrice;
  }
  const optionString = String(optionItem);
  const priceRegex = /\(\s*[+-]?\s*\$?\s*([0-9.]+)\s*\$?_?\)/;
  const match = optionString.match(priceRegex);
  if (match) {
    const val = parseFloat(match[1]);
    const relativeMatch = optionString.match(/\(\s*([+-])\s*\$?\s*([0-9.]+)\s*\$?_?\)/);
    if (relativeMatch) {
      const sign = relativeMatch[1];
      const offset = parseFloat(relativeMatch[2]);
      return sign === '-' ? (basePrice - offset) : (basePrice + offset);
    }
    return val;
  }
  return basePrice;
}

export const CartProvider = ({ children }) => {
  const { settings, apiBase } = useApp();
  const { user } = useAuth();
  
  const cartKey = user ? `cart_${user.username}` : 'cart_guest';
  const [loadedKey, setLoadedKey] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const localData = localStorage.getItem(cartKey);
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
      const token = localStorage.getItem('token');
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
                  price_usd: it.price_usd,
                  stock: 999
                },
                quantity: Number(it.quantity) || 1,
                selectedColor: it.selectedColor,
                selectedSize: it.selectedSize
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
      localStorage.setItem(cartKey, JSON.stringify(cartItems));
    }
  }, [cartItems, cartKey, loadedKey]);

  const addToCart = (product, quantity = 1, selectedColor = null, selectedSize = null) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => 
        item.product.id === product.id && 
        item.selectedColor === selectedColor && 
        item.selectedSize === selectedSize
      );
      if (existingItem) {
        // Ensure quantity doesn't exceed stock
        const newQty = Math.min(existingItem.quantity + quantity, product.stock);
        return prevItems.map((item) =>
          (item.product.id === product.id && 
           item.selectedColor === selectedColor && 
           item.selectedSize === selectedSize) 
            ? { ...item, quantity: newQty } 
            : item
        );
      }
      return [...prevItems, { 
        product, 
        quantity: Math.min(quantity, product.stock), 
        selectedColor, 
        selectedSize 
      }];
    });
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

      const itemsToSync = cartItems.map(item => ({
        product_id: item.product.id,
        name_ar: item.product.name_ar,
        name_en: item.product.name_en,
        image: item.product.image,
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
