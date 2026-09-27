import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, 
  Trash2, ArrowRight, Tag, DollarSign, Layers, Plus, ExternalLink,
  Copy, RefreshCw, Wand2, ShieldCheck, Check, Info, FileText
} from 'lucide-react';

// Common Arabic retail keyword translation dictionary for clean English naming
const ARABIC_TO_ENGLISH_TERMS = [
  { ar: /حرام\s*tv\s*بلانكيت|حرام\s*بلانكيت|بلانكيت/gi, en: 'TV Throw Blanket' },
  { ar: /حرام\s*شتوي|حرام\s*صوف|بطانية/gi, en: 'Winter Blanket' },
  { ar: /طقم\s*شراشف|طقم\s*شرشف|شراشف/gi, en: 'Bedsheet Set' },
  { ar: /شرشف\s*مفرد/gi, en: 'Single Bed Sheet' },
  { ar: /شرشف\s*مجوز|شرشف\s*مزدوج/gi, en: 'Double Bed Sheet' },
  { ar: /غطاء\s*مخدة|كيس\s*مخدة|مخدات|مخدة|وسادة/gi, en: 'Pillow / Cushion' },
  { ar: /لحاف\s*شتوي|لحاف|دوفيه/gi, en: 'Winter Comforter Duvet' },
  { ar: /طقم\s*حمام|بشكير|مناشف|منشفة/gi, en: 'Towel Set' },
  { ar: /سماعات\s*بلوتوث|سماعة\s*بلوتوث|ايربودز/gi, en: 'Wireless Bluetooth Earbuds' },
  { ar: /سماعات\s*راس|سماعة\s*راس/gi, en: 'Over-Ear Headphones' },
  { ar: /سماعات\s*سلك|سماعة\s*سلك/gi, en: 'Wired Earphones' },
  { ar: /شاحن\s*سريع|شاحن\s*جداري|شاحن/gi, en: 'Fast Wall Charger' },
  { ar: /كابل\s*شحن|كابل\s*تايب\s*سي|كابل/gi, en: 'Charging Cable' },
  { ar: /باور\s*بانك|باوربانك|بطارية\s*سفري/gi, en: 'Power Bank' },
  { ar: /ساعة\s*ذكية|سمارت\s*ووتش/gi, en: 'Smart Watch' },
  { ar: /ستاند\s*تلفون|حامل\s*موبايل|حامل\s*سيارة/gi, en: 'Phone Stand & Car Holder' },
  { ar: /ماكينة\s*حلاقة|ماكينة\s*تشذيب/gi, en: 'Electric Hair Trimmer / Shaver' },
  { ar: /جهاز\s*مساج|ماكينة\s*مساج/gi, en: 'Deep Tissue Massage Gun' },
  { ar: /كاميرا\s*مراقبة|كاميرا\s*واي\s*فاي/gi, en: 'Smart Security WiFi Camera' },
  { ar: /رينغ\s*لايت|اضاءة\s*تصوير/gi, en: 'Ring Light Studio Lighting' },
  { ar: /مكبر\s*صوت|سبيكر\s*بلوتوث|سبيكر/gi, en: 'Portable Bluetooth Speaker' },
  { ar: /طنجرة\s*ضغط|طنجرة\s*غرانيت|طناجر/gi, en: 'Cooking Pot' },
  { ar: /مقلاة\s*هوائية|ايرفراير/gi, en: 'Air Fryer' },
  { ar: /مقلاة\s*غرانيت|مقلاية/gi, en: 'Granite Frying Pan' },
  { ar: /خلاط\s*كهربائي|محضرة\s*طعام/gi, en: 'Electric Food Blender' },
  { ar: /مكواة\s*بخار|كواية\s*بخار/gi, en: 'Garment Steam Iron' },
  { ar: /ميزان\s*ذكي|ميزان\s*ديجيتال/gi, en: 'Digital Smart Scale' },
  { ar: /مروحة\s*شحن|مروحة\s*محمولة/gi, en: 'Portable Rechargeable Fan' },
  { ar: /لعبة\s*اطفال|العاب\s*اطفال/gi, en: 'Kids Toy' },
  { ar: /حقيبة\s*يد|شنطة\s*كتف|حقيبة/gi, en: 'Bag' }
];

