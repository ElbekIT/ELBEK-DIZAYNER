
import { TELEGRAM_CONFIG } from '../constants';
import { Order } from '../types';

export const sendOrderToTelegram = async (order: Order) => {
  // Simple helper to escape HTML special characters
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
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CONFIG.ADMIN_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API Error:", errorData);
    }
    
    return response.ok;
  } catch (error) {
    console.error("Telegram notify network error:", error);
    return false;
  }
};
