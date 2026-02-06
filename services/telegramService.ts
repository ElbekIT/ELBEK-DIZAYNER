
import { TELEGRAM_CONFIG } from '../constants';
import { Order } from '../types';

export const sendOrderToTelegram = async (order: Order) => {
  // Simple helper to escape HTML special characters for Telegram's HTML mode
  const escapeHTML = (str: string = '') => 
    str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m] || m);

  const message = `
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
    // Using URLSearchParams avoids the 'application/json' preflight OPTIONS request
    // which often causes CORS issues in client-side Telegram bot requests.
    const params = new URLSearchParams();
    params.append('chat_id', TELEGRAM_CONFIG.ADMIN_ID);
    params.append('text', message);
    params.append('parse_mode', 'HTML');

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      body: params
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API Response Error:", errorData);
      return false;
    }
    
    console.log("Telegram notification sent successfully.");
    return true;
  } catch (error) {
    console.error("Telegram notification network/CORS error:", error);
    return false;
  }
};
