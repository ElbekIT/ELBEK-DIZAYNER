
/**
 * ELBEK DESIGN - BACKEND NOTIFICATION SERVICE
 * 
 * IMPORTANT: This code is meant to be deployed as a Firebase Cloud Function.
 * Direct frontend calls to Telegram are unreliable and insecure.
 * 
 * IMPLEMENTATION STEPS:
 * 1. Initialize Firebase Functions in your project.
 * 2. Copy the code below into your `functions/src/index.ts` file.
 * 3. Deploy using `firebase deploy --only functions`.
 */

/* 
// --- CLOUD FUNCTION CODE (FOR BACKEND DEPLOYMENT) ---

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();

const BOT_TOKEN = '7264338255:AAGE9iqGXeergNWkF5b7U43NQvGCwC5mi8w';
const ADMIN_ID = '7714287797';

export const onOrderCreated = functions.database.ref('/orders/{orderId}')
    .onCreate(async (snapshot, context) => {
        const order = snapshot.val();
        
        const messageText = `
🚀 <b>Yangi Buyurtma! (Elbek Design)</b>
-----------------------------
👤 <b>Mijoz:</b> ${order.firstName} ${order.lastName || ''}
📞 <b>Tel:</b> ${order.phoneNumber}
📱 <b>Telegram:</b> ${order.telegramUsername}
🎮 <b>O'yin:</b> ${order.game}
🎨 <b>Turi:</b> ${order.designTypes?.join(', ') || 'Noma\'lum'}
💰 <b>Narxi:</b> ${order.totalPrice?.toLocaleString() || 0} UZS
🎟️ <b>Promokod:</b> ${order.promoCode || 'Yo\'q'}
📅 <b>Sana:</b> ${new Date(order.createdAt).toLocaleString()}

📝 <b>Xabar:</b>
<i>${order.message || 'Tavsif yo\'q'}</i>
-----------------------------
✅ Holat: Tekshirilmoqda
        `.trim();

        try {
            await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                params: {
                    chat_id: ADMIN_ID,
                    text: messageText,
                    parse_mode: 'HTML'
                }
            });
            console.log(`Notification sent for order ${order.id}`);
        } catch (error) {
            console.error("Telegram API Error:", error);
        }
    });
*/

/**
 * Dummy export to prevent frontend build errors if the file is imported.
 */
export const sendOrderToTelegram = async (order: any) => {
  console.warn("Direct frontend Telegram notifications are disabled for reliability. Use Firebase Cloud Functions instead.");
  return true;
};
