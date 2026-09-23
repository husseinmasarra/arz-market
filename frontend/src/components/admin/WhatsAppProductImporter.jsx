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

// Color dictionary (Arabic -> English / Normalized)
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

  // Raw inputs
  const [rawText, setRawText] = useState('');
  const [markupPercent, setMarkupPercent] = useState(40);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]); // array of { file, previewUrl, isMain }
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
  const [copyNotice, setCopyNotice] = useState(false);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Auto-select first matching merchant (e.g. DigitalSouklb or DR PHONE or first merchant)
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

  // Global Ctrl+V paste listener to capture images directly from clipboard!
  useEffect(() => {
    const handleWindowPaste = (e) => {
      // If clipboard contains files/images
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

  // -------------------------------------------------------------
  // SMART PARSING ENGINE (Arabic WhatsApp Post Analyzer)
  // -------------------------------------------------------------
  const parseWhatsAppPost = (text, currentMarkup = markupPercent) => {
    if (!text || !text.trim()) {
      return;
    }

    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    // 1. Remove contact info, delivery notes, and promotional emojis/hashtags
    const cleanLines = [];
    let detectedCost = null;
    let detectedSizes = [];
    let detectedColors = [];

    for (const rawLine of lines) {
      // Filter out phone numbers, links, delivery dispatches
      if (/(\+?961|03\d{6}|70\d{6}|71\d{6}|76\d{6}|78\d{6}|79\d{6}|81\d{6}|واتساب|whatsapp|توصيل\s*لكل\s*لبنان|يوجد\s*توصيل|للتواصل|للحجز|للاستفسار|http|www\.)/i.test(rawLine)) {
        continue;
      }

      // 2. Extract Price ($xx, xx$, xx USD, xx دولار, xx,xxx L.L)
      const priceRegexUsd = /(?:السعر|سعر|price|cost)?\s*[:=\-]?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:\$|usd|دولار)?/i;
      const explicitPriceMatch = rawLine.match(/(?:سعر|السعر|price|cost|فقط)\s*[:=\-]?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\$?/i) ||
                                rawLine.match(/\$([0-9]+(?:\.[0-9]+)?)/) ||
                                rawLine.match(/([0-9]+(?:\.[0-9]+)?)\s*\$/);

      if (explicitPriceMatch && !detectedCost) {
        const pVal = parseFloat(explicitPriceMatch[1]);
        if (!isNaN(pVal) && pVal > 0 && pVal < 10000) {
          detectedCost = pVal;
        }
      }

      // 3. Extract Dimensions / Sizes (e.g. 160/230, 200*220, 160x230, مفرد, مجوز, كينغ)
      const sizeMatch = rawLine.match(/(?:قياس|حجم|مقاس|size)?\s*[:=\-]?\s*([0-9]{2,3}\s*[\/\*xX]\s*[0-9]{2,3})/i);
      if (sizeMatch) {
        detectedSizes.push(sizeMatch[1].replace(/\s+/g, ''));
      }
      if (/مفرد\s*ونص/i.test(rawLine)) detectedSizes.push('مفرد ونص');
      else if (/مفرد/i.test(rawLine) && !detectedSizes.includes('مفرد')) detectedSizes.push('مفرد');
      if (/مجوز|مزدوج/i.test(rawLine) && !detectedSizes.includes('مجوز')) detectedSizes.push('مجوز');
      if (/كينغ|king/i.test(rawLine) && !detectedSizes.includes('كينغ')) detectedSizes.push('King Size');

      // 4. Extract Colors
      COLOR_KEYWORDS.forEach(c => {
        if (new RegExp(`\\b${c.ar}\\b|ال${c.ar}|${c.ar}`, 'i').test(rawLine)) {
          if (!detectedColors.includes(c.ar)) {
            detectedColors.push(c.ar);
          }
        }
      });

      // Clean line from emojis for clean specs
      const cleanedLine = rawLine
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();

      if (cleanedLine.length > 1) {
        cleanLines.push(cleanedLine);
      }
    }

    // Determine Arabic Title: First clean line or clean combined
    let titleAr = cleanLines[0] || lines[0] || '';
    // Strip trailing prices from title
    titleAr = titleAr.replace(/\s*[\(\[]?\$?[0-9]+(?:\.[0-9]+)?\s*\$?[\)\]]?/g, '').trim();

    // Determine English Title: Translate known keywords or transliterate
    let titleEn = 'New Arrival Product';
    for (const mapping of ARABIC_TO_ENGLISH_TERMS) {
      if (mapping.ar.test(titleAr) || mapping.ar.test(text)) {
        titleEn = mapping.en;
        break;
      }
    }
    // If dimension is detected, append to English title for clarity
    if (detectedSizes.length > 0 && !titleEn.includes(detectedSizes[0])) {
      titleEn += ` - ${detectedSizes[0]}`;
    }

    // Determine Category from keywords
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

    // Price calculation
    let calculatedSelling = '';
    let calculatedOld = '';
    if (detectedCost !== null) {
      const markupRatio = 1 + (Number(currentMarkup) / 100);
      const rawSell = detectedCost * markupRatio;
      // Round nicely: e.g. 16.8 -> 17.00 or 16.99
      const roundedSell = Math.ceil(rawSell);
      calculatedSelling = roundedSell.toFixed(2);
      calculatedOld = (Math.ceil(roundedSell * 1.35)).toFixed(2); // 35% compare price
    }

    // Set state
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

    // Description
    const descLines = cleanLines.slice(1);
    const finalDescAr = descLines.join(' - ');
    setDescAr(finalDescAr || titleAr);
    setDescEn(titleEn + (finalDescAr ? ` (${finalDescAr})` : ''));

    // Sizes
    if (detectedSizes.length > 0) {
      setSizes(detectedSizes.map(sz => ({ name: sz, price: calculatedSelling || '0' })));
    } else {
      setSizes([]);
    }

    // Colors
    setColors(detectedColors);
  };

  // Recalculate selling price when markup or cost changes
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

  // Handle WhatsApp text paste / typing
  const handleTextChange = (e) => {
    const val = e.target.value;
    setRawText(val);
    parseWhatsAppPost(val, markupPercent);
  };

  // Reset form ready for NEXT WhatsApp post
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

  // Example Loader to test with 1-click
  const handleLoadDemo = () => {
    const demoPost = `حرام tv بلانكيت قياس 160/230
نوعية مرتبة (سميك)
متوفر بألوان: سكني، زهر، كحلي، بيج، اسود
السعر: $12
يوجد توصيل لكافة المناطق اللبنانية`;
    setRawText(demoPost);
    parseWhatsAppPost(demoPost, markupPercent);
  };

  // Submit Product to Store
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

    // Append main image file if available
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
    <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden mb-8 transition-all">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner border border-white/30">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black tracking-wide">
                {lang === 'ar' ? 'المستورد الذكي من منشورات واتساب' : 'WhatsApp Smart Product Importer'}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950 uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles size={12} /> Fast AI 1-Click
              </span>
            </div>
            <p className="text-emerald-100 text-sm mt-1">
              {lang === 'ar'
                ? 'انسخ منشور المورّد من الواتساب والصقه هنا، واسحب الصور أو اضغط Ctrl+V للصق الصور فوراً!'
                : 'Paste supplier post from WhatsApp & drag-drop photos or press Ctrl+V to auto-create products!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20 backdrop-blur-sm"
            title="تجربة منشور واتساب تلقائي"
          >
            <Wand2 size={14} />
            {lang === 'ar' ? 'تجربة مثال جاهز' : 'Load Demo Post'}
          </button>
          {rawText && (
            <button
              type="button"
              onClick={handleResetForNext}
              className="px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              {lang === 'ar' ? 'تفريغ الخانات' : 'Clear Form'}
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successProduct && (
        <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md">
              <Check size={22} />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-base">
                {lang === 'ar' ? `🎉 تم نشر منتج "${successProduct.name_ar}" بنجاح في المتجر!` : `🎉 Product "${successProduct.name_ar}" published successfully!`}
              </h4>
              <p className="text-emerald-700 text-xs mt-0.5">
                {lang === 'ar'
                  ? `بسعر بيع $${Number(successProduct.price_usd).toFixed(2)} (${formatPrice(successProduct.price_usd)}) - جاهز للطلب الفوري`
                  : `Selling at $${Number(successProduct.price_usd).toFixed(2)} - Live on storefront`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetForNext}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Plus size={16} />
              {lang === 'ar' ? 'إضافة منتج واتساب التالي 🚀' : 'Add Next Product 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Workflow */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Input Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. WhatsApp Textarea Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-emerald-600" />
                {lang === 'ar' ? '1. نص رسالة / منشور الواتساب' : '1. WhatsApp Message Text'}
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {lang === 'ar' ? 'يتم التحليل تلقائياً فور اللصق' : 'Auto-parsed live'}
              </span>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={handleTextChange}
              placeholder={lang === 'ar' 
                ? "الصق هنا نص رسالة الواتساب مباشرة...\nمثال:\nحرام tv بلانكيت قياس 160/230\nنوعية مرتبة (سميك)\nالسعر $12" 
                : "Paste WhatsApp text here...\nExample:\nTV Blanket 160/230\nHigh quality (thick)\nPrice $12"}
              className="w-full p-3.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner font-mono text-slate-800"
            />
          </div>

          {/* 2. Drag & Drop Image Uploader with Clipboard Paste */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={15} className="text-emerald-600" />
                {lang === 'ar' ? '2. صور المنتج (سحب أو Ctrl+V)' : '2. Product Images (Drag / Ctrl+V)'}
              </label>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {uploadedFiles.length} {lang === 'ar' ? 'صور محددة' : 'images'}
              </span>
            </div>

            {/* Dropzone Box */}
            <div
              ref={dropZoneRef}
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
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                isDragOver ? 'border-emerald-500 bg-emerald-50 scale-[1.01]' : 'border-slate-300 hover:border-emerald-400 bg-white'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleNewFiles(e.target.files)}
              />
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Upload size={22} />
              </div>
              <p className="text-xs font-bold text-slate-700">
                {lang === 'ar' ? 'اسحب الصور من الواتساب هنا، أو اضغط للاختيار' : 'Drag images from WhatsApp here, or click to browse'}
              </p>
              <p className="text-[11px] text-slate-400">
                {lang === 'ar' ? '💡 يمكنك أيضاً نسخ الصورة من الواتساب وضغط Ctrl+V مباشرة!' : '💡 You can also copy image from WhatsApp and press Ctrl+V directly!'}
              </p>
            </div>

            {/* Uploaded Thumbnails Grid */}
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 mt-3">
                {uploadedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border-2 aspect-square group shadow-sm bg-slate-100 ${
                      item.isMain ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Product preview ${idx}`}
                      className="w-full h-full object-cover"
                    />
                    {item.isMain && (
                      <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                        {lang === 'ar' ? 'الرئيسية' : 'Main'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                      {!item.isMain && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMainFile(idx); }}
                          className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[10px] font-bold"
                          title="تعيين كصورة رئيسية"
                        >
                          {lang === 'ar' ? 'رئيسية' : 'Main'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-[10px]"
                        title="حذف"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Supplier & Profit Margin Config */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign size={15} className="text-emerald-600" />
                {lang === 'ar' ? '3. المورّد وهامش الربح' : '3. Supplier & Profit Markup'}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  {lang === 'ar' ? 'المورّد / المصدر' : 'Supplier'}
                </label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                >
                  <option value="">{lang === 'ar' ? '-- بدون مورد --' : '-- No Merchant --'}</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  {lang === 'ar' ? 'نسبة الربح (%)' : 'Markup %'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={markupPercent}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-black text-emerald-700 text-center"
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            {/* Quick Profit Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold">{lang === 'ar' ? 'خيارات سريعة:' : 'Quick:'}</span>
              {[25, 35, 40, 50, 60].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleMarkupChange(pct)}
                  className={`px-2 py-0.5 text-[11px] rounded-lg font-bold transition ${
                    Number(markupPercent) === pct 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right / Live Smart Preview Column (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-50/60 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">
                    {lang === 'ar' ? 'المعاينة المباشرة وتأكيد الحقول' : 'Live Extracted Preview & Adjustments'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'ar' ? 'تم استخراج وتنسيق كافة البيانات تلقائياً، يمكنك التعديل قبل النشر' : 'All specs auto-parsed. Ready for 1-click publishing.'}
                  </p>
                </div>
              </div>

              {costPrice && sellingPrice && (
                <div className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5">
                  <span>{lang === 'ar' ? 'صافي الربح:' : 'Est. Profit:'}</span>
                  <span className="text-emerald-700 underline underline-offset-2">
                    +${(parseFloat(sellingPrice) - parseFloat(costPrice)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Arabic & English Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {lang === 'ar' ? 'اسم المنتج (بالعربي)' : 'Product Name (Arabic)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: حرام TV بلانكيت' : 'Arabic Name'}
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {lang === 'ar' ? 'اسم المنتج (بالإنجليزي)' : 'Product Name (English)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. TV Throw Blanket"
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Price Row (Cost, Selling, Compare Price) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                  {lang === 'ar' ? 'سعر الجملة (التكلفة $)' : 'Cost Price ($)'}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.1"
                    value={costPrice}
                    onChange={(e) => handleCostPriceChange(e.target.value)}
                    placeholder="12.00"
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 text-left"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <label className="text-[11px] font-black text-emerald-800 mb-1 block flex items-center justify-between">
                  <span>{lang === 'ar' ? 'سعر البيع للزبون ($)' : 'Selling Price ($)'}</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded">+{markupPercent}%</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-emerald-600 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.1"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="17.00"
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-black text-emerald-800 text-left"
                  />
                </div>
                {sellingPrice && (
                  <p className="text-[10px] text-emerald-700 font-bold mt-1 text-right">
                    ≈ {formatPrice(sellingPrice)}
                  </p>
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                  {lang === 'ar' ? 'السعر القديم (قبل الخصم)' : 'Compare Price ($)'}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.1"
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="23.00"
                    className="w-full pl-6 pr-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-slate-500 line-through text-left"
                  />
                </div>
              </div>
            </div>

            {/* Category & Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {lang === 'ar' ? 'القسم / التصنيف' : 'Category'}
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
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
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {lang === 'ar' ? 'المخزون المتوفر' : 'Stock Quantity'}
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Description Arabic */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                {lang === 'ar' ? 'الوصف والمواصفات (بالعربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                rows={2}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder={lang === 'ar' ? 'تفاصيل المنتج ومميزاته...' : 'Product details...'}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
            </div>

            {/* Detected Badges (Colors & Sizes) */}
            {(colors.length > 0 || sizes.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200">
                {sizes.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'القياسات:' : 'Sizes:'}</span>
                    {sizes.map((sz, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-bold">
                        {sz.name}
                      </span>
                    ))}
                  </div>
                )}
                {colors.length > 0 && (
                  <div className="flex items-center gap-1 mr-4">
                    <span className="text-[11px] font-black text-slate-500">{lang === 'ar' ? 'الألوان:' : 'Colors:'}</span>
                    {colors.map((clr, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-bold">
                        {clr}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Submit Button */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>{lang === 'ar' ? 'يتم حفظ المنتج فوراً وربطه بالمورّد والأسعار' : 'Instant live store publishing'}</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting || !nameAr || !sellingPrice}
              onClick={handlePublish}
              className={`px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2.5 transition transform active:scale-95 ${
                isSubmitting || !nameAr || !sellingPrice
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/25 hover:shadow-emerald-600/40'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>{lang === 'ar' ? 'جاري الحفظ والنشر...' : 'Publishing Product...'}</span>
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
