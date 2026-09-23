import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart, getOptionPrice } from '../context/CartContext';
import { X, Trash2, Plus, Minus, ShoppingBag, MessageSquare, Edit2, Check, FileText } from 'lucide-react';

export default function Cart({ onCheckoutClick }) {
  const { lang, formatPrice, settings, t, apiHost } = useApp();
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    updateItemNote,
    orderNotes,
    setOrderNotes,
    removeFromCart, 
    subtotal, 
    deliveryFee, 
    total 
  } = useCart();

  const [editingNoteKey, setEditingNoteKey] = useState(null);
  const [tempNote, setTempNote] = useState('');

  if (!isCartOpen) return null;

  const freeThreshold = settings ? settings.free_delivery_threshold : 50;
  const remainingForFreeDelivery = freeThreshold - subtotal;

  const handleStartEditNote = (itemKey, currentNote) => {
    setEditingNoteKey(itemKey);
    setTempNote(currentNote || '');
  };

  const handleSaveNote = (item) => {
    updateItemNote(item.product.id, item.selectedColor, item.selectedSize, tempNote.trim());
    setEditingNoteKey(null);
    setTempNote('');
  };

  return (
    <div className="no-print" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 500,
      display: 'flex',
      justifyContent: lang === 'ar' ? 'flex-start' : 'flex-end'
    }} onClick={() => setIsCartOpen(false)}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          backgroundColor: 'var(--bg-primary)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          borderInlineStart: '1px solid var(--border-color)',
          animation: lang === 'ar' ? 'slideInLeft 0.3s ease-out' : 'slideInRight 0.3s ease-out'
        }}
      >
        {/* Cart Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {t('cart')}
            </h2>
            <span style={{ 
              backgroundColor: 'var(--accent-blue)', 
              color: 'white', 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              padding: '2px 8px', 
              borderRadius: '12px' 
            }}>
              {cartItems.reduce((acc, it) => acc + it.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{
          flex: '1',
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {cartItems.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-light)',
              textAlign: 'center'
            }}>
              <ShoppingBag size={48} strokeWidth={1} />
              <p style={{ fontWeight: '500' }}>{t('empty_cart')}</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemKey = `${item.product.id}_${item.selectedColor || ''}_${item.selectedSize || ''}`;
              const isEditingThisNote = editingNoteKey === itemKey;
              const name = lang === 'ar' ? item.product.name_ar : item.product.name_en;
              const imageUrl = item.product.image_url
                ? (item.product.image_url.startsWith('http') || item.product.image_url.startsWith('data:') ? item.product.image_url : `${apiHost}${item.product.image_url}`)
                : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=100&q=80';

              return (
                <div key={itemKey} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}>
                    {/* Item Image */}
                    <img
                      src={imageUrl}
                      alt={name}
                      style={{
                        width: '64px',
                        height: '64px',
                        objectFit: 'contain',
                        backgroundColor: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }}
                    />

                    {/* Item Details */}
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h4 style={{
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        lineHeight: '1.3',
                        maxHeight: '34px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {name}
                      </h4>

                      {/* Selected Color / Size */}
                      {(item.selectedColor || item.selectedSize) && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                          {item.selectedColor && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                              <span>{lang === 'ar' ? 'اللون:' : 'Color:'}</span>
                              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.selectedColor}</span>
                            </span>
                          )}
                          {item.selectedSize && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                              <span>{lang === 'ar' ? 'الخيارات:' : 'Option:'}</span>
                              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{item.selectedSize}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-red-gold)' }}>
                          {formatPrice(getOptionPrice(item.selectedSize, item.product.price_usd))}
                        </span>
                        
                        {/* Quantity Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.selectedSize)}
                            className="input-field"
                            style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            <Minus size={10} />
                          </button>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.selectedSize)}
                            disabled={item.quantity >= item.product.stock}
                            className="input-field"
                            style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: item.quantity >= item.product.stock ? 'not-allowed' : 'pointer', borderRadius: '4px' }}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedColor, item.selectedSize)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Customer Note Section for this Item */}
                  <div style={{ marginTop: '2px' }}>
                    {isEditingThisNote ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--accent-blue)' }}>
                        <MessageSquare size={14} color="var(--accent-blue)" />
                        <input
                          type="text"
                          value={tempNote}
                          onChange={(e) => setTempNote(e.target.value)}
                          placeholder={lang === 'ar' ? 'ملاحظتك على هذا الصنف (مثلاً: لون بديل، تفاصيل خاصة)...' : 'Note for this item (e.g. alternative color, special request)...'}
                          autoFocus
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.8rem',
                            color: 'var(--text-primary)'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(item);
                            if (e.key === 'Escape') setEditingNoteKey(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveNote(item)}
                          style={{
                            background: 'var(--accent-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <Check size={12} />
                          <span>{lang === 'ar' ? 'حفظ' : 'Save'}</span>
                        </button>
                        <button
                          onClick={() => setEditingNoteKey(null)}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-light)',
                            border: 'none',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : item.customerNote ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        border: '1px dashed rgba(245, 158, 11, 0.4)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.78rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', flex: 1 }}>
                          <MessageSquare size={13} />
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {lang === 'ar' ? 'ملاحظة: ' : 'Note: '}
                            <span style={{ fontWeight: '400', fontStyle: 'italic' }}>"{item.customerNote}"</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => handleStartEditNote(itemKey, item.customerNote)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '2px' }}
                            title={lang === 'ar' ? 'تعديل الملاحظة' : 'Edit note'}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => updateItemNote(item.product.id, item.selectedColor, item.selectedSize, '')}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title={lang === 'ar' ? 'حذف الملاحظة' : 'Remove note'}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditNote(itemKey, '')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 0'
                        }}
                      >
                        <MessageSquare size={12} />
                        <span>{lang === 'ar' ? '+ أضف ملاحظة للصنف' : '+ Add item note'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Footer */}
        {cartItems.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Free Delivery Promo Bar */}
            {remainingForFreeDelivery > 0 ? (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px dashed var(--accent-blue)',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: 'var(--accent-blue)',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                {t('free_delivery_hint')} {formatPrice(freeThreshold)} ({t('subtotal')}: {formatPrice(remainingForFreeDelivery)}+)
              </div>
            ) : (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px dashed #10b981',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#10b981',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                تم تفعيل التوصيل المجاني! (Free Delivery Unlocked!)
              </div>
            )}

            {/* General Order Notes Box */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              backgroundColor: 'var(--bg-primary)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={12} color="var(--accent-blue)" />
                <span>{lang === 'ar' ? 'ملاحظات عامة على الطلبية أو التوصيل (اختياري):' : 'Order or Delivery Notes (optional):'}</span>
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={lang === 'ar' ? 'مثلاً: الاتصال قبل التوصيل، تفاصيل إضافية...' : 'e.g. call before delivery, special instructions...'}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Calculations */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>{t('subtotal')}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>{t('delivery')}</span>
              <span>{deliveryFee === 0 ? t('free') : formatPrice(deliveryFee)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.05rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '8px',
              marginTop: '2px'
            }}>
              <span>{t('total')}</span>
              <span>{formatPrice(total)}</span>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={() => {
                setIsCartOpen(false);
                onCheckoutClick();
              }}
              className="input-field animate-fade"
              style={{
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.95rem',
                padding: '10px',
                cursor: 'pointer',
                textAlign: 'center',
                borderRadius: '8px',
                marginTop: '4px'
              }}
            >
              {t('checkout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