const COLOR_KEYWORDS = [
  { ar: 'اسود', en: 'Black' },
  { ar: 'ابيض', en: 'White' },
  { ar: 'رمادي', en: 'Grey' },
  { ar: 'سكني', en: 'Grey' },
  { ar: 'كحلي', en: 'Navy Blue' },
  { ar: 'ازرق', en: 'Blue' },
  { ar: 'احمر', en: 'Red' },
  { ar: 'خمري', en: 'Burgundy' },
  { ar: 'بني', en: 'Brown' },
  { ar: 'بيج', en: 'Beige' },
  { ar: 'زهر', en: 'Pink' },
  { ar: 'وردي', en: 'Pink' },
  { ar: 'فوشيا', en: 'Fuchsia' },
  { ar: 'ليلكي', en: 'Lilac' },
  { ar: 'موف', en: 'Purple' },
  { ar: 'بنفسجي', en: 'Purple' },
  { ar: 'زيتي', en: 'Olive Green' },
  { ar: 'اخضر', en: 'Green' },
  { ar: 'اصفر', en: 'Yellow' },
  { ar: 'برتقالي', en: 'Orange' },
  { ar: 'ذهبي', en: 'Gold' },
  { ar: 'فضي', en: 'Silver' }
];

export default function WhatsAppProductImporter({ categories = [], merchants = [], onProductCreated, apiBase }) {
  const { lang, formatPrice } = useApp();
  const { token } = useAuth();

  const [rawText, setRawText] = useState('');
  const [markupPercent, setMarkupPercent] = useState(40);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parsed / Editable product state
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [stock, setStock] = useState('10');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successProduct, setSuccessProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (merchants && merchants.length > 0 && !selectedMerchantId) {
      const digitalSouk = merchants.find(m => m.name.toLowerCase().includes('digital') || m.name.includes('سوق'));
      if (digitalSouk) {
        setSelectedMerchantId(digitalSouk.id);
      } else {
        setSelectedMerchantId(merchants[0].id);
      }
    }
  }, [merchants]);

  useEffect(() => {
    const handleWindowPaste = (e) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          e.preventDefault();
          handleNewFiles(imageFiles);
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [uploadedFiles]);

  const handleNewFiles = (newFiles) => {
    const validImages = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) return;

    const newEntries = validImages.map((file, idx) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isMain: uploadedFiles.length === 0 && idx === 0
    }));

    setUploadedFiles(prev => [...prev, ...newEntries]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some(f => f.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered;
    });
  };

  const setMainFile = (index) => {
    setUploadedFiles(prev => prev.map((item, i) => ({
      ...item,
      isMain: i === index
    })));
  };

  const parseWhatsAppPost = (text, currentMarkup = markupPercent) => {
    if (!text || !text.trim()) return;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const cleanLines = [];
    let detectedCost = null;
    let detectedSizes = [];
    let detectedColors = [];

    for (const rawLine of lines) {
      if (/(\+?961|03\d{6}|70\d{6}|71\d{6}|76\d{6}|78\d{6}|79\d{6}|81\d{6}|واتساب|whatsapp|توصيل\s*لكل\s*لبنان|يوجد\s*توصيل|للتواصل|للحجز|للاستفسار|http|www\.)/i.test(rawLine)) {
        continue;
      }

      const explicitPriceMatch = rawLine.match(/(?:سعر|السعر|price|cost|فقط)\s*[:=\-]?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\$?/i) ||
                                rawLine.match(/\$([0-9]+(?:\.[0-9]+)?)/) ||
                                rawLine.match(/([0-9]+(?:\.[0-9]+)?)\s*\$/);

      if (explicitPriceMatch && !detectedCost) {
        const pVal = parseFloat(explicitPriceMatch[1]);
        if (!isNaN(pVal) && pVal > 0 && pVal < 10000) {
          detectedCost = pVal;
        }
      }

      const sizeMatch = rawLine.match(/(?:قياس|حجم|مقاس|size)?\s*[:=\-]?\s*([0-9]{2,3}\s*[\/\*xX]\s*[0-9]{2,3})/i);
      if (sizeMatch) {
        detectedSizes.push(sizeMatch[1].replace(/\s+/g, ''));
      }

      // Liquid / Volume sizes detection (ml, L, liter, مل, لتر)
      const liquidMatch = rawLine.match(/(?:سعة|حجم|قياس|size|capacity)?\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(ml|مل|ملم|لتر|ليتر|liter|liters|litre|litres|l\b)/i);
      if (liquidMatch) {
        const num = liquidMatch[1];
        const unit = liquidMatch[2].toLowerCase();
        if (/ml|مل|ملم/i.test(unit)) {
          const lStr = `${num}ml (${num} مل)`;
          if (!detectedSizes.includes(lStr)) detectedSizes.push(lStr);
        } else if (/لتر|ليتر|liter|liters|litre|litres|l/i.test(unit)) {
          const lStr = `${num} لتر (${num}L)`;
          if (!detectedSizes.includes(lStr)) detectedSizes.push(lStr);
        }
      }
      if (/مفرد\s*ونصف|مفرد\s*ونص|twin|semi-double/i.test(rawLine)) {
        if (!detectedSizes.includes('مفرد ونصف (Twin / Single & Half)')) detectedSizes.push('مفرد ونصف (Twin / Single & Half)');
      } else if (/مفرد|single/i.test(rawLine) && !detectedSizes.includes('مفرد (Single)')) {
        detectedSizes.push('مفرد (Single)');
      }
      if (/مجوز|مزدوج|double|queen/i.test(rawLine) && !detectedSizes.includes('مجوز (Double / Queen)')) {
        detectedSizes.push('مجوز (Double / Queen)');
      }
      if (/كينغ|king\s*size|king/i.test(rawLine) && !detectedSizes.includes('كينغ سايز (King Size)')) {
        detectedSizes.push('كينغ سايز (King Size)');
      }

      COLOR_KEYWORDS.forEach(c => {
        if (new RegExp(`\\b${c.ar}\\b|ال${c.ar}|${c.ar}`, 'i').test(rawLine)) {
          if (!detectedColors.includes(c.ar)) {
            detectedColors.push(c.ar);
          }
        }
      });

      const cleanedLine = rawLine
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();

      if (cleanedLine.length > 1) {
        cleanLines.push(cleanedLine);
      }
    }

    let titleAr = cleanLines[0] || lines[0] || '';
    titleAr = titleAr.replace(/\s*[\(\[]?\$?[0-9]+(?:\.[0-9]+)?\s*\$?[\)\]]?/g, '').trim();

    let titleEn = 'New Arrival Product';
    for (const mapping of ARABIC_TO_ENGLISH_TERMS) {
      if (mapping.ar.test(titleAr) || mapping.ar.test(text)) {
        titleEn = mapping.en;
        break;
      }
    }
    if (detectedSizes.length > 0 && !titleEn.includes(detectedSizes[0])) {
      titleEn += ` - ${detectedSizes[0]}`;
    }

    let matchedCatId = '';
    const fullSearchText = (text + ' ' + titleAr).toLowerCase();

    if (/حرام|بلانكيت|شرشف|شراشف|مخدة|وسادة|لحاف|دوفيه|بياضات|مفرش|بطانية|مناشف/i.test(fullSearchText)) {
      const c = categories.find(cat => cat.name_ar.includes('بياضات') || cat.name_ar.includes('منزل') || cat.name_en.toLowerCase().includes('home') || cat.name_en.toLowerCase().includes('bedding'));
      if (c) matchedCatId = c.id;
    } else if (/طنجرة|مقلاة|ايرفراير|خلاط|مطبخ|كاسات|صحون|سكاكين|شواية|ترمس/i.test(fullSearchText)) {
      const c = categories.find(cat => cat.name_ar.includes('مطبخ') || cat.name_en.toLowerCase().includes('kitchen'));
      if (c) matchedCatId = c.id;
    } else if (/سماعة|شاحن|كابل|باوربانك|باور\s*بانك|ايربودز|بلوتوث|ريزر|كاميرا|سبيكر|مكبر/i.test(fullSearchText)) {
      const c = categories.find(cat => cat.name_ar.includes('إلكترونيات') || cat.name_ar.includes('هواتف') || cat.name_en.toLowerCase().includes('electronic'));
      if (c) matchedCatId = c.id;
    } else if (/ساعة|سمارت\s*ووتش|smart\s*watch/i.test(fullSearchText)) {
      const c = categories.find(cat => cat.name_ar.includes('ساعات') || cat.name_en.toLowerCase().includes('watch'));
      if (c) matchedCatId = c.id;
    } else if (/حلاقة|مساج|استشوار|تجميل|عناية|مكياج|عطر/i.test(fullSearchText)) {
      const c = categories.find(cat => cat.name_ar.includes('عناية') || cat.name_ar.includes('جمال') || cat.name_en.toLowerCase().includes('care') || cat.name_en.toLowerCase().includes('beauty'));
      if (c) matchedCatId = c.id;
    }

    if (!matchedCatId && categories.length > 0) {
      matchedCatId = categories[0].id;
    }

    let calculatedSelling = '';
    let calculatedOld = '';
    if (detectedCost !== null) {
      const markupRatio = 1 + (Number(currentMarkup) / 100);
      const rawSell = detectedCost * markupRatio;
      const roundedSell = Math.ceil(rawSell);
      calculatedSelling = roundedSell.toFixed(2);
      calculatedOld = (Math.ceil(roundedSell * 1.35)).toFixed(2);
    }

    setNameAr(titleAr);
    setNameEn(titleEn);
    if (detectedCost !== null) {
      setCostPrice(String(detectedCost));
      setSellingPrice(calculatedSelling);
      setOldPrice(calculatedOld);
    }
    if (matchedCatId) {
      setCategoryId(matchedCatId);
    }

    const descLines = cleanLines.slice(1);
    const finalDescAr = descLines.join(' - ');
    setDescAr(finalDescAr || titleAr);
    setDescEn(titleEn + (finalDescAr ? ` (${finalDescAr})` : ''));

    if (detectedSizes.length > 0) {
      setSizes(detectedSizes.map(sz => ({ name: sz, price: calculatedSelling || '0' })));
    } else {
      setSizes([]);
    }

    setColors(detectedColors);
  };

  const handleMarkupChange = (newMarkup) => {
    setMarkupPercent(newMarkup);
    const cVal = parseFloat(costPrice);
    if (!isNaN(cVal) && cVal > 0) {
      const rawSell = cVal * (1 + Number(newMarkup) / 100);
      const roundedSell = Math.ceil(rawSell);
      setSellingPrice(roundedSell.toFixed(2));
      setOldPrice((Math.ceil(roundedSell * 1.35)).toFixed(2));
    }
  };

  const handleCostPriceChange = (newCost) => {
    setCostPrice(newCost);
    const cVal = parseFloat(newCost);
    if (!isNaN(cVal) && cVal > 0) {
      const rawSell = cVal * (1 + Number(markupPercent) / 100);
      const roundedSell = Math.ceil(rawSell);
      setSellingPrice(roundedSell.toFixed(2));
      setOldPrice((Math.ceil(roundedSell * 1.35)).toFixed(2));
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setRawText(val);
    parseWhatsAppPost(val, markupPercent);
  };

  const handleResetForNext = () => {
    setRawText('');
    setNameAr('');
    setNameEn('');
    setCostPrice('');
    setSellingPrice('');
    setOldPrice('');
    setDescAr('');
    setDescEn('');
    setSizes([]);
    setColors([]);
    setUploadedFiles([]);
    setSuccessProduct(null);
    setErrorMsg(null);
  };

  const handleLoadDemo = () => {
    const demoPost = `حرام tv بلانكيت قياس 160/230
نوعية مرتبة (سميك)
متوفر بألوان: سكني، زهر، كحلي، بيج، اسود
السعر: $12
يوجد توصيل لكافة المناطق اللبنانية`;
    setRawText(demoPost);
    parseWhatsAppPost(demoPost, markupPercent);
  };

  const handlePublish = async () => {
    if (!nameAr || !nameEn || !sellingPrice) {
      setErrorMsg(lang === 'ar' ? 'يرجى التأكد من اسم المنتج وسعر البيع' : 'Please verify product name and selling price');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('name_ar', nameAr.trim());
    formData.append('name_en', nameEn.trim());
    formData.append('description_ar', descAr.trim() || nameAr.trim());
    formData.append('description_en', descEn.trim() || nameEn.trim());
    formData.append('price_usd', sellingPrice);
    formData.append('cost_price_usd', costPrice || '0.0');
    formData.append('old_price_usd', oldPrice || 'null');
    formData.append('category_id', categoryId || 'null');
    formData.append('merchant_id', selectedMerchantId || 'null');
    formData.append('stock', stock || '10');
    formData.append('colors', JSON.stringify(colors));
    formData.append('sizes', JSON.stringify(sizes));

    const mainImgEntry = uploadedFiles.find(f => f.isMain) || uploadedFiles[0];
    if (mainImgEntry && mainImgEntry.file) {
      formData.append('product_image', mainImgEntry.file);
    }

    try {
      const res = await fetch(`${apiBase}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessProduct(data.product || { name_ar: nameAr, price_usd: sellingPrice });
        if (onProductCreated) {
          onProductCreated();
        }
      } else {
        setErrorMsg(data.error_ar || data.error || (lang === 'ar' ? 'فشل حفظ المنتج' : 'Failed to create product'));
      }
    } catch (err) {
      console.error('Publish product error:', err);
      setErrorMsg(err.message || (lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server connection error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)',
      borderRadius: '20px',
      border: '1px solid #10b981',
      boxShadow: '0 10px 30px rgba(16, 185, 129, 0.12)',
      overflow: 'hidden',
      marginBottom: '24px'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)',
        padding: '20px 24px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
            flexShrink: 0
          }}>
            💬
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.02em', color: '#fff' }}>
                {lang === 'ar' ? 'المستورد الذكي من منشورات واتساب' : 'WhatsApp Smart Product Importer'}
              </h3>
              <span style={{
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: '900',
                backgroundColor: '#fbbf24',
                color: '#78350f',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={13} /> Fast AI 1-Click
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#d1fae5', opacity: 0.95 }}>
              {lang === 'ar'
                ? 'انسخ منشور المورّد من الواتساب والصقه هنا، واسحب الصور أو اضغط Ctrl+V للصق الصور فوراً!'
                : 'Paste supplier post from WhatsApp & drag-drop photos or press Ctrl+V to auto-create products!'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleLoadDemo}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '800',
              border: '1px solid rgba(255,255,255,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Wand2 size={15} />
            {lang === 'ar' ? 'تجربة مثال جاهز' : 'Load Demo Post'}
          </button>
          {rawText && (
            <button
              type="button"
              onClick={handleResetForNext}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} />
              {lang === 'ar' ? 'تفريغ' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Success Alert */}
      {successProduct && (
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)',
          borderBottom: '1px solid #a7f3d0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.35)'
            }}>
              <Check size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#065f46', fontSize: '1rem' }}>
                {lang === 'ar' ? `🎉 تم نشر منتج "${successProduct.name_ar}" بنجاح في المتجر!` : `🎉 Product "${successProduct.name_ar}" published successfully!`}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#047857' }}>
                {lang === 'ar'
                  ? `بسعر بيع $${Number(successProduct.price_usd).toFixed(2)} (${formatPrice(successProduct.price_usd)}) - متاح للزبائن حالياً`
                  : `Selling at $${Number(successProduct.price_usd).toFixed(2)} - Live on storefront`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetForNext}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: '#059669',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.88rem',
              border: 'none',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            {lang === 'ar' ? 'إضافة منتج واتساب التالي 🚀' : 'Add Next Product 🚀'}
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div style={{
          padding: '14px 20px',
          backgroundColor: '#fff1f2',
          borderBottom: '1px solid #fecdd3',
          color: '#9f1239',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={20} color="#e11d48" style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2-Column Responsive Body */}
      <div style={{
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '24px'
      }}>
        {/* Left Column: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. WhatsApp Text Input */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="#059669" />
                {lang === 'ar' ? '1. نص رسالة / منشور الواتساب' : '1. WhatsApp Message Text'}
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'ar' ? 'تحليل مباشر' : 'Auto-parsed'}
              </span>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={handleTextChange}
              placeholder={lang === 'ar' 
                ? "الصق هنا نص رسالة الواتساب مباشرة...\nمثال:\nحرام tv بلانكيت قياس 160/230\nنوعية مرتبة (سميك)\nالسعر $12" 
                : "Paste WhatsApp text here...\nExample:\nTV Blanket 160/230\nHigh quality (thick)\nPrice $12"}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 2. Images Drag & Drop Area */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} color="#059669" />
                {lang === 'ar' ? '2. صور المنتج (سحب أو Ctrl+V)' : '2. Product Images (Drag / Ctrl+V)'}
              </label>
              <span style={{
                fontSize: '0.72rem',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '800'
              }}>
                {uploadedFiles.length} {lang === 'ar' ? 'صور' : 'images'}
              </span>
            </div>

            {/* Drop Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleNewFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: isDragOver ? '2px dashed #059669' : '2px dashed var(--border-color)',
                backgroundColor: isDragOver ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-primary)',
                borderRadius: '14px',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleNewFiles(e.target.files)}
              />
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Upload size={22} />
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                {lang === 'ar' ? 'اسحب الصور من الواتساب هنا، أو اضغط للاختيار' : 'Drag images from WhatsApp here, or click to browse'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {lang === 'ar' ? '💡 يمكنك أيضاً نسخ الصورة من الواتساب وضغط Ctrl+V مباشرة!' : '💡 You can also copy image from WhatsApp and press Ctrl+V directly!'}
              </p>
            </div>

            {/* Thumbnails Grid */}
            {uploadedFiles.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '10px',
                marginTop: '12px'
              }}>
                {uploadedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      border: item.isMain ? '2px solid #059669' : '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-tertiary)'
                    }}
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Product preview ${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {item.isMain && (
                      <span style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        backgroundColor: '#059669',
                        color: '#fff',
                        fontSize: '0.62rem',
                        fontWeight: '900',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        {lang === 'ar' ? 'رئيسية' : 'Main'}
                      </span>
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      display: 'flex',
                      gap: '4px'
                    }}>
                      {!item.isMain && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMainFile(idx); }}
                          style={{
                            padding: '2px 5px',
                            backgroundColor: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.62rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {lang === 'ar' ? 'تعيين' : 'Set'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        style={{
                          padding: '2px 4px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Supplier & Profit Margin */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="#059669" />
              {lang === 'ar' ? '3. المورّد وهامش الربح' : '3. Supplier & Profit Margin'}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {lang === 'ar' ? 'المورّد' : 'Supplier'}
                </label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="input-field"
                  style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <option value="">{lang === 'ar' ? '-- بدون مورد --' : '-- No Merchant --'}</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {lang === 'ar' ? 'نسبة الربح (%)' : 'Markup %'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={markupPercent}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                    className="input-field"
                    style={{ margin: 0, padding: '8px 12px', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
            </div>

            {/* Quick Profit Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                {lang === 'ar' ? 'خيارات سريعة:' : 'Quick:'}
              </span>
              {[25, 35, 40, 50, 60].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleMarkupChange(pct)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    border: Number(markupPercent) === pct ? '1px solid #059669' : '1px solid var(--border-color)',
                    backgroundColor: Number(markupPercent) === pct ? '#059669' : 'var(--bg-primary)',
                    color: Number(markupPercent) === pct ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Extracted Preview & Adjustments */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {lang === 'ar' ? 'المعاينة المباشرة وتأكيد الحقول' : 'Live Extracted Preview'}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lang === 'ar' ? 'البيانات جاهزة للنشر بنقرة واحدة' : 'Auto-populated specs'}
                  </span>
                </div>
              </div>

              {costPrice && sellingPrice && (
                <div style={{
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: '800'
                }}>
                  {lang === 'ar' ? 'صافي الربح: ' : 'Profit: '}
                  <strong>+${(parseFloat(sellingPrice) - parseFloat(costPrice)).toFixed(2)}</strong>
                </div>
              )}
            </div>

            {/* Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>
                  {lang === 'ar' ? 'اسم المنتج (عربي) *' : 'Product Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="حرام TV بلانكيت"
                  className="input-field"
                  style={{ margin: 0, fontWeight: '700' }}
                />
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>
                  {lang === 'ar' ? 'اسم المنتج (إنجليزي) *' : 'Product Name (English) *'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="TV Throw Blanket"
                  className="input-field"
                  style={{ margin: 0, fontWeight: '700' }}
                />
              </div>
            </div>

            {/* Price Triplet */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  {lang === 'ar' ? 'سعر التكلفة ($)' : 'Cost Price ($)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={costPrice}
                  onChange={(e) => handleCostPriceChange(e.target.value)}
                  placeholder="12.00"
                  className="input-field"
                  style={{ margin: 0, padding: '6px 8px', fontSize: '0.85rem', fontWeight: '700' }}
                />
              </div>

              <div style={{
                backgroundColor: '#ecfdf5',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid #a7f3d0'
              }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#065f46', display: 'block', marginBottom: '2px' }}>
                  {lang === 'ar' ? 'سعر البيع ($)' : 'Selling Price ($)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="17.00"
                  className="input-field"
                  style={{ margin: 0, padding: '6px 8px', fontSize: '0.9rem', fontWeight: '900', color: '#047857', backgroundColor: '#fff' }}
                />
              </div>

              <div style={{
                backgroundColor: 'var(--bg-primary)',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                  {lang === 'ar' ? 'السعر القديم ($)' : 'Compare ($)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder="23.00"
                  className="input-field"
                  style={{ margin: 0, padding: '6px 8px', fontSize: '0.85rem', textDecoration: 'line-through' }}
                />
              </div>
            </div>

            {/* Category & Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>
                  {lang === 'ar' ? 'القسم / التصنيف' : 'Category'}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input-field"
                  style={{ margin: 0, fontWeight: '700' }}
                >
                  <option value="">{lang === 'ar' ? '-- اختر القسم --' : '-- Select Category --'}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} ({c.name_en})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>
                  {lang === 'ar' ? 'المخزون المتوفر' : 'Stock Quantity'}
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="input-field"
                  style={{ margin: 0, fontWeight: '700' }}
                />
              </div>
            </div>

            {/* Description Arabic */}
            <div>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>
                {lang === 'ar' ? 'الوصف والمواصفات (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                rows={2}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="تفاصيل المنتج..."
                className="input-field"
                style={{ margin: 0, fontSize: '0.82rem' }}
              />
            </div>

            {/* Tags (Sizes & Colors) */}
            {(colors.length > 0 || sizes.length > 0) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                {sizes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                      {lang === 'ar' ? 'القياس:' : 'Size:'}
                    </span>
                    {sizes.map((sz, idx) => (
                      <span key={idx} style={{
                        padding: '1px 6px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {sz.name}
                      </span>
                    ))}
                  </div>
                )}
                {colors.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginInlineStart: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                      {lang === 'ar' ? 'الألوان:' : 'Colors:'}
                    </span>
                    {colors.map((clr, idx) => (
                      <span key={idx} style={{
                        padding: '1px 6px',
                        backgroundColor: '#f3e8ff',
                        color: '#6b21a8',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {clr}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div style={{
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} color="#059669" />
              <span>{lang === 'ar' ? 'حفظ ونشر فوري للمتجر' : 'Instant 1-Click Publishing'}</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting || !nameAr || !sellingPrice}
              onClick={handlePublish}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '0.92rem',
                color: '#ffffff',
                border: 'none',
                cursor: isSubmitting || !nameAr || !sellingPrice ? 'not-allowed' : 'pointer',
                background: isSubmitting || !nameAr || !sellingPrice
                  ? 'var(--bg-tertiary)'
                  : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                boxShadow: isSubmitting || !nameAr || !sellingPrice
                  ? 'none'
                  : '0 6px 18px rgba(5, 150, 105, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="spin-anim" />
                  <span>{lang === 'ar' ? 'جاري النشر...' : 'Publishing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>{lang === 'ar' ? '🚀 حفظ وإضافة إلى المتجر فوراً' : '🚀 Publish to Store Now'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
