import { supabase } from './supabase.js';

export async function clientIdExists(clientId) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return data.users.some(user => user.user_metadata?.bailey_id === clientId);
}

export function getNumber(jid) {
    // Extract only the number part from the JID
    const match = jid.match(/^(\d{12})@s\.whatsapp\.net$/);
    if (!match) {
        throw new Error("Invalid JID format");
    }

    const fullNumber = match[1];

    const localNumber = fullNumber.slice(2); // Remove country code

    // Format: +91 XXXXX YYYYY
    const formatted = `+91 ${localNumber.slice(0, 5)} ${localNumber.slice(5)}`;
    return formatted;
}
export function getJid(phoneNumber) {
    // Ensure the number is 10 digits
    if (!/^\d{10}$/.test(phoneNumber)) {
        throw new Error("Invalid phone number. Must be 10 digits.");
    }

    // Prepend the country code for India (91)
    const fullNumber = `91${phoneNumber}`;

    // Return the JID format
    return `${fullNumber}@s.whatsapp.net`;
}

export async function onWhatsapp(sock, number) {
    const isOnWhatsapp = await sock.onWhatsApp(number)
    return isOnWhatsapp.length != 0 && isOnWhatsapp[0].exists
}

export async function sendMessage(sock, number, message) {
    const onWhatsApp = await onWhatsapp(sock, number)
    if (onWhatsApp) {
        try {

            const sendMessage = await sock.sendMessage( // ✅ await here
                number,
                { text: message }
            );
            return {
                dataType: "msgStatus", data: {
                    number: getNumber(number),
                    status: "sent"
                }
            }
        } catch (error) {
            console.log(error)
            return {
                dataType: "msgStatus", data: {
                    number: getNumber(number),
                    status: "error"
                }
            }
        }
    } else {
        return { dataType: "error", data: "invalid number" }
    }
}


import P from 'pino'
export const logger = P({ timestamp: () => `,"time"` }, P.destination('./wa-logs-file.txt'))
