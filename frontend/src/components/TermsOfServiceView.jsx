import React from 'react';
import { useApp } from '../context/AppContext';
import { FileText, ArrowRight, ArrowLeft, Shield, Truck, CreditCard, RefreshCw } from 'lucide-react';

export default function TermsOfServiceView({ setCurrentView }) {
  const { lang, settings, formatPrice } = useApp();
  const isAr = lang === 'ar';

  return (
    <div className="container" style={{ flex: '1', padding: '30px 16px', maxWidth: '850px' }}>
      <div className="no-print" style={{ marginBottom: '20px' }}>
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
            <FileText size={36} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0' }}>
            {isAr ? 'الشروط والأحكام العامة' : 'Terms & Conditions of Service'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '4px' }}>
            {isAr ? `متجر ${settings?.app_name || 'أرز مارت'} • لبنان • آخر تحديث: يونيو ٢٠٢٦` : `${settings?.app_name || 'Arz-Mart'} • Lebanon • Last Updated: June 2026`}
          </p>
        </div>

        {isAr ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem' }}>
            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ١. الموافقة على الشروط
              </h3>
              <p>
                باستخدامك لموقع أو تطبيق <strong>{settings?.app_name || 'أرز مارت (Arz-Mart)'}</strong>، فإنك تقر وتوافق على الالتزام بكافة الشروط والأحكام الواردة هنا بالإضافة إلى سياسة الخصوصية. إذا كنت لا توافق على هذه الشروط، يرجى التوقف عن استخدام المنصة.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} />
                ٢. سياسة الطلبات والدفع عند الاستلام (COD)
              </h3>
              <p>
                تتم كافة المعاملات التجارية بنظام <strong>الدفع نقداً عند الاستلام (Cash on Delivery)</strong> في الأراضي اللبنانية:
              </p>
              <ul style={{ listStyleType: 'disc', paddingRight: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>يتم عرض الأسعار بالدولار الأمريكي (USD) وبالليرة اللبنانية (LBP) حسب سعر الصرف اليومي المعتمد في المتجر.</li>
                <li>يلتزم العميل بسداد كامل قيمة الفاتورة نقداً للمندوب عند استلام الشحنة.</li>
                <li>يحتفظ المتجر بحق تأكيد الطلبات هاتفياً أو عبر واتساب قبل خروج الشحنة للتوصيل لضمان جدية الطلب وصحة العنوان.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} />
                ٣. سياسة الشحن والتوصيل
              </h3>
              <p>
                نعمل بالتعاون مع شركات شحن موثوقة لتوصيل الطلبيات لكافة المناطق والمدن اللبنانية:
              </p>
              <ul style={{ listStyleType: 'disc', paddingRight: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>مدة التوصيل المعتادة تتراوح بين ٢٤ إلى ٧٢ ساعة عمل من تاريخ تأكيد الطلب.</li>
                <li>تطبق رسوم توصيل رمزية ثابتة، ويحصل العميل على <strong>توصيل مجاني</strong> عند بلوغ قيمة الطلبية الحد الأدنى المحدد في المتجر.</li>
                <li>يتحمل العميل مسؤولية كتابة العنوان ورقم الهاتف بدقة لتجنب تأخير أو إلغاء الشحنة.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} />
                ٤. سياسة الاستبدال والاسترجاع وإلغاء الطلب
              </h3>
              <p>
                حرصاً منا على رضا عملائنا وسلامة المنتجات:
              </p>
              <ul style={{ listStyleType: 'disc', paddingRight: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>يحق للعميل معاينة المنتجات ظاهرياً عند استلامها من المندوب.</li>
                <li>في حال وجود أي عيب مصنعي أو خطأ في المنتج المستلم، يحق للعميل طلب الاستبدال أو الإرجاع خلال <strong>٤٨ ساعة</strong> من تاريخ الاستلام مع الاحتفاظ بالغلاف والعلبة الأصلية.</li>
                <li>يمكن إلغاء الطلب دون أي رسوم قبل خروج الشحنة مع المندوب للتوصيل عبر التواصل المباشر مع خدمة العملاء.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٥. أمان الحسابات وسلوك المستخدم
              </h3>
              <p>
                يلتزم المستخدم بالمحافظة على سرية بيانات حسابه وكلمة المرور الخاصة به، ويتحمل كامل المسؤولية عن أي نشاط يتم عبر حسابه. يمنع منعاً باتاً استخدام المنصة لأي أغراض غير مشروعة أو إجراء طلبات وهمية بهدف الإضرار بالمتجر.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٦. حقوق الملكية الفكرية
              </h3>
              <p>
                جميع الشعارات، الصور، التصاميم، والنصوص الموجودة في متجر وتطبيق أرز مارت هي ملكية حصرية للمتجر ومحمية بموجب القوانين والأنظمة المعمول بها.
              </p>
            </section>

            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                ٧. القانون الساري وتسوية النزاعات
              </h3>
              <p>
                تخضع هذه الشروط والأحكام وتفسر وفقاً للقوانين والأنظمة التجارية المعمول بها في الجمهورية اللبنانية، وتختص محاكم بيروت بالفصل في أي نزاع قد ينشأ.
              </p>
            </section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem' }}>
            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                1. Acceptance of Terms
              </h3>
              <p>
                By downloading, accessing, or using the <strong>{settings?.app_name || 'Arz-Mart'}</strong> application or website, you agree to be bound by these Terms & Conditions and our Privacy Policy.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} />
                2. Orders & Cash on Delivery (COD) Payment
              </h3>
              <p>
                All purchases are fulfilled through <strong>Cash on Delivery (COD)</strong> across Lebanon:
              </p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Prices are clearly listed in USD and Lebanese Pounds (LBP) based on daily market exchange rates.</li>
                <li>Customers must pay the full invoice amount in cash to the courier upon delivery.</li>
                <li>Orders may undergo telephone or WhatsApp verification prior to dispatch.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} />
                3. Shipping & Delivery
              </h3>
              <ul style={{ listStyleType: 'disc', paddingLeft: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Standard delivery across Lebanese regions takes between 24 to 72 business hours.</li>
                <li>Free shipping is automatically applied when orders meet the designated threshold.</li>
                <li>Customers are responsible for providing valid contact information and exact delivery coordinates.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} />
                4. Returns, Exchanges & Cancellations
              </h3>
              <ul style={{ listStyleType: 'disc', paddingLeft: '22px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Items can be inspected upon receipt.</li>
                <li>Defective or mismatched items must be reported within <strong>48 hours</strong> of delivery with original packaging.</li>
                <li>Orders can be cancelled at zero cost prior to courier dispatch by contacting customer support.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                5. Account Integrity & User Conduct
              </h3>
              <p>
                Users are responsible for maintaining the confidentiality of login credentials and agree not to perform fraudulent orders.
              </p>
            </section>

            <section>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                6. Intellectual Property
              </h3>
              <p>
                All brand assets, images, and content are the sole property of Arz-Mart and protected by copyright regulations.
              </p>
            </section>

            <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h3 style={{ color: 'var(--accent-blue)', fontWeight: '800', marginBottom: '8px' }}>
                7. Governing Law
              </h3>
              <p>
                These terms are governed by and construed under the laws of the Republic of Lebanon.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
