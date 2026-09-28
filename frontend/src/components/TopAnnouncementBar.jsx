import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Truck, Clock, UserCheck, X, ChevronRight, Gift } from 'lucide-react';

export default function TopAnnouncementBar({ onOpenAuth }) {
  const { lang, t } = useApp();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const announcements = [
    {
      id: 'auth',
      icon: Gift,
      ar: '🎁 سجّل دخولك الآن واستفد من عروض وخصومات الأعضاء الحصرية!',
      en: '🎁 Sign in now & unlock exclusive member-only discounts & offers!',
      actionTextAr: user ? 'حسابك مفعل' : 'تسجيل الدخول ←',
      actionTextEn: user ? 'Account Active' : 'Sign In Now →',
      clickable: !user
    },
    {
      id: 'shipping',
      icon: Truck,
      ar: '🚚 توصيل مجاني بالكامل لكافة المناطق اللبنانية للطلبيات بقيمة 150$ وأكثر!',
      en: '🚚 FREE delivery across all Lebanon on all orders over $150!',
      badgeAr: 'عرض خاص',
      badgeEn: 'Special Offer'
    },
    {
      id: 'delivery_time',
      icon: Clock,
      ar: '⚡ توصيل سريع ومضمون خلال 1 إلى 3 أيام عمل مع الدفع عند الاستلام (COD)!',
      en: '⚡ Fast & reliable delivery within 1 to 3 business days with Cash on Delivery!',
      badgeAr: 'خدمة سريعة',
      badgeEn: 'Fast Service'
    }
  ];

  // Auto rotate slides every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (!isVisible) return null;

  const currentAnnouncement = announcements[activeSlide];
  const Icon = currentAnnouncement.icon;

  return (
    <div 
      className="no-print"
      style={{
        backgroundColor: 'var(--accent-blue, #2563eb)',
        background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)',
        color: '#ffffff',
        fontSize: '0.82rem',
        fontWeight: '600',
        padding: '7px 12px',
        position: 'relative',
        zIndex: 101,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        transition: 'all 0.3s ease'
      }}
    >
      <div 
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          maxWidth: '1280px',
          margin: '0 auto',
          position: 'relative',
          minHeight: '26px'
        }}
      >
        {/* Indicators Dots */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', opacity: 0.85 }}>
          {announcements.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              style={{
                width: idx === activeSlide ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                backgroundColor: idx === activeSlide ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
              title={`Offer ${idx + 1}`}
            />
          ))}
        </div>

        {/* Dynamic Center Message with Fade Animation */}
        <div 
          key={activeSlide}
          onClick={() => {
            if (currentAnnouncement.clickable && onOpenAuth) {
              onOpenAuth();
            }
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textAlign: 'center',
            cursor: currentAnnouncement.clickable ? 'pointer' : 'default',
            animation: 'fadeInSlide 0.35s ease-out forwards',
            userSelect: 'none'
          }}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            flexShrink: 0
          }}>
            <Icon size={13} color="#ffffff" />
          </span>

          <span style={{ letterSpacing: '0.2px', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            {lang === 'ar' ? currentAnnouncement.ar : currentAnnouncement.en}
          </span>

          {currentAnnouncement.clickable && !user && (
            <span style={{
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              fontSize: '0.72rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '12px',
              marginLeft: '4px',
              marginRight: '4px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'transform 0.15s'
            }}>
              {lang === 'ar' ? currentAnnouncement.actionTextAr : currentAnnouncement.actionTextEn}
            </span>
          )}
        </div>

        {/* Close Banner Button */}
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          title={lang === 'ar' ? 'إخفاء الشريط' : 'Dismiss'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.75)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'}
        >
          <X size={15} />
        </button>
      </div>

      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
