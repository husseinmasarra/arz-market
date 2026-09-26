import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCart, getOptionPrice } from '../context/CartContext';
import { Star, ShoppingCart, X, ZoomIn, ZoomOut, RotateCcw, Move, MessageSquare, Check } from 'lucide-react';

const COLOR_HEX_MAP = {
  'black': '#18181b', 'أسود': '#18181b', 'noir': '#18181b', 'dark': '#27272a', 'غامق': '#27272a',
  'white': '#ffffff', 'أبيض': '#ffffff', 'blanc': '#ffffff', 'cream': '#fef3c7', 'كريمي': '#fef3c7',
  'blue': '#2563eb', 'أزرق': '#2563eb', 'bleu': '#2563eb', 'navy': '#1e3a8a', 'كحلي': '#1e3a8a',
  'cyan': '#06b6d4', 'سماوي': '#38bdf8', 'sky': '#38bdf8', 'royal': '#1d4ed8', 'ملكي': '#1d4ed8',
  'red': '#dc2626', 'أحمر': '#dc2626', 'rouge': '#dc2626', 'pink': '#ec4899', 'زهري': '#ec4899',
  'وردي': '#f472b6', 'rose': '#f472b6', 'burgundy': '#831843', 'خمري': '#831843',
  'green': '#16a34a', 'أخضر': '#16a34a', 'vert': '#16a34a', 'mint': '#6ee7b7', 'زيتي': '#3f6212',
  'yellow': '#eab308', 'أصفر': '#eab308', 'jaune': '#eab308', 'orange': '#ea580c', 'برتقالي': '#ea580c',
  'purple': '#9333ea', 'بنفسجي': '#9333ea', 'violet': '#8b5cf6', 'lavender': '#c084fc',
  'gold': '#d97706', 'golden': '#f59e0b', 'ذهبي': '#d97706', 'silver': '#9ca3af', 'فضي': '#9ca3af',
  'gray': '#6b7280', 'grey': '#6b7280', 'رمادي': '#6b7280', 'titanium': '#71717a', 'تيتانيوم': '#71717a',
  'brown': '#78350f', 'بني': '#78350f', 'wood': '#a16207', 'خشبي': '#a16207', 'desert': '#d4a373', 'صحراوي': '#d4a373',
  'beige': '#f5f5dc', 'بيج': '#f5f5dc'
};

function resolveColorHex(colorStr) {
  if (!colorStr) return '#6b7280';
  const c = String(colorStr).toLowerCase().trim();
  if (c.startsWith('#') || c.startsWith('rgb')) return colorStr;
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (c.includes(key)) return hex;
  }
  return '#475569';
}

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string') return false;
  if (hex === '#ffffff' || hex.toLowerCase().includes('white') || hex === '#fef3c7' || hex === '#f5f5dc') return true;
  return false;
}

function parseProductOptions(sizes, basePrice) {
  if (!sizes) return [];
  let arr = sizes;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch (e) { arr = []; }
  }
  if (!Array.isArray(arr)) return [];

  return arr.map((item, idx) => {
    if (typeof item === 'object' && item !== null) {
      const name = item.name || item.title || `Option ${idx + 1}`;
      const price = item.price !== undefined && item.price !== null && !isNaN(item.price) 
        ? Number(item.price) 
        : basePrice;
      return { id: `opt_${idx}`, name, price };
    }
    const str = String(item);
    const priceRegex = /\(\s*([+-]?)\s*\$?\s*([0-9.]+)\s*\$?_?\)/;
    const match = str.match(priceRegex);
    let price = basePrice;
    let name = str;
    if (match) {
      name = str.replace(priceRegex, '').trim();
      const sign = match[1];
      const val = parseFloat(match[2]);
      if (sign === '+') price = basePrice + val;
      else if (sign === '-') price = basePrice - val;
      else price = val;
    }
    return { id: `opt_${idx}`, name, price };
  });
}

