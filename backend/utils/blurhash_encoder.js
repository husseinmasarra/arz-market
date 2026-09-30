const DIGIT_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

function encode83(val, length) {
  let result = "";
  for (let i = 1; i <= length; i++) {
    const digit = Math.floor(val / Math.pow(83, length - i)) % 83;
    result += DIGIT_CHARACTERS[digit];
  }
  return result;
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

function encodeBlurHash(pixels, width, height, componentX = 4, componentY = 3) {
  if (componentX < 1 || componentX > 9 || componentY < 1 || componentY > 9) {
    throw new Error("BlurHash components must be between 1 and 9");
  }
  if (width * height * 4 !== pixels.length) {
    throw new Error("Pixel buffer size mismatch");
  }

  const factors = [];
  for (let y = 0; y < componentY; y++) {
    for (let x = 0; x < componentX; x++) {
      const normalisation = (x === 0 && y === 0) ? 1 : 2;
      let r = 0, g = 0, b = 0;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const basis = Math.cos((Math.PI * x * px) / width) * Math.cos((Math.PI * y * py) / height);
          const pixelIdx = 4 * (px + py * width);
          r += basis * sRGBToLinear(pixels[pixelIdx]);
          g += basis * sRGBToLinear(pixels[pixelIdx + 1]);
          b += basis * sRGBToLinear(pixels[pixelIdx + 2]);
        }
      }

      const scale = normalisation / (width * height);
      factors.push([r * scale, g * scale, b * scale]);
    }
  }

  const dc = factors[0];
  const ac = factors.slice(1);

  let hash = "";

  const sizeFlag = (componentX - 1) + (componentY - 1) * 9;
  hash += encode83(sizeFlag, 1);

  let maximumValue = 0;
  if (ac.length > 0) {
    let actualMaximumValue = 0;
    for (const factor of ac) {
      actualMaximumValue = Math.max(actualMaximumValue, Math.abs(factor[0]), Math.abs(factor[1]), Math.abs(factor[2]));
    }
    const quantisedMaxAC = Math.max(0, Math.min(82, Math.floor(actualMaximumValue * 166 - 0.5)));
    hash += encode83(quantisedMaxAC, 1);
    maximumValue = (quantisedMaxAC + 1) / 166;
  } else {
    hash += encode83(0, 1);
  }

  const dcValue = (linearTosRGB(dc[0]) << 16) + (linearTosRGB(dc[1]) << 8) + linearTosRGB(dc[2]);
  hash += encode83(dcValue, 4);

  for (const factor of ac) {
    const qR = Math.max(0, Math.min(18, Math.floor(signPow(factor[0] / maximumValue, 0.5) * 9 + 9.5)));
    const qG = Math.max(0, Math.min(18, Math.floor(signPow(factor[1] / maximumValue, 0.5) * 9 + 9.5)));
    const qB = Math.max(0, Math.min(18, Math.floor(signPow(factor[2] / maximumValue, 0.5) * 9 + 9.5)));
    const acValue = qR * 19 * 19 + qG * 19 + qB;
    hash += encode83(acValue, 2);
  }

  return hash;
}

module.exports = { encodeBlurHash };
