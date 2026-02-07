
import { Order } from '../types';
import { TELEGRAM_CONFIG } from '../constants';

/**
 * Sends order details to the specified Telegram Admin ID via the Bot API.
 */
export const sendOrderToTelegram = async (order: Order) => {
  const message = `
🚀 *Yangi Buyurtma! (Elbek Design)*
-----------------------------
👤 *Mijoz:* ${order.firstName} ${order.lastName || ''}
📞 *Tel:* ${order.phoneNumber}
📱 *Telegram:* ${order.telegramUsername}
🎮 *O'yin:* ${order.game}
🎨 *Turi:* ${order.designTypes?.join(', ')}
💰 *Narxi:* ${order.totalPrice?.toLocaleString()} UZS
🎟️ *Promokod:* ${order.promoCode || 'Yo\'q'}
📅 *Sana:* ${new Date(order.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}

📝 *Xabar:*
_${order.message || 'Tavsif yo\'q'}_
-----------------------------
✅ Holat: Tekshirilmoqda
  `.trim();

  return sendMessage(message);
};

/**
 * Sends cancellation details to the specified Telegram Admin ID.
 */
export const sendCancellationToTelegram = async (order: Order, reason: string) => {
  const message = `
❌ *Buyurtma Bekor Qilindi!*
-----------------------------
🆔 *Order ID:* ${order.id}
👤 *Mijoz:* ${order.firstName} ${order.lastName || ''}
📞 *Tel:* ${order.phoneNumber}
💰 *Qiymati:* ${order.totalPrice?.toLocaleString()} UZS

⚠️ *Bekor qilish sababi:*
_${reason}_
-----------------------------
📅 Sana: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}
  `.trim();

  return sendMessage(message);
};

async function sendMessage(text: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CONFIG.ADMIN_ID,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Telegram API Error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}
