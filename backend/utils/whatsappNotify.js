/**
 * utils/whatsappNotify.js
 *
 * Shared WhatsApp send utilities.
 * Extracted here so that cronJobs.js can import them without
 * creating a circular dependency through WhatsApp.Controller.js.
 */

import axios from 'axios';
import FormData from 'form-data';

/**
 * Send a plain text message to a WhatsApp number via Meta Cloud API v19.0
 */
export const sendWhatsAppMessage = async (to, message) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';

    if (!phoneNumberId || !token || phoneNumberId === 'your_phone_number_id_here') {
        console.warn('[WhatsApp] Credentials not configured. Skipping send.');
        return null;
    }

    try {
        const resp = await axios.post(
            `${apiUrl}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`[WhatsApp] Message sent to ${to} (ID: ${resp.data?.messages?.[0]?.id})`);
        return resp.data;
    } catch (err) {
        console.error('[WhatsApp] Failed to send message:', err.response?.data || err.message);
        return null;
    }
};

/**
 * Upload and send a PDF document to a WhatsApp number via Meta Cloud API.
 */
export const sendWhatsAppDocument = async (to, buffer, filename, caption) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';

    if (!phoneNumberId || !token || phoneNumberId === 'your_phone_number_id_here') {
        console.warn('[WhatsApp] Credentials not configured. Skipping document send.');
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'application/pdf');
        formData.append('file', buffer, { filename, contentType: 'application/pdf' });

        const uploadRes = await axios.post(`${apiUrl}/${phoneNumberId}/media`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        const mediaId = uploadRes.data?.id;
        if (!mediaId) throw new Error('Meta media upload did not return an id');

        const msgRes = await axios.post(
            `${apiUrl}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'document',
                document: {
                    id: mediaId,
                    filename,
                    ...(caption ? { caption } : {})
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[WhatsApp] PDF sent to ${to} (ID: ${msgRes.data?.messages?.[0]?.id})`);
        return msgRes.data;
    } catch (err) {
        console.error('[WhatsApp] Failed to send document:', err.response?.data || err.message);
        throw err;
    }
};
