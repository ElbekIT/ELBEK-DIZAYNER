import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

const BOT_TOKEN = "7264338255:AAGE9iqGXeergNWkF5b7U43NQvGCwC5mi8w";
const ADMIN_ID = "7714287797";

export const onOrderCreated = functions.database
  .ref("/orders/{orderId}")
  .onCreate(async (snapshot) => {
    const order = snapshot.val();

    const message = `
� <b>Yangi Buyurtma (Elbek Design)</b>

� <b>Mijoz:</b> ${order.firstName} ${order.lastName || ""}
� <b>Tel:</b> ${order.phoneNumber}
� <b>Telegram:</b> ${order.telegramUsername}

� <b>O‘yin:</b> ${order.game}
� <b>Turi:</b> ${order.designTypes?.join(", ") || "Nomaʼlum"}

� <b>Narxi:</b> ${Number(order.totalPrice).toLocaleString()} UZS
� <b>Promokod:</b> ${order.promoCode || "Yo‘q"}

� <i>${order.message || "Xabar yo‘q"}</i>
`;

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: ADMIN_ID,
        text: message,
        parse_mode: "HTML",
      }
    );
  });
