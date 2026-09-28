import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Settings, Image, Plus, Trash2, Save, Globe, RefreshCw, CheckCircle2, AlertCircle, Activity, Target, BarChart2, Bell, Send, Copy, Check, MessageSquare, Rss, Clock, Zap } from 'lucide-react';

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
  const [visitorBaselineCount, setVisitorBaselineCount] = useState(0);
  const [showVisitorCounter, setShowVisitorCounter] = useState(1);
  const [showOutOfStockOnHome, setShowOutOfStockOnHome] = useState(1);

  // Telegram & WhatsApp Notifications states (Option 1)
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [adminWhatsappNumber, setAdminWhatsappNumber] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState(null);

  // Marketing Pixels states
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [snapchatPixelId, setSnapchatPixelId] = useState('');
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('');

  // Automated Multi-Supplier Sync states (Option 5)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(1);
  const [runningFullSync, setRunningFullSync] = useState(false);
  const [fullSyncResult, setFullSyncResult] = useState(null);

  // Copy URL states for Feeds (Option 4)
  const [copiedFeed, setCopiedFeed] = useState(null);

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
      setVisitorBaselineCount(settings.visitor_baseline_count || 0);
      setShowVisitorCounter(settings.show_visitor_counter !== undefined ? settings.show_visitor_counter : 1);
      setShowOutOfStockOnHome(settings.show_out_of_stock_on_home !== undefined ? settings.show_out_of_stock_on_home : 1);
      setFacebookPixelId(settings.facebook_pixel_id || '');
      setTiktokPixelId(settings.tiktok_pixel_id || '');
      setSnapchatPixelId(settings.snapchat_pixel_id || '');
      setGoogleAnalyticsId(settings.google_analytics_id || '');
      
      // Option 1 & 5 settings
      setTelegramBotToken(settings.telegram_bot_token || '');
      setTelegramChatId(settings.telegram_chat_id || '');
      setAdminWhatsappNumber(settings.admin_whatsapp_number || '');
      setAutoSyncEnabled(settings.auto_sync_enabled !== undefined ? settings.auto_sync_enabled : 1);
      
      // Ensure all loaded banners have unique IDs for stable editing key
      const bannersWithIds = (settings.hero_banners || []).map((b, idx) => ({
        ...b,
        id: b.id || `banner_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`
      }));
      setBanners(bannersWithIds);
    }
  }, [settings]);

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      alert(lang === 'ar' ? 'الرجاء إدخال توكن البوت ومعرف الشات أولاً' : 'Please enter Telegram Bot Token and Chat ID first');
      return;
    }
    setTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const res = await fetch(`${apiBase}/notifications/test-telegram`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_token: telegramBotToken.trim(),
          chat_id: telegramChatId.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramTestStatus({
          success: true,
          message: lang === 'ar' ? '✅ تم إرسال رسالة تجريبية بنجاح إلى حساب التيليجرام الخاص بك!' : '✅ Test notification sent successfully to your Telegram!'
        });
      } else {
        setTelegramTestStatus({
          success: false,
          message: data.error || (lang === 'ar' ? 'فشل إرسال الإشعار. تحقق من صحة التوكن وChat ID وبدء المحادثة مع البوت (/start).' : 'Failed to send test message. Verify Bot Token & Chat ID and start chat with bot (/start).')
        });
      }
    } catch (e) {
      setTelegramTestStatus({
        success: false,
        message: e.message
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleCopyFeed = (feedUrl, feedKey) => {
    const fullUrl = `${window.location.origin}${feedUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedFeed(feedKey);
    setTimeout(() => setCopiedFeed(null), 3000);
  };

  const handleRunFullMultiSync = async () => {
    setRunningFullSync(true);
    setFullSyncResult(null);
    try {
      const res = await fetch(`${apiBase}/sync/run-now`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFullSyncResult({
          success: true,
          data: data
        });
        fetchSyncStatus();
        fetchSettings();
      } else {
        setFullSyncResult({
          success: false,
          error: data.error || 'Failed to sync'
        });
      }
    } catch (e) {
      setFullSyncResult({
        success: false,
        error: e.message
      });
    } finally {
      setRunningFullSync(false);
    }
  };

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
    formData.append('visitor_baseline_count', visitorBaselineCount);
    formData.append('show_visitor_counter', showVisitorCounter);
    formData.append('show_out_of_stock_on_home', showOutOfStockOnHome);
    formData.append('facebook_pixel_id', facebookPixelId.trim());
    formData.append('tiktok_pixel_id', tiktokPixelId.trim());
    formData.append('snapchat_pixel_id', snapchatPixelId.trim());
    formData.append('google_analytics_id', googleAnalyticsId.trim());
    formData.append('telegram_bot_token', telegramBotToken.trim());
    formData.append('telegram_chat_id', telegramChatId.trim());
    formData.append('admin_whatsapp_number', adminWhatsappNumber.trim());
    formData.append('auto_sync_enabled', autoSyncEnabled);
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
          <div>
            <label className="input-label">الرقم الابتدائي لعداد الزوار (Baseline Visitors)</label>
            <input 
              type="number" 
              className="input-field" 
              value={visitorBaselineCount} 
              onChange={(e) => setVisitorBaselineCount(Math.max(0, parseInt(e.target.value) || 0))} 
              placeholder="0"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', display: 'block', marginTop: '3px' }}>
              الرقم التراكمي المبدئي (لا يتم تصفيره ويضاف إليه كل زائر جديد تلقائياً)
            </span>
          </div>
          <div>
            <label className="input-label">عرض عداد الزوار في أسفل المتجر (Store Footer)</label>
            <select className="input-field" value={showVisitorCounter} onChange={(e) => setShowVisitorCounter(parseInt(e.target.value))}>
              <option value={1}>نعم - إظهار عداد الزوار التراكمي في أسفل المتجر</option>
              <option value={0}>إخفاء العداد من أسفل المتجر</option>
            </select>
          </div>
          <div>
            <label className="input-label">عرض المنتجات المنتهية في المتجر (Out of Stock)</label>
            <select className="input-field" value={showOutOfStockOnHome} onChange={(e) => setShowOutOfStockOnHome(parseInt(e.target.value))}>
              <option value={1}>نعم - إظهار المنتجات المنتهية مع علامة (نفد من المخزون)</option>
              <option value={0}>إخفاء المنتجات المنتهية تلقائياً من المتجر وواجهة العملاء</option>
            </select>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', display: 'block', marginTop: '3px' }}>
              عند الإخفاء، أي منتج رصيده 0 أو تم حذفه من كتالوج المورد يُحجب فوراً عن الزوار
            </span>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="input-field" style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </form>
      </div>

      {/* Marketing Pixels & Tracking Card */}
      <div className="dashboard-card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, rgba(59, 130, 246, 0.04) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <Target size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {lang === 'ar' ? 'بيكسل وأدوات التتبع الإعلاني (Marketing Pixels & Analytics)' : 'Marketing Pixels & Analytics'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '4px 0 0' }}>
                {lang === 'ar'
                  ? 'اربط إعلانات فيسبوك، انستغرام، تيك توك، سناب شات، وجوجل لتتبع حركة الزوار والمبيعات تلقائياً'
                  : 'Track conversions and eCommerce events automatically across Meta, TikTok, Snapchat, and GA4'}
              </p>
            </div>
          </div>

          {/* Quick status badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: '700' }}>
            <span style={{ padding: '4px 10px', backgroundColor: facebookPixelId ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-tertiary)', color: facebookPixelId ? '#3b82f6' : 'var(--text-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              Meta: {facebookPixelId ? (lang === 'ar' ? 'مفعّل' : 'Active') : (lang === 'ar' ? 'غير محدد' : 'Inactive')}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: tiktokPixelId ? 'rgba(0, 0, 0, 0.08)' : 'var(--bg-tertiary)', color: tiktokPixelId ? 'var(--text-primary)' : 'var(--text-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              TikTok: {tiktokPixelId ? (lang === 'ar' ? 'مفعّل' : 'Active') : (lang === 'ar' ? 'غير محدد' : 'Inactive')}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: snapchatPixelId ? 'rgba(234, 179, 8, 0.12)' : 'var(--bg-tertiary)', color: snapchatPixelId ? '#ca8a04' : 'var(--text-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              Snapchat: {snapchatPixelId ? (lang === 'ar' ? 'مفعّل' : 'Active') : (lang === 'ar' ? 'غير محدد' : 'Inactive')}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: googleAnalyticsId ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)', color: googleAnalyticsId ? '#10b981' : 'var(--text-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              GA4: {googleAnalyticsId ? (lang === 'ar' ? 'مفعّل' : 'Active') : (lang === 'ar' ? 'غير محدد' : 'Inactive')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSettingsSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {/* 1. Meta Pixel */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="input-label" style={{ fontWeight: '800', margin: 0, color: '#3b82f6' }}>
                Meta Pixel (Facebook & Instagram)
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: facebookPixelId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)', color: facebookPixelId ? '#10b981' : '#9ca3af' }}>
                {facebookPixelId ? (lang === 'ar' ? 'نشط ومفعّل' : 'Active') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
              </span>
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 123456789012345"
              value={facebookPixelId}
              onChange={(e) => setFacebookPixelId(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.73rem', color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
              {lang === 'ar' ? 'ضع معرّف بيكسل فيسبوك (Pixel ID) المكون من أرقام فقط' : 'Enter your Meta Pixel ID from Events Manager'}
            </span>
          </div>

          {/* 2. TikTok Pixel */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="input-label" style={{ fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                TikTok Pixel ID
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: tiktokPixelId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)', color: tiktokPixelId ? '#10b981' : '#9ca3af' }}>
                {tiktokPixelId ? (lang === 'ar' ? 'نشط ومفعّل' : 'Active') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
              </span>
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. CXXXXXXXXXXXXXXX"
              value={tiktokPixelId}
              onChange={(e) => setTiktokPixelId(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.73rem', color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
              {lang === 'ar' ? 'ضع معرّف بيكسل تيك توك من مدير الإعلانات TikTok Ads Manager' : 'Enter your TikTok Pixel ID from TikTok Ads Manager'}
            </span>
          </div>

          {/* 3. Snapchat Pixel */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="input-label" style={{ fontWeight: '800', margin: 0, color: '#ca8a04' }}>
                Snapchat Pixel ID
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: snapchatPixelId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)', color: snapchatPixelId ? '#10b981' : '#9ca3af' }}>
                {snapchatPixelId ? (lang === 'ar' ? 'نشط ومفعّل' : 'Active') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
              </span>
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={snapchatPixelId}
              onChange={(e) => setSnapchatPixelId(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.73rem', color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
              {lang === 'ar' ? 'معرّف بيكسل سناب شات من Snap Pixel Manager' : 'Enter your Snapchat Pixel ID from Snap Ads Manager'}
            </span>
          </div>

          {/* 4. Google Analytics 4 */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="input-label" style={{ fontWeight: '800', margin: 0, color: '#10b981' }}>
                Google Analytics 4 (Measurement ID)
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: googleAnalyticsId ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)', color: googleAnalyticsId ? '#10b981' : '#9ca3af' }}>
                {googleAnalyticsId ? (lang === 'ar' ? 'نشط ومفعّل' : 'Active') : (lang === 'ar' ? 'معطّل' : 'Disabled')}
              </span>
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. G-XXXXXXXXXX"
              value={googleAnalyticsId}
              onChange={(e) => setGoogleAnalyticsId(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.73rem', color: 'var(--text-light)', display: 'block', marginTop: '4px' }}>
              {lang === 'ar' ? 'معرّف القياس من Google Analytics (يبدأ بـ G-)' : 'Measurement ID from Google Analytics 4'}
            </span>
          </div>

          {/* Features highlight note */}
          <div style={{ gridColumn: '1 / -1', backgroundColor: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
            <div>
              <strong>{lang === 'ar' ? 'الأحداث التلقائية المدعومة:' : 'Supported Automatic Events:'}</strong>{' '}
              {lang === 'ar'
                ? 'مشاهدة الصفحات (PageView)، البحث (Search)، عرض تفاصيل المنتج (ViewContent)، إضافة للسلة (AddToCart)، فتح صفحة الدفع (InitiateCheckout)، وتأكيد الطلب والشراء (Purchase).'
                : 'PageView, Search, ViewContent, AddToCart, InitiateCheckout, and Purchase.'}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
            <button type="submit" className="input-field" style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} />
              <span>{lang === 'ar' ? 'حفظ إعدادات البيكسل والتتبع' : 'Save Pixel & Tracking Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 1. Instant Telegram & WhatsApp Order Alerts (Option 1) */}
      <div className="dashboard-card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, rgba(14, 165, 233, 0.05) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(14, 165, 233, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
              <Bell size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {lang === 'ar' ? 'إشعارات الطلبات الفورية عبر تيليجرام وواتساب' : 'Instant Telegram & WhatsApp Order Notifications'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '4px 0 0' }}>
                {lang === 'ar'
                  ? 'استقبل تنبيهاً فورياً على التيليجرام بتفاصيل كل طلب جديد مع رابط مباشر للتواصل مع العميل عبر الواتساب'
                  : 'Receive instant Telegram alerts for every new order with direct 1-tap WhatsApp customer chat link'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: '700' }}>
            <span style={{ padding: '4px 10px', backgroundColor: telegramBotToken && telegramChatId ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)', color: telegramBotToken && telegramChatId ? '#10b981' : 'var(--text-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              Telegram: {telegramBotToken && telegramChatId ? (lang === 'ar' ? 'مفعّل وجاهز' : 'Connected') : (lang === 'ar' ? 'غير مكتمل' : 'Not configured')}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: adminWhatsappNumber ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-tertiary)', color: adminWhatsappNumber ? '#22c55e' : 'var(--text-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              WhatsApp: {adminWhatsappNumber ? adminWhatsappNumber : (lang === 'ar' ? 'غير محدد' : 'Not set')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSettingsSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'رمز توكن بوت التيليجرام (Telegram Bot Token)' : 'Telegram Bot Token'}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              {lang === 'ar' ? 'تحصل عليه بإنشاء بوت مجاني عبر @BotFather' : 'Get it by creating a bot via @BotFather'}
            </span>
          </div>

          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'معرّف الشات الخاص بك (Telegram Chat ID)' : 'Telegram Chat ID'}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              {lang === 'ar' ? 'معرف حسابك الشخصي أو القروب (احصل عليه من @userinfobot)' : 'Your Chat or Group ID (get from @userinfobot)'}
            </span>
          </div>

          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'رقم هاتف الواتساب للإدارة (Admin WhatsApp Number)' : 'Admin WhatsApp Number'}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="96170123456"
              value={adminWhatsappNumber}
              onChange={(e) => setAdminWhatsappNumber(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              {lang === 'ar' ? 'مع الرمز الدولي بدون إشارة + (مثال: 96170123456)' : 'With country code without + (e.g. 96170123456)'}
            </span>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button
              type="submit"
              className="input-field"
              style={{
                width: 'auto',
                padding: '10px 22px',
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              <span>{lang === 'ar' ? 'حفظ إعدادات الإشعارات' : 'Save Notification Settings'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={testingTelegram || !telegramBotToken || !telegramChatId}
              className="input-field"
              style={{
                width: 'auto',
                padding: '10px 20px',
                backgroundColor: !telegramBotToken || !telegramChatId ? 'var(--bg-tertiary)' : '#0ea5e9',
                color: !telegramBotToken || !telegramChatId ? 'var(--text-light)' : 'white',
                border: 'none',
                fontWeight: '700',
                cursor: !telegramBotToken || !telegramChatId || testingTelegram ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send size={16} />
              <span>
                {testingTelegram 
                  ? (lang === 'ar' ? 'جاري إرسال إشعار تجريبي...' : 'Sending Test...') 
                  : (lang === 'ar' ? 'إرسال إشعار تجريبي للتيليجرام' : 'Test Telegram Alert')}
              </span>
            </button>
          </div>
        </form>

        {/* Telegram Test Alert Result */}
        {telegramTestStatus && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: telegramTestStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${telegramTestStatus.success ? '#10b981' : '#ef4444'}`,
            color: telegramTestStatus.success ? '#10b981' : '#ef4444',
            fontSize: '0.88rem',
            fontWeight: '700'
          }}>
            {telegramTestStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{telegramTestStatus.message}</span>
          </div>
        )}
      </div>

      {/* 2. Automated Product Feeds for Meta, Google & TikTok (Option 4) */}
      <div className="dashboard-card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, rgba(245, 158, 11, 0.05) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Rss size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {lang === 'ar' ? 'خلاصات الكتالوج التلقائية للإعلانات (Product Feeds)' : 'Automated Product Catalog Feeds'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '4px 0 0' }}>
                {lang === 'ar'
                  ? 'روابط خلاصات الكتالوج المحدثة تلقائياً للربط المباشر مع حملات إعلانات فيسبوك، جوجل شوبينغ، وتيك توك'
                  : 'Live automated XML & CSV catalog feeds for Meta Commerce, Google Merchant, and TikTok Ads'}
              </p>
            </div>
          </div>

          <span style={{ padding: '4px 10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', fontWeight: '700' }}>
            {lang === 'ar' ? 'جاهزة ومولّدة بالكامل' : 'Ready & Live'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Feed 1: Meta / Facebook */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: '800', color: '#3b82f6', fontSize: '0.95rem' }}>
                1. Meta / Facebook & Instagram Catalog (XML / RSS)
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                Meta Commerce Manager
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 8px' }}>
              {lang === 'ar'
                ? 'انسخ هذا الرابط وأضفه كمصدر بيانات تلقائي مجدول في Meta Commerce Manager لإنشاء إعلانات المنتجات الديناميكية (DPA)'
                : 'Paste this scheduled data feed URL into Meta Commerce Manager for Dynamic Product Ads (DPA)'}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                className="input-field"
                value={typeof window !== 'undefined' ? `${window.location.origin}/api/feeds/facebook.xml` : '/api/feeds/facebook.xml'}
                style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => handleCopyFeed('/api/feeds/facebook.xml', 'fb')}
                className="input-field"
                style={{ width: 'auto', padding: '8px 16px', backgroundColor: copiedFeed === 'fb' ? '#10b981' : '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', flexShrink: 0 }}
              >
                {copiedFeed === 'fb' ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedFeed === 'fb' ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Feed')}</span>
              </button>
            </div>
          </div>

          {/* Feed 2: Google Merchant Center */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: '800', color: '#10b981', fontSize: '0.95rem' }}>
                2. Google Merchant Center & Shopping Feed (XML / RSS)
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                Google Shopping
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 8px' }}>
              {lang === 'ar'
                ? 'انسخ الرابط وضعه في Google Merchant Center > Feeds لعرض منتجاتك مجاناً وبإعلانات Google Shopping'
                : 'Paste into Google Merchant Center > Feeds for Google Shopping Ads and Free Listings'}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                className="input-field"
                value={typeof window !== 'undefined' ? `${window.location.origin}/api/feeds/google.xml` : '/api/feeds/google.xml'}
                style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => handleCopyFeed('/api/feeds/google.xml', 'google')}
                className="input-field"
                style={{ width: 'auto', padding: '8px 16px', backgroundColor: copiedFeed === 'google' ? '#10b981' : '#10b981', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', flexShrink: 0 }}
              >
                {copiedFeed === 'google' ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedFeed === 'google' ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Feed')}</span>
              </button>
            </div>
          </div>

          {/* Feed 3: TikTok Catalog CSV */}
          <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                3. TikTok Ads Catalog Feed (CSV Format)
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(0, 0, 0, 0.08)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                TikTok Ads Manager
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0 0 8px' }}>
              {lang === 'ar'
                ? 'انسخ الرابط إلى TikTok Ads Manager > Assets > Catalogs لإطلاق إعلانات المنتجات التفاعلية على تيك توك'
                : 'Paste into TikTok Ads Manager > Assets > Catalogs for TikTok Shopping and Collection Ads'}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                className="input-field"
                value={typeof window !== 'undefined' ? `${window.location.origin}/api/feeds/tiktok.csv` : '/api/feeds/tiktok.csv'}
                style={{ direction: 'ltr', textAlign: 'left', fontWeight: '600', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => handleCopyFeed('/api/feeds/tiktok.csv', 'tiktok')}
                className="input-field"
                style={{ width: 'auto', padding: '8px 16px', backgroundColor: copiedFeed === 'tiktok' ? '#10b981' : '#1f2937', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', flexShrink: 0 }}
              >
                {copiedFeed === 'tiktok' ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedFeed === 'tiktok' ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Feed')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Scheduled Automated Multi-Supplier Catalog Sync (Option 5) */}
      <div className="dashboard-card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <Clock size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {lang === 'ar' ? 'المزامنة التلقائية المجدولة لجميع الموردين (Cron Job)' : 'Automated Scheduled Multi-Supplier Sync'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '4px 0 0' }}>
                {lang === 'ar'
                  ? 'مزامنة وتحديث يومي تلقائي للأسعار والمخزون والمنتجات الجديدة من الموردين (عبد الغني، Deal.com، DrPhone)'
                  : 'Automated daily synchronization of prices, stock, and new products from Abdul Ghani, Deal.com, and DrPhone'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: '700' }}>
            <span style={{ padding: '4px 10px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {lang === 'ar' ? 'الجدول: يومياً الساعة 04:00 صباحاً (UTC)' : 'Schedule: Daily at 04:00 AM UTC'}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: autoSyncEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: autoSyncEnabled ? '#10b981' : '#ef4444', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {autoSyncEnabled ? (lang === 'ar' ? 'المزامنة التلقائية مفعلة' : 'Auto-Sync Active') : (lang === 'ar' ? 'معطلة' : 'Disabled')}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label className="input-label" style={{ fontWeight: '700' }}>
              {lang === 'ar' ? 'حالة المزامنة التلقائية المجدولة' : 'Automated Sync Status'}
            </label>
            <select
              className="input-field"
              value={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(parseInt(e.target.value))}
            >
              <option value={1}>{lang === 'ar' ? 'مفعّل - مزامنة الكتالوجات يومياً تلقائياً' : 'Enabled - Daily Auto Sync'}</option>
              <option value={0}>{lang === 'ar' ? 'إيقاف المزامنة التلقائية' : 'Disabled'}</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={handleRunFullMultiSync}
              disabled={runningFullSync}
              className="input-field"
              style={{
                backgroundColor: runningFullSync ? 'var(--text-light)' : '#8b5cf6',
                color: 'white',
                border: 'none',
                fontWeight: '800',
                cursor: runningFullSync ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                boxShadow: runningFullSync ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} style={{ animation: runningFullSync ? 'spin 1s linear infinite' : 'none' }} />
              <span>
                {runningFullSync 
                  ? (lang === 'ar' ? 'جاري مزامنة كافة الموردين الآن...' : 'Syncing All Suppliers...') 
                  : (lang === 'ar' ? 'تشغيل المزامنة الشاملة لكافة الموردين الآن' : 'Run Full Multi-Supplier Sync Now')}
              </span>
            </button>
          </div>
        </div>

        {/* Sync Summary Result Banner */}
        {fullSyncResult && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: fullSyncResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${fullSyncResult.success ? '#10b981' : '#ef4444'}`,
            fontSize: '0.88rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: fullSyncResult.success ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
              {fullSyncResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{fullSyncResult.success ? (lang === 'ar' ? 'تمت المزامنة الشاملة لجميع الموردين بنجاح!' : 'Full Multi-Supplier Sync Completed Successfully!') : fullSyncResult.error}</span>
            </div>

            {fullSyncResult.data?.results && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: 'var(--accent-blue)', marginBottom: '4px' }}>🏢 Abdul Ghani Trading:</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {fullSyncResult.data.results.abdulGhani?.success 
                      ? (lang === 'ar' ? `المعالج: ${fullSyncResult.data.results.abdulGhani.processed}، المضاف: ${fullSyncResult.data.results.abdulGhani.inserted}، المحدث: ${fullSyncResult.data.results.abdulGhani.updated}` : `Processed: ${fullSyncResult.data.results.abdulGhani.processed}, New: ${fullSyncResult.data.results.abdulGhani.inserted}, Updated: ${fullSyncResult.data.results.abdulGhani.updated}`)
                      : 'Skipped / Error'}
                  </span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: '4px' }}>🛒 Deal.com:</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {fullSyncResult.data.results.dealCom?.success 
                      ? (lang === 'ar' ? `المعالج: ${fullSyncResult.data.results.dealCom.processed}، المضاف: ${fullSyncResult.data.results.dealCom.inserted}، المحدث: ${fullSyncResult.data.results.dealCom.updated}` : `Processed: ${fullSyncResult.data.results.dealCom.processed}, New: ${fullSyncResult.data.results.dealCom.inserted}, Updated: ${fullSyncResult.data.results.dealCom.updated}`)
                      : 'Skipped / Error'}
                  </span>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#8b5cf6', marginBottom: '4px' }}>📱 DrPhone Wholesale:</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    {fullSyncResult.data.results.drPhone?.success 
                      ? (lang === 'ar' ? `المعالج: ${fullSyncResult.data.results.drPhone.processed}، المضاف: ${fullSyncResult.data.results.drPhone.inserted}، المحدث: ${fullSyncResult.data.results.drPhone.updated}` : `Processed: ${fullSyncResult.data.results.drPhone.processed}, New: ${fullSyncResult.data.results.drPhone.inserted}, Updated: ${fullSyncResult.data.results.drPhone.updated}`)
                      : 'Skipped / Error'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
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
