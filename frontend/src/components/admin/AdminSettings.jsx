import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Settings, Image, Plus, Trash2, Save, Globe, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminSettings() {
  const { lang, settings, fetchSettings, apiBase } = useApp();
  const { token } = useAuth();

  // Settings states
  const [appName, setAppName] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [freeThreshold, setFreeThreshold] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [onlinePayEnabled, setOnlinePayEnabled] = useState(0);
  const [contactEmail, setContactEmail] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  // Supplier Catalog Sync states
  const [supplierUrl, setSupplierUrl] = useState('https://drphonewholesale.online');
  const [supplierPasscode, setSupplierPasscode] = useState('Drphone123');
  const [supplierMarkup, setSupplierMarkup] = useState(45);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncStats, setSyncStats] = useState(null);

  // Banners states
  const [banners, setBanners] = useState([]);
  const [bannerFiles, setBannerFiles] = useState({}); // key: banner ID, value: file

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/drphone/status`);
      if (res.ok) {
        const data = await res.json();
        setSyncStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name || '');
      setExchangeRate(settings.exchange_rate || 89500);
      setFreeThreshold(settings.free_delivery_threshold || 50);
      setDeliveryFee(settings.delivery_fee || 4);
      setOnlinePayEnabled(settings.online_payment_enabled || 0);
      setContactEmail(settings.contact_email || 'info@arz-mart.com');
      setSupplierUrl(settings.supplier_catalog_url || 'https://drphonewholesale.online');
      setSupplierPasscode(settings.supplier_catalog_passcode || 'Drphone123');
      setSupplierMarkup(settings.supplier_markup_percent !== undefined ? settings.supplier_markup_percent : 45);
      
      // Ensure all loaded banners have unique IDs for stable editing key
      const bannersWithIds = (settings.hero_banners || []).map((b, idx) => ({
        ...b,
        id: b.id || `banner_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`
      }));
      setBanners(bannersWithIds);
    }
  }, [settings]);

  const handleLogoChange = (e) => {
    setLogoFile(e.target.files[0]);
  };

  const handleSyncNow = async () => {
    if (!supplierUrl.trim()) {
      alert(lang === 'ar' ? 'الرجاء إدخال رابط موقع المورد' : 'Please enter supplier website URL');
      return;
    }

    setSyncing(true);
    setSyncStatus(null);
    try {
      // First save settings so the URL is persisted
      const formData = new FormData();
      formData.append('supplier_catalog_url', supplierUrl.trim());
      formData.append('supplier_catalog_passcode', supplierPasscode.trim());
      formData.append('supplier_markup_percent', supplierMarkup);
      await fetch(`${apiBase}/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      // Trigger sync
      const res = await fetch(`${apiBase}/drphone/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: supplierUrl.trim(),
          passcode: supplierPasscode.trim(),
          markupPercent: Number(supplierMarkup) || 45
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatus({
          success: true,
          message: lang === 'ar' 
            ? `تم الجلب والمزامنة بنجاح! إجمالي المنتجات المعالجة: ${data.totalProcessed}، المضافة: ${data.insertedCount}، المحدثة: ${data.updatedCount} عبر ${data.totalCategories} تصنيف.`
            : `Synced successfully! Processed: ${data.totalProcessed}, Inserted: ${data.insertedCount}, Updated: ${data.updatedCount} across ${data.totalCategories} categories.`
        });
        fetchSyncStatus();
        fetchSettings();
      } else {
        setSyncStatus({
          success: false,
          message: data.error || (lang === 'ar' ? 'فشل الاتصال بموقع المورد أو رمز المرور غير صحيح' : 'Failed to connect to supplier website or invalid passcode')
        });
      }
    } catch (err) {
      console.error(err);
      setSyncStatus({
        success: false,
        message: lang === 'ar' ? 'حدث خطأ أثناء مزامنة الكتالوج: ' + err.message : 'Error syncing catalog: ' + err.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSyncSettings = async () => {
    try {
      const formData = new FormData();
      formData.append('supplier_catalog_url', supplierUrl.trim());
      formData.append('supplier_catalog_passcode', supplierPasscode.trim());
      formData.append('supplier_markup_percent', supplierMarkup);
      const res = await fetch(`${apiBase}/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        fetchSettings();
        fetchSyncStatus();
        alert(lang === 'ar' ? 'تم حفظ إعدادات رابط المورد بنجاح!' : 'Supplier settings saved successfully!');
      }
    } catch (e) {
      console.error(e);
      alert(lang === 'ar' ? 'خطأ في حفظ الإعدادات' : 'Error saving settings');
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('app_name', appName);
    formData.append('exchange_rate', exchangeRate);
    formData.append('free_delivery_threshold', freeThreshold);
    formData.append('delivery_fee', deliveryFee);
    formData.append('online_payment_enabled', onlinePayEnabled);
    formData.append('contact_email', contactEmail);
    formData.append('supplier_catalog_url', supplierUrl.trim());
    formData.append('supplier_catalog_passcode', supplierPasscode.trim());
    formData.append('supplier_markup_percent', supplierMarkup);
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        fetchSettings();
        setLogoFile(null);
        alert(lang === 'ar' ? 'تم تحديث الإعدادات بنجاح!' : 'Settings updated successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBannerFileChange = (id, file) => {
    setBannerFiles(prev => ({
      ...prev,
      [id]: file
    }));
  };

  const handleAddBanner = () => {
    const newId = `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setBanners(prev => [
      ...prev,
      {
        id: newId,
        image: '',
        title_ar: '',
        title_en: '',
        desc_ar: '',
        desc_en: ''
      }
    ]);
  };

  const handleDeleteBanner = (id) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    // Clear file queue for this ID
    const updatedFiles = { ...bannerFiles };
    delete updatedFiles[id];
    setBannerFiles(updatedFiles);
  };

  const handleBannerChange = (id, field, value) => {
    setBanners(prev => prev.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const getBannerPreview = (banner) => {
    if (bannerFiles[banner.id]) {
      return URL.createObjectURL(bannerFiles[banner.id]);
    }
    if (banner.image) {
      return banner.image.startsWith('http') 
        ? banner.image 
        : `${apiBase.replace('/api', '')}${banner.image}`;
    }
    return '';
  };

  const handleBannersSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('banners', JSON.stringify(banners));

    Object.keys(bannerFiles).forEach(id => {
      formData.append(`banner_image_${id}`, bannerFiles[id]);
    });

    try {
      const res = await fetch(`${apiBase}/settings/banners`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        fetchSettings();
        setBannerFiles({});
        alert(lang === 'ar' ? 'تم تحديث البانرات الإعلانية بنجاح!' : 'Hero banners updated successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 0. Supplier Catalog Auto-Sync Card */}
      <div className="dashboard-card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, rgba(37, 99, 235, 0.04) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <Globe size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {lang === 'ar' ? 'الربط التلقائي وجلب المنتجات والتصنيفات من موقع المورد' : 'Supplier Catalog & Auto-Sync'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '4px 0 0' }}>
                {lang === 'ar'
                  ? 'ضع رابط موقع المورد ليقوم النظام بسحب المنتجات والتصنيفات والأسعار والصور وتحديثها في متجرك بضغطة زر'
                  : 'Enter supplier website URL to fetch and auto-synchronize products, categories, images, and prices'}
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: '700' }}>
            <span style={{ padding: '4px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {lang === 'ar' ? 'المنتجات:' : 'Products:'} <strong style={{ color: 'var(--accent-blue)' }}>{syncStats?.totalStoreProducts ?? '...'}</strong>
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {lang === 'ar' ? 'التصنيفات:' : 'Categories:'} <strong style={{ color: 'var(--accent-blue)' }}>{syncStats?.totalCategories ?? '...'}</strong>
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {lang === 'ar' ? 'الهامش:' : 'Markup:'} <strong style={{ color: '#10b981' }}>+{supplierMarkup}%</strong>
            </span>
          </div>
        </div>

        {/* Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'رابط موقع المورد (Supplier Website URL)' : 'Supplier Website URL'}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="https://drphonewholesale.online"
              value={supplierUrl}
              onChange={(e) => setSupplierUrl(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              {lang === 'ar' ? 'مثال: https://drphonewholesale.online' : 'Example: https://drphonewholesale.online'}
            </span>
          </div>

          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'رمز مرور الدخول للكتالوج (Passcode)' : 'Catalog Passcode'}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Drphone123"
              value={supplierPasscode}
              onChange={(e) => setSupplierPasscode(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              {lang === 'ar' ? 'الرمز المعتمد لفتح كتالوج المورد (مثل: Drphone123)' : 'Passcode for supplier catalog'}
            </span>
          </div>

          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'نسبة هامش الربح المضافة % (Markup)' : 'Profit Markup %'}
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="45"
              value={supplierMarkup}
              onChange={(e) => setSupplierMarkup(e.target.value)}
              style={{ fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              {lang === 'ar' ? 'تطبق تلقائياً على سعر الجملة (عدا الحمايات 2.50$)' : 'Applied on wholesale prices (except protectors $2.50)'}
            </span>
          </div>
        </div>

        {/* Action Buttons & Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="input-field"
              style={{
                width: 'auto',
                padding: '10px 22px',
                backgroundColor: syncing ? 'var(--text-light)' : '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: '800',
                cursor: syncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: syncing ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              <span>
                {syncing 
                  ? (lang === 'ar' ? 'جاري جلب وتحديث المنتجات والتصنيفات...' : 'Syncing Catalog Now...') 
                  : (lang === 'ar' ? 'جلب وتحديث المنتجات والتصنيفات الآن' : 'Fetch & Sync Catalog Now')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveSyncSettings}
              disabled={syncing}
              className="input-field"
              style={{
                width: 'auto',
                padding: '10px 18px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              <span>{lang === 'ar' ? 'حفظ إعدادات الرابط' : 'Save URL Settings'}</span>
            </button>
          </div>

          {syncStats?.lastSyncTime && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              {lang === 'ar' ? 'آخر مزامنة:' : 'Last Sync:'} <strong style={{ color: 'var(--text-primary)' }}>{syncStats.lastSyncTime}</strong>
            </div>
          )}
        </div>

        {/* Live sync status banner */}
        {syncStatus && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: syncStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${syncStatus.success ? '#10b981' : '#ef4444'}`,
            color: syncStatus.success ? '#10b981' : '#ef4444',
            fontSize: '0.9rem',
            fontWeight: '700'
          }}>
            {syncStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{syncStatus.message}</span>
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} color="var(--accent-blue)" />
          <span>إعدادات المتجر العامة</span>
        </h4>

        <form onSubmit={handleSettingsSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label className="input-label">اسم المتجر (App Name)</label>
            <input type="text" className="input-field" value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">سعر الصرف (LBP per 1 USD)</label>
            <input type="number" className="input-field" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
          </div>
          <div>
            <label className="input-label">حد التوصيل المجاني (USD Threshold)</label>
            <input type="number" className="input-field" value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} />
          </div>
          <div>
            <label className="input-label">تكلفة التوصيل الأساسية (Delivery Fee - USD)</label>
            <input type="number" className="input-field" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
          </div>
          <div>
            <label className="input-label">تفعيل الدفع الإلكتروني (Online Pay Mock)</label>
            <select className="input-field" value={onlinePayEnabled} onChange={(e) => setOnlinePayEnabled(parseInt(e.target.value))}>
              <option value={0}>إيقاف - نقدي فقط (Cash Only)</option>
              <option value={1}>تفعيل خيار الدفع الإلكتروني (Allow Online Payment)</option>
            </select>
          </div>
          <div>
            <label className="input-label">إيميل التواصل (Contact Email)</label>
            <input type="email" className="input-field" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <label className="input-label">شعار المتجر (Store Logo)</label>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="input-field" style={{ padding: '6px' }} />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="input-field" style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>

      {/* Infinite Banners Slider Settings */}
      <div className="dashboard-card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image size={18} color="var(--accent-blue)" />
            <span>{lang === 'ar' ? 'البانرات الإعلانية في الواجهة (Hero Banners)' : 'Homepage Hero Banners'}</span>
          </span>
          <button
            type="button"
            onClick={handleAddBanner}
            className="input-field"
            style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={14} />
            <span>{lang === 'ar' ? 'إضافة بنر جديد' : 'Add New Banner'}</span>
          </button>
        </h4>

        <form onSubmit={handleBannersSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {banners.map((b, idx) => {
            const previewUrl = getBannerPreview(b);
            return (
              <div key={b.id} style={{
                padding: '20px',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-secondary)',
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '20px',
                position: 'relative',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {/* Header of Banner Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
                    {lang === 'ar' ? `البانر الإعلاني #${idx + 1}` : `Hero Banner #${idx + 1}`}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(b.id)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={16} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{lang === 'ar' ? 'حذف البنر' : 'Delete'}</span>
                  </button>
                </div>

                {/* Banner Content Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
                  {/* Inputs Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="input-label">{lang === 'ar' ? 'العنوان الرئيسي (عربي)' : 'Main Title (AR)'}</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={lang === 'ar' ? 'أدخل العنوان الرئيسي...' : 'Enter main title...'}
                          value={b.title_ar || ''}
                          onChange={(e) => handleBannerChange(b.id, 'title_ar', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="input-label">{lang === 'ar' ? 'العنوان الرئيسي (إنجليزي)' : 'Main Title (EN)'}</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={lang === 'ar' ? 'Enter main title in English...' : 'Enter main title...'}
                          value={b.title_en || ''}
                          onChange={(e) => handleBannerChange(b.id, 'title_en', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="input-label">{lang === 'ar' ? 'النص الفرعي / الوصف (عربي)' : 'Subtitle / Description (AR)'}</label>
                        <textarea
                          className="input-field"
                          style={{ minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                          placeholder={lang === 'ar' ? 'أدخل الوصف أو النص الفرعي...' : 'Enter description...'}
                          value={b.desc_ar || ''}
                          onChange={(e) => handleBannerChange(b.id, 'desc_ar', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="input-label">{lang === 'ar' ? 'النص الفرعي / الوصف (إنجليزي)' : 'Subtitle / Description (EN)'}</label>
                        <textarea
                          className="input-field"
                          style={{ minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                          placeholder={lang === 'ar' ? 'Enter description in English...' : 'Enter description...'}
                          value={b.desc_en || ''}
                          onChange={(e) => handleBannerChange(b.id, 'desc_en', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="input-label">{lang === 'ar' ? 'رفع صورة الخلفية للبنر' : 'Upload Banner Image'}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBannerFileChange(b.id, e.target.files[0])}
                        className="input-field"
                        style={{ padding: '6px' }}
                      />
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    height: '100%',
                    minHeight: '180px',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Banner Preview"
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        />
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-light)',
                          marginTop: '8px',
                          textAlign: 'center',
                          wordBreak: 'break-all',
                          padding: '0 8px'
                        }}>
                          {bannerFiles[b.id] ? (
                            <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>
                              {lang === 'ar' ? 'صورة جديدة محددة: ' : 'New image selected: '} {bannerFiles[b.id].name}
                            </span>
                          ) : (
                            `${lang === 'ar' ? 'مسار الصورة الحالي: ' : 'Current image path: '} ${b.image}`
                          )}
                        </span>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-light)' }}>
                        <Image size={32} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                          {lang === 'ar' ? 'لا توجد صورة محددة بعد' : 'No image selected yet'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {banners.length > 0 && (
            <button
              type="submit"
              className="input-field"
              style={{
                backgroundColor: 'var(--accent-red-gold)',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                width: 'auto',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              <span>{lang === 'ar' ? 'حفظ التعديلات للبانرات' : 'Save Banner Changes'}</span>
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
