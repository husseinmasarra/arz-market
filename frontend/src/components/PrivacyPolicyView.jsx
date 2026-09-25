import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, ArrowRight, ArrowLeft, Trash2, Mail, Lock, Smartphone, FileText } from 'lucide-react';

export default function PrivacyPolicyView({ setCurrentView }) {
  const { lang, settings } = useApp();
  const isAr = lang === 'ar';

  return (
    <div className="container" style={{ flex: '1', padding: '30px 16px', maxWidth: '850px' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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
            setCurrentView('delete-account');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'underline'
          }}
        >
          <Trash2 size={16} />
          <span>{isAr ? 'طلب حذف الحساب والبيانات' : 'Request Account Deletion'}</span>
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
        gap: '24px',
        lineHeight: '1.8',
        textAlign: isAr ? 'right' : 'left'
      }}>
        <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '18px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-blue)', marginBottom: '8px' }}>
            <ShieldCheck size={36} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            {isAr ? 'سياسة الخصوصية وأمان البيانات' : 'Privacy Policy & Data Protection'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
            {isAr ? 'متوافق مع معايير Google Play 2026 • آخر تحديث: يونيو ٢٠٢٦' : 'Google Play Compliant • Last Updated: June 2026'}
          </p>
        </div>

        {isAr ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem' }}>
            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ١. مقدمة والتزامنا بالخصوصية
              </h3>
              <p>
                نحن في <strong>{settings?.app_name || 'أرز مارت (Arz-Mart)'}</strong> نولي أهمية قصوى لخصوصية مستخدمينا وحماية بياناتهم الشخصية. توضح هذه السياسة بشفافية تامة نوع البيانات التي نجمعها، وكيفية استخدامها، وطرق حمايتها عند تصفح المتجر الإلكتروني أو استخدام تطبيق الهاتف المحمول المتاح على نظام Android.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ٢. البيانات التي نجمعها والغرض منها
              </h3>
              <p>نجمع فقط البيانات الضرورية لإتمام عمليات التسوق والتوصيل:</p>
              <ul style={{ listStyleType: 'disc', paddingRight: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>بيانات الحساب الشخصي:</strong> الاسم الكامل، اسم المستخدم، البريد الإلكتروني، وكلمة المرور المشفرة لتمكينك من تسجيل الدخول الآمن وإدارة حسابك.</li>
                <li><strong>معلومات التوصيل والشحن:</strong> رقم الهاتف وعنوان التوصيل التفصيلي (المدينة، المنطقة، الشارع) لتسهيل التواصل وتسليم الطلبيات بنظام الدفع عند الاستلام (COD) في الأراضي اللبنانية.</li>
                <li><strong>سجل الطلبيات والمشتريات:</strong> تفاصيل المنتجات، الكميات، الفواتير، وحالة الطلب لتمكينك من متابعة الشحن وخدمات ما بعد البيع.</li>
              </ul>
            </section>

            <section style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h3 style={{ color: '#059669', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} />
                ٣. سياسة المصادقة الحيوية (بصمة الإصبع - Biometric)
              </h3>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                يوفر تطبيق الهاتف خياراً اختيارياً لتسجيل الدخول السريع عبر بصمة الإصبع. نؤكد بشكل قاطع أن <strong>بيانات بصمة الإصبع أو أي بيانات بيومترية لا يتم جمعها، أو تخزينها، أو إرسالها إلى خوادمنا مطلقاً</strong>. تتم المصادقة بالكامل وبشكل محلي مشفر على جهاز المستخدم من خلال واجهة نظام الأندرويد الرسمية (Android BiometricPrompt).
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٤. أذونات تطبيق الأندرويد (App Permissions)
              </h3>
              <p>يطلب تطبيق أرز مارت فقط الأذونات القياسية الضرورية لعمله:</p>
              <ul style={{ listStyleType: 'disc', paddingRight: '22px', marginTop: '6px' }}>
                <li><strong>الإنترنت (INTERNET):</strong> لتحميل أحدث كتالوجات المنتجات والأسعار وإرسال الطلبيات وإجراء المحادثات الفورية.</li>
                <li><strong>المستشعر البيومتري (USE_BIOMETRIC):</strong> لتسهيل الدخول السريع بالبصمة عند تفعيلها من قبل المستخدم اختيارياً.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٥. مشاركة البيانات مع أطراف ثالثة
              </h3>
              <p>
                نحن <strong>لا نقوم إطلاقاً ببيع أو تأجير أو المتاجرة ببياناتك الشخصية</strong> لأي جهات إعلانية أو تسويقية خارجية. تقتصر مشاركة البيانات حصراً على شركات التوصيل وشركاء الخدمات اللوجستية لنقل وتوصيل طلبك إلى عنوانك المحدد.
              </p>
            </section>

            <section style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h3 style={{ color: '#dc2626', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                ٦. حقوق المستخدم وسياسة حذف الحساب والبيانات (Google Policy)
              </h3>
              <p style={{ margin: 0 }}>
                يحق لكل مستخدم في أي وقت طلب حذف حسابه وكافة بياناته الشخصية من منصتنا بشكل نهائي، سواء من داخل التطبيق مباشرة أو عبر رابط صفحة حذف الحساب العامة:{' '}
                <button
                  onClick={() => {
                    setCurrentView('delete-account');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ color: 'var(--accent-blue)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  صفحة حذف الحساب والبيانات
                </button>. عند حذف الحساب، يتم محو بيانات الاعتماد، العناوين، وسلة التسوق فوراً وبشكل دائم.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٧. حماية وأمن المعلومات
              </h3>
              <p>
                نستخدم بروتوكولات تشفير متقدمة (HTTPS/SSL) وتشفير آمن لكلمات المرور باستخدام خوارزمية (bcrypt) وقواعد بيانات محمية لمنع أي وصول غير مصرح به أو تسريب للبيانات.
              </p>
            </section>

            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٨. التواصل والاستفسارات
              </h3>
              <p>
                إذا كان لديك أي تساؤل أو استفسار بخصوص سياسة الخصوصية، يرجى التواصل مع فريق الدعم عبر البريد الإلكتروني:{' '}
                <a href={`mailto:${settings?.contact_email || 'info@arz-mart.com'}`} style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                  {settings?.contact_email || 'info@arz-mart.com'}
                </a>{' '}
                أو من خلال الدردشة المباشرة داخل التطبيق.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem' }}>
            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                1. Introduction & Commitment to Privacy
              </h3>
              <p>
                At <strong>{settings?.app_name || 'Arz-Mart'}</strong>, protecting your privacy and securing your personal data is a top priority. This Privacy Policy details the types of data we collect, how we process and protect it across our website and Android mobile application.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                2. Data We Collect and Why
              </h3>
              <p>We only collect data strictly necessary to fulfill e-commerce services and deliveries:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Account Information:</strong> Full name, username, email address, and encrypted passwords for secure authentication.</li>
                <li><strong>Delivery & Contact Details:</strong> Phone number and physical shipping address in Lebanon to complete Cash on Delivery (COD) dispatches.</li>
                <li><strong>Order History:</strong> Product items, quantities, totals, and order tracking statuses for post-purchase support.</li>
              </ul>
            </section>

            <section style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h3 style={{ color: '#059669', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} />
                3. Biometric Authentication Policy (Fingerprint)
              </h3>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                The mobile app offers an optional fingerprint login feature. <strong>We NEVER collect, store, or transmit your biometric fingerprint data to our servers</strong>. Biometric authentication is handled locally on the device using standard Android BiometricPrompt APIs.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                4. Android App Permissions
              </h3>
              <p>Our app requires minimal essential permissions:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '22px', marginTop: '6px' }}>
                <li><strong>INTERNET:</strong> To connect to Arz-Mart servers, retrieve catalogs, and process orders and chats.</li>
                <li><strong>USE_BIOMETRIC:</strong> To authenticate local biometric credentials if enabled by the user.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                5. Third-Party Sharing
              </h3>
              <p>
                We do not sell, trade, or rent personal identification data to third parties. Information is only shared with logistics and delivery partners strictly for delivering orders.
              </p>
            </section>

            <section style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h3 style={{ color: '#dc2626', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                6. User Rights & Account Deletion (Google Play Compliance)
              </h3>
              <p style={{ margin: 0 }}>
                Users have the right to request deletion of their account and associated personal data at any time either within the app or via our dedicated{' '}
                <button
                  onClick={() => {
                    setCurrentView('delete-account');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ color: 'var(--accent-blue)', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Account & Data Deletion Page
                </button>.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                7. Security Standards
              </h3>
              <p>
                We employ industry-standard encryption protocols (HTTPS/SSL), bcrypt password hashing, and restricted database access to safeguard personal information.
              </p>
            </section>

            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                8. Contact Information
              </h3>
              <p>
                For privacy inquiries or data removal questions, contact our support team at:{' '}
                <a href={`mailto:${settings?.contact_email || 'info@arz-mart.com'}`} style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                  {settings?.contact_email || 'info@arz-mart.com'}
                </a>.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
