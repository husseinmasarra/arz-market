import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit3, Image, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Plus, Globe, ExternalLink, X } from 'lucide-react';

export default function AdminProducts({ filterOutOfStock = false, onClearFilter = null }) {
  const { lang, formatPrice, apiBase, apiHost } = useApp();
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);

  // DR PHONE Wholesale Supplier Sync states
  const [syncMarkup, setSyncMarkup] = useState(45);
  const [syncPasscode, setSyncPasscode] = useState('Drphone123');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [drPhoneStatus, setDrPhoneStatus] = useState(null);
  // Multi-Supplier Sync states
  const [supplierSources, setSupplierSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourcePasscode, setNewSourcePasscode] = useState('');
  const [newSourceMarkup, setNewSourceMarkup] = useState(45);
  const [newSourceType, setNewSourceType] = useState('drphone_catalog');
  const [savingSource, setSavingSource] = useState(false);

  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [costPriceUsd, setCostPriceUsd] = useState('');
  const [oldPriceUsd, setOldPriceUsd] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [stock, setStock] = useState('10');
  const [selectedFile, setSelectedFile] = useState(null);
  const [colorsInput, setColorsInput] = useState('');
  const [sizesList, setSizesList] = useState([{ name: '', price: '', type: 'absolute' }]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${apiBase}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBase}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMerchants = async () => {
    try {
      const res = await fetch(`${apiBase}/merchants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMerchants(data);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const fetchSupplierSources = async () => {
    try {
      const res = await fetch(`${apiBase}/supplier-sources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupplierSources(data);
        if (data.length > 0) {
          setSelectedSourceId(prev => {
            const current = data.find(s => String(s.id) === String(prev));
            if (current) {
              setSyncMarkup(current.markup_percent !== undefined ? current.markup_percent : 45);
              setSyncPasscode(current.passcode || '');
              return current.id;
            } else {
              setSyncMarkup(data[0].markup_percent !== undefined ? data[0].markup_percent : 45);
              setSyncPasscode(data[0].passcode || '');
              return data[0].id;
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching supplier sources:', err);
    }
  };

  const handleSelectSource = (id) => {
    setSelectedSourceId(id);
    const source = supplierSources.find(s => String(s.id) === String(id));
    if (source) {
      setSyncMarkup(source.markup_percent !== undefined ? source.markup_percent : 45);
      setSyncPasscode(source.passcode || '');
    }
    setSyncResult(null);
    setSyncError(null);
  };

  const handleSaveSource = async (e) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    setSavingSource(true);

    try {
      const url = editingSource 
        ? `${apiBase}/supplier-sources/${editingSource.id}`
        : `${apiBase}/supplier-sources`;
      const method = editingSource ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSourceName.trim(),
          url: newSourceUrl.trim(),
          passcode: newSourcePasscode.trim(),
          markup_percent: Number(newSourceMarkup) || 45,
          sync_type: newSourceType
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setShowSourceModal(false);
        await fetchSupplierSources();
        setSelectedSourceId(saved.id);
        setSyncMarkup(saved.markup_percent);
        setSyncPasscode(saved.passcode);
      } else {
        const err = await res.json();
        alert(err.error_ar || err.error || 'Failed to save supplier source');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSource(false);
    }
  };

  const handleDeleteSource = async (source) => {
    if (source.is_default) {
      alert(lang === 'ar' ? 'لا يمكن حذف المصدر الافتراضي الرئيسي' : 'Cannot delete default source');
      return;
    }
    if (!window.confirm(lang === 'ar' ? `هل أنت متأكد من حذف موقع "${source.name}"؟` : `Delete "${source.name}"?`)) return;

    try {
      const res = await fetch(`${apiBase}/supplier-sources/${source.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSupplierSources();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDrPhoneStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/drphone/status`);
      if (res.ok) {
        const data = await res.json();
        setDrPhoneStatus(data);
      }
    } catch (err) {
      console.error('Error fetching DR PHONE status:', err);
    }
  };

  const handleTriggerSync = async (sourceToSync = null) => {
    const curSource = sourceToSync || supplierSources.find(s => String(s.id) === String(selectedSourceId));
    const targetSourceId = curSource ? curSource.id : selectedSourceId;
    const targetMarkup = curSource && curSource.markup_percent !== undefined ? curSource.markup_percent : syncMarkup;
    const targetPasscode = curSource && curSource.passcode !== undefined ? curSource.passcode : syncPasscode;
    const sourceName = curSource ? curSource.name : (lang === 'ar' ? 'المورد' : 'Supplier');

    const confirmMsg = lang === 'ar'
      ? `هل تريد تأكيد جلب وتحديث منتجات "${sourceName}" وتنزيل الصور بزيادة هامش ربح (+${targetMarkup}%)؟`
      : `Are you sure you want to sync products from "${sourceName}" with +${targetMarkup}% markup?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const syncEndpoint = targetSourceId 
        ? `${apiBase}/supplier-sources/${targetSourceId}/sync`
        : `${apiBase}/drphone/sync`;

      const res = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          passcode: targetPasscode,
          markupPercent: Number(targetMarkup) || 45
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult(data);
        fetchProducts();
        fetchCategories();
        fetchDrPhoneStatus();
        fetchSupplierSources();
      } else {
        setSyncError(data.error || (lang === 'ar' ? 'فشلت عملية المزامنة. يرجى التأكد من الرابط والرمز السري' : 'Sync failed. Check URL and passcode'));
      }
    } catch (err) {
      setSyncError(err.message || (lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Server connection error'));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchMerchants();
    fetchDrPhoneStatus();
    fetchSupplierSources();
  }, [token]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameAr || !nameEn || !priceUsd) return;

    const formData = new FormData();
    formData.append('name_ar', nameAr);
    formData.append('name_en', nameEn);
    formData.append('description_ar', descAr);
    formData.append('description_en', descEn);
    formData.append('price_usd', priceUsd);
    formData.append('cost_price_usd', costPriceUsd || '0.0');
    formData.append('old_price_usd', oldPriceUsd || 'null');
    formData.append('category_id', categoryId || 'null');
    formData.append('merchant_id', merchantId || 'null');
    formData.append('stock', stock);
    if (selectedFile) {
      formData.append('product_image', selectedFile);
    }
    const colorsArray = colorsInput ? colorsInput.split(',').map(c => c.trim()).filter(Boolean) : [];
    const sizesArray = sizesList
      .filter(opt => opt && opt.name && opt.name.trim())
      .map(opt => {
        const val = parseFloat(opt.price);
        return {
          name: opt.name.trim(),
          price: !isNaN(val) ? val : (parseFloat(priceUsd) || 0)
        };
      });
    formData.append('colors', JSON.stringify(colorsArray));
    formData.append('sizes', JSON.stringify(sizesArray));

    const url = isEditing 
      ? `${apiBase}/products/${editingId}`
      : `${apiBase}/products`;

    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        resetForm();
        fetchProducts();
      }
    } catch (err) {
      console.error('Submit product error:', err);
    }
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setEditingId(product.id);
    setNameAr(product.name_ar);
    setNameEn(product.name_en);
    setDescAr(product.description_ar || '');
    setDescEn(product.description_en || '');
    setPriceUsd(product.price_usd);
    setCostPriceUsd(product.cost_price_usd || '0.0');
    setOldPriceUsd(product.old_price_usd || '');
    setCategoryId(product.category_id || '');
    setMerchantId(product.merchant_id || '');
    setStock(product.stock);
    setSelectedFile(null);
    setColorsInput((product.colors || []).join(', '));
    let parsedSizes = [];
    if (product.sizes) {
      let rawSizes = product.sizes;
      if (typeof rawSizes === 'string') {
        try { rawSizes = JSON.parse(rawSizes); } catch (e) { rawSizes = []; }
      }
      if (Array.isArray(rawSizes)) {
        parsedSizes = rawSizes.map(s => {
          if (typeof s === 'object' && s !== null) {
            return {
              name: s.name || '',
              price: s.price !== undefined && s.price !== null ? String(s.price) : '',
              type: 'absolute'
            };
          }
          const str = String(s);
          const priceRegex = /\(\s*([+-]?\s*\$?\s*[0-9.]+)\s*\$?_?\)/;
          const match = str.match(priceRegex);
          if (match) {
            const name = str.replace(/\s*\(\s*[+-]?\s*\$?\s*[0-9.]+\s*\$?_?\)/g, '').trim();
            const priceVal = match[1].replace(/[+\-$]/g, '').trim();
            let type = 'absolute';
            if (str.includes('+')) type = 'relative';
            else if (str.includes('-')) type = 'negative';
            return { name, price: priceVal, type };
          }
          return { name: str, price: '', type: 'absolute' };
        });
      }
    }
    setSizesList(parsedSizes.length > 0 ? parsedSizes : [{ name: '', price: '', type: 'absolute' }]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`${apiBase}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setNameAr('');
    setNameEn('');
    setDescAr('');
    setDescEn('');
    setPriceUsd('');
    setCostPriceUsd('');
    setOldPriceUsd('');
    setCategoryId('');
    setMerchantId('');
    setStock('10');
    setSelectedFile(null);
    setColorsInput('');
    setSizesList([{ name: '', price: '', type: 'absolute' }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
            {/* Multi-Supplier Website Synchronization Card */}
      {(() => {
        const currentSource = supplierSources.find(s => String(s.id) === String(selectedSourceId)) || supplierSources[0];

        return (
          <div className="dashboard-card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(147, 51, 234, 0.05) 100%)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header with Title, Metrics, and Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  flexShrink: 0
                }}>
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {lang === 'ar' 
                      ? 'جدول مواقع الموردين والمزامنة التلقائية' 
                      : 'Supplier Websites Directory & Catalog Sync'}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {lang === 'ar' 
                      ? 'قائمة بجميع مواقع الموردين المربوطة لمتابعة حالتها وتحديث منتجاتها وأسعارها بضغطة زر'
                      : 'View and manage all connected supplier sites, monitor sync status, and update catalog in one click'}
                  </p>
                </div>
              </div>

              {/* Action and Metrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                    {lang === 'ar' ? 'إجمالي المنتجات' : 'Total Items'}
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#2563eb' }}>
                    {supplierSources.reduce((acc, s) => acc + (parseInt(s.products_count) || 0), 0) || (drPhoneStatus ? drPhoneStatus.drphoneProductsCount : 0)}
                  </strong>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                    {lang === 'ar' ? 'المواقع المربوطة' : 'Connected Sites'}
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#8b5cf6' }}>
                    {supplierSources.length}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingSource(null);
                    setNewSourceName('');
                    setNewSourceUrl('');
                    setNewSourcePasscode('');
                    setNewSourceMarkup(45);
                    setNewSourceType('drphone_catalog');
                    setShowSourceModal(true);
                  }}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Plus size={18} />
                  <span>{lang === 'ar' ? '+ إضافة موقع مورد جديد' : '+ Add New Supplier Site'}</span>
                </button>
              </div>
            </div>

            {/* Sync Success / Error Alert */}
            {syncResult && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid #16a34a',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem'
              }}>
                <CheckCircle2 size={20} />
                <div>
                  <strong>{lang === 'ar' ? 'اكتملت المزامنة بنجاح!' : 'Sync completed successfully!'}</strong>{' '}
                  {lang === 'ar'
                    ? `تمت معالجة ${syncResult.totalProcessed} منتج (تحديث: ${syncResult.updatedCount}، جديد: ${syncResult.insertedCount}) بنسبة زيادة ${syncResult.markupPercent}% من موقع ${syncResult.targetUrl}.`
                    : `Processed ${syncResult.totalProcessed} items (${syncResult.updatedCount} updated, ${syncResult.insertedCount} inserted) with +${syncResult.markupPercent}% markup from ${syncResult.targetUrl}.`}
                </div>
              </div>
            )}

            {syncError && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem'
              }}>
                <AlertCircle size={20} />
                <div>{syncError}</div>
              </div>
            )}

            {/* Primary Supplier Websites Table */}
            <div style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', backgroundColor: 'var(--bg-primary)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'start' }}>{lang === 'ar' ? 'الموقع والمورد' : 'Supplier / Site'}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'start' }}>{lang === 'ar' ? 'الرابط الإلكتروني' : 'Website URL'}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>{lang === 'ar' ? 'نوع الربط' : 'Integration Type'}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>{lang === 'ar' ? 'هامش الربح' : 'Markup Margin'}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>{lang === 'ar' ? 'المنتجات المستوردة' : 'Imported Products'}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'start' }}>{lang === 'ar' ? 'آخر مزامنة وتحديث' : 'Last Sync & Status'}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>{lang === 'ar' ? 'إجراء وتحديث فوري' : 'Sync & Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierSources.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 10px', display: 'block' }} />
                          <span>{lang === 'ar' ? 'جاري تحميل قائمة مواقع الموردين...' : 'Loading supplier sites directory...'}</span>
                        </td>
                      </tr>
                    ) : (
                      supplierSources.map((source) => {
                        const isCurrentSelected = String(source.id) === String(selectedSourceId);
                        const isThisSourceSyncing = isSyncing && isCurrentSelected;

                        return (
                          <tr 
                            key={source.id} 
                            style={{ 
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isThisSourceSyncing ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                          >
                            {/* Supplier Name & Default Badge */}
                            <td style={{ padding: '14px 16px', fontWeight: '800' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Globe size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.95rem' }}>{source.name}</span>
                                {source.is_default ? (
                                  <span style={{ fontSize: '0.7rem', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                                    {lang === 'ar' ? '★ الرئيسي' : '★ Default'}
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Website URL */}
                            <td style={{ padding: '14px 16px' }}>
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title={lang === 'ar' ? 'فتح الموقع بتبويب جديد' : 'Open website in new tab'}
                                style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                              >
                                <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', display: 'inline-block' }}>
                                  {source.url.replace(/^https?:\/\//, '')}
                                </span>
                                <ExternalLink size={14} />
                              </a>
                            </td>

                            {/* Type */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '4px 12px', 
                                borderRadius: '14px',
                                fontWeight: '800',
                                backgroundColor: source.sync_type === 'shopify_json' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                color: source.sync_type === 'shopify_json' ? '#059669' : '#2563eb'
                              }}>
                                {source.sync_type === 'shopify_json' ? 'Shopify Store' : (lang === 'ar' ? 'بوابة جملة خاصة' : 'Wholesale Portal')}
                              </span>
                            </td>

                            {/* Markup */}
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '800', color: '#16a34a', fontSize: '1rem' }}>
                              +{source.markup_percent}%
                            </td>

                            {/* Products Count */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span style={{ 
                                backgroundColor: 'var(--bg-secondary)', 
                                padding: '5px 14px', 
                                borderRadius: '8px', 
                                fontWeight: '800',
                                fontSize: '0.95rem',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                              }}>
                                {source.products_count || 0}
                              </span>
                            </td>

                            {/* Last Sync Info */}
                            <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                              {source.last_sync_time ? (
                                <div>
                                  <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{source.last_sync_time}</div>
                                  <div style={{ color: '#16a34a', marginTop: '2px', fontSize: '0.76rem' }}>{source.last_sync_status || (lang === 'ar' ? 'محدث' : 'Updated')}</div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>{lang === 'ar' ? 'لم تتم المزامنة بعد' : 'Not synced yet'}</span>
                              )}
                            </td>

                            {/* Actions & Instant Sync Button */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerSync(source)}
                                  disabled={isSyncing}
                                  title={lang === 'ar' ? `تحديث ومزامنة منتجات ${source.name} الآن (+${source.markup_percent}%)` : `Sync ${source.name} now (+${source.markup_percent}%)`}
                                  style={{
                                    padding: '8px 18px',
                                    backgroundColor: isThisSourceSyncing ? '#94a3b8' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: isThisSourceSyncing ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.35)',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <RefreshCw size={14} className={isThisSourceSyncing ? 'spin-anim' : ''} />
                                  <span>{isThisSourceSyncing ? (lang === 'ar' ? 'جاري التحديث...' : 'Syncing...') : (lang === 'ar' ? 'تحديث الآن' : 'Sync Now')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSource(source);
                                    setNewSourceName(source.name);
                                    setNewSourceUrl(source.url);
                                    setNewSourcePasscode(source.passcode || '');
                                    setNewSourceMarkup(source.markup_percent !== undefined ? source.markup_percent : 45);
                                    setNewSourceType(source.sync_type || 'drphone_catalog');
                                    setShowSourceModal(true);
                                  }}
                                  title={lang === 'ar' ? 'تعديل بيانات الموقع' : 'Edit site'}
                                  style={{
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: '#2563eb',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit3 size={15} />
                                </button>

                                {!source.is_default && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSource(source)}
                                    title={lang === 'ar' ? 'حذف هذا الموقع' : 'Delete site'}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: '#ef4444',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '8px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal for Adding / Editing Supplier Source Website */}
      {showSourceModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setShowSourceModal(false)}>
          <div 
            className="animate-scale"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={22} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {editingSource 
                    ? (lang === 'ar' ? 'تعديل بيانات موقع المورد' : 'Edit Supplier Website') 
                    : (lang === 'ar' ? 'إضافة موقع مورد جديد للجلب' : 'Add New Supplier Website')}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSourceModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSource} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">{lang === 'ar' ? 'اسم الموقع / المورد *' : 'Site / Supplier Name *'}</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder={lang === 'ar' ? 'مثال: متجر الإلكترونيات أو DR PHONE' : 'e.g. Electronics Wholesaler'}
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">{lang === 'ar' ? 'رابط الموقع الإلكتروني (URL) *' : 'Website URL *'}</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="https://example.com"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">{lang === 'ar' ? 'نوع الموقع / آلية الجلب' : 'Sync Type / Source Mechanism'}</label>
                <select
                  className="input-field"
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                >
                  <option value="drphone_catalog">
                    {lang === 'ar' ? 'موقع جملة بكلمة مرور (Wholesale Passcode Portal / DR PHONE)' : 'Wholesale Passcode Portal (DR PHONE compatible)'}
                  </option>
                  <option value="shopify_json">
                    {lang === 'ar' ? 'متجر شوبيفاي (Shopify / products.json)' : 'Shopify Store (products.json)'}
                  </option>
                  <option value="open_json">
                    {lang === 'ar' ? 'رابط كتالوج مباشر مفتوح (Direct Catalog API)' : 'Direct Catalog API'}
                  </option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">{lang === 'ar' ? 'رمز الدخول (Passcode إن وجد)' : 'Passcode / Token (Optional)'}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Drphone123"
                    value={newSourcePasscode}
                    onChange={(e) => setNewSourcePasscode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">{lang === 'ar' ? 'نسبة هامش الربح %' : 'Markup Profit Margin %'}</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    className="input-field"
                    value={newSourceMarkup}
                    onChange={(e) => setNewSourceMarkup(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={savingSource}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: savingSource ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingSource ? '...' : (editingSource ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إضافة الموقع' : 'Add Website'))}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSourceModal(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Product Form */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>
          {isEditing 
            ? (lang === 'ar' ? 'تعديل بيانات المنتج' : 'Edit Product Details') 
            : (lang === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')}
        </h4>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label className="input-label">الاسم (العربية) *</label>
            <input type="text" required className="input-field" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Name (English) *</label>
            <input type="text" required className="input-field" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div>
            <label className="input-label">الوصف (العربية)</label>
            <input type="text" className="input-field" value={descAr} onChange={(e) => setDescAr(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Description (English)</label>
            <input type="text" className="input-field" value={descEn} onChange={(e) => setDescEn(e.target.value)} />
          </div>
          <div>
            <label className="input-label">سعر البيع (Selling Price - USD) *</label>
            <input type="number" step="0.01" required className="input-field" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} />
          </div>
          <div>
            <label className="input-label">سعر التكلفة (Cost Price - USD) *</label>
            <input type="number" step="0.01" required className="input-field" value={costPriceUsd} onChange={(e) => setCostPriceUsd(e.target.value)} />
          </div>
          <div>
            <label className="input-label">السعر القديم المشطوب (USD - إن وجد)</label>
            <input type="number" step="0.01" className="input-field" value={oldPriceUsd} onChange={(e) => setOldPriceUsd(e.target.value)} />
          </div>
          <div>
            <label className="input-label">التصنيف (Category)</label>
            <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">-- اختر التصنيف --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'ar' ? `${c.name_ar} ${c.parent_name_ar ? `(${c.parent_name_ar})` : ''}` : `${c.name_en} ${c.parent_name_en ? `(${c.parent_name_en})` : ''}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">التاجر / المورد (Supplier Merchant)</label>
            <select className="input-field" value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
              <option value="">-- اختر المورد --</option>
              {merchants.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.company ? `(${m.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">المخزون المتوفر (Stock)</label>
            <input type="number" required className="input-field" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div>
            <label className="input-label">{lang === 'ar' ? 'الألوان المتاحة (مفصولة بفاصلة)' : 'Available Colors (comma-separated)'}</label>
            <input type="text" className="input-field" placeholder={lang === 'ar' ? 'مثال: أحمر, أزرق, أسود' : 'e.g. Red, Blue, Black'} value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', backgroundColor: 'var(--bg-secondary)', marginTop: '8px' }}>
            <span className="input-label" style={{ display: 'block', fontWeight: '700', fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {lang === 'ar' ? 'خيارات المنتج وتحديد الأسعار يدوياً (مثل الأحجام أو السعات)' : 'Product Options & Price Details (e.g. Sizes or Storage)'}
            </span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sizesList.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Option Name */}
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <input 
                      type="text" 
                      placeholder={lang === 'ar' ? 'اسم الخيار (مثال: 512GB أو 5L)' : 'Option Name (e.g. 512GB or 5L)'} 
                      className="input-field" 
                      style={{ margin: 0 }}
                      value={item.name} 
                      onChange={(e) => {
                        const newList = [...sizesList];
                        newList[index].name = e.target.value;
                        setSizesList(newList);
                      }} 
                    />
                  </div>

                  {/* Price Type */}
                  <div style={{ width: '160px' }}>
                    <select 
                      className="input-field" 
                      style={{ margin: 0, padding: '8px' }}
                      value={item.type} 
                      onChange={(e) => {
                        const newList = [...sizesList];
                        newList[index].type = e.target.value;
                        setSizesList(newList);
                      }}
                    >
                      <option value="absolute">{lang === 'ar' ? 'سعر يدوي مباشر ($)' : 'Absolute Price ($)'}</option>
                      <option value="relative">{lang === 'ar' ? 'زيادة نسبية (+)' : 'Price Increase (+)'}</option>
                      <option value="negative">{lang === 'ar' ? 'خصم نسبي (-)' : 'Price Decrease (-)'}</option>
                    </select>
                  </div>

                  {/* Price Value */}
                  <div style={{ width: '120px' }}>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder={lang === 'ar' ? 'السعر/الفارق' : 'Price/Offset'} 
                      className="input-field" 
                      style={{ margin: 0 }}
                      value={item.price} 
                      onChange={(e) => {
                        const newList = [...sizesList];
                        newList[index].price = e.target.value;
                        setSizesList(newList);
                      }} 
                    />
                  </div>

                  {/* Delete Button */}
                  <button 
                    type="button" 
                    onClick={() => {
                      const newList = sizesList.filter((_, i) => i !== index);
                      setSizesList(newList.length > 0 ? newList : [{ name: '', price: '', type: 'absolute' }]);
                    }}
                    style={{
                      border: 'none',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {lang === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>

            {/* Add Option Button */}
            <button 
              type="button" 
              onClick={() => setSizesList([...sizesList, { name: '', price: '', type: 'absolute' }])}
              style={{
                marginTop: '12px',
                padding: '6px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {lang === 'ar' ? '+ إضافة خيار جديد' : '+ Add New Option'}
            </button>
          </div>
          <div style={{ gridColumn: 'span 1' }}>
            <label className="input-label">صورة المنتج (Product Image)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="input-field" style={{ padding: '6px' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="input-field" style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
              {isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="input-field" style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      {filterOutOfStock && (
        <div className="animate-scale" style={{
          backgroundColor: 'rgba(217,119,6,0.1)',
          border: '1px solid #d97706',
          padding: '12px 20px',
          borderRadius: '12px',
          color: '#d97706',
          fontWeight: '700',
          fontSize: '0.95rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>{lang === 'ar' ? 'عرض السلع المنتهية من المخزون فقط' : 'Showing out of stock items only'}</span>
          </div>
          {onClearFilter && (
            <button
              onClick={onClearFilter}
              style={{
                backgroundColor: '#d97706',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {lang === 'ar' ? 'عرض جميع المنتجات' : 'Show All Products'}
            </button>
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="dashboard-card" style={{ overflowX: 'auto', padding: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px' }}>قائمة المنتجات الحالية</h4>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              <th style={{ padding: '10px', textAlign: 'start' }}>الصورة</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>الاسم</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>التصنيف</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>المورد</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>الألوان</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>القياسات</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>سعر البيع</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>سعر التكلفة</th>
              <th style={{ padding: '10px', textAlign: 'start' }}>المخزون</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {(filterOutOfStock ? products.filter(p => p.stock === 0) : products).map((p) => {
              const imageUrl = p.image_url 
                ? (p.image_url.startsWith('http') || p.image_url.startsWith('data:') ? p.image_url : `${apiHost}${p.image_url}`)
                : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=50&q=80';
              
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '10px' }}>
                    <img src={imageUrl} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                  </td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>
                    {lang === 'ar' ? p.name_ar : p.name_en}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-light)' }}>
                    {lang === 'ar' ? p.category_name_ar : p.category_name_en}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-light)' }}>
                    {p.merchant_name || '-'}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-light)', fontSize: '0.8rem' }}>
                    {p.colors && p.colors.length > 0 ? p.colors.join(', ') : '-'}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-light)', fontSize: '0.8rem' }}>
                    {p.sizes && p.sizes.length > 0 ? p.sizes.join(', ') : '-'}
                  </td>
                  <td style={{ padding: '10px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                    {formatPrice(p.price_usd)}
                  </td>
                  <td style={{ padding: '10px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {formatPrice(p.cost_price_usd || 0)}
                  </td>
                  <td style={{ padding: '10px', color: p.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                    {p.stock}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(p)} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-blue)', cursor: 'pointer' }}>
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
