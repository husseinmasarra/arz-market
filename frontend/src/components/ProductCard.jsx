import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { Star, ShoppingCart, Eye, Share2, Check, Tag } from 'lucide-react';
import BlurImage from './BlurImage';

export default function ProductCard({ product, onDetailsClick, onCategoryClick }) {
  const { lang, formatPrice, t, getImageUrl, handleImageError } = useApp();
  const { addToCart } = useCart();
  const [cardCopied, setCardCopied] = useState(false);

  const name = (lang === 'ar' ? product?.name_ar : product?.name_en) || product?.name_ar || product?.name_en || product?.title || 'Product';
  const categoryName = (lang === 'ar' ? product?.category_name_ar : product?.category_name_en) || product?.category_name_ar || product?.category_name_en;
  
  // Safe options parsing
  const parsedSizes = React.useMemo(() => {
    if (!product?.sizes) return [];
    let arr = product.sizes;
    if (typeof arr === 'string') {
      try { arr = JSON.parse(arr); } catch (e) { arr = []; }
    }
    return Array.isArray(arr) ? arr : [];
  }, [product?.sizes]);

  // Rating calculation
  const rating = Number(product?.rating) || 0;

  const hasDiscount = product?.old_price_usd && Number(product.old_price_usd) > Number(product.price_usd);

  const imageUrl = getImageUrl(product?.image_url);

  return (
    <div 
      onClick={() => onDetailsClick(product)}
      className="dashboard-card animate-fade" 
      style={{
        overflow: 'hidden',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer'
      }}
    >
      {/* Product Image Wrapper */}
      <div 
        style={{
          width: '100%',
          height: '220px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px'
        }}
      >
        <BlurImage
          src={imageUrl}
          alt={name}
          blurhash={product?.blurhash}
          objectFit="contain"
          onError={handleImageError}
          imgStyle={{
            transition: 'transform 0.3s ease'
          }}
          onMouseEnter={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) img.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            const img = e.currentTarget.querySelector('img');
            if (img) img.style.transform = 'scale(1)';
          }}
        />
        {/* Discount Badge */}
        {hasDiscount && (
          <span style={{
            position: 'absolute',
            top: '10px',
            right: lang === 'ar' ? 'auto' : '10px',
            left: lang === 'ar' ? '10px' : 'auto',
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            borderRadius: '4px',
            zIndex: 10
          }}>
            % {Math.round(((product.old_price_usd - product.price_usd) / product.old_price_usd) * 100)} -
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flex: '1'
      }}>
        {/* Category Label */}
        {categoryName && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span 
              onClick={(e) => {
                if (onCategoryClick && product?.category_id) {
                  e.stopPropagation();
                  onCategoryClick(product.category_id);
                }
              }}
              title={lang === 'ar' ? `عرض المزيد من تصنيف ${categoryName}` : `View more in ${categoryName}`}
              style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                color: 'var(--accent-blue)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: onCategoryClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
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
              <Tag size={11} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{categoryName}</span>
            </span>
          </div>
        )}

        {/* Title */}
        <h3 
          style={{
            fontSize: '1rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            lineHeight: '1.4',
            height: '42px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {name}
        </h3>

        {/* Rating Stars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              fill={i < Math.round(rating) ? '#fbbf24' : 'none'}
              color={i < Math.round(rating) ? '#fbbf24' : '#d1d5db'}
            />
          ))}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginInlineStart: '4px' }}>
            ({product.rating_count || 0})
          </span>
        </div>

        {/* Pricing */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 'auto' }}>
          {hasDiscount && (
            <span className="old-price">
              {formatPrice(product.old_price_usd)}
            </span>
          )}
          <span className="new-price" style={{ fontSize: '1.25rem' }}>
            {formatPrice(product.price_usd)}
          </span>
        </div>

        {/* Stock & Options status indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: product.stock > 0 ? '#10b981' : '#ef4444' }}>
            {product.stock > 0 ? `${t('in_stock')}: ${product.stock}` : t('out_of_stock')}
          </div>
          {parsedSizes.length > 0 && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: 'var(--accent-blue)',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              padding: '2px 8px',
              borderRadius: '6px'
            }}>
              {lang === 'ar' ? `${parsedSizes.length} خيارات/موديلات` : `${parsedSizes.length} options`}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetailsClick(product);
            }}
            className="input-field"
            style={{
              padding: '8px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              borderRadius: '8px'
            }}
            title={t('product_details')}
          >
            <Eye size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const productUrl = `${window.location.origin}/?product_id=${product.id}`;
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(productUrl);
                } else {
                  const ta = document.createElement('textarea');
                  ta.value = productUrl;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                }
                setCardCopied(true);
                setTimeout(() => setCardCopied(false), 2000);
              } catch (err) {}
            }}
            className="input-field"
            style={{
              padding: '8px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              backgroundColor: cardCopied ? '#10b981' : 'var(--bg-tertiary)',
              color: cardCopied ? '#ffffff' : 'var(--text-primary)',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            title={cardCopied ? (lang === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!') : (lang === 'ar' ? 'نسخ رابط المنتج المباشر' : 'Copy Direct Product Link')}
          >
            {cardCopied ? <Check size={16} /> : <Share2 size={16} />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (parsedSizes.length > 0) {
                onDetailsClick(product);
              } else {
                addToCart(product);
              }
            }}
            disabled={product.stock <= 0}
            className="input-field animate-fade"
            style={{
              padding: '8px 12px',
              flex: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
              border: 'none',
              backgroundColor: product.stock > 0 ? 'var(--accent-blue)' : 'var(--border-color)',
              color: product.stock > 0 ? 'white' : 'var(--text-light)',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            <ShoppingCart size={14} />
            <span>{parsedSizes.length > 0 ? (lang === 'ar' ? 'اختر الموديل' : 'Select Option') : t('add_to_cart')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
