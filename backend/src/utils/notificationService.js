const https = require('https');
const querystring = require('querystring');
const db = require('../config/db');

const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(botToken, chatId, messageText) {
  if (!botToken || !chatId || !messageText) return false;

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: messageText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.ok === true);
        } catch (e) {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[NotificationService] Telegram send error:', err.message);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Format and send instant new order notification to Admin
 */
async function notifyAdminNewOrder({ orderId, trackingNumber, customerName, customerPhone, address, items, totalUsd, totalLbp, deliveryFeeUsd, paymentMethod, notes }) {
  try {
    const settings = await db.getAsync('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
    const botToken = settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settings?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    // Format items list for Telegram
    let itemsText = '';
    if (Array.isArray(items)) {
      items.forEach((item, idx) => {
        const title = item.name_ar || item.name_en || item.title || `منتج #${item.product_id || idx + 1}`;
        const option = item.selectedSize ? ` (${item.selectedSize})` : (item.selectedColor ? ` (${item.selectedColor})` : '');
        itemsText += `\n  ▫️ <b>${item.quantity}x</b> ${title}${option} — <b>$${item.price_usd || item.price}</b>`;
      });
    }

    const cleanPhone = String(customerPhone || '').replace(/[^0-9+]/g, '');
    const cleanCustomerName = customerName || 'زبون المتجر';

    // Direct WhatsApp link for admin to click & chat with customer
    const adminWhatsAppText = encodeURIComponent(`مرحباً ${cleanCustomerName}، تم استلام طلبيتك رقم #${trackingNumber} في متجر أرز مارت، ونحن بصدد تجهيزها للشحن والتوصيل. شكراً لثقتك! 🛍️`);
    const customerWhatsAppLink = `https://wa.me/${cleanPhone.replace(/^00/, '').replace(/^\+/, '')}?text=${adminWhatsAppText}`;

    const telegramHtml = `
🚀 <b>طلب جديد في أرز مارت | New Order!</b>
━━━━━━━━━━━━━━━━━━━━━━
📦 <b>رقم التتبع:</b> <code>${trackingNumber}</code> (ID: #${orderId})
👤 <b>الزبون:</b> ${cleanCustomerName}
📱 <b>الهاتف:</b> <a href="tel:${cleanPhone}">${cleanPhone}</a>
📍 <b>العنوان:</b> ${address}
💳 <b>طريقة الدفع:</b> ${paymentMethod || 'الدفع عند الاستلام (COD)'}

🛍️ <b>المنتجات:</b>${itemsText}

💰 <b>المجموع:</b> <b>$${totalUsd}</b> (${Number(totalLbp || 0).toLocaleString()} L.L.)
🚚 <b>أجور التوصيل:</b> $${deliveryFeeUsd || 0}
${notes ? `📝 <b>ملاحظة:</b> <i>${notes}</i>\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
💬 <a href="${customerWhatsAppLink}"><b>فتح محادثة واتساب مع الزبون 📲</b></a>
`.trim();

    if (botToken && chatId) {
      await sendTelegramMessage(botToken, chatId, telegramHtml);
    }

    return {
      success: true,
      whatsappLink: customerWhatsAppLink
    };
  } catch (err) {
    console.error('[NotificationService] Error notifying admin:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendTelegramMessage,
  notifyAdminNewOrder
};
