import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCart, getOptionPrice } from '../context/CartContext';
import { Star, ShoppingCart, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  
  // Image Lightbox Zoom state
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

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
          setZoomScale(1);
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

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div style={{ margin: '6px 0' }}>
                <span className="input-label" style={{ display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                  {lang === 'ar' ? 'اللون المتاح:' : 'Available Color:'}
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {product.colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '20px',
                        border: selectedColor === color ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                        backgroundColor: selectedColor === color ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                        color: selectedColor === color ? 'white' : 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {color}
                    </button>
                  ))}
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

            {/* Quantity Selector & Add to Cart */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
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
                    addToCart(product, qty, selectedColor, chosenOptionString);
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

      {/* Lightbox Image Fullscreen Zoom Modal */}
      {isZoomOpen && (
        <div
          onClick={() => { setIsZoomOpen(false); setZoomScale(1); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.94)',
            zIndex: 3500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.2s ease-out'
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
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              backdropFilter: 'blur(16px)',
              padding: '8px 18px',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 3600
            }}
          >
            <button
              type="button"
              onClick={() => setZoomScale(prev => Math.min(prev + 0.3, 3.5))}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
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
              onClick={() => setZoomScale(prev => Math.max(prev - 0.3, 0.6))}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title={lang === 'ar' ? 'تصغير (-)' : 'Zoom Out (-)'}
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title={lang === 'ar' ? 'إعادة ضبط الحجم' : 'Reset Zoom'}
            >
              <RotateCcw size={16} />
            </button>
            <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.25)', margin: '0 4px' }} />
            <button
              type="button"
              onClick={() => { setIsZoomOpen(false); setZoomScale(1); }}
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
                justifyContent: 'center',
                transition: 'transform 0.2s'
              }}
              title={lang === 'ar' ? 'إغلاق المعاينة (ESC)' : 'Close Preview (ESC)'}
            >
              <X size={16} />
            </button>
          </div>

          {/* Lightbox Image with smooth scaling */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setZoomScale(prev => (prev === 1 ? 1.8 : 1));
            }}
            style={{
              maxWidth: '92vw',
              maxHeight: '84vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: zoomScale === 1 ? 'zoom-in' : 'zoom-out',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: `scale(${zoomScale})`
            }}
          >
            <img
              src={imageUrl}
              alt={name}
              style={{
                maxWidth: '85vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
                backgroundColor: 'white'
              }}
            />
          </div>

          {/* Bottom helper text */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: '0.78rem',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            padding: '6px 16px',
            borderRadius: '20px',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {lang === 'ar' ? 'انقر على الصورة للتكبير / التصغير أو اضغط ESC للخروج' : 'Click image to toggle zoom or press ESC to exit'}
          </div>
        </div>
      )}
    </div>
  );
}
