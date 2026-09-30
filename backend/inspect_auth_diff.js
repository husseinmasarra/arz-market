const fs = require('fs');

const guest = fs.readFileSync('guest_prod.html', 'utf8');
const auth = fs.readFileSync('auth_prod.html', 'utf8');

console.log('Guest HTML length:', guest.length);
console.log('Auth HTML length:', auth.length);

// Check if user name or email appears in auth HTML
console.log('Contains info@arz-mart.com:', auth.includes('info@arz-mart.com'));
console.log('Contains Hussein or Arz:', auth.includes('Hussein') || auth.includes('arz-mart') || auth.includes('Arz'));

// Check for user menu / login status in HTML
const userMenuGuest = guest.match(/<li[^>]*class="[^"]*dropdown[^"]*"[\s\S]*?<\/li>/gi) || [];
const userMenuAuth = auth.match(/<li[^>]*class="[^"]*dropdown[^"]*"[\s\S]*?<\/li>/gi) || [];
console.log('Guest dropdowns:', userMenuGuest.map(s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
console.log('Auth dropdowns:', userMenuAuth.map(s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));

// Let's check /my or /my/account or /my/orders
const myAccountMatch = auth.match(/href="\/my[^"]*"/g);
console.log('/my links in auth:', myAccountMatch);

// Look for pricelist dropdown or active pricelist
const pricelistMatch = auth.match(/class="[^"]*pricelist[^"]*"[\s\S]*?<\/div>/gi) || auth.match(/pricelist/gi);
console.log('Pricelist mentions:', pricelistMatch ? pricelistMatch.length : 0);
