import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useChat } from '../context/ChatContext';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  ShoppingBag, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Key, 
  Printer, 
  RefreshCw, 
  MessageSquare, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Calendar,
  DollarSign,
  AlertCircle,
  Save,
  Fingerprint,
  ArrowRight
} from 'lucide-react';

export default function CustomerDashboard({ onGoToStore, onNavigate }) {
  const { lang, t, formatPrice, apiBase, apiHost } = useApp();
  const { user, token } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  const { setIsChatOpen } = useChat();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'profile', 'security'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all', 'pending', 'processing', 'shipped', 'delivered'
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Profile Form states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Fetch customer orders
  const fetchUserOrders = async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${apiBase}/orders/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchUserOrders();
  }, [token]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Order stats calculations
  const totalOrdersCount = orders.length;
  const inProgressCount = orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalSpentUsd = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_usd) || 0), 0);

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'active') return ['pending', 'processing', 'shipped'].includes(o.status);
    return o.status === orderFilter;
  });

  // Re-order all items from a past order
  const handleReorder = (order) => {
    if (!order.items || !Array.isArray(order.items)) return;
    order.items.forEach(item => {
      addToCart({
        id: item.product_id,
        name_ar: item.name_ar,
        name_en: item.name_en,
        price_usd: item.price_usd,
        image_url: item.image_url,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      }, item.quantity || 1);
    });
    setIsCartOpen(true);
  };

  // Print Order Invoice
  const handlePrintOrder = (order) => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = (order.items || []).map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.name_ar || item.name_en}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">$${Number(item.price_usd).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: end; font-weight: bold;">$${(Number(item.price_usd) * Number(item.quantity)).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>فاتورة طلب #${order.id} | أرز مارت</title>
          <style>
            body { font-family: 'Cairo', sans-serif, Tahoma; padding: 25px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f1f5f9; padding: 10px; text-align: start; }
            .totals { margin-top: 20px; text-align: end; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>متجر أرز مارت - ArzMart</h2>
            <p>فاتورة شراء للطلب رقم: <strong>#${order.id}</strong></p>
            <p>رقم التتبع: <strong>${order.tracking_number || '-'}</strong> | التاريخ: ${new Date(order.created_at || Date.now()).toLocaleDateString('ar-LB')}</p>
          </div>
          <div>
            <p><strong>اسم العميل:</strong> ${user?.full_name || user?.username || 'زبون أرز مارت'}</p>
            <p><strong>العنوان:</strong> ${order.address || '-'}</p>
            <p><strong>رقم الهاتف:</strong> ${order.phone || '-'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: center;">السعر</th>
                <th style="text-align: end;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <p>رسوم التوصيل: $${Number(order.delivery_fee_usd || 0).toFixed(2)}</p>
            <h3>المجموع الكلي: $${Number(order.total_usd || 0).toFixed(2)}</h3>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ full_name: fullName, phone })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: 'success', text: lang === 'ar' ? 'تم حفظ التعديلات بنجاح!' : 'Profile updated successfully!' });
      } else {
        setProfileMsg({ type: 'error', text: data.error_ar || data.error_en || 'Failed to update' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: lang === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: lang === 'ar' ? 'كلمة المرور يجب أن تكون ٦ خانات على الأقل' : 'Password must be at least 6 characters' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error_ar || data.error_en || 'Failed to update password' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return {
          label: lang === 'ar' ? 'قيد الانتظار' : 'Pending',
          bg: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          icon: Clock
        };
      case 'processing':
        return {
          label: lang === 'ar' ? 'قيد التحضير' : 'Processing',
          bg: 'rgba(59, 130, 246, 0.1)',
          color: '#2563eb',
          icon: Package
        };
      case 'shipped':
        return {
          label: lang === 'ar' ? 'تم الشحن للتوصيل' : 'Shipped',
          bg: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
          icon: Truck
        };
      case 'delivered':
        return {
          label: lang === 'ar' ? 'تم التسليم بنجاح' : 'Delivered',
          bg: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          icon: CheckCircle
        };
      case 'cancelled':
        return {
          label: lang === 'ar' ? 'ملغي' : 'Cancelled',
          bg: 'rgba(100, 116, 139, 0.1)',
          color: '#64748b',
          icon: AlertCircle
        };
      default:
        return {
          label: status,
          bg: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          icon: Clock
        };
    }
  };

  return (
    <div className="container animate-fade" style={{ flex: '1', padding: '24px 0 60px' }}>
      
      {/* Top Breadcrumb & Back button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
          <button 
            onClick={onGoToStore} 
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: '600' }}
          >
            {t('home')}
          </button>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
            {lang === 'ar' ? 'لوحة تحكم حسابي' : 'My Account Dashboard'}
          </span>
        </div>

        <button
          onClick={onGoToStore}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '8px 14px',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <ShoppingBag size={16} color="var(--accent-blue)" />
          <span>{lang === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}</span>
        </button>
      </div>

      {/* Customer Welcome Card Header */}
      <div className="dashboard-card" style={{
        padding: '24px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-blue)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            fontWeight: '800',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                {lang === 'ar' ? `مرحباً بك، ${user?.full_name || user?.username}` : `Welcome, ${user?.full_name || user?.username}`}
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: 'var(--accent-blue)'
              }}>
                {lang === 'ar' ? 'حساب زبون مميز' : 'Verified Customer'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {user?.email && <span>📧 {user.email}</span>}
              {user?.phone && <span>📞 {user.phone}</span>}
              {user?.created_at && (
                <span>🗓️ {lang === 'ar' ? 'عضو منذ:' : 'Member since:'} {new Date(user.created_at).toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-US')}</span>
              )}
            </p>
          </div>
        </div>

        {/* Live Chat Support Action */}
        <button
          onClick={() => setIsChatOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 18px',
            fontWeight: '700',
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
          }}
        >
          <MessageSquare size={18} />
          <span>{lang === 'ar' ? 'تواصل مع خدمة العملاء' : 'Live Chat Support'}</span>
        </button>
      </div>

      {/* Quick Customer Stats Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Stat 1: Total Orders */}
        <div className="dashboard-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Package size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '600' }}>
              {lang === 'ar' ? 'إجمالي الطلبيات' : 'Total Orders'}
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
              {totalOrdersCount}
            </h3>
          </div>
        </div>

        {/* Stat 2: In Progress */}
        <div className="dashboard-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Truck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '600' }}>
              {lang === 'ar' ? 'قيد التوصيل والتحضير' : 'In Progress'}
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: '#d97706' }}>
              {inProgressCount}
            </h3>
          </div>
        </div>

        {/* Stat 3: Delivered */}
        <div className="dashboard-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '600' }}>
              {lang === 'ar' ? 'طلبيات مستلمة' : 'Delivered Orders'}
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: '#10b981' }}>
              {deliveredCount}
            </h3>
          </div>
        </div>

        {/* Stat 4: Total Spent */}
        <div className="dashboard-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            color: 'var(--accent-red-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '600' }}>
              {lang === 'ar' ? 'مجموع المشتريات' : 'Total Purchases'}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--accent-red-gold)' }}>
              {formatPrice(totalSpentUsd)}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid var(--accent-blue)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'orders' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'orders' ? '800' : '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Package size={18} />
          <span>{lang === 'ar' ? 'سجل وتتبع الطلبيات' : 'Order History & Tracking'}</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'orders' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: activeTab === 'orders' ? 'white' : 'var(--text-secondary)'
          }}>
            {totalOrdersCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '3px solid var(--accent-blue)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'profile' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'profile' ? '800' : '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <User size={18} />
          <span>{lang === 'ar' ? 'الملف الشخصي والبيانات' : 'Profile Information'}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'security' ? '3px solid var(--accent-blue)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'security' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'security' ? '800' : '600',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Lock size={18} />
          <span>{lang === 'ar' ? 'الأمان وكلمة المرور' : 'Security & Password'}</span>
        </button>
      </div>

      {/* --- TAB 1: ORDERS HISTORY & TRACKING --- */}
      {activeTab === 'orders' && (
        <div className="animate-fade">
          {/* Order Filters Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: lang === 'ar' ? 'كل الطلبيات' : 'All Orders' },
                { id: 'active', label: lang === 'ar' ? 'الطلبات الجارية' : 'Active Orders' },
                { id: 'delivered', label: lang === 'ar' ? 'المستلمة' : 'Delivered' },
                { id: 'cancelled', label: lang === 'ar' ? 'الملغاة' : 'Cancelled' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: orderFilter === f.id ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: orderFilter === f.id ? 'white' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchUserOrders}
              disabled={loadingOrders}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                fontWeight: '600',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingOrders ? 'animate-spin' : ''} />
              <span>{lang === 'ar' ? 'تحديث السجل' : 'Refresh Orders'}</span>
            </button>
          </div>

          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-blue)' }} />
              <p>{lang === 'ar' ? 'جاري تحميل سجل طلبياتك...' : 'Loading your orders...'}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="dashboard-card" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '16px' }}>
              <Package size={54} style={{ color: 'var(--border-color)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 8px' }}>
                {lang === 'ar' ? 'لا توجد أي طلبيات في هذا القسم' : 'No orders found in this section'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', maxWidth: '400px', margin: '0 auto 20px' }}>
                {lang === 'ar' 
                  ? 'لم تقم بطلب أي منتجات بعد، تصفح تشكيلتنا المميزة وابدأ بالتسوق الآن!'
                  : 'You have not placed any orders yet. Explore our store and start shopping!'}
              </p>
              <button
                onClick={onGoToStore}
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                {lang === 'ar' ? 'تصفح المتجر الآن' : 'Shop Now'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredOrders.map(order => {
                const badge = getStatusBadge(order.status);
                const BadgeIcon = badge.icon;
                const isExpanded = expandedOrderId === order.id;
                const itemsCount = (order.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);

                // Tracking timeline step (0 to 3)
                const stepIndex = order.status === 'pending' ? 0 
                  : order.status === 'processing' ? 1 
                  : order.status === 'shipped' ? 2 
                  : order.status === 'delivered' ? 3 : -1;

                return (
                  <div 
                    key={order.id} 
                    className="dashboard-card"
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Order Summary Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          color: 'var(--accent-blue)'
                        }}>
                          #{order.id}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {lang === 'ar' ? `الطلبية رقم #${order.id}` : `Order #${order.id}`}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🗓️ {new Date(order.created_at || Date.now()).toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-US')}</span>
                            <span>•</span>
                            <span>📦 {itemsCount} {lang === 'ar' ? 'منتجات' : 'items'}</span>
                            {order.tracking_number && (
                              <>
                                <span>•</span>
                                <span>🏷️ {order.tracking_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Status Badge */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          fontWeight: '700',
                          fontSize: '0.8rem'
                        }}>
                          <BadgeIcon size={14} />
                          <span>{badge.label}</span>
                        </div>

                        {/* Total Price */}
                        <div style={{ textAlign: 'end', minWidth: '90px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', display: 'block' }}>
                            {lang === 'ar' ? 'الإجمالي:' : 'Total:'}
                          </span>
                          <span style={{ fontWeight: '800', fontSize: '1.15rem', color: 'var(--accent-red-gold)' }}>
                            {formatPrice(order.total_usd)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Visual Progress Tracker (for active/delivered orders) */}
                    {order.status !== 'cancelled' && (
                      <div style={{ padding: '16px 8px 8px', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '8px' }}>
                          {/* Progress Line */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '5%',
                            right: '5%',
                            height: '3px',
                            backgroundColor: 'var(--border-color)',
                            zIndex: 1
                          }}>
                            <div style={{
                              width: `${(Math.max(0, stepIndex) / 3) * 100}%`,
                              height: '100%',
                              backgroundColor: '#10b981',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>

                          {/* Tracker Steps */}
                          {[
                            { label: lang === 'ar' ? 'تم تسجيل الطلب' : 'Placed', icon: Clock },
                            { label: lang === 'ar' ? 'قيد التحضير' : 'Processing', icon: Package },
                            { label: lang === 'ar' ? 'تم الشحن' : 'Shipped', icon: Truck },
                            { label: lang === 'ar' ? 'تم الاستلام' : 'Delivered', icon: CheckCircle }
                          ].map((step, idx) => {
                            const isDone = idx <= stepIndex;
                            const isCurrent = idx === stepIndex;
                            const StepIcon = step.icon;
                            return (
                              <div key={idx} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' }}>
                                <div style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: isDone ? '#10b981' : 'var(--bg-secondary)',
                                  border: `2px solid ${isDone ? '#10b981' : 'var(--border-color)'}`,
                                  color: isDone ? 'white' : 'var(--text-light)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
                                }}>
                                  <StepIcon size={12} />
                                </div>
                                <span style={{
                                  fontSize: '0.68rem',
                                  marginTop: '6px',
                                  color: isDone ? 'var(--text-primary)' : 'var(--text-light)',
                                  fontWeight: isDone ? '700' : '500',
                                  textAlign: 'center'
                                }}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Order Details / Expandable section */}
                    {isExpanded && (
                      <div className="animate-fade" style={{ paddingTop: '16px' }}>
                        {/* Products in this order */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-light)' }}>
                            {lang === 'ar' ? 'المنتجات في هذه الطلبية:' : 'Items in this order:'}
                          </span>
                          {(order.items || []).map((item, idx) => {
                            const itemImg = item.image_url 
                              ? (item.image_url.startsWith('http') || item.image_url.startsWith('data:') ? item.image_url : `${apiHost}${item.image_url}`)
                              : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80';
                            
                            return (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-secondary)',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                gap: '12px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <img 
                                    src={itemImg} 
                                    alt={item.name_ar || item.name_en} 
                                    style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.88rem' }}>
                                      {lang === 'ar' ? item.name_ar : item.name_en}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>
                                      {item.quantity} × {formatPrice(item.price_usd)}
                                      {item.selectedSize && ` | ${lang === 'ar' ? 'المقاس:' : 'Size:'} ${item.selectedSize}`}
                                      {item.selectedColor && ` | ${lang === 'ar' ? 'اللون:' : 'Color:'} ${item.selectedColor}`}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                                  {formatPrice(Number(item.price_usd) * Number(item.quantity))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Shipping & Delivery Info */}
                        <div style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          fontSize: '0.82rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '10px',
                          marginBottom: '16px'
                        }}>
                          <div>
                            <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'عنوان التوصيل:' : 'Delivery Address:'}</span>
                            <div style={{ fontWeight: '600', marginTop: '2px' }}>{order.address || '-'}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'رقم الهاتف للتوصيل:' : 'Contact Phone:'}</span>
                            <div style={{ fontWeight: '600', marginTop: '2px' }}>{order.phone || '-'}</div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'طريقة الدفع:' : 'Payment:'}</span>
                            <div style={{ fontWeight: '600', marginTop: '2px' }}>
                              {order.payment_method === 'online' ? (lang === 'ar' ? 'دفع إلكتروني (بطاقة)' : 'Online Card') : (lang === 'ar' ? 'دفع نقدي عند الاستلام' : 'Cash on Delivery')}
                            </div>
                          </div>
                          {order.notes && (
                            <div>
                              <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                              <div style={{ fontWeight: '600', marginTop: '2px' }}>{order.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Action Buttons Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: isExpanded ? '1px solid var(--border-color)' : 'none',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-blue)',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <span>{isExpanded ? (lang === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details') : (lang === 'ar' ? 'عرض تفاصيل الفاتورة والمنتجات' : 'View Details & Items')}</span>
                        <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Print Invoice Button */}
                        <button
                          type="button"
                          onClick={() => handlePrintOrder(order)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Printer size={13} />
                          <span>{lang === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
                        </button>

                        {/* Re-order Button */}
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'var(--accent-blue)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <RefreshCw size={13} />
                          <span>{lang === 'ar' ? 'إعادة طلب المنتجات' : 'Re-order'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: PROFILE INFORMATION --- */}
      {activeTab === 'profile' && (
        <div className="animate-fade dashboard-card" style={{ padding: '24px', borderRadius: '18px', maxWidth: '640px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-blue)" />
            <span>{lang === 'ar' ? 'تعديل البيانات الشخصية' : 'Personal Profile'}</span>
          </h3>

          {profileMsg.text && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              backgroundColor: profileMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: profileMsg.type === 'success' ? '#10b981' : '#ef4444',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">{lang === 'ar' ? 'اسم المستخدم (اسم الحساب)' : 'Username'}</label>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="input-field"
                style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed', opacity: 0.7 }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
                {lang === 'ar' ? 'لا يمكن تعديل اسم المستخدم الرئيسي' : 'Username cannot be changed'}
              </span>
            </div>

            <div>
              <label className="input-label">{lang === 'ar' ? 'الاسم الكامل للعميل' : 'Full Name'}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder={lang === 'ar' ? 'أدخل اسمك الكامل للتوصيل' : 'Enter your full name'}
              />
            </div>

            <div>
              <label className="input-label">{lang === 'ar' ? 'رقم الهاتف للتواصل والتوصيل' : 'Phone Number'}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder={lang === 'ar' ? 'مثال: 70123456' : 'e.g. +96170123456'}
              />
            </div>

            <div>
              <label className="input-label">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="input-field"
                style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed', opacity: 0.7 }}
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: savingProfile ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              <Save size={16} />
              <span>{savingProfile ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}</span>
            </button>
          </form>
        </div>
      )}

      {/* --- TAB 3: SECURITY & PASSWORD --- */}
      {activeTab === 'security' && (
        <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
          {/* Change Password Card */}
          <div className="dashboard-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} color="var(--accent-blue)" />
              <span>{lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
            </h3>

            {passwordMsg.text && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: passwordMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: passwordMsg.type === 'success' ? '#10b981' : '#ef4444',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="input-label">{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="input-label">{lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  backgroundColor: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: savingPassword ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
              >
                <Key size={16} />
                <span>{savingPassword ? (lang === 'ar' ? 'جاري التحديث...' : 'Updating...') : (lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}</span>
              </button>
            </form>
          </div>

          {/* Privacy & Self-Service Account Deletion */}
          <div className="dashboard-card" style={{
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            backgroundColor: 'rgba(239, 68, 68, 0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={18} />
                <span>{lang === 'ar' ? 'حذف الحساب والبيانات نهائياً' : 'Permanent Account Deletion'}</span>
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
                {lang === 'ar' ? 'حذف كافة بيانات حسابك وطلبياتك فوراً طبقاً لسياسات الخصوصية ومتجر Google Play' : 'Permanently remove your account and all associated data'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('delete-account')}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {lang === 'ar' ? 'طلب حذف الحساب' : 'Delete Account'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
