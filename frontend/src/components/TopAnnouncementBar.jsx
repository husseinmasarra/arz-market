import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Gift, Truck, Clock, X, Sparkles } from 'lucide-react';

export default function TopAnnouncementBar({ onOpenAuth }) {
  const { lang } = useApp();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const items = [
    {
      id: 1,
      icon: Gift,
      textAr: 'سجّل الدخول الآن واحصل على حسم 10% على أول طلبية لك!',
      textEn: 'Sign in now & get 10% OFF on your first order!',
      badgeAr: 'حسم 10%',
      badgeEn: '10% OFF',
      isAuth: true
    },
    {
      id: 2,
      icon: Truck,
      textAr: 'توصيل مجاني بالكامل لكافة المناطق اللبنانية للطلبيات فوق 150$!',
      textEn: 'FREE delivery across all Lebanon on orders over $150!',
      badgeAr: 'توصيل مجاني',
      badgeEn: 'Free Delivery',
      isAuth: false
    },
    {
      id: 3,
      icon: Clock,
      textAr: 'مدة التوصيل السريع: من 1 إلى 3 أيام عمل مع الدفع عند الاستلام (COD)!',
      textEn: 'Fast delivery within 1 to 3 business days with Cash on Delivery!',
      badgeAr: 'توصيل سريع',
      badgeEn: '1-3 Days',
      isAuth: false
    }
  ];

  // Duplicate items array to create seamless infinite loop
  const marqueeItems = [...items, ...items, ...items, ...items];

  return (
    <div 
      className="no-print arz-top-marquee-wrapper"
      style={{
        backgroundColor: '#1d4ed8',
        background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)',
        color: '#ffffff',
        fontSize: '0.82rem',
        fontWeight: '700',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 101,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        userSelect: 'none'
      }}
    >
      {/* Continuous Marquee Track */}
      <div 
        className="arz-marquee-track"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          whiteSpace: 'nowrap',
          width: 'max-content',
          willChange: 'transform'
        }}
      >
        {marqueeItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              onClick={() => {
                if (item.isAuth && !user && onOpenAuth) {
                  onOpenAuth();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: (item.isAuth && !user) ? 'pointer' : 'default',
                padding: '2px 10px',
                borderRadius: '20px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (item.isAuth && !user) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                if (item.isAuth && !user) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                flexShrink: 0
              }}>
                <Icon size={12} color="#ffffff" />
              </span>

              <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
                {lang === 'ar' ? item.textAr : item.textEn}
              </span>

              <span style={{
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                fontSize: '0.7rem',
                fontWeight: '900',
                padding: '1px 7px',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
              }}>
                {lang === 'ar' ? item.badgeAr : item.badgeEn}
              </span>

              <span style={{ opacity: 0.5, marginInlineStart: '10px' }}>✦</span>
            </div>
          );
        })}
      </div>

      {/* Close button on side */}
      <div style={{
        position: 'absolute',
        insetInlineEnd: '8px',
        top: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        paddingInlineStart: '12px',
        background: 'linear-gradient(to left, rgba(29, 78, 216, 0.95) 70%, transparent 100%)',
        zIndex: 2
      }}>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          title={lang === 'ar' ? 'إغلاق' : 'Close'}
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.85)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'}
        >
          <X size={13} />
        </button>
      </div>

      <style>{`
        @keyframes arzMarqueeScroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        [dir="rtl"] .arz-marquee-track {
          animation: arzMarqueeScrollRtl 32s linear infinite;
        }
        [dir="ltr"] .arz-marquee-track {
          animation: arzMarqueeScroll 32s linear infinite;
        }
        @keyframes arzMarqueeScrollRtl {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(50%);
          }
        }
        .arz-top-marquee-wrapper:hover .arz-marquee-track {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
