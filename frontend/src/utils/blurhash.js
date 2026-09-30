/**
 * Pure JavaScript BlurHash Decoder & Dynamic Generator
 * Based on the official BlurHash algorithm (Wolt).
 * Zero external dependencies, ultra-fast performance.
 */

const DIGIT_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

export const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

// Category-tuned authentic BlurHashes for instant client placeholders
export const PRESET_BLURHASHES = {
  gaming: "L14n0*00_300~q%M4nof00_3_3_3",     // Neon blue & dark slate
  beauty: "LPS~e;?v~qxu%Mof%Mj[ofofWBj[",     // Soft rose & warm blush
  perfume: "LXQv5t%2?bxt~qxuxuWBxtWBf6WB",    // Warm amber & golden glass
  tech: "L8N^%g_3~q9F?b?bofof_3_3_3_3",       // Clean minimal metallic silver
  kitchen: "LYPZfS%M~qxu?b%M%Mj[t7t7Rjof",    // Warm terracotta & porcelain
  audio: "L35#x^00_3_3~q%M4nof00_3_3_3",      // Deep obsidian & carbon
  default: "L6PZfSi_.AyE_3t7t7R**0o#DgR4"
};

export function getFallbackBlurHash(name = '', categoryName = '') {
  const str = String(categoryName || name).toLowerCase();
  if (str.includes('beauty') || str.includes('تجميل') || str.includes('مكياج') || str.includes('skincare')) {
    return PRESET_BLURHASHES.beauty;
  }
  if (str.includes('gaming') || str.includes('جيمنج') || str.includes('ألعاب') || str.includes('esports')) {
    return PRESET_BLURHASHES.gaming;
  }
  if (str.includes('perfume') || str.includes('عطور') || str.includes('بخور') || str.includes('fragrance')) {
    return PRESET_BLURHASHES.perfume;
  }
  if (str.includes('kitchen') || str.includes('مطبخ') || str.includes('dining')) {
    return PRESET_BLURHASHES.kitchen;
  }
  if (str.includes('audio') || str.includes('صوت') || str.includes('سماعات') || str.includes('headphone')) {
    return PRESET_BLURHASHES.audio;
  }
  if (str.includes('phone') || str.includes('هاتف') || str.includes('computer') || str.includes('كمبيوتر')) {
    return PRESET_BLURHASHES.tech;
  }
  return PRESET_BLURHASHES.default;
}

function decode83(str, start, end) {
  let val = 0;
  for (let i = start; i < end; i++) {
    const c = str[i];
    const idx = DIGIT_CHARACTERS.indexOf(c);
    if (idx === -1) return 0;
    val = val * 83 + idx;
  }
  return val;
}

function sRGBToLinear(value) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearTosRGB(value) {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308
    ? Math.round(v * 12.92 * 255 + 0.5)
    : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
}

function signPow(val, exp) {
  return Math.sign(val) * Math.pow(Math.abs(val), exp);
}

/**
 * Validates whether a given string is a valid BlurHash.
 */
export function isBlurHashValid(blurhash) {
  if (!blurhash || typeof blurhash !== 'string' || blurhash.length < 6) {
    return false;
  }
  const sizeFlag = decode83(blurhash, 0, 1);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  return blurhash.length === 4 + 2 * numX * numY;
}

/**
 * Decodes a BlurHash string into raw RGBA pixel data (Uint8ClampedArray).
 */
export function decodeBlurHash(blurhash, width = 32, height = 32, punch = 1) {
  if (!isBlurHashValid(blurhash)) {
    blurhash = DEFAULT_BLURHASH;
  }

  const sizeFlag = decode83(blurhash, 0, 1);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;

  const quantisedMaxAC = decode83(blurhash, 1, 2);
  const maxValue = ((quantisedMaxAC + 1) / 166) * punch;

  const colors = new Array(numX * numY);

  const dcVal = decode83(blurhash, 2, 6);
  colors[0] = [
    sRGBToLinear((dcVal >> 16) & 255),
    sRGBToLinear((dcVal >> 8) & 255),
    sRGBToLinear(dcVal & 255)
  ];

  for (let i = 1; i < numX * numY; i++) {
    const acVal = decode83(blurhash, 4 + i * 2, 6 + i * 2);
    const qR = Math.floor(acVal / (19 * 19));
    const qG = Math.floor(acVal / 19) % 19;
    const qB = acVal % 19;

    colors[i] = [
      signPow((qR - 9) / 9, 2.0) * maxValue,
      signPow((qG - 9) / 9, 2.0) * maxValue,
      signPow((qB - 9) / 9, 2.0) * maxValue
    ];
  }

  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }

      const pixelIdx = 4 * (x + y * width);
      pixels[pixelIdx] = linearTosRGB(r);
      pixels[pixelIdx + 1] = linearTosRGB(g);
      pixels[pixelIdx + 2] = linearTosRGB(b);
      pixels[pixelIdx + 3] = 255;
    }
  }

  return pixels;
}

/**
 * Decodes a BlurHash directly to a data URL via in-memory canvas for instant rendering.
 */
const dataUrlCache = new Map();

export function blurHashToDataURL(blurhash, width = 32, height = 32) {
  const hash = isBlurHashValid(blurhash) ? blurhash : DEFAULT_BLURHASH;
  const cacheKey = `${hash}_${width}x${height}`;
  if (dataUrlCache.has(cacheKey)) {
    return dataUrlCache.get(cacheKey);
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const pixels = decodeBlurHash(hash, width, height);
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(pixels);
    ctx.putImageData(imgData, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    if (dataUrlCache.size > 200) {
      dataUrlCache.clear();
    }
    dataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (e) {
    return '';
  }
}
