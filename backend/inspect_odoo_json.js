const https = require('https');
const fs = require('fs');

const agent = new https.Agent({ rejectUnauthorized: false });

const html = fs.readFileSync('wholesale_prod.html', 'utf8');

// Find all JSON blobs or data attributes in wholesale_prod.html
const combinationMatch = html.match(/data-combination-info="([^"]+)"/i) || html.match(/class="js_product"[^>]*data-product-tracking-info="([^"]+)"/i);
console.log('Combination data found in HTML:', combinationMatch ? combinationMatch[1] : 'none');

// Look for product_template_id or product_id
const tmplIdMatch = html.match(/name="product_template_id"\s+value="(\d+)"/i);
const prodIdMatch = html.match(/name="product_id"\s+value="(\d+)"/i) || html.match(/class="product_id"\s+value="(\d+)"/i);
console.log('Template ID:', tmplIdMatch ? tmplIdMatch[1] : 'none');
console.log('Product ID:', prodIdMatch ? prodIdMatch[1] : 'none');

// Look for data-oe-model and data-oe-id
const oeMatches = html.match(/data-oe-model="product\.(?:template|product)"\s+data-oe-id="(\d+)"/g) || [];
console.log('OE models:', oeMatches);