export default function ProductDetails({ product, onClose, onRefresh }) {
  const { lang, formatPrice, t, apiBase, apiHost } = useApp();
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [userRating, setUserRating] = useState(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  
  // Image Lightbox Zoom & Pan states
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleZoomChange = (newScale) => {
    const clamped = Math.max(0.6, Math.min(newScale, 4.5));
    setZoomScale(clamped);
    if (clamped <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panOffset.x,
      initialPanY: panOffset.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPanOffset({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.startX;
    const dy = e.touches[0].clientY - dragStartRef.current.startY;
    setPanOffset({
      x: dragStartRef.current.initialPanX + dx,
      y: dragStartRef.current.initialPanY + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.3 : -0.3;
    handleZoomChange(zoomScale + delta);
  };

  const productOptions = parseProductOptions(product?.sizes, product?.price_usd || 0);
  const hasOptions = productOptions.length > 0;

  const [selectedOptId, setSelectedOptId] = useState(() => (hasOptions ? productOptions[0].id : null));
  const selectedOption = productOptions.find(o => o.id === selectedOptId) || (hasOptions ? productOptions[0] : null);

  const [selectedColor, setSelectedColor] = useState(() => {
    return (product && product.colors && product.colors.length > 0) ? product.colors[0] : null;
  });

  if (!product) return null;

  // ESC key closes zoom modal first if active, otherwise closes product details
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isZoomOpen) {
          setIsZoomOpen(false);
          resetZoom();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isZoomOpen]);

  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const desc = lang === 'ar' ? product.description_ar : product.description_en;
  const categoryName = lang === 'ar' ? product.category_name_ar : product.category_name_en;
  
  const rating = product.rating || 0;
  
  const currentPrice = selectedOption ? selectedOption.price : product.price_usd;
  const hasDiscount = product.old_price_usd && product.old_price_usd > currentPrice;
  const adjustedOldPrice = product.old_price_usd;

  const imageUrl = product.image_url 
    ? (product.image_url.startsWith('http') || product.image_url.startsWith('data:') ? product.image_url : `${apiHost}${product.image_url}`)
    : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80';

  const handleRatingSubmit = async () => {
    try {
      const res = await fetch(`${apiBase}/products/${product.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: userRating })
      });
      if (res.ok) {
        setRatingSubmitted(true);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Submit rating error:', err);
    }
  };

  return (
    <div className="no-print" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }} onClick={onClose}>
      <div 
        className="animate-scale"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          padding: '24px'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: lang === 'ar' ? 'auto' : '16px',
            left: lang === 'ar' ? '16px' : 'auto',
            border: 'none',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
          title={t('close')}
        >
          <X size={18} />
        </button>

        {/* Modal Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '16px'
        }}>
          {/* Product Image with Zoom preview */}
          <div 
            onClick={() => setIsZoomOpen(true)}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              minHeight: '260px',
              position: 'relative',
              cursor: 'zoom-in',
              overflow: 'hidden'
            }}
            title={lang === 'ar' ? 'انقر لتكبير ومعاينة الصورة' : 'Click to enlarge image'}
          >
            <img 
              src={imageUrl} 
              alt={name} 
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
            {/* Zoom Badge Indicator */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              insetInlineEnd: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '4px 10px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              pointerEvents: 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <ZoomIn size={13} />
              <span>{lang === 'ar' ? 'تكبير' : 'Zoom'}</span>
            </div>
          </div>

          {/* Details Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Top Category & Stock Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {categoryName ? (
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {categoryName}
                </span>
              ) : <div />}

              <span style={{
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '800',
                backgroundColor: product.stock > 0 ? '#dcfce7' : '#fee2e2',
                color: product.stock > 0 ? '#15803d' : '#b91c1c',
                letterSpacing: '0.5px'
              }}>
                {product.stock > 0 ? (lang === 'ar' ? 'متوفر بالمخزون (IN STOCK)' : 'IN STOCK') : (lang === 'ar' ? 'نفذ من المخزون' : 'OUT OF STOCK')}
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.3', margin: 0 }}>
              {name}
            </h2>

            {/* Ratings Overview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ display: 'flex' }}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    fill={i < Math.round(rating) ? '#fbbf24' : 'none'}
                    color={i < Math.round(rating) ? '#fbbf24' : '#d1d5db'}
                  />
                ))}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {rating.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                ({product.rating_count || 0} {t('rating_stars')})
              </span>
            </div>

            {/* Price section */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
              {hasDiscount && (
                <span className="old-price" style={{ fontSize: '1.05rem', textDecoration: 'line-through', color: 'var(--text-light)' }}>
                  {formatPrice(adjustedOldPrice)}
                </span>
              )}
              <span className="new-price" style={{ fontSize: '1.7rem', fontWeight: '900', color: '#dc2626' }}>
                {formatPrice(currentPrice)}
              </span>
            </div>

            {/* Color Selector as Color Swatch Circles */}
            {product.colors && product.colors.length > 0 && (
              <div style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="input-label" style={{ fontWeight: '800', fontSize: '0.88rem', margin: 0, color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? 'اللون المتاح:' : 'Available Color:'}
                  </span>
                  {selectedColor && (
                    <span style={{ 
                      fontSize: '0.82rem', 
                      fontWeight: '800', 
                      color: 'var(--accent-blue)',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}>
                      {selectedColor}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
                  {product.colors.map(color => {
                    const hex = resolveColorHex(color);
                    const isSelected = selectedColor === color;
                    const isLight = isLightColor(hex);

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        style={{
                          position: 'relative',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: hex,
                          border: isLight ? '2px solid #cbd5e1' : (isSelected ? '2px solid #ffffff' : '2px solid rgba(0,0,0,0.1)'),
                          boxShadow: isSelected 
                            ? `0 0 0 3px var(--accent-blue), 0 4px 10px rgba(0,0,0,0.25)` 
                            : '0 2px 6px rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          padding: 0
                        }}
                      >
                        {isSelected && (
                          <Check 
                            size={18} 
                            strokeWidth={3} 
                            color={isLight ? '#0f172a' : '#ffffff'} 
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Options / Models Table & Dropdown (Just like DR PHONE Supplier) */}
            {hasOptions && (
              <div style={{ margin: '8px 0' }}>
                {/* Scrollable Table of Options */}
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-secondary)',
                  marginBottom: '12px'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-color)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    <span>{lang === 'ar' ? 'الخيار / الموديل (OPTION)' : 'OPTION'}</span>
                    <span style={{ color: '#dc2626' }}>{lang === 'ar' ? 'السعر (PRICE)' : 'PRICE'}</span>
                  </div>

                  {/* Table Rows */}
                  <div style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {productOptions.map((opt) => {
                      const isSelected = selectedOption && selectedOption.id === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedOptId(opt.id)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            borderInlineStart: isSelected ? '4px solid var(--accent-blue)' : '4px solid transparent',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span style={{
                            fontSize: '0.9rem',
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)'
                          }}>
                            {opt.name}
                          </span>
                          <span style={{
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            color: '#dc2626'
                          }}>
                            {formatPrice(opt.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dropdown Selector: CHOOSE OPTION */}
                <div>
                  <label className="input-label" style={{
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    display: 'block'
                  }}>
                    {lang === 'ar' ? 'تحديد الموديل (CHOOSE OPTION):' : 'CHOOSE OPTION:'}
                  </label>
                  <select
                    value={selectedOptId || ''}
                    onChange={(e) => setSelectedOptId(e.target.value)}
                    className="input-field"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--accent-blue)',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)'
                    }}
                  >
                    {productOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} — {formatPrice(opt.price)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              maxHeight: '120px',
              overflowY: 'auto',
              padding: '10px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              margin: '4px 0'
            }}>
              {desc || <span style={{ fontStyle: 'italic', color: 'var(--text-light)' }}>No description available.</span>}
            </div>

            {/* Customer Special Note on this product */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
              <label className="input-label" style={{ margin: 0, fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <MessageSquare size={13} color="var(--accent-blue)" />
                <span>{lang === 'ar' ? 'ملاحظة خاصة على هذا الصنف (اختياري):' : 'Special note for this item (optional):'}</span>
              </label>
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder={lang === 'ar' ? 'مثلاً: اللون البديل، المقاس، تفضيل معين...' : 'e.g. alternative color, special preferences...'}
                className="input-field"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  borderRadius: '8px'
                }}
              />
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="input-label" style={{ margin: 0, fontWeight: '700', fontSize: '0.8rem' }}>
                  {lang === 'ar' ? 'الكمية' : 'Quantity'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px 6px', backgroundColor: 'var(--bg-primary)' }}>
                  <button 
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: '800', minWidth: '24px', textAlign: 'center', fontSize: '0.95rem' }}>{qty}</span>
                  <button 
                    onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                    style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', cursor: qty >= product.stock ? 'not-allowed' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    const chosenOptionString = selectedOption
                      ? `${selectedOption.name} ($${selectedOption.price.toFixed(2)})`
                      : null;
                    addToCart(product, qty, selectedColor, chosenOptionString, customerNote.trim());
                    onClose();
                  }}
                  disabled={product.stock <= 0}
                  className="input-field"
                  style={{
                    backgroundColor: product.stock > 0 ? 'var(--accent-blue)' : 'var(--border-color)',
                    color: product.stock > 0 ? 'white' : 'var(--text-light)',
                    border: 'none',
                    fontWeight: '800',
                    cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '42px',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    boxShadow: product.stock > 0 ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                  }}
                >
                  <ShoppingCart size={18} />
                  <span>{t('add_to_cart')}</span>
                </button>
              </div>
            </div>

            {/* Rating Section */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                {t('rate_product')}
              </span>
              {ratingSubmitted ? (
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>
                  {t('submit')}!
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select 
                    value={userRating}
                    onChange={(e) => setUserRating(parseInt(e.target.value))}
                    className="input-field"
                    style={{ width: '80px', padding: '4px 8px' }}
                  >
                    {[5, 4, 3, 2, 1].map(n => (
                      <option key={n} value={n}>{n} </option>
                    ))}
                  </select>
                  <button
                    onClick={handleRatingSubmit}
                    className="input-field"
                    style={{
                      width: 'auto',
                      padding: '4px 12px',
                      backgroundColor: 'var(--accent-red-gold)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {t('submit')}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Lightbox Image Fullscreen Zoom & Pan Modal */}
      {isZoomOpen && (
        <div
          onClick={() => { setIsZoomOpen(false); resetZoom(); }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 3500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(14px)',
            animation: 'fadeIn 0.2s ease-out',
            userSelect: 'none',
            overflow: 'hidden'
          }}
        >
          {/* Top Controls Bar */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              backdropFilter: 'blur(16px)',
              padding: '8px 18px',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 3600
            }}
          >
            <button
              type="button"
              onClick={() => handleZoomChange(zoomScale + 0.4)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={lang === 'ar' ? 'تكبير (+)' : 'Zoom In (+)'}
            >
              <ZoomIn size={18} />
            </button>
            <span style={{ color: 'white', fontSize: '0.82rem', fontWeight: '700', minWidth: '45px', textAlign: 'center' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoomChange(zoomScale - 0.4)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={lang === 'ar' ? 'تصغير (-)' : 'Zoom Out (-)'}
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={lang === 'ar' ? 'إعادة ضبط الحجم' : 'Reset Zoom'}
            >
              <RotateCcw size={16} />
            </button>

            {/* Drag mode indicator badge when zoomed */}
            {zoomScale > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: '600',
                color: '#93c5fd',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                padding: '3px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <Move size={12} />
                <span>{lang === 'ar' ? 'اسحب للتحريك' : 'Drag to pan'}</span>
              </div>
            )}

            <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.25)', margin: '0 4px' }} />
            <button
              type="button"
              onClick={() => { setIsZoomOpen(false); resetZoom(); }}
              style={{
                background: 'rgba(239, 68, 68, 0.85)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={lang === 'ar' ? 'إغلاق المعاينة (ESC)' : 'Close Preview (ESC)'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Draggable & Pannable Image Canvas */}
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (zoomScale === 1) handleZoomChange(2.2);
              else resetZoom();
            }}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '84vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: 'center center',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            <img
              src={imageUrl}
              alt={name}
              draggable={false}
              style={{
                maxWidth: '85vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
                backgroundColor: 'white',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            />
          </div>

          {/* Bottom helper text */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.78rem',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            padding: '6px 18px',
            borderRadius: '20px',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Move size={13} color="#93c5fd" />
            <span>
              {lang === 'ar' 
                ? 'اسحب الصورة بالماوس أو اللمس لتحريكها وإظهار التفاصيل • دبل كليك للتكبير السريع' 
                : 'Drag image with mouse or touch to pan details • Double-click to toggle zoom'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
