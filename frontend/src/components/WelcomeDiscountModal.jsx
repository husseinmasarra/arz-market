import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Gift, CheckCircle2, ShoppingBag, X, Tag } from 'lucide-react';

export default function WelcomeDiscountModal({ isOpen, onClose, userName, onStartShopping }) {
  const { lang, t } = useApp();
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div 
        className="animate-fade"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '24px',
          padding: '36px 28px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          border: '2px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.25), 0 0 35px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Top Gradient Banner */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #f59e0b, #ef4444, #10b981, #3b82f6)'
        }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            insetInlineEnd: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-light)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Celebratory Badge Icon */}
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.15))',
          border: '2px solid #f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          position: 'relative'
        }}>
          <Gift size={44} color="#f59e0b" className="animate-bounce" />
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            padding: '4px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={14} />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '900',
          color: 'var(--text-primary)',
          margin: '0 0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>{isAr ? '🎉 تهانينا! مبروك التسجيل' : '🎉 Congratulations!'}</span>
        </h2>

        {/* Welcome greeting */}
        <p style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          color: 'var(--accent-blue)',
          margin: '0 0 14px'
        }}>
          {isAr
            ? `أهلاً وسهلاً بك ${userName ? `يا ${userName}` : ''} في عائلة Arz-Mart!`
            : `Welcome ${userName ? userName : ''} to the Arz-Mart family!`}
        </p>

        {/* Discount Details Box */}
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1.5px dashed #f59e0b',
          borderRadius: '16px',
          padding: '16px',
          margin: '0 0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Tag size={20} color="#f59e0b" />
            <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f59e0b' }}>
              {isAr ? 'خصم 10% على أول طلبية' : '10% OFF Your First Order'}
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            {isAr
              ? 'هدية ترحيبية خاصة بك بمناسبة انضمامك إلينا! سيتم تطبيق الخصم تلقائياً عند إتمام أول طلبية لك.'
              : 'A special welcome gift for joining us! The 10% discount will be applied automatically at checkout.'}
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '700',
            alignSelf: 'center',
            marginTop: '4px'
          }}>
            <CheckCircle2 size={14} />
            <span>{isAr ? 'مفعّل تلقائياً في حسابك' : 'Automatically Activated'}</span>
          </div>
        </div>

        {/* CTA Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onStartShopping) onStartShopping();
            }}
            style={{
              backgroundColor: '#f59e0b',
              color: '#111827',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 24px',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              transition: 'transform 0.15s, background-color 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ShoppingBag size={20} />
            <span>{isAr ? 'ابدأ التسوق واستمتع بالخصم 🛍️' : 'Start Shopping & Enjoy 10% Off 🛍️'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-light)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              padding: '6px',
              fontWeight: '600'
            }}
          >
            {isAr ? 'إغلاق ومتابعة التصفح' : 'Close & Continue Browsing'}
          </button>
        </div>
      </div>
    </div>
  );
}
