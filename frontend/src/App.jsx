import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { useChat } from './context/ChatContext';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetails from './components/ProductDetails';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Chat from './components/Chat';
import PwaInstallBanner from './components/PwaInstallBanner';
import BestSellersSection from './components/BestSellersSection';
import NewArrivalsSection from './components/NewArrivalsSection';
import SocialAuthButtons from './components/SocialAuthButtons';
import PrivacyPolicyView from './components/PrivacyPolicyView';
import TermsOfServiceView from './components/TermsOfServiceView';
import DeleteAccountView from './components/DeleteAccountView';
import CustomerDashboard from './components/CustomerDashboard';
import WelcomeDiscountModal from './components/WelcomeDiscountModal';

// Admin panel imports
import AdminDashboard from './components/admin/AdminDashboard';

import { Key, User, FileText, ChevronDown, Check, Star, RefreshCw, Fingerprint, Smartphone, Globe } from 'lucide-react';

// Clean category names strictly separating Arabic and English
function getCategoryName(cat, currentLang) {
  if (!cat) return '';
  const raw = currentLang === 'ar' 
    ? (cat.name_ar || cat.name_en || '') 
    : (cat.name_en || cat.name_ar || '');
  if (!raw) return '';
  const str = String(raw).trim();
  const match = str.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    const p1 = match[1].trim();
    const p2 = match[2].trim();
    const isP1Ar = /[\u0600-\u06FF]/.test(p1);
    return currentLang === 'ar' ? (isP1Ar ? p1 : p2) : (isP1Ar ? p2 : p1);
  }
  return str;
}

