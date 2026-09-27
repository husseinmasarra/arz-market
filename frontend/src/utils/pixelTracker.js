/**
 * Universal Pixel & Marketing Tracker for Arz-Mart
 * Supports Meta (Facebook/Instagram), TikTok, Snapchat, and Google Analytics 4 (GA4).
 */

let initializedPixels = {
  fb: false,
  tiktok: false,
  snapchat: false,
  ga: false
};

let currentConfig = {
  facebook_pixel_id: '',
  tiktok_pixel_id: '',
  snapchat_pixel_id: '',
  google_analytics_id: ''
};

// Safe script injector helper
function injectScript(id, src, content) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  if (src) script.src = src;
  if (content) script.innerHTML = content;
  document.head.appendChild(script);
}

/**
 * Initialize all active pixels based on store settings
 */
export function initPixels(settings = {}) {
  if (!settings || typeof window === 'undefined') return;

  const fbId = (settings.facebook_pixel_id || '').trim();
  const ttId = (settings.tiktok_pixel_id || '').trim();
  const scId = (settings.snapchat_pixel_id || '').trim();
  const gaId = (settings.google_analytics_id || '').trim();

  // 1. Meta / Facebook Pixel
  if (fbId && (!initializedPixels.fb || currentConfig.facebook_pixel_id !== fbId)) {
    try {
      if (!window.fbq) {
        /* eslint-disable */
        (function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          if (s && s.parentNode) {
            s.parentNode.insertBefore(t, s);
          } else {
            b.head.appendChild(t);
          }
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
      }
      window.fbq('init', fbId);
      window.fbq('track', 'PageView');
      initializedPixels.fb = true;
      currentConfig.facebook_pixel_id = fbId;
    } catch (e) {
      console.warn('[Pixel Tracker] Failed to init Meta Pixel:', e);
    }
  }

  // 2. TikTok Pixel
  if (ttId && (!initializedPixels.tiktok || currentConfig.tiktok_pixel_id !== ttId)) {
    try {
      if (!window.ttq) {
        /* eslint-disable */
        (function (w, d, t) {
          w.TiktokAnalyticsObject = t;
          var ttq = (w[t] = w[t] || []);
          ttq.methods = [
            'page',
            'track',
            'identify',
            'instances',
            'debug',
            'on',
            'off',
            'once',
            'ready',
            'alias',
            'group',
            'enableCookie',
            'disableCookie'
          ];
          ttq.setAndDefer = function (t, e) {
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
          };
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
          ttq.instance = function (t) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
              ttq.setAndDefer(e, ttq.methods[n]);
            return e;
          };
          ttq.load = function (e, n) {
            var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
            (ttq._i = ttq._i || {}),
              (ttq._i[e] = []),
              (ttq._i[e]._u = i),
              (ttq._t = ttq._t || {}),
              (ttq._t[e] = +new Date()),
              (ttq._o = ttq._o || {}),
              (ttq._o[e] = n || {});
            var o = document.createElement('script');
            (o.type = 'text/javascript'), (o.async = !0), (o.src = i + '?sdkid=' + e + '&lib=' + t);
            var a = document.getElementsByTagName('script')[0];
            if (a && a.parentNode) {
              a.parentNode.insertBefore(o, a);
            } else {
              document.head.appendChild(o);
            }
          };
        })(window, document, 'ttq');
        /* eslint-enable */
      }
      window.ttq.load(ttId);
      window.ttq.page();
      initializedPixels.tiktok = true;
      currentConfig.tiktok_pixel_id = ttId;
    } catch (e) {
      console.warn('[Pixel Tracker] Failed to init TikTok Pixel:', e);
    }
  }

  // 3. Snapchat Pixel
  if (scId && (!initializedPixels.snapchat || currentConfig.snapchat_pixel_id !== scId)) {
    try {
      if (!window.snaptr) {
        /* eslint-disable */
        (function (e, t, n) {
          if (e.snaptr) return;
          var a = (e.snaptr = function () {
            a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
          });
          a.queue = [];
          var s = 'script';
          var r = t.createElement(s);
          r.async = !0;
          r.src = n;
          var u = t.getElementsByTagName(s)[0];
          if (u && u.parentNode) {
            u.parentNode.insertBefore(r, u);
          } else {
            t.head.appendChild(r);
          }
        })(window, document, 'https://sc-static.net/scevent.min.js');
        /* eslint-enable */
      }
      window.snaptr('init', scId);
      window.snaptr('track', 'PAGE_VIEW');
      initializedPixels.snapchat = true;
      currentConfig.snapchat_pixel_id = scId;
    } catch (e) {
      console.warn('[Pixel Tracker] Failed to init Snapchat Pixel:', e);
    }
  }

  // 4. Google Analytics 4 (GA4)
  if (gaId && (!initializedPixels.ga || currentConfig.google_analytics_id !== gaId)) {
    try {
      injectScript('ga4-script', `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
      if (!window.dataLayer) window.dataLayer = [];
      if (!window.gtag) {
        window.gtag = function () {
          window.dataLayer.push(arguments);
        };
      }
      window.gtag('js', new Date());
      window.gtag('config', gaId, { send_page_view: true });
      initializedPixels.ga = true;
      currentConfig.google_analytics_id = gaId;
    } catch (e) {
      console.warn('[Pixel Tracker] Failed to init Google Analytics:', e);
    }
  }
}

/**
 * Track Page Views
 */
export function trackPageView(pageTitle = document.title, path = window.location.pathname) {
  try {
    if (initializedPixels.fb && window.fbq) {
      window.fbq('track', 'PageView');
    }
    if (initializedPixels.tiktok && window.ttq) {
      window.ttq.page();
    }
    if (initializedPixels.snapchat && window.snaptr) {
      window.snaptr('track', 'PAGE_VIEW');
    }
    if (initializedPixels.ga && window.gtag && currentConfig.google_analytics_id) {
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: path
      });
    }
  } catch (err) {
    console.debug('[Pixel Tracker] trackPageView error:', err);
  }
}

/**
 * Track Product View / ViewContent
 */
export function trackViewContent(product) {
  if (!product) return;
  const price = parseFloat(product.price_usd || product.price || 0);
  const name = product.name_ar || product.name_en || product.name || 'Product';
  const id = String(product.id || '');
  const category = product.category_name_ar || product.category_name_en || product.category_name || '';

  try {
    if (initializedPixels.fb && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: name,
        content_ids: [id],
        content_type: 'product',
        value: price,
        currency: 'USD'
      });
    }
    if (initializedPixels.tiktok && window.ttq) {
      window.ttq.track('ViewContent', {
        content_id: id,
        content_type: 'product',
        content_name: name,
        content_category: category,
        price: price,
        value: price,
        currency: 'USD'
      });
    }
    if (initializedPixels.snapchat && window.snaptr) {
      window.snaptr('track', 'VIEW_CONTENT', {
        item_ids: [id],
        item_category: category,
        price: price,
        currency: 'USD'
      });
    }
    if (initializedPixels.ga && window.gtag) {
      window.gtag('event', 'view_item', {
        currency: 'USD',
        value: price,
        items: [
          {
            item_id: id,
            item_name: name,
            item_category: category,
            price: price,
            quantity: 1
          }
        ]
      });
    }
  } catch (err) {
    console.debug('[Pixel Tracker] trackViewContent error:', err);
  }
}

/**
 * Track Add to Cart
 */
export function trackAddToCart(product, quantity = 1, selectedColor = '', selectedSize = '') {
  if (!product) return;
  const price = parseFloat(product.price_usd || product.price || 0);
  const name = product.name_ar || product.name_en || product.name || 'Product';
  const id = String(product.id || '');
  const totalValue = +(price * quantity).toFixed(2);
  const category = product.category_name_ar || product.category_name_en || product.category_name || '';

  try {
    if (initializedPixels.fb && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_name: name,
        content_ids: [id],
        content_type: 'product',
        value: totalValue,
        currency: 'USD'
      });
    }
    if (initializedPixels.tiktok && window.ttq) {
      window.ttq.track('AddToCart', {
        content_id: id,
        content_type: 'product',
        content_name: name,
        content_category: category,
        quantity: quantity,
        price: price,
        value: totalValue,
        currency: 'USD'
      });
    }
    if (initializedPixels.snapchat && window.snaptr) {
      window.snaptr('track', 'ADD_CART', {
        item_ids: [id],
        item_category: category,
        price: totalValue,
        number_items: quantity,
        currency: 'USD'
      });
    }
    if (initializedPixels.ga && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'USD',
        value: totalValue,
        items: [
          {
            item_id: id,
            item_name: name,
            item_category: category,
            item_variant: [selectedColor, selectedSize].filter(Boolean).join(' - ') || undefined,
            price: price,
            quantity: quantity
          }
        ]
      });
    }
  } catch (err) {
    console.debug('[Pixel Tracker] trackAddToCart error:', err);
  }
}

/**
 * Track Initiate Checkout
 */
export function trackInitiateCheckout(cartItems = [], totalAmount = 0) {
  const items = Array.isArray(cartItems) ? cartItems : [];
  const total = parseFloat(totalAmount || 0);
  const itemIds = items.map(item => String(item.product_id || item.id));

  try {
    if (initializedPixels.fb && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: itemIds,
        content_type: 'product',
        num_items: items.length,
        value: total,
        currency: 'USD'
      });
    }
    if (initializedPixels.tiktok && window.ttq) {
      window.ttq.track('InitiateCheckout', {
        contents: items.map(i => ({
          content_id: String(i.product_id || i.id),
          content_name: i.name_ar || i.name_en || i.name || '',
          quantity: i.quantity || 1,
          price: parseFloat(i.price_usd || i.price || 0)
        })),
        value: total,
        currency: 'USD'
      });
    }
    if (initializedPixels.snapchat && window.snaptr) {
      window.snaptr('track', 'START_CHECKOUT', {
        item_ids: itemIds,
        price: total,
        number_items: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
        currency: 'USD'
      });
    }
    if (initializedPixels.ga && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: total,
        items: items.map(i => ({
          item_id: String(i.product_id || i.id),
          item_name: i.name_ar || i.name_en || i.name || '',
          price: parseFloat(i.price_usd || i.price || 0),
          quantity: i.quantity || 1
        }))
      });
    }
  } catch (err) {
    console.debug('[Pixel Tracker] trackInitiateCheckout error:', err);
  }
}

/**
 * Track Purchase / Order Completion
 */
export function trackPurchase(orderId, cartItems = [], totalAmount = 0, currency = 'USD') {
  const items = Array.isArray(cartItems) ? cartItems : [];
  const total = parseFloat(totalAmount || 0);
  const itemIds = items.map(item => String(item.product_id || item.id));

  try {
    if (initializedPixels.fb && window.fbq) {
      window.fbq('track', 'Purchase', {
        content_ids: itemIds,
        content_type: 'product',
        num_items: items.length,
        value: total,
        currency: currency
      });
    }
    if (initializedPixels.tiktok && window.ttq) {
      window.ttq.track('PlaceAnOrder', {
        contents: items.map(i => ({
          content_id: String(i.product_id || i.id),
          content_name: i.name_ar || i.name_en || i.name || '',
          quantity: i.quantity || 1,
          price: parseFloat(i.price_usd || i.price || 0)
        })),
        value: total,
        currency: currency
      });
      window.ttq.track('CompletePayment', {
        value: total,
        currency: currency
      });
    }
    if (initializedPixels.snapchat && window.snaptr) {
      window.snaptr('track', 'PURCHASE', {
        transaction_id: String(orderId || Date.now()),
        item_ids: itemIds,
        price: total,
        number_items: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
        currency: currency
      });
    }
    if (initializedPixels.ga && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: String(orderId || Date.now()),
        value: total,
        currency: currency,
        items: items.map(i => ({
          item_id: String(i.product_id || i.id),
          item_name: i.name_ar || i.name_en || i.name || '',
          price: parseFloat(i.price_usd || i.price || 0),
          quantity: i.quantity || 1
        }))
      });
    }
  } catch (err) {
    console.debug('[Pixel Tracker] trackPurchase error:', err);
  }
}

/**
 * Track Product / Catalog Search
 */
export function trackSearch(query = '') {
  if (!query || typeof query !== 'string' || !query.trim()) return;
  const q = query.trim();

  try {
    if (initializedPixels.fb && window.fbq) {
      window.fbq('track', 'Search', { search_string: q });
    }
    if (initializedPixels.tiktok && window.ttq) {
      window.ttq.track('Search', { query: q });
    }
    if (initializedPixels.snapchat && window.snaptr) {
      window.snaptr('track', 'SEARCH', { search_string: q });
    }
    if (initializedPixels.ga && window.gtag) {
      window.gtag('event', 'search', { search_term: q });
    }
  } catch (err) {
    console.debug('[Pixel Tracker] trackSearch error:', err);
  }
}
