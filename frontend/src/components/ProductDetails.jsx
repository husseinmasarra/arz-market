import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useCart, getOptionPrice } from '../context/CartContext';
import { Star, ShoppingCart, X, ZoomIn, ZoomOut, RotateCcw, Move, MessageSquare, Check, ChevronLeft, ChevronRight, Images, Share2, Copy, Send, Tag, Sparkles, Plus, Layers, ShoppingBag } from 'lucide-react';
import BlurImage from './BlurImage';

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

function parseProductOptions(sizes, basePrice, allImages = [], getImageUrl = null) {
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
      const rawImg = item.image || item.image_url || item.img || item.photo || null;
      const image = rawImg ? (getImageUrl ? getImageUrl(rawImg) : rawImg) : (allImages && allImages[idx] ? allImages[idx] : null);
      return { id: `opt_${idx}`, name, price, image, imageIndex: (allImages && allImages[idx]) ? idx : 0 };
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
    const fallbackImg = (allImages && allImages.length > idx) ? allImages[idx] : (allImages && allImages[0] ? allImages[0] : null);
    return { id: `opt_${idx}`, name, price, image: fallbackImg, imageIndex: (allImages && allImages.length > idx) ? idx : 0 };
  });
}

export default function ProductDetails({ product, onClose, onRefresh, onCategoryClick, onProductClick }) {
  const { lang, formatPrice, t, apiBase, apiHost, getImageUrl, handleImageError } = useApp();
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [userRating, setUserRating] = useState(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [quickAddedId, setQuickAddedId] = useState(null);
  const [bundleAdded, setBundleAdded] = useState(false);
  const similarScrollRef = useRef(null);

  const scrollSimilar = (dir) => {
    if (similarScrollRef.current) {
      similarScrollRef.current.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!product?.id) {
      setSimilarProducts([]);
      return;
    }
    let isMounted = true;
    const fetchSimilar = async () => {
      try {
        setLoadingSimilar(true);
        // Smart recommendation algorithm endpoint
        const res = await fetch(`${apiBase}/products/${product.id}/related`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setSimilarProducts(data.filter(p => p && String(p.id) !== String(product.id)));
          }
        } else if (product.category_id) {
          // Fallback to category endpoint if needed
          const fallbackRes = await fetch(`${apiBase}/products?category_id=${product.category_id}&limit=12`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (isMounted && Array.isArray(fallbackData)) {
              setSimilarProducts(fallbackData.filter(p => p && String(p.id) !== String(product.id)));
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch similar products:', e);
      } finally {
        if (isMounted) setLoadingSimilar(false);
      }
    };
    fetchSimilar();
    return () => { isMounted = false; };
  }, [product?.id, product?.category_id, apiBase]);

  const productUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?product_id=${product?.id}` 
    : `https://arzmart.com/?product_id=${product?.id}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(productUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = productUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error('Failed to copy product link:', e);
    }
  };

  const handleShareWhatsApp = () => {
    const prodName = (lang === 'ar' ? product?.name_ar : product?.name_en) || product?.name_ar || product?.name_en || product?.title || 'منتج أرز مارت';
    const priceFormatted = formatPrice(product?.price_usd);
    const msg = lang === 'ar'
      ? `مرحباً، تفضل رابط ومواصفات المنتج من متجر أرز مارت:\n\n🛒 *${prodName}*\n💰 السعر: *${priceFormatted}*\n🔗 الرابط المباشر:\n${productUrl}`
      : `Hello, here is the product details from ArzMart:\n\n🛒 *${prodName}*\n💰 Price: *${priceFormatted}*\n🔗 Direct Link:\n${productUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleNativeShare = async () => {
    const prodName = (lang === 'ar' ? product?.name_ar : product?.name_en) || product?.title || 'ArzMart';
    if (navigator.share) {
      try {
        await navigator.share({
          title: prodName,
          text: `${prodName} - ${formatPrice(product?.price_usd)}`,
          url: productUrl
        });
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };
  
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

  const allImages = React.useMemo(() => {
    let list = [];
    if (product?.images) {
      if (Array.isArray(product.images)) list = product.images;
      else {
        try { list = JSON.parse(product.images); } catch (e) { list = []; }
      }
    }
    if (!Array.isArray(list) || list.length === 0) {
      if (product?.image_url) list = [product.image_url];
    }
    if (list.length === 0) {
      list = ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80'];
    }
    return list.map(img => getImageUrl(img)).filter(Boolean);
  }, [product?.images, product?.image_url, getImageUrl]);

  const productOptions = parseProductOptions(product?.sizes, product?.price_usd || 0, allImages, getImageUrl);
  const hasOptions = productOptions.length > 0;

  const [selectedOptId, setSelectedOptId] = useState(() => (hasOptions ? productOptions[0].id : null));
  const selectedOption = productOptions.find(o => o.id === selectedOptId) || (hasOptions ? productOptions[0] : null);

  const [selectedColor, setSelectedColor] = useState(() => {
    return (product && product.colors && product.colors.length > 0) ? product.colors[0] : null;
  });

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const imageUrl = allImages[activeImageIndex] || allImages[0] || '';

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
          marginTop: '16px',
          alignItems: 'start'
        }}>
          {/* Product Image & Gallery Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Main Product Image with Zoom preview */}
            <div 
              onClick={() => setIsZoomOpen(true)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                width: '100%',
                minHeight: '320px',
                maxHeight: '460px',
                aspectRatio: '1 / 1',
                position: 'relative',
                cursor: 'zoom-in',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
              title={lang === 'ar' ? 'انقر لتكبير ومعاينة الصورة' : 'Click to enlarge image'}
            >
              <BlurImage 
                src={imageUrl} 
                alt={name} 
                blurhash={product?.blurhash}
                objectFit="contain"
                onError={handleImageError}
                imgStyle={{
                  maxHeight: '430px',
                  borderRadius: '10px',
                  transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.04)';
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                }}
              />

              {/* Multi-Image Counter Badge */}
              {allImages.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  insetInlineStart: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  pointerEvents: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <Images size={12} />
                  <span>{activeImageIndex + 1} / {allImages.length}</span>
                </div>
              )}

              {/* Navigation Arrows on Main Image */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      insetInlineStart: '10px',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      color: 'var(--text-primary)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <ChevronLeft size={18} style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      insetInlineEnd: '10px',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      color: 'var(--text-primary)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <ChevronRight size={18} style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }} />
                  </button>
                </>
              )}

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

            {/* Thumbnails Gallery Strip */}
            {allImages.length > 1 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'thin'
              }}>
                {allImages.map((thumbUrl, tIdx) => {
                  const isActive = tIdx === activeImageIndex;
                  return (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => setActiveImageIndex(tIdx)}
                      onMouseEnter={() => setActiveImageIndex(tIdx)}
                      style={{
                        position: 'relative',
                        width: '60px',
                        height: '60px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        border: isActive ? '2.5px solid var(--accent-blue)' : '1px solid var(--border-color)',
                        padding: '2px',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                        opacity: isActive ? 1 : 0.7
                      }}
                    >
                      <img 
                        src={thumbUrl} 
                        alt="" 
                        onError={handleImageError}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} 
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Top Category & Stock Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {categoryName ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onCategoryClick && product?.category_id) {
                      onClose && onClose();
                      onCategoryClick(product.category_id);
                    }
                  }}
                  title={lang === 'ar' ? 'تصفح كل المنتجات المشابهة في هذا القسم' : 'Browse similar products in this category'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    cursor: onCategoryClick ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (onCategoryClick) {
                      e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.18)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onCategoryClick) {
                      e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <Tag size={13} />
                  <span>{categoryName}</span>
                  {onCategoryClick && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: '600' }}>
                      ({lang === 'ar' ? 'عرض المشابه ←' : 'View Similar →'})
                    </span>
                  )}
                </button>
              ) : <div />}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontFamily: 'monospace',
                  fontWeight: '800',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--accent-blue)',
                  border: '1px solid var(--border-color)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  🏷️ {product?.sku || ('ARZ-P' + String(product?.id || 0).padStart(4, '0'))}
                </span>

                <span style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  backgroundColor: product.stock > 0 ? '#dcfce7' : '#fee2e2',
                  color: product.stock > 0 ? '#15803d' : '#b91c1c',
                  letterSpacing: '0.5px'
                }}>
                  {product.stock > 0 ? (lang === 'ar' ? 'متوفر بالمخزون' : 'IN STOCK') : (lang === 'ar' ? 'نفذ من المخزون' : 'OUT OF STOCK')}
                </span>
              </div>
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

            {/* Options / Models with Photos and Interactive Selector */}
            {hasOptions && (
              <div style={{ margin: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? 'اختر الموديل / الخيار المطلوب:' : 'Select Desired Option / Variant:'}
                  </span>
                  {selectedOption && (
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: 'var(--accent-blue)',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}>
                      {selectedOption.name}
                    </span>
                  )}
                </div>

                {/* Visual Option Cards Grid with Photos */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  {productOptions.map((opt) => {
                    const isSelected = selectedOption && selectedOption.id === opt.id;
                    const optImg = opt.image || (allImages && allImages[0]) || null;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setSelectedOptId(opt.id);
                          if (opt.imageIndex !== undefined && allImages[opt.imageIndex]) {
                            setActiveImageIndex(opt.imageIndex);
                          }
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: '8px 6px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)',
                          border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                          boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          textAlign: 'center'
                        }}
                      >
                        {/* Option Image Thumbnail */}
                        {optImg && (
                          <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#ffffff',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(0,0,0,0.06)',
                            padding: '2px'
                          }}>
                            <img
                              src={optImg}
                              alt={opt.name}
                              onError={handleImageError}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        )}

                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                          lineHeight: '1.2',
                          marginBottom: '4px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {opt.name}
                        </span>

                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: '800',
                          color: '#dc2626'
                        }}>
                          {formatPrice(opt.price)}
                        </span>

                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            insetInlineEnd: '4px',
                            backgroundColor: 'var(--accent-blue)',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                          }}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Option Dropdown */}
                <div>
                  <select
                    value={selectedOptId || ''}
                    onChange={(e) => {
                      const foundId = e.target.value;
                      setSelectedOptId(foundId);
                      const foundOpt = productOptions.find(o => o.id === foundId);
                      if (foundOpt && foundOpt.imageIndex !== undefined && allImages[foundOpt.imageIndex]) {
                        setActiveImageIndex(foundOpt.imageIndex);
                      }
                    }}
                    className="input-field"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--accent-blue)',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
                    }}
                  >
                    {productOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} - ({formatPrice(opt.price)})
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

            {/* Direct Product Link & Share Section */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Share2 size={16} color="var(--accent-blue)" />
                  <span>{t('share_product')}</span>
                </span>
                {copiedLink && (
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} />
                    <span>{t('link_copied')}</span>
                  </span>
                )}
              </div>

              {/* Direct Link Input Box with 1-Click Copy */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '4px 6px',
                gap: '6px'
              }}>
                <input 
                  type="text" 
                  readOnly 
                  value={productUrl} 
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    outline: 'none',
                    direction: 'ltr',
                    textAlign: 'left',
                    padding: '4px 6px',
                    fontFamily: 'monospace'
                  }}
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="input-field"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    backgroundColor: copiedLink ? '#10b981' : 'var(--accent-blue)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                  title={t('copy_product_link')}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? t('link_copied') : t('copy_product_link')}</span>
                </button>
              </div>

              {/* Social / WhatsApp Share Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleShareWhatsApp}
                  className="input-field"
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)'
                  }}
                >
                  <Send size={15} />
                  <span>{t('share_whatsapp')}</span>
                </button>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="input-field"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <Share2 size={15} />
                    <span>{t('share_btn')}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Similar Products Carousel */}
        {similarProducts.length > 0 && (
          <div style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '2px dashed var(--border-color)'
          }}>
            {/* Top Carousel Navigation Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#dc2626" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  {lang === 'ar' ? 'منتجات مشابهة وموصى بها لك' : 'Similar & Recommended Products'}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {onCategoryClick && product?.category_id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose && onClose();
                      onCategoryClick(product.category_id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{lang === 'ar' ? 'تصفح كل القسم ←' : 'Browse All in Category →'}</span>
                  </button>
                )}

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => scrollSimilar('left')}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                    title={lang === 'ar' ? 'السابق' : 'Previous'}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollSimilar('right')}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                    title={lang === 'ar' ? 'التالي' : 'Next'}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Smooth Horizontal Scrolling Cards Strip */}
            <div 
              ref={similarScrollRef}
              style={{
                display: 'flex',
                gap: '14px',
                overflowX: 'auto',
                paddingBottom: '12px',
                paddingTop: '4px',
                scrollbarWidth: 'none',
                scrollSnapType: 'x mandatory'
              }}
            >
              {similarProducts.map((simProd) => {
                const simName = (lang === 'ar' ? simProd.name_ar : simProd.name_en) || simProd.name_ar || simProd.name_en || 'Product';
                const simCatName = (lang === 'ar' ? simProd.category_name_ar : simProd.category_name_en) || simProd.category_name_ar || simProd.category_name_en;
                const simImg = getImageUrl(simProd.image_url);
                const isQuickAdded = quickAddedId === simProd.id;
                const hasDiscount = simProd.old_price_usd && Number(simProd.old_price_usd) > Number(simProd.price_usd);
                const simRating = Number(simProd.rating) || 0;

                const handleQuickAdd = (e) => {
                  e.stopPropagation();
                  addToCart({
                    ...simProd,
                    price_usd: simProd.price_usd
                  }, 1);
                  setQuickAddedId(simProd.id);
                  setTimeout(() => setQuickAddedId(null), 1800);
                };

                return (
                  <div
                    key={simProd.id}
                    onClick={() => {
                      if (onProductClick) {
                        onProductClick(simProd);
                      }
                    }}
                    style={{
                      minWidth: '170px',
                      maxWidth: '170px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
                      position: 'relative',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    {/* Image Area with Discount Badge */}
                    <div style={{
                      width: '100%',
                      height: '130px',
                      backgroundColor: '#ffffff',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px'
                    }}>
                      <img
                        src={simImg}
                        alt={simName}
                        onError={handleImageError}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      {hasDiscount && (
                        <span style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: '800'
                        }}>
                          %{Math.round(((simProd.old_price_usd - simProd.price_usd) / simProd.old_price_usd) * 100)}-
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: '1' }}>
                      {simCatName && (
                        <span style={{
                          fontSize: '0.68rem',
                          color: 'var(--accent-blue)',
                          fontWeight: '700',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          🏷️ {simCatName}
                        </span>
                      )}

                      <p style={{
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        margin: 0,
                        lineHeight: '1.3',
                        height: '32px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {simName}
                      </p>

                      {/* Rating Stars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            fill={i < Math.round(simRating) ? '#fbbf24' : 'none'}
                            color={i < Math.round(simRating) ? '#fbbf24' : '#d1d5db'}
                          />
                        ))}
                      </div>

                      {/* Price */}
                      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#dc2626' }}>
                          {formatPrice(simProd.price_usd)}
                        </div>
                      </div>

                      {/* Quick Add To Cart Button */}
                      <button
                        type="button"
                        onClick={handleQuickAdd}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          backgroundColor: isQuickAdded ? '#10b981' : 'rgba(37, 99, 235, 0.08)',
                          color: isQuickAdded ? '#ffffff' : 'var(--accent-blue)',
                          border: isQuickAdded ? '1px solid #10b981' : '1px solid rgba(37, 99, 235, 0.25)',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          marginTop: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isQuickAdded ? (
                          <>
                            <Check size={12} />
                            <span>{lang === 'ar' ? 'تمت الإضافة ✓' : 'Added ✓'}</span>
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            <span>{lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              onError={handleImageError}
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