export default function App() {
  const { lang, formatPrice, t, apiBase, settings, currency, apiHost } = useApp();
  const { user, login, register, token } = useAuth();
  const { setIsCartOpen, cartItems } = useCart();
  const { isChatOpen, setIsChatOpen } = useChat();

  const [currentView, setCurrentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam) return viewParam;
    const path = window.location.pathname.toLowerCase();
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('terms')) return 'terms';
    if (path.includes('delete-account') || path.includes('account-deletion')) return 'delete-account';
    return 'store';
  });

  // Catalog states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); // Detail modal
  const [showCheckout, setShowCheckout] = useState(false);

  // Search & Filter states
  const [searchVal, setSearchVal] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category_id') || params.get('category') || '';
  });
  // Hierarchical category: when user clicks a parent, we show its children
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');

  // Dropdown UI toggles
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Auth form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Enhanced security signup states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Biometrics enrollment states
  const [showBiometricEnrollPrompt, setShowBiometricEnrollPrompt] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);
  
  // First-Time Welcome 10% Discount Modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState('');

  // User orders history state
  const [userOrders, setUserOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      let url = `${apiBase}/products?`;
      if (selectedCategory) url += `category_id=${encodeURIComponent(selectedCategory)}&`;
      if (searchVal) url += `search=${encodeURIComponent(searchVal)}&`;
      if (minPrice) url += `min_price=${encodeURIComponent(minPrice)}&`;
      if (maxPrice) url += `max_price=${encodeURIComponent(maxPrice)}&`;
      if (minRating) url += `min_rating=${encodeURIComponent(minRating)}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Fetch products client error:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBase}/categories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data.filter(c => c && c.active !== 0));
        } else {
          setCategories([]);
        }
      }
    } catch (err) {
      console.error('Fetch categories client error:', err);
      setCategories([]);
    }
  };

  const fetchUserOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/orders/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Smooth debounced fetch when user is typing in search bar
    const delay = searchVal ? 220 : 0;
    const timer = setTimeout(() => {
      if (selectedCategory || searchVal || minPrice || maxPrice || minRating) {
        fetchProducts();
      } else {
        setProducts([]);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchVal, minPrice, maxPrice, minRating]);

  // Analytics: Track visitor page views
  useEffect(() => {
    // Generate a unique visitor ID if it doesn't exist yet
    let visitorId = localStorage.getItem('arz_mart_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('arz_mart_visitor_id', visitorId);
    }

    // Report page hit to backend
    const trackPageHit = async () => {
      try {
        await fetch(`${apiBase}/analytics/hit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: visitorId,
            url: window.location.pathname + window.location.search
          })
        });
      } catch (err) {
        console.error('Failed to report analytics hit:', err);
      }
    };

    trackPageHit();
  }, [currentView]);

  useEffect(() => {
    fetchCategories();
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'orders') {
      fetchUserOrders();
    }
  }, [currentView, token]);

  // Dynamic SEO Page Title and Meta Tags
  useEffect(() => {
    let title = lang === 'ar' 
      ? 'ArzMart | متجر أرز مارت - أفضل عروض الهواتف والإلكترونيات في لبنان' 
      : 'ArzMart | Online Shopping & Electronics in Lebanon';
    let description = lang === 'ar'
      ? 'تسوق أفضل العروض على الهواتف الذكية، الأجهزة اللوحية، اللابتوبات، والإلكترونيات في لبنان مع أرز مارت ArzMart. دفع عند الاستلام وتوصيل سريع.'
      : 'Shop the best deals on smartphones, electronics, tablets, and accessories in Lebanon with ArzMart. Cash on delivery & fast shipping across Lebanon.';

    if (selectedProduct) {
      const prodName = (lang === 'ar' ? selectedProduct.name_ar : selectedProduct.name_en) || selectedProduct.title || 'ArzMart';
      title = `${prodName} | ArzMart`;
      const prodDesc = (lang === 'ar' ? selectedProduct.description_ar : selectedProduct.description_en) || selectedProduct.description || '';
      if (prodDesc && typeof prodDesc === 'string') {
        description = prodDesc.substring(0, 160);
      }
    } else if (selectedCategory && categories.length > 0) {
      const cat = categories.find(c => String(c.id) === String(selectedCategory));
      if (cat) {
        const catName = getCategoryName(cat, lang);
        title = `${catName} | ArzMart`;
        description = lang === 'ar'
          ? `تسوق أحدث منتجات ${catName} بأفضل الأسعار مع توصيل سريع في لبنان من أرز مارت.`
          : `Shop latest ${catName} products with best prices and fast delivery in Lebanon from ArzMart.`;
      }
    } else if (currentView === 'admin') {
      title = lang === 'ar' ? 'لوحة التحكم | أرز مارت' : 'Admin Panel | ArzMart';
    } else if (currentView === 'orders') {
      title = lang === 'ar' ? 'طلباتي | أرز مارت' : 'My Orders | ArzMart';
    }

    document.title = title;

    // Update Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);

    // Update OG Title & Description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
  }, [selectedProduct, selectedCategory, categories, currentView, lang]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') || 'store';
    const tabParam = params.get('tab');
    
    if (currentView !== viewParam) {
      let url = `/?view=${currentView}`;
      if (currentView === 'admin') {
        const tab = tabParam || 'products';
        url += `&tab=${tab}`;
      }
      window.history.pushState(null, '', url);
    }
  }, [currentView]);

  // Always scroll to the top on first load and disable browser restoring mid-page scroll
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Always scroll to the top when switching views, selecting a category, or searching
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentView, selectedCategory]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'store';
      const cat = params.get('category_id') || params.get('category') || '';
      setCurrentView(view);
      setSelectedCategory(cat);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle Biometric Login authentication
  const handleBiometricLogin = async () => {
    const savedUser = localStorage.getItem('biometric_username');
    const savedPass = localStorage.getItem('biometric_password');
    if (savedUser && savedPass) {
      try {
        setAuthError('');
        await login(savedUser, savedPass);
        setCurrentView('store');
      } catch (err) {
        setAuthError(err.message || (lang === 'ar' ? 'فشلت عملية المصادقة بالبصمة تلقائياً' : 'Biometric login failed automatically'));
      }
    }
  };

  // Setup biometric callbacks injected by native app
  useEffect(() => {
    window.onBiometricSuccess = () => {
      if (window.isEnrollingBiometrics && tempCredentials) {
        localStorage.setItem('biometric_username', tempCredentials.username);
        localStorage.setItem('biometric_password', tempCredentials.password);
        window.isEnrollingBiometrics = false;
        setShowBiometricEnrollPrompt(false);
        setTempCredentials(null);
        alert(lang === 'ar' ? 'تم تفعيل الدخول بالبصمة بنجاح!' : 'Fingerprint login enabled successfully!');
        
        if (window.onBiometricPromptClose) {
          window.onBiometricPromptClose();
        }
      } else {
        handleBiometricLogin();
      }
    };

    window.onBiometricFailed = (msg) => {
      window.isEnrollingBiometrics = false;
      let localizedMsg = msg;
      if (msg === 'device_no_hardware') {
        localizedMsg = lang === 'ar' ? 'الجهاز لا يدعم البصمة' : 'Device does not support fingerprint';
      } else if (msg === 'device_hw_unavailable') {
        localizedMsg = lang === 'ar' ? 'مستشعر البصمة غير متوفر حالياً' : 'Biometric sensor unavailable';
      } else if (msg === 'device_no_biometrics_enrolled') {
        localizedMsg = lang === 'ar' ? 'لا توجد بصمات مسجلة في هذا الجهاز. يرجى إضافتها من إعدادات الهاتف' : 'No fingerprints registered on this device. Please add one in system settings';
      } else if (msg === 'Authentication failed' || msg === 'فشلت المصادقة') {
        localizedMsg = lang === 'ar' ? 'فشلت المصادقة بالبصمة' : 'Biometric authentication failed';
      }
      
      alert(localizedMsg || (lang === 'ar' ? 'فشلت مصادقة البصمة' : 'Biometric authentication failed'));
      setShowBiometricEnrollPrompt(false);
      setTempCredentials(null);
      
      if (window.onBiometricPromptClose) {
        window.onBiometricPromptClose();
      }
    };

    return () => {
      window.onBiometricSuccess = null;
      window.onBiometricFailed = null;
    };
  }, [tempCredentials, lang]);

  // Helper for handling successful manual authentication (login/register)
  const handleAuthSuccess = (userVal, passVal, onNext) => {
    if (window.AndroidApp && !localStorage.getItem('biometric_username')) {
      setTempCredentials({ username: userVal, password: passVal });
      setShowBiometricEnrollPrompt(true);
      window.onBiometricPromptClose = () => {
        onNext();
      };
    } else {
      onNext();
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await login(username, password);
      const onNext = () => {
        setCurrentView('store');
        setUsername('');
        setPassword('');
      };
      handleAuthSuccess(username, password, onNext);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (password !== confirmPassword) {
      setAuthError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    try {
      const data = await register(username, password, fullName, phone, email);
      await login(username, password);
      
      setWelcomeUserName(fullName || username);
      setShowWelcomeModal(true);

      const onNext = () => {
        setCurrentView('store');
        setUsername('');
        setPassword('');
        setFullName('');
        setPhone('');
        setEmail('');
        setConfirmPassword('');
      };
      handleAuthSuccess(username, password, onNext);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Safe dropdown toggle
  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  const handleSelectCategory = (catId) => {
    const idStr = catId ? String(catId) : '';
    setSelectedCategory(idStr);
    const url = new URL(window.location.href);
    if (idStr) {
      url.searchParams.set('category_id', idStr);
      url.searchParams.delete('category');
    } else {
      url.searchParams.delete('category_id');
      url.searchParams.delete('category');
    }
    const searchStr = url.searchParams.toString();
    window.history.pushState(null, '', url.pathname + (searchStr ? '?' + searchStr : ''));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    const url = new URL(window.location.href);
    url.searchParams.delete('category_id');
    url.searchParams.delete('category');
    const searchStr = url.searchParams.toString();
    window.history.pushState(null, '', url.pathname + (searchStr ? '?' + searchStr : ''));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header Navigation */}
      <Header 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        searchVal={searchVal} 
        setSearchVal={setSearchVal} 
        onLogoClick={() => {
          setCurrentView('store');
          setSelectedProduct(null);
          setShowCheckout(false);
          setSelectedCategory('');
          setSearchVal('');
          setMinPrice('');
          setMaxPrice('');
          setMinRating('');
          setIsCartOpen(false);
          window.history.pushState(null, '', '/');
        }}
      />


      {/* Biometric Enrollment Prompt Modal */}
      {showBiometricEnrollPrompt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div className="animate-scale" style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '30px',
            borderRadius: '16px',
            border: '2px solid #10b981',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Fingerprint size={36} className="animate-pulse" />
            </div>

            <h3 style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: '1.25rem' }}>
              {lang === 'ar' ? 'تفعيل الدخول بالبصمة' : 'Enable Fingerprint Login'}
            </h3>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {lang === 'ar' 
                ? 'هل ترغب في حفظ بيانات الدخول محلياً على هذا الجهاز وتفعيل تسجيل الدخول ببصمة الإصبع مستقبلاً؟' 
                : 'Would you like to save your credentials locally on this device and enable fingerprint login for future sessions?'}
            </p>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '10px' }}>
              <button
                onClick={() => {
                  window.isEnrollingBiometrics = true;
                  if (window.AndroidApp) {
                    window.AndroidApp.triggerFingerprintAuth();
                  }
                }}
                className="input-field"
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {lang === 'ar' ? 'تفعيل الآن' : 'Enable Now'}
              </button>
              
              <button
                onClick={() => {
                  setShowBiometricEnrollPrompt(false);
                  setTempCredentials(null);
                  if (window.onBiometricPromptClose) {
                    window.onBiometricPromptClose();
                  }
                }}
                className="input-field"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {lang === 'ar' ? 'ليس الآن' : 'Not Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Views router */}
      {currentView === 'admin' ? (
        <AdminDashboard setCurrentView={setCurrentView} />
      ) : currentView === 'privacy' ? (
        <PrivacyPolicyView setCurrentView={setCurrentView} />
      ) : currentView === 'terms' ? (
        <TermsOfServiceView setCurrentView={setCurrentView} />
      ) : currentView === 'delete-account' ? (
        <DeleteAccountView setCurrentView={setCurrentView} />
      ) : currentView === 'login' || currentView === 'register' ? (
        
        /* AUTH VIEWS (LOGIN / REGISTER) */
        <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="animate-fade dashboard-card" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '30px',
            gap: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {currentView === 'login' ? t('login') : t('register')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px' }}>
                {currentView === 'login' ? t('welcome_back') : t('create_account')}
              </p>
            </div>

            {authError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>
                {authError}
              </div>
            )}

            <form onSubmit={currentView === 'login' ? handleLoginSubmit : handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="input-label">
                  {currentView === 'login' ? (lang === 'ar' ? 'الاسم الكامل' : 'Full Name') : t('username')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    autoComplete="off" // No usernames hints
                    className="input-field"
                    placeholder={currentView === 'login' 
                      ? (lang === 'ar' ? 'أدخل اسمك الكامل أو رقم الهاتف' : 'Enter your full name or phone') 
                      : (lang === 'ar' ? 'اسم المستخدم' : 'Username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingStart: '36px' }}
                  />
                  <User size={16} style={{ position: 'absolute', top: '12px', left: lang === 'ar' ? 'auto' : '12px', right: lang === 'ar' ? '12px' : 'auto', color: 'var(--text-light)' }} />
                </div>
              </div>

              {currentView === 'register' && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="input-label">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{ paddingStart: '36px' }}
                        placeholder={lang === 'ar' ? 'الاسم الثلاثي مثلاً' : 'e.g. John Doe'}
                      />
                      <User size={16} style={{ position: 'absolute', top: '12px', left: lang === 'ar' ? 'auto' : '12px', right: lang === 'ar' ? '12px' : 'auto', color: 'var(--text-light)' }} />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="input-label">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="tel"
                        required
                        className="input-field"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ paddingStart: '36px' }}
                        placeholder="03 123 456"
                      />
                      <Smartphone size={16} style={{ position: 'absolute', top: '12px', left: lang === 'ar' ? 'auto' : '12px', right: lang === 'ar' ? '12px' : 'auto', color: 'var(--text-light)' }} />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="input-label">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        required
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ paddingStart: '36px' }}
                        placeholder="example@mail.com"
                      />
                      <Globe size={16} style={{ position: 'absolute', top: '12px', left: lang === 'ar' ? 'auto' : '12px', right: lang === 'ar' ? '12px' : 'auto', color: 'var(--text-light)' }} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="input-label">{t('password')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    autocomplete="new-password" // No username auto-linking
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingStart: '36px' }}
                  />
                  <Key size={16} style={{ position: 'absolute', top: '12px', left: lang === 'ar' ? 'auto' : '12px', right: lang === 'ar' ? '12px' : 'auto', color: 'var(--text-light)' }} />
                </div>
              </div>

              {currentView === 'register' && (
                <div>
                  <label className="input-label">{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      className="input-field"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingStart: '36px' }}
                    />
                    <Key size={16} style={{ position: 'absolute', top: '12px', left: lang === 'ar' ? 'auto' : '12px', right: lang === 'ar' ? '12px' : 'auto', color: 'var(--text-light)' }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="input-field"
                style={{ backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', marginTop: '10px' }}
              >
                {currentView === 'login' ? t('login') : t('register')}
              </button>

              {currentView === 'login' && window.AndroidApp && localStorage.getItem('biometric_username') && (
                <button
                  type="button"
                  onClick={() => {
                    window.isEnrollingBiometrics = false;
                    if (window.AndroidApp) {
                      window.AndroidApp.triggerFingerprintAuth();
                    }
                  }}
                  className="input-field animate-pulse"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid #10b981',
                    fontWeight: '700',
                    cursor: 'pointer',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Fingerprint size={18} />
                  <span>{lang === 'ar' ? 'تسجيل الدخول بالبصمة' : 'Login with Fingerprint'}</span>
                </button>
              )}
            </form>

            {/* Google and Apple ID Sign In */}
            <SocialAuthButtons 
              onSuccess={(authData) => {
                setAuthError('');
                if (authData && authData.is_new_user) {
                  setWelcomeUserName(authData.user?.full_name || authData.user?.username || '');
                  setShowWelcomeModal(true);
                }
                setCurrentView('store');
              }}
              onError={(msg) => setAuthError(msg)}
            />

            <button
              onClick={() => {
                setAuthError('');
                setUsername('');
                setPassword('');
                setFullName('');
                setPhone('');
                setEmail('');
                setConfirmPassword('');
                setCurrentView(currentView === 'login' ? 'register' : 'login');
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '700',
                textAlign: 'center',
                marginTop: '10px'
              }}
            >
              {currentView === 'login' ? t('dont_have_account') : t('already_have_account')}
            </button>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', textAlign: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              {lang === 'ar' ? (
                <span>
                  بتسجيل الدخول أو التسجيل، أنت توافق على{' '}
                  <button
                    type="button"
                    onClick={() => { setCurrentView('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}
                  >
                    شروط الاستخدام
                  </button>
                  {' '}و{' '}
                  <button
                    type="button"
                    onClick={() => { setCurrentView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}
                  >
                    سياسة الخصوصية
                  </button>
                  .
                </span>
              ) : (
                <span>
                  By logging in or registering, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => { setCurrentView('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => { setCurrentView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent-blue)', textDecoration: 'underline', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              )}
            </div>
          </div>
        </div>

      ) : (currentView === 'orders' || currentView === 'customer-dashboard' || currentView === 'account') ? (

        /* USER DEDICATED CUSTOMER DASHBOARD */
        <CustomerDashboard 
          onGoToStore={() => {
            setCurrentView('store');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigate={(view) => {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

      ) : (
        
        /* STOREFRONT CATALOG VIEW */
        <>
          <div className="container" style={{ flex: '1', paddingBottom: '40px' }}>
            
            {/* Hero Banner section - only on homepage */}
            {selectedCategory === '' && !searchVal && <Hero />}

            {/* Dropdown filters and search toggle */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={toggleFilterDropdown}
                className="input-field"
                style={{
                  width: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '700',
                  padding: '8px 16px',
                  backgroundColor: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  borderRadius: '20px'
                }}
              >
                <span>{t('filters')}</span>
                <ChevronDown size={14} style={{ transform: showFilterDropdown ? 'rotate(180deg)' : 'none' }} />
              </button>

              {/* Reset filters button if active */}
              {(selectedCategory || minPrice || maxPrice || minRating) && (
                <button
                  onClick={clearFilters}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  إعادة تعيين (Clear Filters)
                </button>
              )}
            </div>

            {/* Dropdown Filters Form Overlay */}
            {showFilterDropdown && (
              <div className="no-print animate-fade" style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {/* Category Dropdown */}
                <div>
                  <label className="input-label">{t('categories')}</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => handleSelectCategory(e.target.value)}
                    className="input-field"
                  >
                    <option value="">{t('all_categories')}</option>
                    {(Array.isArray(categories) ? categories : []).filter(c => c && !c.parent_id).map(parent => (
                      <optgroup key={parent.id} label={getCategoryName(parent, lang)}>
                        <option value={parent.id}>{getCategoryName(parent, lang)} ({lang === 'ar' ? 'الكل' : 'All'})</option>
                        {(Array.isArray(categories) ? categories : []).filter(c => c && String(c.parent_id) === String(parent.id)).map(sub => (
                          <option key={sub.id} value={sub.id}>
                            &nbsp;&nbsp;↳ {getCategoryName(sub, lang)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Min Price Slider/Input */}
                <div>
                  <label className="input-label">{t('min_rating')}</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="input-field"
                  >
                    <option value="">كل التقييمات</option>
                    <option value="4">4 {t('rating_stars')}</option>
                    <option value="3">3 {t('rating_stars')}</option>
                    <option value="2">2 {t('rating_stars')}</option>
                  </select>
                </div>

                {/* Price Slider range */}
                <div>
                  <label className="input-label">{t('price_range')} (USD)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Min"
                      className="input-field"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="input-field"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Storefront Renderer */}
            {selectedCategory === '' && !searchVal ? (
              /* --- 1. GRAND CATEGORY CARDS ONLY VIEW (DEFAULT ENTRY POINT) --- */
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Best Sellers Strip */}
                <BestSellersSection onProductClick={(p) => setSelectedProduct(p)} />

                {/* New Arrivals Strip */}
                <NewArrivalsSection onProductClick={(p) => setSelectedProduct(p)} />

                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '16px' }}>
                  {lang === 'ar' ? 'تصفح أقسام المتجر الرئيسية' : 'Browse Main Categories'}
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '24px'
                }}>
                  {(Array.isArray(categories) ? categories : []).filter(c => c && !c.parent_id).map((cat) => {
                    const catName = getCategoryName(cat, lang);
                    const subcategories = (Array.isArray(categories) ? categories : []).filter(c => c && String(c.parent_id) === String(cat.id));
                    const subCount = subcategories.length;
                    
                    let bgImg = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=500&q=80';
                    const catImg = cat.image_url;
                    const imageUrl = (typeof catImg === 'string' && catImg.trim().length > 0)
                      ? (catImg.startsWith('http') || catImg.startsWith('data:') ? catImg : `${apiHost}${catImg}`)
                      : bgImg;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className="dashboard-card animate-fade"
                        style={{
                          height: '240px',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '18px',
                          cursor: 'pointer',
                          padding: '0',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-6px)';
                          e.currentTarget.style.boxShadow = '0 16px 32px rgba(0,0,0,0.22)';
                          const img = e.currentTarget.querySelector('.cat-bg-img');
                          if (img) img.style.transform = 'scale(1.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                          const img = e.currentTarget.querySelector('.cat-bg-img');
                          if (img) img.style.transform = 'scale(1.0)';
                        }}
                      >
                        {/* Background Cover image */}
                        <div 
                          className="cat-bg-img"
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: `linear-gradient(to top, rgba(15, 23, 42, 0.92) 0%, rgba(15, 23, 42, 0.45) 50%, rgba(15, 23, 42, 0.1) 100%), url(${imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'transform 0.5s ease'
                          }} 
                        />

                        {/* Sub-category count badge */}
                        {subCount > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '14px',
                            insetInlineEnd: '14px',
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(8px)',
                            color: '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            zIndex: 4
                          }}>
                            {subCount} {lang === 'ar' ? 'أقسام فرعية' : 'Sub-categories'}
                          </div>
                        )}

                        {/* Title text overlay */}
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          padding: '20px',
                          color: 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          zIndex: 5
                        }}>
                          <h3 style={{ 
                            fontSize: '1.35rem', 
                            fontWeight: '800', 
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            margin: 0
                          }}>
                            {catName}
                          </h3>
                          <span style={{ 
                            fontSize: '0.82rem', 
                            color: '#38bdf8', 
                            fontWeight: '700',
                            letterSpacing: '0.3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {lang === 'ar' ? 'تصفح القسم والمنتجات ←' : 'Browse category →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* --- 2. PRODUCT GRID & NAVIGATION VIEW --- */
              <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {(() => {
                  const catList = Array.isArray(categories) ? categories : [];
                  const currentCat = catList.find(c => c && String(c.id) === String(selectedCategory));
                  const parentId = currentCat ? (currentCat.parent_id || currentCat.id) : null;
                  const parentCat = parentId ? catList.find(c => c && String(c.id) === String(parentId)) : null;
                  const availableSubCats = parentId ? catList.filter(c => c && String(c.parent_id) === String(parentId)) : [];

                  return (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderBottom: '2px solid var(--border-color)',
                      paddingBottom: '16px'
                    }}>
                      {/* Top bar: Back button + Title */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            onClick={clearFilters}
                            className="input-field"
                            style={{
                              width: 'auto',
                              padding: '8px 18px',
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '0.85rem'
                            }}
                          >
                            {lang === 'ar' ? '← العودة للأقسام الرئيسية' : '← Back to Main Categories'}
                          </button>
                          
                          <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                            {parentCat ? (
                              <span>
                                {getCategoryName(parentCat, lang)}
                                {currentCat && currentCat.parent_id && String(currentCat.parent_id) !== String(currentCat.id) ? (
                                  <span style={{ fontSize: '1.05rem', color: 'var(--accent-blue)', marginInlineStart: '8px', fontWeight: '600' }}>
                                    / {getCategoryName(currentCat, lang)}
                                  </span>
                                ) : ''}
                              </span>
                            ) : (
                              currentCat ? getCategoryName(currentCat, lang) : (lang === 'ar' ? 'نتائج البحث' : 'Search Results')
                            )}
                          </h2>
                        </div>
                      </div>

                      {/* Sub-categories Pills Strip */}
                      {availableSubCats.length > 0 && (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          overflowX: 'auto',
                          paddingBottom: '6px',
                          scrollbarWidth: 'none'
                        }}>
                          {/* All in Parent Pill */}
                          <button
                            onClick={() => handleSelectCategory(parentId)}
                            style={{
                              whiteSpace: 'nowrap',
                              padding: '8px 16px',
                              fontSize: '0.82rem',
                              borderRadius: '20px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '700',
                              backgroundColor: selectedCategory === String(parentId) ? 'var(--accent-red-gold)' : 'var(--bg-secondary)',
                              color: selectedCategory === String(parentId) ? 'white' : 'var(--text-primary)',
                              boxShadow: selectedCategory === String(parentId) ? 'var(--shadow-sm)' : 'none',
                              outline: selectedCategory === String(parentId) ? 'none' : '1px solid var(--border-color)'
                            }}
                          >
                            {lang === 'ar' ? 'كل الأقسام' : 'All Sub-categories'}
                          </button>

                          {/* Individual Subcategory Pills */}
                          {availableSubCats.map((sub) => {
                            if (!sub) return null;
                            const isSubActive = selectedCategory === String(sub.id);
                            return (
                              <button
                                key={sub.id}
                                onClick={() => handleSelectCategory(sub.id)}
                                style={{
                                  whiteSpace: 'nowrap',
                                  padding: '8px 16px',
                                  fontSize: '0.82rem',
                                  borderRadius: '20px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: isSubActive ? '700' : '500',
                                  backgroundColor: isSubActive ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                                  color: isSubActive ? 'white' : 'var(--text-secondary)',
                                  boxShadow: isSubActive ? 'var(--shadow-sm)' : 'none',
                                  outline: isSubActive ? 'none' : '1px solid var(--border-color)'
                                }}
                              >
                                {getCategoryName(sub, lang)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Products Grid */}
                {loadingProducts ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '80px 0',
                    color: 'var(--text-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid var(--border-color)',
                      borderTopColor: 'var(--accent-red-gold)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                      {lang === 'ar' ? 'جاري جلب المنتجات...' : 'Loading products...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '24px'
                    }}>
                      {(Array.isArray(products) ? products : []).map((p) => p && (
                        <ProductCard 
                          key={p.id || Math.random()} 
                          product={p} 
                          onDetailsClick={setSelectedProduct} 
                        />
                      ))}
                    </div>

                    {(!products || products.length === 0) && (
                      <div style={{
                        textAlign: 'center',
                        padding: '80px 0',
                        color: 'var(--text-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <FileText size={48} strokeWidth={1} />
                        <p style={{ fontWeight: '600' }}>{t('no_products')}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </>
      )}

      {/* Footer copyright */}
      <footer className="no-print" style={{
        marginTop: 'auto',
        padding: '20px 0',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-light)'
      }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div>
            &copy; {new Date().getFullYear()} {settings?.app_name || 'Arz-Mart'}. All Rights Reserved. Lebanese Market COD Store.
          </div>
          {settings?.contact_email && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span>{lang === 'ar' ? 'للتواصل والدعم الفني:' : 'Contact & Support:'}</span>
              <a href={`mailto:${settings.contact_email}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 'bold' }}>
                {settings.contact_email}
              </a>
            </div>
          )}

          {/* Public Store Visitor Counter Badge */}
          {settings?.show_visitor_counter !== 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 14px',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'inline-block',
                boxShadow: '0 0 6px #10b981'
              }} />
              <span>{lang === 'ar' ? 'زوار المتجر:' : 'Store Visitors:'}</span>
              <strong style={{ color: 'var(--accent-blue)', fontWeight: '800' }}>
                {Number(settings?.visitor_count || settings?.unique_visitors || 0).toLocaleString()}
              </strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
            <button
              onClick={() => {
                setCurrentView('privacy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              {t('privacy_policy')}
            </button>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <button
              onClick={() => {
                setCurrentView('terms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              {t('terms_of_service')}
            </button>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <button
              onClick={() => {
                setCurrentView('delete-account');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.8rem',
                textDecoration: 'underline'
              }}
            >
              {t('delete_account')}
            </button>
          </div>
        </div>
      </footer>

      {/* 4. Product Details Modal */}
      {selectedProduct && (
        <ProductDetails 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onRefresh={fetchProducts}
        />
      )}

      {/* 5. Cart Drawer overlay */}
      <Cart onCheckoutClick={() => setShowCheckout(true)} />

      {/* 6. Checkout Modal dialog */}
      {showCheckout && (
        <Checkout onClose={() => setShowCheckout(false)} />
      )}

      {/* 7. Live Customer Chat Panel */}
      <Chat />

      {/* 8. PWA Install Notification Banner */}
      <PwaInstallBanner />

      {/* 9. First-Time Registration Welcome 10% Discount Celebration Modal */}
      <WelcomeDiscountModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userName={welcomeUserName}
        onStartShopping={() => {
          setShowWelcomeModal(false);
          setCurrentView('store');
        }}
      />

    </div>
  );
}
