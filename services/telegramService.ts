
import { TELEGRAM_CONFIG } from '../constants';
import { Order } from '../types';

export const sendOrderToTelegram = async (order: Order) => {
  // Helper to escape HTML special characters for Telegram's HTML parse mode
  const escapeHTML = (str: string = '') => 
    str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m] || m);

  // Constructing a clean, readable message for the admin
  const message = `
🚀 <b>NEW DESIGN ORDER</b>
-----------------------------
👤 <b>Client:</b> ${escapeHTML(order.firstName)} ${escapeHTML(order.lastName || '')}
📧 <b>Email:</b> ${escapeHTML(order.userEmail)}
📞 <b>Phone:</b> ${escapeHTML(order.phoneNumber)}
📱 <b>Telegram:</b> ${escapeHTML(order.telegramUsername)}
🎮 <b>Focus:</b> ${escapeHTML(order.game)}
🎨 <b>Services:</b> ${escapeHTML(order.designTypes?.join(' + ') || 'None')}
💰 <b>Value:</b> ${order.totalPrice?.toLocaleString() || 0} UZS
🎟️ <b>Promo:</b> ${escapeHTML(order.promoCode || 'N/A')}
📅 <b>Timestamp:</b> ${new Date(order.createdAt).toLocaleString()}

📝 <b>Vision:</b>
<i>${escapeHTML(order.message || 'No specific instructions provided.')}</i>
-----------------------------
🆔 Order ID: <code>${order.id}</code>
  `.trim();

  try {
    // Telegram API does not support CORS. 
    // To send messages from a client-side web app, we use a GET request with 'no-cors' mode.
    // This allows the request to be dispatched to the server even if the browser cannot read the response.
    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
    const params = new URLSearchParams({
      chat_id: TELEGRAM_CONFIG.ADMIN_ID,
      text: message,
      parse_mode: 'HTML'
    });

    const url = `${baseUrl}?${params.toString()}`;

    // mode: 'no-cors' is critical for client-side Telegram bot integration.
    await fetch(url, { 
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    
    console.log("Telegram notification signal sent.");
    return true;
  } catch (error) {
    console.error("Telegram notification failed to dispatch:", error);
    return false;
  }
};
