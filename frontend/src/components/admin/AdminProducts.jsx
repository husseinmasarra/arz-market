import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit3, Image, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Plus, Globe, ExternalLink, X, Search, Filter, Eye, ChevronLeft, ChevronRight, ArrowUpDown, MessageSquare } from 'lucide-react';
import WhatsAppProductImporter from './WhatsAppProductImporter';

export default function AdminProducts({ filterOutOfStock = false, onClearFilter = null }) {
  const { lang, formatPrice, apiBase, apiHost } = useApp();
  const { token } = useAuth();

  const [activeSection, setActiveSection] = useState('whatsapp'); // 'whatsapp' | 'manual' | 'suppliers'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);

  // Filter & Search states for Products List
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOnlyNew, setFilterOnlyNew] = useState(false);
  const [filterOnlyOutOfStock, setFilterOnlyOutOfStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // default: newest first so newly fetched products appear at the top
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;

  const handleFilterBySource = (sourceName) => {
    setFilterSupplier(prev => prev === sourceName ? '' : sourceName);
    setFilterOnlyNew(false);
    setFilterOnlyOutOfStock(false);
    setCurrentPage(1);
    setTimeout(() => {
      const el = document.getElementById('admin-products-table');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleViewNewArrivals = (sourceName) => {
    setFilterSupplier(sourceName || '');
    setFilterOnlyNew(true);
    setFilterOnlyOutOfStock(false);
    setCurrentPage(1);
    setTimeout(() => {
      const el = document.getElementById('admin-products-table');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleViewOutOfStock = (sourceName) => {
    setFilterSupplier(sourceName || '');
    setFilterOnlyOutOfStock(true);
    setFilterOnlyNew(false);
    setCurrentPage(1);
    setTimeout(() => {
      const el = document.getElementById('admin-products-table');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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
  const [newSourceWhatsapp, setNewSourceWhatsapp] = useState('');
  const [newSourceEmail, setNewSourceEmail] = useState('');
  const [newSourceNotes, setNewSourceNotes] = useState('');
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
          sync_type: newSourceType,
          whatsapp_number: newSourceWhatsapp.trim(),
          email: newSourceEmail.trim(),
          shipping_notes: newSourceNotes.trim()
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
    setActiveSection('manual');
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

  // Filter and sort products
  const filteredProducts = products.filter(p => {
    if ((filterOutOfStock || filterOnlyOutOfStock) && p.stock > 0) return false;
    if (filterOnlyNew && p.is_new_arrival !== 1) return false;
    if (filterSupplier && p.merchant_name !== filterSupplier) return false;
    if (filterCategory && String(p.category_id) !== String(filterCategory)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameAr = (p.name_ar || '').toLowerCase();
      const nameEn = (p.name_en || '').toLowerCase();
      const descAr = (p.description_ar || '').toLowerCase();
      const descEn = (p.description_en || '').toLowerCase();
      const catAr = (p.category_name_ar || '').toLowerCase();
      const catEn = (p.category_name_en || '').toLowerCase();
      const merchant = (p.merchant_name || '').toLowerCase();
      if (!nameAr.includes(q) && !nameEn.includes(q) && !descAr.includes(q) && !descEn.includes(q) && !catAr.includes(q) && !catEn.includes(q) && !merchant.includes(q)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.id || 0) - (a.id || 0);
    } else if (sortBy === 'oldest') {
      return (a.id || 0) - (b.id || 0);
    } else if (sortBy === 'price_asc') {
      return (Number(a.price_usd) || 0) - (Number(b.price_usd) || 0);
    } else if (sortBy === 'price_desc') {
      return (Number(b.price_usd) || 0) - (Number(a.price_usd) || 0);
    } else if (sortBy === 'stock') {
      return (Number(b.stock) || 0) - (Number(a.stock) || 0);
    } else if (sortBy === 'name') {
      const nameA = (lang === 'ar' ? a.name_ar : a.name_en) || '';
      const nameB = (lang === 'ar' ? b.name_ar : b.name_en) || '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedProducts = filteredProducts.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  // Collect unique suppliers present in products
  const availableSuppliers = Array.from(
    new Set(products.map(p => p.merchant_name).filter(Boolean))
  );

  // ESC key closes the supplier source modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showSourceModal) {
        setShowSourceModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSourceModal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Quick Mode Switcher Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <button
          type="button"
          onClick={() => setActiveSection('whatsapp')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            backgroundColor: activeSection === 'whatsapp' ? '#059669' : 'var(--bg-secondary)',
            color: activeSection === 'whatsapp' ? '#ffffff' : 'var(--text-primary)',
            border: activeSection === 'whatsapp' ? '1px solid #059669' : '1px solid var(--border-color)',
            boxShadow: activeSection === 'whatsapp' ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>💬</span>
          <span>{lang === 'ar' ? 'استيراد فوري من واتساب (WhatsApp)' : 'WhatsApp Fast Import'}</span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: '6px',
            background: activeSection === 'whatsapp' ? 'rgba(255,255,255,0.25)' : '#d1fae5',
            color: activeSection === 'whatsapp' ? '#ffffff' : '#065f46',
            fontWeight: '900'
          }}>
            {lang === 'ar' ? 'الأسرع' : 'Fast'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('manual')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            backgroundColor: activeSection === 'manual' ? '#2563eb' : 'var(--bg-secondary)',
            color: activeSection === 'manual' ? '#ffffff' : 'var(--text-primary)',
            border: activeSection === 'manual' ? '1px solid #2563eb' : '1px solid var(--border-color)',
            boxShadow: activeSection === 'manual' ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
          }}
        >
          <Plus size={16} />
          <span>{lang === 'ar' ? 'إضافة منتج يدوي' : 'Manual Product Form'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('suppliers')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            backgroundColor: activeSection === 'suppliers' ? '#7c3aed' : 'var(--bg-secondary)',
            color: activeSection === 'suppliers' ? '#ffffff' : 'var(--text-primary)',
            border: activeSection === 'suppliers' ? '1px solid #7c3aed' : '1px solid var(--border-color)',
            boxShadow: activeSection === 'suppliers' ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none'
          }}
        >
          <Globe size={16} />
          <span>{lang === 'ar' ? 'مواقع الموردين والمزامنة' : 'Supplier Websites & Sync'}</span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: '6px',
            background: activeSection === 'suppliers' ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
            color: activeSection === 'suppliers' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: '800'
          }}>
            {supplierSources.length}
          </span>
        </button>
      </div>

      {/* WhatsApp Smart Product Importer */}
      {activeSection === 'whatsapp' && (
        <WhatsAppProductImporter
          categories={categories}
          merchants={merchants}
          onProductCreated={() => {
            fetchProducts();
            fetchCategories();
          }}
          apiBase={apiBase}
        />
      )}

      {/* Multi-Supplier Website Synchronization Card */}
      {activeSection === 'suppliers' && (() => {
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
                    setNewSourceWhatsapp('');
                    setNewSourceEmail('');
                    setNewSourceNotes('');
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
                marginBottom: '18px',
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(22, 163, 74, 0.12)',
                border: '1px solid #16a34a',
                color: '#15803d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                fontSize: '0.92rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '2px' }}>
                      {lang === 'ar' ? 'اكتملت المزامنة بنجاح!' : 'Sync completed successfully!'}
                    </strong>
                    <div>
                      {lang === 'ar'
                        ? `نتائج السحب: أُضيف (${syncResult.insertedCount || 0}) صنف جديد، وحُدّث (${syncResult.updatedCount || 0}) صنف، ونفد (${syncResult.outOfStockCount || 0}) صنف تم إزالته من موقع المورد.`
                        : `Sync results: (${syncResult.insertedCount || 0}) new items added, (${syncResult.updatedCount || 0}) updated, (${syncResult.outOfStockCount || 0}) marked out of stock.`}
                    </div>
                  </div>
                </div>

                {Number(syncResult.insertedCount) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const matched = supplierSources.find(s => s.url === syncResult.targetUrl || syncResult.targetUrl?.includes(s.url));
                      handleViewNewArrivals(matched ? matched.name : '');
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Eye size={15} />
                    <span>{lang === 'ar' ? `عرض الـ ${syncResult.insertedCount} منتج الجديدة الآن` : `View ${syncResult.insertedCount} New Products`}</span>
                  </button>
                )}
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
                      <th style={{ padding: '12px 16px', textAlign: 'start' }}>{lang === 'ar' ? 'نتائج السحب وآخر تحديث' : 'Sync Breakdown & Status'}</th>
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
                                    {lang === 'ar' ? 'الرئيسي' : 'Default'}
                                  </span>
                                ) : null}
                              </div>
                              {source.whatsapp_number && (
                                <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', direction: 'ltr' }}>
                                  <span>{source.whatsapp_number}</span>
                                </div>
                              )}
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
                                backgroundColor: source.sync_type === 'shopify_json' ? 'rgba(16, 185, 129, 0.12)' : (source.sync_type === 'deal_scraper' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)'),
                                color: source.sync_type === 'shopify_json' ? '#059669' : (source.sync_type === 'deal_scraper' ? '#d97706' : '#2563eb')
                              }}>
                                {source.sync_type === 'shopify_json' 
                                  ? 'Shopify Store' 
                                  : (source.sync_type === 'deal_scraper' 
                                      ? (lang === 'ar' ? 'منصة Deal.com.lb' : 'Deal.com.lb') 
                                      : (lang === 'ar' ? 'بوابة جملة خاصة' : 'Wholesale Portal')
                                    )
                                }
                              </span>
                            </td>

                            {/* Markup */}
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '800', color: '#16a34a', fontSize: '1rem' }}>
                              +{source.markup_percent}%
                            </td>

                            {/* Products Count & View Button */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleFilterBySource(source.name)}
                                title={lang === 'ar' ? `عرض الـ ${source.products_count || 0} منتج الخاصة بـ ${source.name}` : `View ${source.products_count || 0} products from ${source.name}`}
                                style={{ 
                                  backgroundColor: filterSupplier === source.name ? '#2563eb' : 'var(--bg-secondary)', 
                                  color: filterSupplier === source.name ? 'white' : 'var(--text-primary)',
                                  padding: '6px 14px', 
                                  borderRadius: '8px', 
                                  fontWeight: '800',
                                  fontSize: '0.88rem',
                                  border: filterSupplier === source.name ? '2px solid #1d4ed8' : '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s',
                                  boxShadow: filterSupplier === source.name ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none'
                                }}
                              >
                                <Eye size={14} />
                                <span>{source.products_count || 0}</span>
                                <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>({lang === 'ar' ? 'عرض' : 'View'})</span>
                              </button>
                            </td>

                            {/* Sync Breakdown & Status */}
                            <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                              {source.last_sync_time ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                    {source.last_sync_time}
                                  </div>

                                  {/* Sync Breakdown Badges */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {/* New items count */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ 
                                        backgroundColor: '#dcfce7', 
                                        color: '#15803d', 
                                        padding: '2px 8px', 
                                        borderRadius: '6px', 
                                        fontWeight: '800',
                                        fontSize: '0.78rem'
                                      }}>
                                        +{source.last_sync_inserted || source.new_arrivals_count || 0} {lang === 'ar' ? 'جديد تم سحبه' : 'new imported'}
                                      </span>

                                      {(Number(source.last_sync_inserted) > 0 || Number(source.new_arrivals_count) > 0) && (
                                        <button
                                          type="button"
                                          onClick={() => handleViewNewArrivals(source.name)}
                                          title={lang === 'ar' ? 'عرض المنتجات الجديدة المسحوبة من هذا الموقع فقط' : 'View new products from this site only'}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#15803d',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            fontWeight: '800',
                                            fontSize: '0.75rem',
                                            padding: '0 2px'
                                          }}
                                        >
                                          ({lang === 'ar' ? 'عرض الجديدة فقط' : 'View New Only'})
                                        </button>
                                      )}
                                    </div>

                                    {/* Updated items count */}
                                    {Number(source.last_sync_updated) > 0 && (
                                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                                        {source.last_sync_updated} {lang === 'ar' ? 'صنف تم تحديث سعره' : 'items price updated'}
                                      </div>
                                    )}

                                    {/* Out of stock count */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ 
                                        backgroundColor: (Number(source.last_sync_out_of_stock) > 0 || Number(source.out_of_stock_count) > 0) ? '#fee2e2' : 'var(--bg-secondary)', 
                                        color: (Number(source.last_sync_out_of_stock) > 0 || Number(source.out_of_stock_count) > 0) ? '#b91c1c' : 'var(--text-muted)', 
                                        padding: '2px 8px', 
                                        borderRadius: '6px', 
                                        fontWeight: '700',
                                        fontSize: '0.75rem'
                                      }}>
                                        {source.last_sync_out_of_stock || source.out_of_stock_count || 0} {lang === 'ar' ? 'أُزيل / نفد من المخزون' : 'out of stock / removed'}
                                      </span>

                                      {(Number(source.last_sync_out_of_stock) > 0 || Number(source.out_of_stock_count) > 0) && (
                                        <button
                                          type="button"
                                          onClick={() => handleViewOutOfStock(source.name)}
                                          title={lang === 'ar' ? 'عرض المنتجات المنتهية من هذا المورد' : 'View out-of-stock products from this supplier'}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#b91c1c',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            fontWeight: '800',
                                            fontSize: '0.75rem',
                                            padding: '0 2px'
                                          }}
                                        >
                                          ({lang === 'ar' ? 'عرض المنتهية' : 'View Out of Stock'})
                                        </button>
                                      )}
                                    </div>
                                  </div>
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
                                    setNewSourceWhatsapp(source.whatsapp_number || source.phone || '');
                                    setNewSourceEmail(source.email || '');
                                    setNewSourceNotes(source.shipping_notes || '');
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
                  <option value="deal_scraper">
                    {lang === 'ar' ? 'منصة الصفقات Deal.com.lb (Web Crawler / Scraper)' : 'Deal.com.lb Web Scraper'}
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

              {/* Dropshipping Contact Settings */}
              <div style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563eb' }}>
                  {lang === 'ar' ? 'بيانات التواصل للدروب شيبينغ (إرسال الطلبات للمورد)' : 'Dropshipping Dispatch Info'}
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="input-label" style={{ fontSize: '0.78rem' }}>
                      {lang === 'ar' ? 'رقم واتساب المورد *' : 'Supplier WhatsApp *'}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="+96171234567"
                      value={newSourceWhatsapp}
                      onChange={(e) => setNewSourceWhatsapp(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="input-label" style={{ fontSize: '0.78rem' }}>
                      {lang === 'ar' ? 'بريد المورد الإلكتروني' : 'Supplier Email'}
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="orders@supplier.com"
                      value={newSourceEmail}
                      onChange={(e) => setNewSourceEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label" style={{ fontSize: '0.78rem' }}>
                    {lang === 'ar' ? 'ملاحظات وتوجيهات الشحن للمورد' : 'Supplier Shipping Instructions'}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={lang === 'ar' ? 'مثال: الرجاء الشحن باسم أرز مارت COD' : 'e.g. Please ship under Arz-Mart COD'}
                    value={newSourceNotes}
                    onChange={(e) => setNewSourceNotes(e.target.value)}
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
      {(activeSection === 'manual' || isEditing) && (
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
      )}

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
            <span></span>
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

      {/* Products Table with Enhanced Search, Supplier Filter & Sorting */}
      <div id="admin-products-table" className="dashboard-card" style={{ padding: '24px' }}>
        
        {/* Header and Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
              {lang === 'ar' ? 'قائمة وإدارة المنتجات' : 'Products Directory'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              {lang === 'ar' 
                ? `عرض ${paginatedProducts.length} من إجمالي ${filteredProducts.length} منتج مطروح في المتجر`
                : `Showing ${paginatedProducts.length} of ${filteredProducts.length} total products`}
            </p>
          </div>

          {(filterSupplier || filterCategory || searchQuery.trim() || filterOutOfStock) && (
            <button
              type="button"
              onClick={() => {
                setFilterSupplier('');
                setFilterCategory('');
                setSearchQuery('');
                setCurrentPage(1);
                if (onClearFilter) onClearFilter();
              }}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <X size={14} />
              <span>{lang === 'ar' ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}</span>
            </button>
          )}
        </div>

        {/* Active Filter Banner */}
        {(filterSupplier || filterOnlyNew || filterOnlyOutOfStock) && (
          <div style={{
            backgroundColor: filterOnlyOutOfStock ? 'rgba(239, 68, 68, 0.08)' : filterOnlyNew ? 'rgba(22, 163, 74, 0.08)' : 'rgba(37, 99, 235, 0.08)',
            border: `1px solid ${filterOnlyOutOfStock ? '#ef4444' : filterOnlyNew ? '#16a34a' : '#3b82f6'}`,
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} color={filterOnlyOutOfStock ? '#dc2626' : filterOnlyNew ? '#16a34a' : '#2563eb'} />
              <div>
                <span style={{ fontWeight: '800', color: filterOnlyOutOfStock ? '#b91c1c' : filterOnlyNew ? '#15803d' : '#1d4ed8', fontSize: '0.95rem' }}>
                  {filterOnlyNew
                    ? (lang === 'ar' ? `تصفية نشطة: عرض الأصناف الجديدة المسحوبة بعد التحديث ${filterSupplier ? `لموقع [ ${filterSupplier} ]` : ''}` : `Active Filter: Showing New Products pulled after sync ${filterSupplier ? `from [ ${filterSupplier} ]` : ''}`)
                    : filterOnlyOutOfStock
                    ? (lang === 'ar' ? `تصفية نشطة: عرض المنتجات المنتهية من المخزون (Out of Stock / أُزيلت من المورد) ${filterSupplier ? `لـ [ ${filterSupplier} ]` : ''}` : `Active Filter: Showing Out of Stock / Removed items ${filterSupplier ? `from [ ${filterSupplier} ]` : ''}`)
                    : (lang === 'ar' ? `تصفية نشطة: عرض منتجات المورد [ ${filterSupplier} ]` : `Active Filter: Showing products from [ ${filterSupplier} ]`)}
                </span>
                <span style={{ 
                  backgroundColor: filterOnlyOutOfStock ? '#dc2626' : filterOnlyNew ? '#16a34a' : '#2563eb', 
                  color: 'white', 
                  padding: '2px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.78rem', 
                  fontWeight: '800',
                  marginRight: '8px',
                  marginLeft: '8px'
                }}>
                  {filteredProducts.length} {lang === 'ar' ? 'منتج' : 'items'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setFilterSupplier(''); setFilterOnlyNew(false); setFilterOnlyOutOfStock(false); setCurrentPage(1); }}
              style={{
                backgroundColor: filterOnlyOutOfStock ? '#dc2626' : filterOnlyNew ? '#16a34a' : '#2563eb',
                color: 'white',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <X size={14} />
              <span>{lang === 'ar' ? 'عرض جميع المنتجات' : 'Show All Products'}</span>
            </button>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '16px'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-light)" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: lang === 'ar' ? '12px' : 'auto', left: lang === 'ar' ? 'auto' : '12px' }} />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'ابحث باسم المنتج أو الوصف...' : 'Search by name or description...'}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input-field"
              style={{
                margin: 0,
                paddingRight: lang === 'ar' ? '36px' : '12px',
                paddingLeft: lang === 'ar' ? '12px' : '36px',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Supplier Filter Dropdown */}
          <div>
            <select
              value={filterSupplier}
              onChange={(e) => { setFilterSupplier(e.target.value); setCurrentPage(1); }}
              className="input-field"
              style={{ margin: 0, fontSize: '0.88rem', fontWeight: filterSupplier ? '700' : 'normal' }}
            >
              <option value="">{lang === 'ar' ? 'جميع الموردين والمصادر' : 'All Suppliers / Sites'}</option>
              {availableSuppliers.map((sup) => {
                const count = products.filter(p => p.merchant_name === sup).length;
                return (
                  <option key={sup} value={sup}>
                    {sup} ({count} {lang === 'ar' ? 'منتج' : 'items'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="input-field"
              style={{ margin: 0, fontSize: '0.88rem' }}
            >
              <option value="">{lang === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'ar' ? (cat.name_ar || cat.name_en) : (cat.name_en || cat.name_ar)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
              style={{ margin: 0, fontSize: '0.88rem' }}
            >
              <option value="newest">{lang === 'ar' ? 'الأحدث مضافاً (المستوردة حديثاً)' : 'Newest / Recently Added'}</option>
              <option value="oldest">{lang === 'ar' ? 'الأقدم مضافاً' : 'Oldest First'}</option>
              <option value="price_asc">{lang === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
              <option value="price_desc">{lang === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
              <option value="stock">{lang === 'ar' ? 'المخزون: الأكثر توفراً' : 'Stock: High to Low'}</option>
              <option value="name">{lang === 'ar' ? 'الاسم أبجدياً (أ - ي)' : 'Name (A - Z)'}</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => {
              setFilterOnlyNew(prev => !prev);
              setFilterOnlyOutOfStock(false);
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterOnlyNew ? '2px solid #16a34a' : '1px solid var(--border-color)',
              backgroundColor: filterOnlyNew ? '#dcfce7' : 'var(--bg-secondary)',
              color: filterOnlyNew ? '#15803d' : 'var(--text-primary)',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Sparkles size={14} color={filterOnlyNew ? '#15803d' : 'var(--text-light)'} />
            <span>{lang === 'ar' ? 'الأصناف الجديدة المسحوبة' : 'New Imported Arrivals'}</span>
            <span style={{ opacity: 0.8 }}>({products.filter(p => p.is_new_arrival === 1).length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterOnlyOutOfStock(prev => !prev);
              setFilterOnlyNew(false);
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: filterOnlyOutOfStock ? '2px solid #ef4444' : '1px solid var(--border-color)',
              backgroundColor: filterOnlyOutOfStock ? '#fee2e2' : 'var(--bg-secondary)',
              color: filterOnlyOutOfStock ? '#b91c1c' : 'var(--text-primary)',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span></span>
            <span>{lang === 'ar' ? 'المنتجات المنتهية من المخزون (Out of Stock)' : 'Out of Stock Items'}</span>
            <span style={{ opacity: 0.8 }}>({products.filter(p => p.stock <= 0).length})</span>
          </button>
        </div>

        {/* Products Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'الصورة' : 'Image'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'المورد / الموقع' : 'Supplier / Source'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'الألوان' : 'Colors'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'القياسات' : 'Sizes'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'سعر البيع' : 'Sale Price'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'سعر التكلفة' : 'Cost Price'}</th>
                <th style={{ padding: '10px', textAlign: 'start' }}>{lang === 'ar' ? 'المخزون' : 'Stock'}</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>{lang === 'ar' ? 'العمليات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}></div>
                    <div style={{ fontWeight: '700' }}>
                      {lang === 'ar' ? 'لا توجد منتجات مطابقة لخيارات التصفية الحالية' : 'No products found matching filters'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const imageUrl = p.image_url 
                    ? (p.image_url.startsWith('http') || p.image_url.startsWith('data:') ? p.image_url : `${apiHost}${p.image_url}`)
                    : 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=50&q=80';
                  
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '10px' }}>
                        <img 
                          src={imageUrl} 
                          alt="" 
                          style={{ 
                            width: '44px', 
                            height: '44px', 
                            objectFit: 'contain', 
                            backgroundColor: 'white', 
                            borderRadius: '6px', 
                            border: '1px solid var(--border-color)' 
                          }} 
                        />
                      </td>
                      <td style={{ padding: '10px', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{lang === 'ar' ? p.name_ar : p.name_en}</span>
                          {p.is_new_arrival === 1 && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              {lang === 'ar' ? 'جديد' : 'New'}
                            </span>
                          )}
                          {p.stock <= 0 && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              {lang === 'ar' ? 'نفد' : 'Out'}
                            </span>
                          )}
                        </div>
                        {p.merchant_name && (
                          <div style={{ 
                            display: 'inline-block',
                            marginTop: '4px',
                            fontSize: '0.72rem', 
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: p.merchant_name.toLowerCase().includes('cube') ? '#ecfdf5' : '#eff6ff',
                            color: p.merchant_name.toLowerCase().includes('cube') ? '#047857' : '#1d4ed8'
                          }}>
                            {p.merchant_name}
                          </div>
                        )}
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
                        {p.stock <= 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                            0 <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>({lang === 'ar' ? 'نفد' : 'Out'})</span>
                          </span>
                        ) : p.stock}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => handleEdit(p)} title={lang === 'ar' ? 'تعديل المنتج' : 'Edit Product'} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-blue)', cursor: 'pointer' }}>
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} title={lang === 'ar' ? 'حذف المنتج' : 'Delete Product'} style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
              {lang === 'ar' 
                ? `صفحة ${safeCurrentPage} من إجمالي ${totalPages} صفحات (${filteredProducts.length} منتج)`
                : `Page ${safeCurrentPage} of ${totalPages} (${filteredProducts.length} items)`}
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage === 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}
              >
                <ChevronRight size={16} />
                <span>{lang === 'ar' ? 'السابق' : 'Previous'}</span>
              </button>

              <span style={{ 
                padding: '6px 14px', 
                backgroundColor: 'var(--accent-blue)', 
                color: 'white', 
                borderRadius: '6px', 
                fontWeight: '800',
                fontSize: '0.85rem'
              }}>
                {safeCurrentPage}
              </span>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: safeCurrentPage >= totalPages ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}
              >
                <span>{lang === 'ar' ? 'التالي' : 'Next'}</span>
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
