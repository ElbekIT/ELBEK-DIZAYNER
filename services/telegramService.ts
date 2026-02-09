
import { TELEGRAM_CONFIG } from '../constants';
import { Order } from '../types';

/**
 * Sends order notifications to a Telegram bot.
 * Uses a GET request with URL parameters to bypass CORS preflight restrictions
 * that often block JSON POST requests from the browser to the Telegram API.
 */
export const sendOrderToTelegram = async (order: Order) => {
  // Helper to escape characters that might break the URL or Telegram HTML parsing
  const escapeHTML = (str: string = '') => 
    str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m] || m);

  const messageText = `
🚀 <b>New Order from Elbek Design!</b>
-----------------------------
👤 <b>User:</b> ${escapeHTML(order.firstName)} ${escapeHTML(order.lastName || '')}
📧 <b>Email:</b> ${escapeHTML(order.userEmail)}
📞 <b>Phone:</b> ${escapeHTML(order.phoneNumber)}
📱 <b>Telegram:</b> ${escapeHTML(order.telegramUsername)}
🎮 <b>Game:</b> ${escapeHTML(order.game)}
🎨 <b>Designs:</b> ${escapeHTML(order.designTypes?.join(', ') || 'None')}
💰 <b>Total Price:</b> ${order.totalPrice?.toLocaleString() || 0} UZS
🎟️ <b>Promo:</b> ${escapeHTML(order.promoCode || 'None')}
📅 <b>Date:</b> ${new Date(order.createdAt).toLocaleString()}

📝 <b>Message:</b>
<i>${escapeHTML(order.message || 'No description provided')}</i>
-----------------------------
✅ Status: Checking
  `.trim();

  try {
    // Using GET request to avoid CORS preflight (OPTIONS) issues with api.telegram.org
    const url = new URL(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`);
    url.searchParams.append('chat_id', TELEGRAM_CONFIG.ADMIN_ID);
    url.searchParams.append('text', messageText);
    url.searchParams.append('parse_mode', 'HTML');

    // We use 'no-cors' mode to ensure the request is dispatched even if the browser 
    // can't read the response due to Telegram's CORS policy.
    const response = await fetch(url.toString(), { 
      method: 'GET',
      mode: 'no-cors' 
    });
    
    // Note: with 'no-cors', response.ok will be false and response.status will be 0,
    // but the request is actually sent to the server.
    return true;
  } catch (error) {
    console.error("Telegram notify network error:", error);
    return false;
  }
};
