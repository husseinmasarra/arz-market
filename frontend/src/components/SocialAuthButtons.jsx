import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function SocialAuthButtons({ onSuccess, onError }) {
  const { lang, t } = useApp();
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [promptModal, setPromptModal] = useState(null); // 'google' | 'apple'
  const [promptEmail, setPromptEmail] = useState('');
  const [promptName, setPromptName] = useState('');

  // Handle Google Sign In
  const handleGoogleClick = async () => {
    setLoadingProvider('google');
    try {
      setPromptModal('google');
    } catch (err) {
      console.error('Google sign in error:', err);
      if (onError) onError(err.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  // Handle Apple Sign In
  const handleAppleClick = async () => {
    setLoadingProvider('apple');
    try {
      setPromptModal('apple');
    } catch (err) {
      console.error('Apple sign in error:', err);
      if (onError) onError(err.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!promptEmail) return;

    const provider = promptModal;
    setLoadingProvider(provider);
    try {
      if (provider === 'google') {
        await loginWithGoogle({
          email: promptEmail.trim(),
          name: promptName.trim() || promptEmail.split('@')[0],
          google_id: `g_${Date.now()}`
        });
      } else if (provider === 'apple') {
        await loginWithApple({
          email: promptEmail.trim(),
          name: promptName.trim() || promptEmail.split('@')[0],
          apple_id: `appl_${Date.now()}`
        });
      }
      setPromptModal(null);
      setPromptEmail('');
      setPromptName('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Social login error:', err);
      if (onError) onError(err.message);
      else alert(err.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '12px 0',
        color: 'var(--text-light)',
        fontSize: '0.78rem'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        <span style={{ padding: '0 12px', fontWeight: '600' }}>
          {lang === 'ar' ? 'أو المتابعة عبر' : 'Or continue with'}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
      </div>

      {/* Social Buttons Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loadingProvider !== null}
          className="input-field"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            padding: '10px 16px',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: loadingProvider ? 'wait' : 'pointer',
            transition: 'background-color 0.2s, box-shadow 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
        >
          {/* Google SVG Logo */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>
            {loadingProvider === 'google' 
              ? (lang === 'ar' ? 'جاري الاتصال بـ Google...' : 'Connecting to Google...')
              : (lang === 'ar' ? 'المتابعة باستخدام Google' : 'Continue with Google')}
          </span>
        </button>

        {/* Apple ID Sign In Button */}
        <button
          type="button"
          onClick={handleAppleClick}
          disabled={loadingProvider !== null}
          className="input-field"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: '#000000',
            color: '#ffffff',
            border: '1px solid #000000',
            borderRadius: '10px',
            padding: '10px 16px',
            fontWeight: '600',
            fontSize: '0.88rem',
            cursor: loadingProvider ? 'wait' : 'pointer',
            transition: 'opacity 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {/* Apple SVG Logo */}
          <svg width="18" height="18" viewBox="0 0 170 170" fill="white">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.2-7.85-9.35-16.74-12.44-26.68-3.09-9.93-4.64-19.54-4.64-28.82 0-14.07 3.69-25.77 11.06-35.1 7.37-9.33 16.59-14.05 27.67-14.16 4.79 0 10.05 1.25 15.78 3.75 5.73 2.5 9.53 3.81 11.4 3.92 1.41-.11 5.38-1.46 11.89-4.04 6.52-2.58 11.89-3.75 16.12-3.52 12.08.77 21.6 5.27 28.56 13.5-10.77 6.52-16.03 15.54-15.79 27.05.24 8.92 3.63 16.42 10.18 22.5 6.55 6.08 14.34 9.46 23.36 10.13-2.07 6.3-4.58 12.63-7.53 18.98zM119.22 33.72c0-7.39 2.67-14.34 8.01-20.85 5.34-6.51 11.96-10.87 19.86-13.07.24 1.3.36 2.49.36 3.56 0 7.28-2.82 14.34-8.47 21.18-5.65 6.84-12.44 11.08-20.37 12.71-.24-.76-.36-1.94-.36-3.53z" />
          </svg>
          <span>
            {loadingProvider === 'apple' 
              ? (lang === 'ar' ? 'جاري الاتصال بـ Apple ID...' : 'Connecting to Apple ID...')
              : (lang === 'ar' ? 'المتابعة باستخدام Apple ID' : 'Continue with Apple ID')}
          </span>
        </button>
      </div>

      {/* Quick Authentication Prompt Modal */}
      {promptModal && (
        <div 
          onClick={() => setPromptModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(6px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-scale dashboard-card"
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: promptModal === 'google' ? '#f3f4f6' : '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px'
              }}>
                {promptModal === 'google' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 170 170" fill="white">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.2-7.85-9.35-16.74-12.44-26.68-3.09-9.93-4.64-19.54-4.64-28.82 0-14.07 3.69-25.77 11.06-35.1 7.37-9.33 16.59-14.05 27.67-14.16 4.79 0 10.05 1.25 15.78 3.75 5.73 2.5 9.53 3.81 11.4 3.92 1.41-.11 5.38-1.46 11.89-4.04 6.52-2.58 11.89-3.75 16.12-3.52 12.08.77 21.6 5.27 28.56 13.5-10.77 6.52-16.03 15.54-15.79 27.05.24 8.92 3.63 16.42 10.18 22.5 6.55 6.08 14.34 9.46 23.36 10.13-2.07 6.3-4.58 12.63-7.53 18.98zM119.22 33.72c0-7.39 2.67-14.34 8.01-20.85 5.34-6.51 11.96-10.87 19.86-13.07.24 1.3.36 2.49.36 3.56 0 7.28-2.82 14.34-8.47 21.18-5.65 6.84-12.44 11.08-20.37 12.71-.24-.76-.36-1.94-.36-3.53z" />
                  </svg>
                )}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                {promptModal === 'google' 
                  ? (lang === 'ar' ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google')
                  : (lang === 'ar' ? 'تسجيل الدخول بـ Apple ID' : 'Sign in with Apple ID')}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px' }}>
                {lang === 'ar' 
                  ? 'أدخل بريدك الإلكتروني وسيتم تسجيل دخولك فوراً'
                  : 'Enter your email to authenticate instantly'}
              </p>
            </div>

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} *
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder={promptModal === 'google' ? 'example@gmail.com' : 'example@icloud.com'}
                  value={promptEmail}
                  onChange={(e) => setPromptEmail(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">
                  {lang === 'ar' ? 'الاسم الكامل (اختياري)' : 'Full Name (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'اسمك الكريم' : 'Your name'}
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={loadingProvider !== null}
                  className="input-field"
                  style={{
                    backgroundColor: promptModal === 'google' ? '#4285F4' : '#000000',
                    color: 'white',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {loadingProvider 
                    ? (lang === 'ar' ? 'جاري التحقق...' : 'Authenticating...')
                    : (lang === 'ar' ? 'تأكيد ودخول' : 'Confirm & Login')}
                </button>
                <button
                  type="button"
                  onClick={() => setPromptModal(null)}
                  className="input-field"
                  style={{
                    width: 'auto',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontWeight: '600',
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
    </div>
  );
}
