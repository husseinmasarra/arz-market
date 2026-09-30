import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  FileText, 
  Printer, 
  Eye, 
  Search, 
  Download, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  MessageCircle, 
  Edit3, 
  Save, 
  X, 
  RotateCcw,
  Calendar,
  Hash,
  ShoppingBag,
  Filter,
  CreditCard,
  MessageSquare,
  QrCode
} from 'lucide-react';

export default function AdminInvoices() {
  const { lang, formatPrice, apiBase, settings, apiHost, getImageUrl, handleImageError } = useApp();
  const { token, user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'COD', 'Online'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [hidePricesInPrint, setHidePricesInPrint] = useState(false);

  // Price editing states (Admin Only)
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [editingItems, setEditingItems] = useState([]);
  const [editingDeliveryFee, setEditingDeliveryFee] = useState(0);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setIsEditingPrices(false);
    setEditingItems([]);
  }, [selectedInvoice?.id]);

  const handleStartEditPricing = () => {
    if (!selectedInvoice) return;
    const clonedItems = (selectedInvoice.items || []).map(i => ({
      ...i,
      price_usd: Number(i.price_usd) || 0
    }));
    setEditingItems(clonedItems);
    setEditingDeliveryFee(Number(selectedInvoice.delivery_fee_usd) || 0);
    setIsEditingPrices(true);
  };

  const handleCancelEditPricing = () => {
    setIsEditingPrices(false);
    setEditingItems([]);
  };

  const handleItemPriceChange = (index, newPrice) => {
    setEditingItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        price_usd: newPrice === '' ? '' : Math.max(0, parseFloat(newPrice) || 0)
      };
      return updated;
    });
  };

  const handleSavePricing = async () => {
    if (!selectedInvoice) return;
    setIsSavingPricing(true);
    try {
      const cleanItems = editingItems.map(i => ({
        ...i,
        price_usd: Math.max(0, Number(i.price_usd) || 0)
      }));
      const res = await fetch(`${apiBase}/orders/${selectedInvoice.id}/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cleanItems,
          delivery_fee_usd: Math.max(0, Number(editingDeliveryFee) || 0)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedInvoice(prev => ({
          ...prev,
          items: data.order.items,
          total_usd: data.order.total_usd,
          total_lbp: data.order.total_lbp,
          delivery_fee_usd: data.order.delivery_fee_usd,
          delivery_fee_lbp: data.order.delivery_fee_lbp
        }));
        setOrders(prev => prev.map(o => o.id === selectedInvoice.id ? {
          ...o,
          items: data.order.items,
          total_usd: data.order.total_usd,
          total_lbp: data.order.total_lbp,
          delivery_fee_usd: data.order.delivery_fee_usd,
          delivery_fee_lbp: data.order.delivery_fee_lbp
        } : o));
        setIsEditingPrices(false);
        alert(lang === 'ar' ? 'تم تحديث أسعار الفاتورة والمجموع بنجاح!' : 'Invoice pricing updated successfully!');
      } else {
        alert(data.error_ar || data.error_en || 'Error saving prices');
      }
    } catch (err) {
      console.error('Save pricing error:', err);
      alert(lang === 'ar' ? 'خطأ أثناء حفظ الأسعار' : 'Error saving prices');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${apiBase}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedInvoice && selectedInvoice.id === orderId) {
          setSelectedInvoice(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handlePrint = (invoiceToPrint = null) => {
    if (invoiceToPrint) {
      setSelectedInvoice(invoiceToPrint);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSendWhatsapp = (order) => {
    const phone = order.phone.replace(/[^0-9+]/g, '');
    const cleanPhone = phone.startsWith('0') ? '961' + phone.substring(1) : (phone.startsWith('+') ? phone.substring(1) : phone);
    const tracking = order.tracking_number || `#${order.id}`;
    const total = formatPrice(order.total_usd);
    const text = lang === 'ar'
      ? `مرحباً ${order.user_name}، فاتورة طلبك من ${settings?.app_name || 'أرز مارت'} رقم (${tracking}) بقيمة إجمالية ${total}. يمكنك متابعة حالة طلبك عبر متجرنا.`
      : `Hello ${order.user_name}, your invoice for order (${tracking}) from ${settings?.app_name || 'Arz-Mart'} total is ${total}. Thank you for shopping with us!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportCsv = () => {
    if (orders.length === 0) return;
    const headers = [
      'Invoice ID',
      'Tracking Number',
      'Date',
      'Customer Name',
      'Phone',
      'Address',
      'Status',
      'Payment Method',
      'Item SKUs / Codes',
      'Items Count',
      'Total USD',
      'Total LBP',
      'Delivery Fee USD'
    ];

    const rows = filteredOrders.map(o => {
      const itemSkus = (o.items || []).map(i => i.sku || ('ARZ-P' + String(i.product_id || i.id || 0).padStart(4, '0'))).join('; ');
      return [
        `INV-${o.id}`,
        `"${o.tracking_number || ''}"`,
        `"${new Date(o.created_at).toLocaleString()}"`,
        `"${(o.user_name || '').replace(/"/g, '""')}"`,
        `"${o.phone || ''}"`,
        `"${(o.address || '').replace(/"/g, '""')}"`,
        `"${o.status || ''}"`,
        `"${o.payment_method || ''}"`,
        `"${itemSkus}"`,
        (o.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0),
        o.total_usd,
        o.total_lbp,
        o.delivery_fee_usd
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invoices_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Date Filter matching
  const matchesDate = (orderDateStr, filter) => {
    if (!orderDateStr || filter === 'all') return true;
    const orderDate = new Date(orderDateStr);
    const now = new Date();
    
    if (filter === 'today') {
      return orderDate.getFullYear() === now.getFullYear() &&
             orderDate.getMonth() === now.getMonth() &&
             orderDate.getDate() === now.getDate();
    }
    if (filter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return orderDate.getFullYear() === yesterday.getFullYear() &&
             orderDate.getMonth() === yesterday.getMonth() &&
             orderDate.getDate() === yesterday.getDate();
    }
    if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return orderDate >= weekAgo;
    }
    if (filter === 'month') {
      return orderDate.getFullYear() === now.getFullYear() &&
             orderDate.getMonth() === now.getMonth();
    }
    return true;
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    // Status Filter
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    // Payment Method Filter
    if (paymentFilter !== 'all' && o.payment_method !== paymentFilter) return false;
    // Date Filter
    if (!matchesDate(o.created_at, dateFilter)) return false;

    // Search Query (Invoice ID, Tracking, Phone, Customer Name, Address, Product SKU or Name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchInvId = String(o.id).includes(q) || `inv-${o.id}`.includes(q);
      const matchTracking = (o.tracking_number || '').toLowerCase().includes(q);
      const matchPhone = (o.phone || '').toLowerCase().includes(q);
      const matchName = (o.user_name || '').toLowerCase().includes(q);
      const matchAddress = (o.address || '').toLowerCase().includes(q);
      const matchItems = (o.items || []).some(it => 
        (it.name_ar || '').toLowerCase().includes(q) ||
        (it.name_en || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        ('arz-p' + String(it.product_id || it.id || 0).padStart(4, '0')).toLowerCase().includes(q)
      );
      if (!matchInvId && !matchTracking && !matchPhone && !matchName && !matchAddress && !matchItems) {
        return false;
      }
    }
    return true;
  });

  // Financial Metrics
  const totalInvoicedUsd = filteredOrders.reduce((sum, o) => sum + (Number(o.total_usd) || 0), 0);
  const totalInvoicedLbp = filteredOrders.reduce((sum, o) => sum + (Number(o.total_lbp) || 0), 0);
  const deliveredInvoicesCount = filteredOrders.filter(o => o.status === 'delivered').length;
  const pendingInvoicesCount = filteredOrders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const avgInvoiceValueUsd = filteredOrders.length > 0 ? (totalInvoicedUsd / filteredOrders.length) : 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return { label: lang === 'ar' ? 'تم التسليم والتحصيل' : 'Delivered & Paid', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'shipped':
        return { label: lang === 'ar' ? 'تم الشحن' : 'Shipped', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'processing':
        return { label: lang === 'ar' ? 'قيد التحضير' : 'Processing', bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
      case 'cancelled':
        return { label: lang === 'ar' ? 'ملغاة' : 'Cancelled', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'archived':
        return { label: lang === 'ar' ? 'مؤرشفة' : 'Archived', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
      default:
        return { label: lang === 'ar' ? 'قيد الانتظار' : 'Pending', bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Metrics Dashboard (NO-PRINT) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Title Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)'
            }}>
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                {lang === 'ar' ? 'قسم الفواتير والوصولات الضريبية' : 'Invoices & Billing Center'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                {lang === 'ar' ? 'إدارة وطباعة الفواتير مع أكواد المنتجات وتعديل الأسعار' : 'Manage, search, print receipts with product SKU codes & price edits'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleExportCsv}
              className="input-field animate-scale"
              style={{
                width: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Download size={15} color="var(--accent-blue)" />
              <span>{lang === 'ar' ? 'تصدير كملف Excel / CSV' : 'Export to CSV'}</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          
          <div className="dashboard-card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'إجمالي قيمة الفواتير' : 'Total Invoiced'}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '4px 0', color: 'var(--accent-blue)' }}>
                  {formatPrice(totalInvoicedUsd)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                  {formatPrice(totalInvoicedLbp).replace('$', '')} L.L.
                </span>
              </div>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(37,99,235,0.1)' }}>
                <DollarSign size={20} color="#2563eb" />
              </div>
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'عدد الفواتير الكلي' : 'Total Invoices'}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '4px 0', color: '#10b981' }}>
                  {filteredOrders.length}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                  {deliveredInvoicesCount} {lang === 'ar' ? 'مسلّمة ومحصّلة' : 'delivered'}
                </span>
              </div>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.1)' }}>
                <CheckCircle2 size={20} color="#10b981" />
              </div>
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'فواتير قيد التحصيل' : 'Pending Invoices'}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '4px 0', color: '#f59e0b' }}>
                  {pendingInvoicesCount}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'بانتظار الشحن والتسليم' : 'Awaiting fulfillment'}
                </span>
              </div>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.1)' }}>
                <Clock size={20} color="#f59e0b" />
              </div>
            </div>
          </div>

          <div className="dashboard-card" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'متوسط قيمة الفاتورة' : 'Average Order Value'}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '900', margin: '4px 0', color: '#8b5cf6' }}>
                  {formatPrice(avgInvoiceValueUsd)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                  {lang === 'ar' ? 'لكل فاتورة مسجلة' : 'per invoice average'}
                </span>
              </div>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(139,92,246,0.1)' }}>
                <ShoppingBag size={20} color="#8b5cf6" />
              </div>
            </div>
          </div>

        </div>

        {/* Filters and Search Bar */}
        <div className="dashboard-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search input with SKU search highlight */}
            <div style={{ position: 'relative', flex: '1.5', minWidth: '260px' }}>
              <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: lang === 'ar' ? '12px' : 'auto', left: lang === 'ar' ? 'auto' : '12px', color: 'var(--text-light)' }} />
              <input
                type="text"
                className="input-field"
                placeholder={lang === 'ar' ? 'بحث برقم الفاتورة، كود الصنف (SKU)، اسم الزبون، أو رقم الهاتف...' : 'Search by Invoice #, SKU code, customer, or phone...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: lang === 'ar' ? '36px' : '12px', paddingLeft: lang === 'ar' ? '12px' : '36px', width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            {/* Status Select */}
            <div style={{ minWidth: '150px' }}>
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontSize: '0.82rem', fontWeight: '600' }}
              >
                <option value="all">{lang === 'ar' ? 'كافة حالات الفواتير' : 'All Statuses'}</option>
                <option value="pending">{lang === 'ar' ? 'قيد الانتظار (Pending)' : 'Pending'}</option>
                <option value="processing">{lang === 'ar' ? 'قيد التحضير (Processing)' : 'Processing'}</option>
                <option value="shipped">{lang === 'ar' ? 'تم الشحن (Shipped)' : 'Shipped'}</option>
                <option value="delivered">{lang === 'ar' ? 'تم التسليم والتحصيل (Delivered)' : 'Delivered'}</option>
                <option value="cancelled">{lang === 'ar' ? 'ملغاة (Cancelled)' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Payment Method Select */}
            <div style={{ minWidth: '140px' }}>
              <select
                className="input-field"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                style={{ fontSize: '0.82rem', fontWeight: '600' }}
              >
                <option value="all">{lang === 'ar' ? 'كافة طرق الدفع' : 'All Payment'}</option>
                <option value="COD">{lang === 'ar' ? 'دفع عند الاستلام (COD)' : 'Cash on Delivery (COD)'}</option>
                <option value="Online">{lang === 'ar' ? 'دفع إلكتروني (Online)' : 'Online Payment'}</option>
              </select>
            </div>

          </div>

          {/* Quick Date Range Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-light)', marginInlineEnd: '4px' }}>
              <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginInlineEnd: '4px' }} />
              {lang === 'ar' ? 'الفترة:' : 'Period:'}
            </span>
            {[
              { id: 'all', labelAr: 'كافة الفترات', labelEn: 'All Time' },
              { id: 'today', labelAr: 'اليوم', labelEn: 'Today' },
              { id: 'yesterday', labelAr: 'أمس', labelEn: 'Yesterday' },
              { id: 'week', labelAr: 'آخر 7 أيام', labelEn: 'Last 7 Days' },
              { id: 'month', labelAr: 'هذا الشهر', labelEn: 'This Month' }
            ].map(period => (
              <button
                key={period.id}
                type="button"
                onClick={() => setDateFilter(period.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: dateFilter === period.id ? 'var(--accent-blue)' : 'var(--bg-primary)',
                  color: dateFilter === period.id ? 'white' : 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {lang === 'ar' ? period.labelAr : period.labelEn}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Main Grid: Invoices Table & Detail / Printable Invoice Sheet */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedInvoice ? '1.1fr 1.3fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Side: Invoices Directory Table */}
        <div className="no-print dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>
              {lang === 'ar' ? 'قائمة الفواتير الصادرة' : 'Issued Invoices List'} ({filteredOrders.length})
            </h4>
            {selectedInvoice && (
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'var(--text-light)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
              >
                {lang === 'ar' ? 'عرض ملء الشاشة' : 'Full Screen'}
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              {lang === 'ar' ? 'جاري تحميل الفواتير...' : 'Loading invoices...'}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              {lang === 'ar' ? 'لا توجد فواتير مطابقة لخيارات البحث والتصفية.' : 'No invoices matching filters.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: selectedInvoice ? '750px' : 'none', overflowY: selectedInvoice ? 'auto' : 'visible' }}>
              {filteredOrders.map(order => {
                const isSelected = selectedInvoice?.id === order.id;
                const statusBadge = getStatusBadge(order.status);
                const itemsCount = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedInvoice(order)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(37,99,235,0.06)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Header Row: ID, Date, Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                          #INV-{order.id}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                          ({order.tracking_number})
                        </span>
                      </div>
                      
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Customer & Total Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {order.user_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }}>
                          {order.phone}
                        </div>
                      </div>

                      <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                        <div style={{ fontWeight: '900', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {formatPrice(order.total_usd)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                          {itemsCount} {lang === 'ar' ? 'أصناف' : 'items'}
                        </div>
                      </div>
                    </div>

                    {/* Item SKU Badges Preview */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                      {(order.items || []).slice(0, 4).map((it, iIdx) => (
                        <span key={iIdx} style={{
                          fontSize: '0.68rem',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)'
                        }}>
                          {it.sku || ('ARZ-P' + String(it.product_id || it.id || 0).padStart(4, '0'))} (×{it.quantity})
                        </span>
                      ))}
                      {(order.items || []).length > 4 && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-light)' }}>
                          +{ (order.items || []).length - 4 } {lang === 'ar' ? 'المزيد' : 'more'}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                        {new Date(order.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(order);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={lang === 'ar' ? 'طباعة سريعة' : 'Quick Print'}
                        >
                          <Printer size={13} color="var(--accent-blue)" />
                          <span>{lang === 'ar' ? 'طباعة' : 'Print'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsapp(order);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #10b981',
                            backgroundColor: 'rgba(16,185,129,0.1)',
                            color: '#059669',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={lang === 'ar' ? 'إرسال الفاتورة عبر واتساب' : 'Send via WhatsApp'}
                        >
                          <MessageCircle size={13} />
                          <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Right Side: Detailed Printable Invoice Viewer & Editor */}
        {selectedInvoice && (
          <div className="dashboard-card animate-fade" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Control Bar (NO-PRINT) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--accent-blue)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                  }}
                >
                  <Printer size={16} />
                  <span>{lang === 'ar' ? 'طباعة الفاتورة الآن' : 'Print Invoice Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHidePricesInPrint(prev => !prev)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: hidePricesInPrint ? '#f59e0b' : 'var(--bg-tertiary)',
                    color: hidePricesInPrint ? '#ffffff' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                  title={lang === 'ar' ? 'طباعة بوليصة شحن للمندوب بدون أسعار' : 'Hide prices on printed receipt'}
                >
                  {hidePricesInPrint ? (lang === 'ar' ? '✓ مخفية الأسعار' : '✓ Prices Hidden') : (lang === 'ar' ? 'إخفاء الأسعار (بوليصة توصيل)' : 'Hide Prices')}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Admin Inline Pricing Action Button */}
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={isEditingPrices ? handleSavePricing : handleStartEditPricing}
                    style={{
                      padding: '7px 14px',
                      backgroundColor: isEditingPrices ? '#10b981' : '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isSavingPricing ? 'not-allowed' : 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    {isEditingPrices ? <Save size={15} /> : <Edit3 size={15} />}
                    <span>{isEditingPrices ? (isSavingPricing ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الأسعار' : 'Save Prices')) : (lang === 'ar' ? 'تعديل أسعار الفاتورة' : 'Edit Prices')}</span>
                  </button>
                )}

                {isEditingPrices && (
                  <button
                    type="button"
                    onClick={handleCancelEditPricing}
                    disabled={isSavingPricing}
                    style={{
                      padding: '7px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    <X size={14} />
                    <span>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</span>
                  </button>
                )}

                <select
                  className="input-field"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', fontWeight: '700' }}
                  value={selectedInvoice.status}
                  onChange={(e) => handleUpdateStatus(selectedInvoice.id, e.target.value)}
                >
                  <option value="pending">{lang === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                  <option value="processing">{lang === 'ar' ? 'قيد التحضير' : 'Processing'}</option>
                  <option value="shipped">{lang === 'ar' ? 'تم الشحن' : 'Shipped'}</option>
                  <option value="delivered">{lang === 'ar' ? 'تم التسليم والتحصيل' : 'Delivered'}</option>
                  <option value="cancelled">{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</option>
                </select>
              </div>

            </div>

            {/* --- PRINTABLE INVOICE SHEET --- */}
            <div className={`invoice-box ${hidePricesInPrint ? 'hide-price-on-print' : ''}`} style={{
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              lineHeight: '1.6'
            }}>
              
              {/* Header: Logo, Store Info & Invoice Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double var(--border-color)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {settings?.logo_url ? (
                    <img 
                      src={settings.logo_url.startsWith('http') || settings.logo_url.startsWith('data:') ? settings.logo_url : `${apiHost}${settings.logo_url}`} 
                      alt="Logo" 
                      style={{ height: '54px', maxWidth: '140px', objectFit: 'contain' }} 
                    />
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-blue)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1.2rem'
                    }}>
                      {settings?.app_name ? settings.app_name[0] : 'A'}
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
                      {settings?.app_name || 'أرز مارت'}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginTop: '2px' }}>
                      {lang === 'ar' ? 'فاتورة شراء رسمية معتمدة' : 'Official Commercial Receipt'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: lang === 'ar' ? 'left' : 'right', direction: 'ltr' }}>
                  <h1 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--accent-blue)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {lang === 'ar' ? 'فاتورة طلبية' : 'TAX INVOICE'}
                  </h1>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', marginTop: '4px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    #INV-{selectedInvoice.id}
                  </div>
                </div>
              </div>

              {/* Customer & Order Metadata Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                
                {/* Customer Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px' }}>
                    {lang === 'ar' ? 'معلومات العميل:' : 'Customer Details:'}
                  </strong>
                  <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {selectedInvoice.user_name}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'الهاتف: ' : 'Phone: '}</span>
                    <span style={{ direction: 'ltr', display: 'inline-block' }}>{selectedInvoice.phone}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'العنوان: ' : 'Address: '}</span>
                    {selectedInvoice.address}
                  </div>
                  {selectedInvoice.notes && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #f59e0b', borderRadius: '6px', fontSize: '0.82rem' }}>
                      <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MessageSquare size={13} />
                        {lang === 'ar' ? 'ملاحظات الزبون:' : 'Customer Note:'}
                      </strong>
                      <span style={{ color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>{selectedInvoice.notes}</span>
                    </div>
                  )}
                </div>

                {/* Invoice Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: lang === 'ar' ? 'left' : 'right', alignItems: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
                  <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px', width: '100%' }}>
                    {lang === 'ar' ? 'تفاصيل الفاتورة:' : 'Invoice Metadata:'}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'التاريخ: ' : 'Date: '}</span>
                    {new Date(selectedInvoice.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'طريقة الدفع: ' : 'Payment Method: '}</span>
                    {selectedInvoice.payment_method === 'COD' 
                      ? (lang === 'ar' ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)') 
                      : (lang === 'ar' ? 'دفع إلكتروني (Online)' : 'Online Payment')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'رقم التتبع: ' : 'Tracking Number: '}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{selectedInvoice.tracking_number}</span>
                  </div>
                  {selectedInvoice.exchange_rate && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'سعر الصرف المعتمد: ' : 'Exchange Rate: '}</span>
                      {formatPrice(selectedInvoice.exchange_rate).replace('$', '')} L.L.
                    </div>
                  )}
                </div>

              </div>

              {/* Price Editing Mode Alert */}
              {isEditingPrices && (
                <div className="no-print animate-fade" style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.85rem',
                  color: '#b45309',
                  fontWeight: 'bold'
                }}>
                  <Edit3 size={18} />
                  <span>{lang === 'ar' ? 'وضع تعديل الأسعار نشط (المدير فقط): يمكنك تعديل سعر بيع كل منتج ورسوم التوصيل مباشرة أدناه ثم حفظ التعديل.' : 'Price Editing Mode Active (Admin Only): Edit unit prices and delivery fee below, then click Save.'}</span>
                </div>
              )}

              {/* Items Table with SKU Column */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--text-primary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '50px' }}>{lang === 'ar' ? 'الصورة' : 'Image'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'start', width: '110px' }}>{lang === 'ar' ? 'كود الصنف' : 'SKU / Code'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'start' }}>{lang === 'ar' ? 'اسم المنتج والخيارات' : 'Item Description'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th className="price-col" style={{ padding: '10px 8px', textAlign: 'end', width: '110px' }}>
                      {lang === 'ar' ? (isEditingPrices ? 'سعر الوحدة ($)' : 'سعر الوحدة') : (isEditingPrices ? 'Unit Price ($)' : 'Unit Price')}
                    </th>
                    <th className="total-col" style={{ padding: '10px 8px', textAlign: 'end', width: '110px' }}>{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((item, idx) => {
                    const itemImg = item.image_url ? getImageUrl(item.image_url) : '';
                    const livePrice = isEditingPrices && editingItems[idx]?.price_usd !== undefined
                      ? editingItems[idx].price_usd
                      : Number(item.price_usd || 0);
                    const liveTotal = (parseFloat(livePrice) || 0) * (item.quantity || 1);
                    const itemSku = item.sku || ('ARZ-P' + String(item.product_id || item.id || 0).padStart(4, '0'));

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', verticalAlign: 'middle', backgroundColor: isEditingPrices ? 'rgba(245, 158, 11, 0.03)' : 'transparent' }}>
                        
                        {/* Product Image Column */}
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {itemImg ? (
                            <img 
                              src={itemImg} 
                              alt="Item" 
                              onError={handleImageError}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'block', margin: 'auto' }} 
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}></div>
                          )}
                        </td>

                        {/* Product SKU Code Badge */}
                        <td style={{ padding: '8px', textAlign: 'start' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            color: 'var(--accent-blue)',
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            display: 'inline-block'
                          }}>
                            {itemSku}
                          </span>
                        </td>

                        {/* Description & Options */}
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            {lang === 'ar' ? item.name_ar : item.name_en}
                          </div>
                          {(item.selectedColor || item.selectedSize) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
                              {item.selectedColor && (
                                <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {lang === 'ar' ? `اللون: ${item.selectedColor}` : `Color: ${item.selectedColor}`}
                                </span>
                              )}
                              {item.selectedSize && (
                                <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {lang === 'ar' ? `القياس: ${item.selectedSize}` : `Size: ${item.selectedSize}`}
                                </span>
                              )}
                            </div>
                          )}
                          {item.customer_note && (
                            <div style={{ fontSize: '0.75rem', color: '#d97706', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px dashed rgba(245, 158, 11, 0.4)' }}>
                              <MessageSquare size={12} />
                              <span><strong>{lang === 'ar' ? 'ملاحظة: ' : 'Note: '}</strong>"{item.customer_note}"</span>
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {item.quantity}
                        </td>

                        {/* Unit Price (Editable if in price mode) */}
                        <td 
                          className="price-col" 
                          style={{ 
                            padding: '8px', 
                            textAlign: 'end', 
                            fontWeight: '600', 
                            color: 'var(--text-secondary)',
                            cursor: user?.role === 'admin' && !isEditingPrices ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (user?.role === 'admin' && !isEditingPrices) {
                              handleStartEditPricing();
                            }
                          }}
                          title={user?.role === 'admin' && !isEditingPrices ? (lang === 'ar' ? 'انقر لتعديل السعر' : 'Click to edit price') : ''}
                        >
                          {isEditingPrices ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="input-field"
                                value={editingItems[idx]?.price_usd !== undefined ? editingItems[idx].price_usd : item.price_usd}
                                onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                                style={{
                                  width: '85px',
                                  padding: '4px 6px',
                                  fontSize: '0.88rem',
                                  fontWeight: '800',
                                  textAlign: 'center',
                                  borderColor: '#f59e0b',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  borderRadius: '6px'
                                }}
                              />
                            </div>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                              <span>{formatPrice(item.price_usd)}</span>
                              {user?.role === 'admin' && (
                                <span className="no-print" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', cursor: 'pointer' }} title={lang === 'ar' ? 'تعديل السعر' : 'Edit price'}>
                                  <Edit3 size={13} />
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Total Column */}
                        <td className="total-col" style={{ padding: '8px', textAlign: 'end', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {formatPrice(liveTotal)}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Calculation Summary */}
              {(() => {
                const subtotal = isEditingPrices
                  ? editingItems.reduce((sum, it) => sum + (Number(it.price_usd) || 0) * (it.quantity || 1), 0)
                  : (selectedInvoice.items || []).reduce((sum, it) => sum + (Number(it.price_usd) || 0) * (it.quantity || 1), 0);
                
                const deliveryFee = isEditingPrices
                  ? Number(editingDeliveryFee) || 0
                  : Number(selectedInvoice.delivery_fee_usd) || 0;

                const grandTotal = subtotal + deliveryFee;
                const exRate = selectedInvoice.exchange_rate || settings?.exchange_rate || 89500;
                const grandTotalLbp = grandTotal * exRate;

                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(subtotal)}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'أجور التوصيل:' : 'Delivery Fee:'}</span>
                        {isEditingPrices ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="input-field"
                              value={editingDeliveryFee}
                              onChange={(e) => setEditingDeliveryFee(e.target.value)}
                              style={{
                                width: '80px',
                                padding: '4px 6px',
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                textAlign: 'center',
                                borderColor: '#f59e0b',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                borderRadius: '6px'
                              }}
                            />
                          </div>
                        ) : (
                          <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(deliveryFee)}</strong>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '2px solid var(--text-primary)',
                        paddingTop: '10px',
                        marginTop: '6px'
                      }}>
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {lang === 'ar' ? 'المجموع الإجمالي:' : 'Grand Total:'}
                        </span>
                        <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--accent-blue)', display: 'block' }}>
                            {formatPrice(grandTotal)}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: '700' }}>
                            {formatPrice(grandTotalLbp).replace('$', '')} L.L.
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Invoice Footer Note */}
              <div style={{
                marginTop: '32px',
                paddingTop: '16px',
                borderTop: '1px dashed var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.78rem',
                color: 'var(--text-light)'
              }}>
                <div>
                  <strong>{settings?.app_name || 'أرز مارت'}</strong> — {lang === 'ar' ? 'شكراً لتعاملكم معنا ونتمنى لكم تجربة تسوق ممتعة!' : 'Thank you for your business!'}
                </div>
                <div style={{ fontFamily: 'monospace' }}>
                  {settings?.contact_email || 'info@arz-mart.com'}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
