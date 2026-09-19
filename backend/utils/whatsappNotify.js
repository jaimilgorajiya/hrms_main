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

/**
 * Send an interactive button message (up to 3 reply buttons) to a WhatsApp number.
 * Automatically falls back to plain text if the interactive message cannot be delivered.
 *
 * @param {string} to - Destination WhatsApp number (e.g. "919099705065")
 * @param {Object} options
 * @param {string} [options.headerText] - Optional header title (bold)
 * @param {string} options.bodyText - Main message body
 * @param {string} [options.footerText] - Optional small footer
 * @param {Array<{id: string, title: string}>} options.buttons - Array of up to 3 buttons
 * @returns {Promise<Object|null>}
 */
export const sendWhatsAppInteractiveButtons = async (to, { headerText, bodyText, footerText = 'HRMS Approval Action', buttons = [] }) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';

    if (!phoneNumberId || !token || phoneNumberId === 'your_phone_number_id_here') {
        console.warn('[WhatsApp] Credentials not configured. Skipping interactive buttons send.');
        return null;
    }

    try {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                ...(headerText ? { header: { type: 'text', text: headerText.slice(0, 60) } } : {}),
                body: { text: bodyText },
                ...(footerText ? { footer: { text: footerText.slice(0, 60) } } : {}),
                action: {
                    buttons: buttons.slice(0, 3).map(b => ({
                        type: 'reply',
                        reply: {
                            id: b.id.slice(0, 256),
                            title: b.title.slice(0, 20)
                        }
                    }))
                }
            }
        };

        const resp = await axios.post(
            `${apiUrl}/${phoneNumberId}/messages`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`[WhatsApp] Interactive buttons sent to ${to} (ID: ${resp.data?.messages?.[0]?.id})`);
        return resp.data;
    } catch (err) {
        console.warn('[WhatsApp] Interactive button send failed, falling back to text format:', err.response?.data?.error?.message || err.message);
        
        // Fallback: send clean structured text with reply guidelines
        const fallbackBody =
            `${headerText ? headerText + '\n\n' : ''}` +
            `${bodyText}\n\n` +
            `To take action, reply:\n` +
            `• *APPROVE* or *REJECT*`;

        return await sendWhatsAppMessage(to, fallbackBody);
    }
};

