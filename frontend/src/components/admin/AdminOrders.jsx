import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Printer, Eye, CheckCircle2, MessageCircle, Mail, DollarSign, PackageCheck, Send, MessageSquare } from 'lucide-react';

export default function AdminOrders() {
  const { lang, formatPrice, apiBase, settings, apiHost } = useApp();
  const { token, user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active', 'delivered', 'cancelled'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [hidePricesInPrint, setHidePricesInPrint] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiBase}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${apiBase}/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSupplierStatus = async (id, newSupplierStatus) => {
    try {
      const res = await fetch(`${apiBase}/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ supplier_fulfillment_status: newSupplierStatus })
      });
      if (res.ok) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder(prev => ({ ...prev, supplier_fulfillment_status: newSupplierStatus }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDispatchToSupplierWhatsApp = (supplierName, supplierPhone, supplierItems, order) => {
    let cleanPhone = (supplierPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      const inputPhone = window.prompt(
        lang === 'ar' ? `الرجاء إدخال رقم واتساب المورد (${supplierName}) مع رمز الدولة (مثال: 96171000000):` : `Enter WhatsApp number for ${supplierName} with country code:`
      );
      if (!inputPhone) return;
      cleanPhone = inputPhone.replace(/[^0-9]/g, '');
    }

    const itemsText = supplierItems.map((item, idx) => {
      const name = lang === 'ar' ? item.name_ar : item.name_en;
      const opts = [];
      if (item.selectedColor) opts.push(`اللون: ${item.selectedColor}`);
      if (item.selectedSize) opts.push(`القياس: ${item.selectedSize}`);
      if (item.customer_note) opts.push(`ملاحظة الزبون: ${item.customer_note}`);
      const optsStr = opts.length > 0 ? ` (${opts.join(' - ')})` : '';
      const costStr = item.cost_price_usd ? ` [تكلفة الجملة: $${(Number(item.cost_price_usd) * item.quantity).toFixed(2)}]` : '';
      return `${idx + 1}. ${name} × ${item.quantity}${optsStr}${costStr}`;
    }).join('\n');

    const totalSupplierCost = supplierItems.reduce((acc, i) => acc + (Number(i.cost_price_usd || 0) * i.quantity), 0);

    const message = 
`*طلب دروب شيبينغ جديد من أرز مارت (Arz-Mart)* ----------------------------------
*رقم الطلب:* #${order.tracking_number || order.id}
*التاريخ:* ${new Date(order.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}

*المنتجات المطلوبة:*
${itemsText}

${totalSupplierCost > 0 ? `*مجموع تكلفة الجملة:* $${totalSupplierCost.toFixed(2)} USD\n` : ''}----------------------------------
*بيانات الشحن والتسليم للعميل:*
*الاسم:* ${order.user_name || 'عميل'}
*الهاتف:* ${order.phone}
*العنوان:* ${order.address}
${order.notes ? `*ملاحظات الزبون:* ${order.notes}\n` : ''}*طريقة الدفع:* ${order.payment_method === 'COD' ? 'الدفع عند الاستلام (COD)' : 'مدفوع مسبقاً (Online)'}
*المبلغ المطلوب تحصيله من الزبون:* ${order.payment_method === 'COD' ? `$${Number(order.total_usd).toFixed(2)} (${formatPrice(order.total_lbp).replace('$', '')} L.L.)` : 'تم الدفع أونلاين ($0)'}
----------------------------------
شكراً لتعاونكم! الرجاء تأكيد الاستلام والبدء بالتجهيز.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    handleUpdateSupplierStatus(order.id, 'forwarded_to_supplier');
  };

  const handleDispatchToSupplierEmail = (supplierName, supplierEmail, supplierItems, order) => {
    let email = supplierEmail;
    if (!email) {
      email = window.prompt(lang === 'ar' ? `الرجاء إدخال إيميل المورد (${supplierName}):` : `Enter email for ${supplierName}:`);
      if (!email) return;
    }

    const itemsText = supplierItems.map((item, idx) => {
      const name = lang === 'ar' ? item.name_ar : item.name_en;
      const noteStr = item.customer_note ? ` (ملاحظة الزبون: ${item.customer_note})` : '';
      return `${idx + 1}. ${name} × ${item.quantity}${noteStr} (Wholesale Cost: $${(Number(item.cost_price_usd || 0) * item.quantity).toFixed(2)})`;
    }).join('\n');

    const subject = `طلب دروب شيبينغ جديد #${order.tracking_number || order.id} - Arz-Mart`;
    const body = `مرحباً ${supplierName}،\n\nنرجو تجهيز وشحن طلبية الدروب شيبينغ التالية:\nرقم الطلب: #${order.tracking_number || order.id}\n\nالمنتجات:\n${itemsText}\n\nعنوان الزبون للتوصيل:\nالاسم: ${order.user_name}\nالهاتف: ${order.phone}\nالعنوان: ${order.address}\n${order.notes ? `ملاحظات الزبون: ${order.notes}\n` : ''}طريقة الدفع: ${order.payment_method === 'COD' ? `الدفع عند الاستلام ($${order.total_usd})` : 'مدفوع أونلاين'}\n\nشكراً لكم،\nفريق أرز مارت`;

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    handleUpdateSupplierStatus(order.id, 'forwarded_to_supplier');
  };

  const handlePrint = (hidePrices = false) => {
    setHidePricesInPrint(hidePrices);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleDeleteOrder = async (id) => {
    const confirmDelete = window.confirm(lang === 'ar' ? 'هل أنت متأكد من نقل هذه الطلبية إلى الأرشيف؟' : 'Are you sure you want to move this order to the archive?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${apiBase}/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOrders();
        setSelectedOrder(null);
      } else {
        const errData = await res.json();
        alert(lang === 'ar' ? errData.error_ar : errData.error_en);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeSubTab === 'active') {
      return order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'archived';
    } else if (activeSubTab === 'delivered') {
      return order.status === 'delivered';
    } else if (activeSubTab === 'cancelled') {
      return order.status === 'cancelled';
    } else {
      return order.status === 'archived';
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Sub tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('active')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: activeSubTab === 'active' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: activeSubTab === 'active' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}
        >
          الطلبيات النشطة ({orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'archived').length})
        </button>
        <button
          onClick={() => setActiveSubTab('delivered')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: activeSubTab === 'delivered' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: activeSubTab === 'delivered' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}
        >
          الطلبيات المسلمة ({orders.filter(o => o.status === 'delivered').length})
        </button>
        <button
          onClick={() => setActiveSubTab('cancelled')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: activeSubTab === 'cancelled' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: activeSubTab === 'cancelled' ? 'white' : 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}
        >
          الطلبيات الملغاة ({orders.filter(o => o.status === 'cancelled').length})
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveSubTab('archive')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeSubTab === 'archive' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
              color: activeSubTab === 'archive' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}
          >
            أرشيف الطلبيات ({orders.filter(o => o.status === 'archived').length})
          </button>
        )}
      </div>

      {/* Orders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left Side: Orders List */}
        <div className="no-print dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '800' }}>قائمة الطلبيات</h4>
          {filteredOrders.length === 0 ? (
            <div style={{ color: 'var(--text-light)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
              لا يوجد طلبيات في هذا القسم حالياً.
            </div>
          ) : (
            filteredOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: selectedOrder?.id === o.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{o.user_name}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '2px' }}>{o.tracking_number}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-red-gold)' }}>
                    {formatPrice(o.total_usd)}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: o.status === 'pending' ? 'rgba(239,68,68,0.1)' : o.status === 'processing' ? 'rgba(59,130,246,0.1)' : o.status === 'shipped' ? 'rgba(217,119,6,0.1)' : o.status === 'cancelled' ? 'rgba(107,114,128,0.1)' : 'rgba(16,185,129,0.1)',
                      color: o.status === 'pending' ? '#ef4444' : o.status === 'processing' ? 'var(--accent-blue)' : o.status === 'shipped' ? '#d97706' : o.status === 'cancelled' ? '#6b7280' : '#10b981'
                    }}>
                      {o.status === 'cancelled' ? (lang === 'ar' ? 'ملغاة' : 'CANCELLED') : o.status.toUpperCase()}
                    </span>
                    {o.supplier_fulfillment_status === 'forwarded_to_supplier' ? (
                      <span style={{ fontSize: '0.66rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '12px', fontWeight: '800' }}>
                        {lang === 'ar' ? 'أُرسل للمورد' : 'Sent to Supplier'}
                      </span>
                    ) : o.supplier_fulfillment_status === 'shipped_by_supplier' ? (
                      <span style={{ fontSize: '0.66rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '12px', fontWeight: '800' }}>
                        {lang === 'ar' ? 'شحنه المورد' : 'Shipped'}
                      </span>
                    ) : o.supplier_fulfillment_status === 'delivered_settled' ? (
                      <span style={{ fontSize: '0.66rem', backgroundColor: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: '12px', fontWeight: '800' }}>
                        {lang === 'ar' ? 'مكتمل ومُحصّل' : 'Settled'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.66rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '12px', fontWeight: '700' }}>
                        {lang === 'ar' ? 'بانتظار المورد' : 'Dropship'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Order Detail / Invoicing Panel */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedOrder ? (
            <div className="dashboard-card" style={{ padding: '24px', position: 'sticky', top: '90px' }}>
              
              {/* Actions Header */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handlePrint(false)}
                    className="input-field"
                    style={{ width: 'auto', padding: '6px 12px', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <Printer size={14} />
                    <span>طباعة تفاصيل الطلب</span>
                  </button>
                  <button
                    onClick={() => handlePrint(true)}
                    className="input-field"
                    style={{ width: 'auto', padding: '6px 12px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <Printer size={14} />
                    <span>طباعة بدون سعر</span>
                  </button>
                  {user?.role === 'admin' && selectedOrder.status !== 'archived' && (
                    <button
                      onClick={() => handleDeleteOrder(selectedOrder.id)}
                      className="input-field animate-scale"
                      style={{ width: 'auto', padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      <span>أرشفة الطلبية</span>
                    </button>
                  )}
                </div>

                {((selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'archived') || 
                  (selectedOrder.status === 'archived' && user?.role === 'admin')) && (
                  <select
                    className="input-field"
                    style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  >
                    <option value="pending">قيد الانتظار (Pending)</option>
                    <option value="processing">قيد التحضير (Processing)</option>
                    <option value="shipped">تم الشحن (Shipped)</option>
                    <option value="delivered">تم التسليم (Delivered)</option>
                    {user?.role === 'admin' && (
                      <option value="cancelled">ملغاة (Cancelled)</option>
                    )}
                    {user?.role === 'admin' && selectedOrder.status === 'archived' && (
                      <option value="archived">مؤرشفة (Archived)</option>
                    )}
                  </select>
                )}
              </div>

              {/* --- DROPSHIPPING & SUPPLIER DISPATCH CONTROL (NO-PRINT) --- */}
              {(() => {
                const supplierGroups = {};
                (selectedOrder.items || []).forEach(item => {
                  const mName = item.merchant_name || (lang === 'ar' ? 'المتجر الرئيسي / عام' : 'Direct / Main Store');
                  if (!supplierGroups[mName]) {
                    supplierGroups[mName] = {
                      name: mName,
                      phone: item.supplier_phone || '',
                      whatsapp: item.supplier_whatsapp || item.supplier_phone || '',
                      email: item.supplier_email || '',
                      shipping_notes: item.supplier_shipping_notes || '',
                      items: [],
                      totalWholesale: 0,
                      totalRetail: 0
                    };
                  }
                  supplierGroups[mName].items.push(item);
                  supplierGroups[mName].totalWholesale += Number(item.cost_price_usd || 0) * item.quantity;
                  supplierGroups[mName].totalRetail += Number(item.price_usd || 0) * item.quantity;
                });

                const groupKeys = Object.keys(supplierGroups);
                if (groupKeys.length === 0) return null;

                const overallOrderWholesale = groupKeys.reduce((sum, k) => sum + supplierGroups[k].totalWholesale, 0);
                const overallOrderRetail = groupKeys.reduce((sum, k) => sum + supplierGroups[k].totalRetail, 0);
                const overallOrderProfit = overallOrderRetail - overallOrderWholesale;

                return (
                  <div className="no-print animate-fade" style={{
                    marginBottom: '20px',
                    padding: '18px 20px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '2px solid var(--accent-blue)',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {/* Header with Profit Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}></span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                            {lang === 'ar' ? 'منظومة الدروب شيبينغ وإرسال الطلبات للموردين' : 'Dropshipping & Supplier Fulfillment'}
                          </h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                            {lang === 'ar' ? 'أرسل الطلب للمورد بضغطة زر مع بيانات الشحن وعنوان الزبون' : '1-Click Dispatch to suppliers with customer address & wholesale cost'}
                          </span>
                        </div>
                      </div>

                      {/* Financial Profit Pills */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-light)' }}>{lang === 'ar' ? 'تكلفة الموردين' : 'Wholesale Cost'}</span>
                          <strong style={{ fontSize: '0.9rem', color: '#64748b' }}>${overallOrderWholesale.toFixed(2)}</strong>
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-light)' }}>{lang === 'ar' ? 'سعر البيع' : 'Retail Price'}</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--accent-blue)' }}>${overallOrderRetail.toFixed(2)}</strong>
                        </div>
                        <div style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#047857', fontWeight: '700' }}>{lang === 'ar' ? 'صافي ربحك ' : 'Net Profit '}</span>
                          <strong style={{ fontSize: '1rem', color: '#059669', fontWeight: '900' }}>+${overallOrderProfit.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Status with Supplier Dropdown */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {lang === 'ar' ? 'حالة التوريد الحالية:' : 'Supplier Fulfillment Status:'}
                      </span>
                      <select
                        className="input-field"
                        style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem', fontWeight: '800' }}
                        value={selectedOrder.supplier_fulfillment_status || 'pending_supplier'}
                        onChange={(e) => handleUpdateSupplierStatus(selectedOrder.id, e.target.value)}
                      >
                        <option value="pending_supplier">⏳ {lang === 'ar' ? 'بانتظار الإرسال للمورد (Pending Supplier)' : 'Pending Supplier'}</option>
                        <option value="forwarded_to_supplier">{lang === 'ar' ? 'تم إرسال الطلب للمورد (Forwarded to Supplier)' : 'Forwarded to Supplier'}</option>
                        <option value="shipped_by_supplier">{lang === 'ar' ? 'تم الشحن من المورد (Shipped by Supplier)' : 'Shipped by Supplier'}</option>
                        <option value="delivered_settled">{lang === 'ar' ? 'تم التسليم والتحصيل (Settled & Complete)' : 'Settled & Complete'}</option>
                      </select>
                    </div>

                    {/* Each Supplier Card */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {groupKeys.map(k => {
                        const group = supplierGroups[k];
                        const groupProfit = group.totalRetail - group.totalWholesale;

                        return (
                          <div 
                            key={k} 
                            style={{ 
                              padding: '14px 16px', 
                              borderRadius: '12px', 
                              backgroundColor: 'var(--bg-primary)', 
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '1rem', color: '#2563eb' }}>{group.name}</strong>
                                  <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-light)' }}>
                                    {group.items.length} {lang === 'ar' ? 'منتج' : 'items'}
                                  </span>
                                </div>
                                {(group.whatsapp || group.phone) && (
                                  <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '2px', fontWeight: '700', direction: 'ltr' }}>
                                    {group.whatsapp || group.phone}
                                  </div>
                                )}
                              </div>

                              {/* Supplier Action Buttons: 1-Click WhatsApp & Email */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDispatchToSupplierWhatsApp(group.name, group.whatsapp, group.items, selectedOrder)}
                                  title={lang === 'ar' ? 'إرسال تفاصيل المنتجات والشحن للمورد عبر واتساب بنقرة واحدة' : 'Send order & shipping details to supplier via WhatsApp'}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#25D366',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '800',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 3px 10px rgba(37, 211, 102, 0.35)',
                                    transition: 'transform 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                  <MessageCircle size={16} />
                                  <span>{lang === 'ar' ? 'إرسال للمورد عبر واتساب ' : 'Send to Supplier via WhatsApp'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDispatchToSupplierEmail(group.name, group.email, group.items, selectedOrder)}
                                  title={lang === 'ar' ? 'إرسال بوليصة الطلب عبر البريد للمورد' : 'Send via email'}
                                  style={{
                                    padding: '8px 14px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <Mail size={14} />
                                  <span>{lang === 'ar' ? 'إيميل' : 'Email'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Items List from this supplier */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                              {group.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                  <div>
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                      {lang === 'ar' ? it.name_ar : it.name_en}
                                    </span>
                                    <span style={{ color: 'var(--text-light)', margin: '0 6px' }}>× {it.quantity}</span>
                                    {(it.selectedColor || it.selectedSize) && (
                                      <span style={{ fontSize: '0.74rem', color: 'var(--accent-blue)', opacity: 0.9 }}>
                                        ({[it.selectedColor, it.selectedSize].filter(Boolean).join(' - ')})
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>
                                      {lang === 'ar' ? 'جملة:' : 'Cost:'} ${Number(it.cost_price_usd || 0).toFixed(2)}
                                    </span>
                                    <span style={{ fontWeight: '700', color: 'var(--accent-blue)' }}>
                                      {lang === 'ar' ? 'بيع:' : 'Retail:'} ${Number(it.price_usd || 0).toFixed(2)}
                                    </span>
                                    <span style={{ fontWeight: '800', color: '#059669', fontSize: '0.8rem' }}>
                                      +{((Number(it.price_usd || 0) - Number(it.cost_price_usd || 0)) * it.quantity).toFixed(2)}$
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Group Subtotals */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {lang === 'ar' ? `مجموع مستحقات ${group.name}: ` : `Total for ${group.name}: `}
                                <strong style={{ color: 'var(--text-primary)' }}>${group.totalWholesale.toFixed(2)}</strong>
                              </span>
                              <span style={{ color: '#059669', fontWeight: '800' }}>
                                {lang === 'ar' ? 'ربحك من هذا المورد: ' : 'Your profit from supplier: '}
                                +${groupProfit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Printable Invoice Container */}
              {/* Printable Invoice Container */}
              <div className={`invoice-box ${hidePricesInPrint ? 'hide-price-on-print' : ''}`} style={{ 
                padding: '24px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '12px', 
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem', 
                color: 'var(--text-primary)',
                lineHeight: '1.6'
              }}>
                {/* Printable Header */}
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
                      <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        {settings?.app_name || 'أرز مارت'}
                      </h2>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginTop: '2px' }}>
                        {lang === 'ar' ? 'متجر إلكتروني متكامل' : 'E-Commerce Marketplace'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: lang === 'ar' ? 'left' : 'right', direction: 'ltr' }}>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--accent-blue)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'ar' ? 'وصل استلام طلبية' : 'ORDER RECEIPT'}
                    </h1>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginTop: '4px', color: 'var(--text-primary)' }}>
                      #{selectedOrder.id}
                    </div>
                  </div>
                </div>

                {/* Info Blocks Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  {/* Left Column: Client Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px' }}>
                      {lang === 'ar' ? 'معلومات العميل:' : 'Customer Info:'}
                    </strong>
                    <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      {selectedOrder.user_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'الهاتف: ' : 'Phone: '}</span>
                      <span style={{ direction: 'ltr', display: 'inline-block' }}>{selectedOrder.phone}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'العنوان: ' : 'Address: '}</span>
                      {selectedOrder.address}
                    </div>
                    {selectedOrder.notes && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #f59e0b', borderRadius: '6px', fontSize: '0.82rem' }}>
                        <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MessageSquare size={13} />
                          {lang === 'ar' ? 'ملاحظات الزبون على الطلب:' : 'Customer Order Notes:'}
                        </strong>
                        <span style={{ color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>{selectedOrder.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Order/Invoice Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: lang === 'ar' ? 'left' : 'right', alignItems: lang === 'ar' ? 'flex-start' : 'flex-end' }}>
                    <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-light)', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px', width: '100%' }}>
                      {lang === 'ar' ? 'تفاصيل الطلبية:' : 'Order Details:'}
                    </strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'التاريخ: ' : 'Date: '}</span>
                      {new Date(selectedOrder.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'طريقة الدفع: ' : 'Payment Method: '}</span>
                      {selectedOrder.payment_method === 'COD' 
                        ? (lang === 'ar' ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)') 
                        : (lang === 'ar' ? 'دفع إلكتروني (Online)' : 'Online Payment')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'رقم التتبع: ' : 'Tracking Number: '}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{selectedOrder.tracking_number}</span>
                    </div>
                    {selectedOrder.exchange_rate && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'سعر الصرف المعتمد: ' : 'Exchange Rate: '}</span>
                        {formatPrice(selectedOrder.exchange_rate).replace('$', '')} L.L.
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--text-primary)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>{lang === 'ar' ? 'الصورة' : 'Image'}</th>
                      <th style={{ padding: '10px 8px', textAlign: 'start' }}>{lang === 'ar' ? 'المنتج وصف' : 'Item Description'}</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', width: '70px' }}>{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="price-col" style={{ padding: '10px 8px', textAlign: 'end', width: '100px' }}>{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                      <th className="total-col" style={{ padding: '10px 8px', textAlign: 'end', width: '110px' }}>{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => {
                      const itemImg = item.image_url 
                        ? (item.image_url.startsWith('http') || item.image_url.startsWith('data:') ? item.image_url : `${apiHost}${item.image_url}`)
                        : '';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', verticalAlign: 'middle' }}>
                          {/* Product Image Column */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {itemImg ? (
                              <img 
                                src={itemImg} 
                                alt="Item" 
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'block', margin: 'auto' }} 
                              />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}></div>
                            )}
                          </td>
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
                                <span><strong>{lang === 'ar' ? 'ملاحظة الزبون: ' : 'Customer Note: '}</strong>"{item.customer_note}"</span>
                              </div>
                            )}
                            {item.merchant_name && (
                              <div className="merchant-info-print" style={{ fontSize: '0.75rem', color: 'gray', marginTop: '4px' }}>
                                {lang === 'ar' ? `التاجر: ${item.merchant_name}` : `Merchant: ${item.merchant_name}`}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {item.quantity}
                          </td>
                          <td className="price-col" style={{ padding: '8px', textAlign: 'end', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            {formatPrice(item.price_usd)}
                          </td>
                          <td className="total-col" style={{ padding: '8px', textAlign: 'end', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {formatPrice(item.price_usd * item.quantity)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Calculations & Footer Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  {/* Left: Thank you and Note */}
                  <div style={{ flex: 1, minWidth: '220px', fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {lang === 'ar' ? 'ملاحظة هامة:' : 'Important Note:'}
                    </div>
                    <div>
                      {lang === 'ar' 
                        ? 'الرجاء الاحتفاظ بهذا الوصل للاستبدال أو المرجوعات خلال مدة أقصاها ٧ أيام من تاريخ التسليم.'
                        : 'Please keep this receipt for exchanges or returns within a maximum of 7 days from delivery.'}
                    </div>
                  </div>

                  {/* Right: Subtotal and Total calculations */}
                  <div className="total-col" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '240px', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-light)' }}>{lang === 'ar' ? 'التوصيل:' : 'Delivery:'}</span>
                      <strong style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {selectedOrder.delivery_fee_usd === 0 
                          ? (lang === 'ar' ? 'مجاني' : 'Free') 
                          : formatPrice(selectedOrder.delivery_fee_usd)}
                      </strong>
                    </div>
                    
                    {/* Grand Total USD */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '240px', fontSize: '1.1rem', fontWeight: '900', borderTop: '2px solid var(--text-primary)', paddingTop: '8px', marginTop: '4px' }}>
                      <span>{lang === 'ar' ? 'الإجمالي النهائي (USD):' : 'Grand Total (USD):'}</span>
                      <span style={{ color: 'var(--accent-red-gold)' }}>
                        {formatPrice(selectedOrder.total_usd)}
                      </span>
                    </div>

                    {/* Grand Total LBP (Lebanese Lira) */}
                    {(() => {
                      const rate = selectedOrder.exchange_rate || settings?.exchange_rate || 89500;
                      const totalLbp = selectedOrder.total_usd * rate;
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '240px', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
                          <span>{lang === 'ar' ? 'المعادل بالليرة اللبنانية:' : 'Equivalent in LBP:'}</span>
                          <span>
                            {totalLbp.toLocaleString()} ل.ل.
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer Notes */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '30px', paddingTop: '10px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                  <div>{lang === 'ar' ? 'شكرًا لشرائكم وثقتكم بنا!' : 'Thank you for shopping and trusting us!'}</div>
                  {settings?.contact_email && (
                    <div style={{ marginTop: '2px' }}>{settings.contact_email}</div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="no-print dashboard-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
              اختر طلبية من القائمة الجانبية لعرض تفاصيلها وطباعتها.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
