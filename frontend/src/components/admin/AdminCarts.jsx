import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingCart, Eye, Phone, MessageCircle, RefreshCw, Search, 
  Calendar, DollarSign, Package, User, CheckCircle, Clock, AlertCircle, X
} from 'lucide-react';

export default function AdminCarts() {
  const { lang, formatPrice, apiBase } = useApp();
  const { token } = useAuth();

  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCart, setSelectedCart] = useState(null);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/carts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCarts(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch admin carts');
      }
    } catch (err) {
      console.error('Fetch admin carts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  // ESC key closes the cart inspection modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedCart) {
        setSelectedCart(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCart]);

  const filteredCarts = carts.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const totalCartsValue = carts.reduce((sum, c) => sum + (Number(c.total_usd) || 0), 0);
  const totalItemsInCarts = carts.reduce((sum, c) => sum + (Number(c.items_count) || 0), 0);

  // Format WhatsApp message for cart reminder
  const getWhatsAppReminderUrl = (cart) => {
    let cleanPhone = (cart.phone || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '961' + cleanPhone.substring(1); // Default to Lebanon code +961
    } else if (cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('3') || cleanPhone.startsWith('03')) {
      cleanPhone = '961' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace('+', '');

    const customerName = cart.full_name || cart.username || 'عميلنا العزيز';
    
    // List up to 3 item names
    const itemNames = (cart.items || [])
      .slice(0, 3)
      .map(it => `• ${it.name_ar || it.name_en || 'منتج'} (الكمية: ${it.quantity || 1})`)
      .join('\n');
    const moreNotice = (cart.items || []).length > 3 ? `\n• وغيرها من المنتجات...` : '';

    const message = `مرحباً أستاذ/ة ${customerName} 🌸
معك متجر أرز مارت Arz-Mart 🇱🇧

نود تذكيرك بلطف بأن لديك ${cart.items_count} منتج بانتظارك في سلة التسوق بقيمة $${Number(cart.total_usd).toFixed(2)}:
${itemNames}${moreNotice}

هل تواجه أي استفسار أو صعوبة في إتمام طلبك؟ يسعدنا جداً مساعدتك وتأكيد طلبيتك الآن! 🛒✨
رابط المتجر: https://arzmart.com`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header & Stats Cards */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={24} style={{ color: 'var(--accent-blue)' }} />
              {lang === 'ar' ? 'سلات الزبائن النشطة والمتروكة' : 'Active & Abandoned Customer Carts'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              {lang === 'ar' 
                ? 'متابعة وتذكير الزبائن بالمنتجات المعلقة في سلاتهم دون أي تعديل عليها (للقراءة فقط)'
                : 'Monitor and remind customers of pending items in their carts (Read-Only)'}
            </p>
          </div>

          <button 
            type="button"
            onClick={fetchCarts} 
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              color: 'var(--text-primary)'
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lang === 'ar' ? 'تحديث القائمة' : 'Refresh'}
          </button>
        </div>

        {/* Quick KPI Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '20px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShoppingCart size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600' }}>
                {lang === 'ar' ? 'عدد السلات النشطة' : 'Active Carts'}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{carts.length}</div>
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600' }}>
                {lang === 'ar' ? 'القيمة الإجمالية للسلات' : 'Total Cart Value'}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>
                ${totalCartsValue.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600' }}>
                {lang === 'ar' ? 'إجمالي القطع بالسلات' : 'Total Items in Carts'}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{totalItemsInCarts}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--bg-secondary)',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        <Search size={18} style={{ color: 'var(--text-light)' }} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'ar' ? 'البحث باسم الزبون أو اسم المستخدم أو رقم الهاتف...' : 'Search by customer name, username, or phone...'}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            width: '100%',
            fontSize: '0.9rem',
            color: 'var(--text-primary)'
          }}
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Carts Table */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'الزبون' : 'Customer'}</th>
                <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'عدد المنتجات' : 'Items Count'}</th>
                <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'قيمة السلة' : 'Cart Value'}</th>
                <th style={{ padding: '14px 16px' }}>{lang === 'ar' ? 'آخر نشاط' : 'Last Updated'}</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>{lang === 'ar' ? 'الإجراءات والتذكير' : 'Actions & Reminders'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                    <div>{lang === 'ar' ? 'جاري تحميل السلات النشطة...' : 'Loading active carts...'}</div>
                  </td>
                </tr>
              ) : filteredCarts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>
                    <ShoppingCart size={32} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>
                      {lang === 'ar' ? 'لا توجد سلات نشطة حالياً' : 'No active carts found'}
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      {lang === 'ar' 
                        ? 'عندما يقوم أي زبون مسجل بوضع منتجات في سلته، ستظهر هنا فوراً وبشكل تلقائي.'
                        : 'When registered customers add products to their carts, they will appear here automatically.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCarts.map((cart) => (
                  <tr 
                    key={cart.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Customer Info */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-blue)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.85rem'
                        }}>
                          {(cart.full_name || cart.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                            {cart.full_name || cart.username}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                            @{cart.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        direction: 'ltr', 
                        display: 'inline-block',
                        fontWeight: '600',
                        fontSize: '0.85rem'
                      }}>
                        {cart.phone || '-'}
                      </span>
                    </td>

                    {/* Items Count */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent-blue)',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}>
                        {cart.items_count} {lang === 'ar' ? 'قطع' : 'items'}
                      </span>
                    </td>

                    {/* Cart Value */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '800', color: '#10b981', fontSize: '0.95rem' }}>
                        ${Number(cart.total_usd).toFixed(2)}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} />
                        <span>{formatDate(cart.updated_at)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        
                        {/* View Cart Button (Read Only) */}
                        <button
                          type="button"
                          onClick={() => setSelectedCart(cart)}
                          title={lang === 'ar' ? 'معاينة محتويات السلة (للقراءة فقط)' : 'View Cart (Read-Only)'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Eye size={14} style={{ color: 'var(--accent-blue)' }} />
                          <span>{lang === 'ar' ? 'معاينة' : 'View'}</span>
                        </button>

                        {/* WhatsApp Reminder Button */}
                        {cart.phone && (
                          <a
                            href={getWhatsAppReminderUrl(cart)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={lang === 'ar' ? 'تذكير فوري عبر واتساب' : 'Remind via WhatsApp'}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: '#25D366',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>{lang === 'ar' ? 'تذكير واتساب' : 'WhatsApp'}</span>
                          </a>
                        )}

                        {/* Direct Call Button */}
                        {cart.phone && (
                          <a
                            href={`tel:${cart.phone}`}
                            title={lang === 'ar' ? 'اتصال بالزبون' : 'Call Customer'}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px 8px',
                              backgroundColor: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-secondary)',
                              textDecoration: 'none'
                            }}
                          >
                            <Phone size={14} />
                          </a>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-Only Cart Inspection Modal */}
      {selectedCart && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={20} style={{ color: 'var(--accent-blue)' }} />
                  {lang === 'ar' ? 'معاينة سلة الزبون' : 'Customer Cart Preview'}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  {selectedCart.full_name || selectedCart.username} ({selectedCart.phone || 'بدون رقم'})
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedCart(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-light)',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Read-Only Warning Notice */}
            <div style={{
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: 'var(--accent-blue)'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                {lang === 'ar' 
                  ? 'هذه الشاشة للعرض فقط دون تعديل، لحفظ اختيارات وخصوصية الزبون.'
                  : 'This view is strictly read-only to preserve customer choices and privacy.'}
              </span>
            </div>

            {/* Items List */}
            <div style={{ flex: '1', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(selectedCart.items || []).length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'لا توجد منتجات مسجلة في هذه السلة.' : 'No items found in this cart.'}
                </div>
              ) : (
                selectedCart.items.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px'
                    }}
                  >
                    {/* Item Image */}
                    <img 
                      src={item.image || 'https://via.placeholder.com/60?text=Product'} 
                      alt={item.name_ar || 'Product'} 
                      style={{
                        width: '54px',
                        height: '54px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        backgroundColor: '#fff'
                      }}
                    />

                    {/* Details */}
                    <div style={{ flex: '1' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>
                        {lang === 'ar' ? (item.name_ar || item.name_en) : (item.name_en || item.name_ar)}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
                        {item.selectedSize && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            {lang === 'ar' ? `المقاس/الموديل: ${item.selectedSize}` : `Size/Model: ${item.selectedSize}`}
                          </span>
                        )}
                        {item.selectedColor && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            {lang === 'ar' ? `اللون: ${item.selectedColor}` : `Color: ${item.selectedColor}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity & Unit Price */}
                    <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                      <div style={{ fontWeight: '800', color: '#10b981', fontSize: '0.95rem' }}>
                        ${((Number(item.price_usd) || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        {item.quantity || 1} × ${Number(item.price_usd || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'المجموع الإجمالي للقطع:' : 'Total Items:'} <strong>{selectedCart.items_count}</strong>
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>
                  ${Number(selectedCart.total_usd).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedCart.phone && (
                  <a
                    href={getWhatsAppReminderUrl(selectedCart)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>{lang === 'ar' ? 'مراسلة عبر واتساب للتذكير' : 'Send WhatsApp Reminder'}</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedCart(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
