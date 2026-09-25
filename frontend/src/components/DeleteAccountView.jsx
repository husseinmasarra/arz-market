import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert, UserCheck } from 'lucide-react';

export default function DeleteAccountView({ setCurrentView }) {
  const { lang, apiBase, settings } = useApp();
  const { user, logout, token } = useAuth();
  const isAr = lang === 'ar';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Authenticated user direct deletion
  const handleDeleteLoggedInUser = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await fetch(`${apiBase}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(isAr ? (data.error_ar || 'فشل حذف الحساب') : (data.error_en || 'Failed to delete account'));
      }
      setSuccessMsg(isAr ? data.message_ar : data.message_en);
      setShowConfirmModal(false);
      setTimeout(() => {
        logout();
      }, 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Error deleting account');
    } finally {
      setSubmitting(false);
    }
  };

  // Public deletion form submission
  const handlePublicSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg(isAr ? 'الرجاء إدخال اسم المستخدم، البريد، أو رقم الهاتف' : 'Please provide username, email or phone');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await fetch(`${apiBase}/auth/request-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, reason })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(isAr ? (data.error_ar || 'فشل معالجة الطلب') : (data.error_en || 'Failed to process request'));
      }
      setSuccessMsg(isAr ? data.message_ar : data.message_en);
      setIdentifier('');
      setPassword('');
      setReason('');
    } catch (err) {
      setErrorMsg(err.message || 'Error processing deletion request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ flex: '1', padding: '30px 16px', maxWidth: '750px' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => {
            setCurrentView('store');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="input-field"
          style={{
            width: 'auto',
            padding: '8px 18px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            fontWeight: '700',
            borderRadius: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isAr ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          <span>{isAr ? 'العودة للمتجر' : 'Back to Store'}</span>
        </button>

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
            fontSize: '0.82rem',
            fontWeight: '700',
            textDecoration: 'underline'
          }}
        >
          {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </button>
      </div>

      <div className="animate-fade dashboard-card" style={{
        padding: '36px 28px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-md)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        lineHeight: '1.8',
        textAlign: isAr ? 'right' : 'left'
      }}>
        <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '8px' }}>
            <Trash2 size={36} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            {isAr ? 'طلب حذف الحساب والبيانات الشخصية' : 'Account & Data Deletion Request'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
            {isAr ? 'متوافق مع سياسات Google Play لحماية بيانات المستخدمين' : 'Google Play User Data & Account Deletion Compliance'}
          </p>
        </div>

        {/* Informational Policy Notice */}
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '800', marginBottom: '6px' }}>
            <AlertTriangle size={20} />
            <span>{isAr ? 'ماذا يحدث عند حذف الحساب؟' : 'What data is deleted?'}</span>
          </div>
          <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--text-primary)' }}>
            {isAr ? (
              'عند تأكيد طلب حذف الحساب، سيتم محو اسم المستخدم، البريد الإلكتروني، رقم الهاتف، العناوين المسجلة، وسلة التسوق المحفوظة بشكل فوري ودائم. يتم فصل بيانات الحساب عن أي فواتير قديمة لأغراض التوثيق المحاسبي دون أي قدرة على التعرف على هويتك مجدداً.'
            ) : (
              'Upon deletion confirmation, your username, email address, phone number, saved delivery addresses, and cart items are permanently purged immediately. Historical order records are strictly anonymized for statutory bookkeeping.'
            )}
          </p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '700' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '14px 18px', borderRadius: '8px', fontSize: '0.92rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={24} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* If user is logged in, show instant in-app account deletion */}
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-tertiary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={22} style={{ color: 'var(--accent-blue)' }} />
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {isAr ? 'أنت مسجل الدخول حالياً بحساب:' : 'You are currently logged in as:'}
                </strong>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {user.full_name || user.username} ({user.phone || user.email || user.username})
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: 0 }}>
              {isAr ? 'يمكنك حذف هذا الحساب فوراً بضغطة زر واحدة:' : 'You can delete this account immediately with one click:'}
            </p>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              style={{
                padding: '12px 20px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.95rem'
              }}
            >
              <Trash2 size={18} />
              <span>{isAr ? 'حذف حسابي وبياناتي نهائياً' : 'Permanently Delete My Account'}</span>
            </button>
          </div>
        ) : (
          /* Public Web Request Form for Visitors / Users without app */
          <form onSubmit={handlePublicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label" style={{ fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                {isAr ? 'اسم المستخدم أو رقم الهاتف أو البريد المسجل *' : 'Registered Username, Phone, or Email *'}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isAr ? 'مثال: 70123456 أو user@example.com' : 'e.g. 70123456 or user@example.com'}
                className="input-field"
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label className="input-label" style={{ fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                {isAr ? 'كلمة المرور (لتأكيد الهوية إن وجدت)' : 'Password (to verify identity, if applicable)'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAr ? 'أدخل كلمة المرور لتأكيد الحذف' : 'Enter password to confirm deletion'}
                className="input-field"
                style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label className="input-label" style={{ fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                {isAr ? 'سبب طلب الحذف (اختياري)' : 'Reason for deletion (optional)'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={isAr ? 'يرجى إعلامنا إن كان بإمكاننا تحسين تجربتك...' : 'Let us know if we can improve...'}
                className="input-field"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 20px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Trash2 size={18} />
              <span>{submitting ? (isAr ? 'جاري المعالجة...' : 'Processing...') : (isAr ? 'إرسال طلب حذف الحساب والبيانات' : 'Submit Deletion Request')}</span>
            </button>
          </form>
        )}
      </div>

      {/* Confirmation Modal for logged in user */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
          backdropFilter: 'blur(3px)'
        }}>
          <div className="animate-scale" style={{
            maxWidth: '450px',
            width: '100%',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '12px' }}>
              <ShieldAlert size={36} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {isAr ? 'تأكيد الحذف النهائي للحساب' : 'Confirm Permanent Deletion'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
              {isAr ? 'هل أنت متأكد تماماً من رغبتك في حذف حسابك وجميع بياناتك؟ هذا الإجراء فوري ولا يمكن التراجع عنه.' : 'Are you completely sure? This action is permanent and cannot be undone.'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleDeleteLoggedInUser}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '800',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'نعم، احذف نهائياً' : 'Yes, Delete Permanently')}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
