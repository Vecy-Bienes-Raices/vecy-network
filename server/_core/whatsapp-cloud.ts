import { whatsappBot } from "./whatsapp";

/**
 * Downloads a media file from the WhatsApp Cloud API using its media ID.
 */
export async function downloadMetaMedia(mediaId: string): Promise<{ data: string; mimetype: string } | null> {
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!token) {
    console.error("[WHATSAPP-CLOUD] Error: WHATSAPP_API_TOKEN not configured");
    return null;
  }

  try {
    console.log(`[WHATSAPP-CLOUD] Fetching metadata for media ID: ${mediaId}...`);
    // 1. Get media URL
    const urlRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!urlRes.ok) {
      const errText = await urlRes.text();
      console.error(`[WHATSAPP-CLOUD] Error fetching media metadata for ${mediaId}: ${urlRes.status} - ${errText}`);
      return null;
    }

    const metadata = await urlRes.json() as { url: string; mime_type: string };
    if (!metadata.url) {
      console.error(`[WHATSAPP-CLOUD] No URL found in media metadata for ${mediaId}`);
      return null;
    }

    console.log(`[WHATSAPP-CLOUD] Downloading media binary from lookaside URL...`);
    // 2. Fetch media binary
    const binRes = await fetch(metadata.url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!binRes.ok) {
      const errText = await binRes.text();
      console.error(`[WHATSAPP-CLOUD] Error downloading media binary from ${metadata.url}: ${binRes.status} - ${errText}`);
      return null;
    }

    const buffer = await binRes.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");

    return {
      data: base64Data,
      mimetype: metadata.mime_type || "application/octet-stream"
    };
  } catch (err: any) {
    console.error(`[WHATSAPP-CLOUD] Exception in downloadMetaMedia for ${mediaId}:`, err);
    return null;
  }
}

/**
 * Uploads a file buffer to the WhatsApp Cloud API and returns the media ID.
 */
export async function uploadMetaMedia(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.error("[WHATSAPP-CLOUD] Error: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured");
    return null;
  }

  try {
    const formData = new (globalThis as any).FormData();
    const fileBlob = new (globalThis as any).Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append("file", fileBlob, filename);
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");

    console.log(`[WHATSAPP-CLOUD] Post form-data to Meta Media API...`);
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[WHATSAPP-CLOUD] Media upload failed: ${response.status} - ${errText}`);
      return null;
    }

    const data = await response.json() as { id: string };
    console.log(`[WHATSAPP-CLOUD] Media uploaded successfully. ID: ${data.id}`);
    return data.id || null;
  } catch (err: any) {
    console.error("[WHATSAPP-CLOUD] Exception in uploadMetaMedia:", err);
    return null;
  }
}

/**
 * Sends a message (text or media) using the WhatsApp Cloud API.
 */
export async function sendCloudMessage(chatId: string, content: any, options: any = {}): Promise<any> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.error("[WHATSAPP-CLOUD] Error: WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured");
    return;
  }

  const phone = chatId.split("@")[0];

  try {
    // 1. Text message
    if (typeof content === "string") {
      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: content
        }
      };

      if (options.quotedMessageId) {
        payload.context = {
          message_id: options.quotedMessageId
        };
      }

      console.log(`[WHATSAPP-CLOUD] Sending text message to ${phone}...`);
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[WHATSAPP-CLOUD] Text send failed: ${res.status} - ${errText}`);
      } else {
        console.log(`[WHATSAPP-CLOUD] Text message successfully sent to ${phone}`);
      }
      return;
    }

    // 2. Media Message
    if (content && typeof content === "object" && content.mimetype && content.data) {
      const isAudio = content.mimetype.startsWith("audio/");
      const isImage = content.mimetype.startsWith("image/");

      const buffer = Buffer.from(content.data, "base64");
      const filename = content.filename || (isAudio ? "voice-note.ogg" : isImage ? "image.jpg" : "file");

      console.log(`[WHATSAPP-CLOUD] Uploading media (${content.mimetype}, ${buffer.byteLength} bytes) to Meta...`);
      const mediaId = await uploadMetaMedia(buffer, content.mimetype, filename);

      if (!mediaId) {
        console.error("[WHATSAPP-CLOUD] Failed to upload media, cannot send message");
        return;
      }

      const type = isAudio ? "audio" : isImage ? "image" : "document";
      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type,
        [type]: {
          id: mediaId
        }
      };

      if (options.quotedMessageId) {
        payload.context = {
          message_id: options.quotedMessageId
        };
      }

      console.log(`[WHATSAPP-CLOUD] Sending media message of type '${type}' to ${phone}...`);
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[WHATSAPP-CLOUD] Media send failed (${type}): ${res.status} - ${errText}`);
      } else {
        console.log(`[WHATSAPP-CLOUD] Media message (${type}) successfully sent to ${phone}`);
      }
      return;
    }

    console.warn("[WHATSAPP-CLOUD] Unknown content type passed to sendCloudMessage:", content);
  } catch (err: any) {
    console.error("[WHATSAPP-CLOUD] Exception in sendCloudMessage:", err);
  }
}

/**
 * Sends a reaction to a message using the WhatsApp Cloud API.
 */
export async function sendCloudReaction(chatId: string, messageId: string, emoji: string): Promise<void> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) return;

  const phone = chatId.split("@")[0];

  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "reaction",
      reaction: {
        message_id: messageId,
        emoji: emoji
      }
    };

    console.log(`[WHATSAPP-CLOUD] Sending reaction '${emoji}' for message ${messageId} to ${phone}...`);
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[WHATSAPP-CLOUD] Reaction send failed: ${res.status} - ${errText}`);
    }
  } catch (err: any) {
    console.error("[WHATSAPP-CLOUD] Error sending reaction:", err);
  }
}

/**
 * Processes incoming webhooks from Meta and forwards them to the bot logic.
 */
export async function handleIncomingWebhook(payload: any): Promise<void> {
  if (payload.object !== "whatsapp_business_account") {
    return;
  }

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      if (!value || !value.messages || value.messages.length === 0) continue;

      const message = value.messages[0];
      const fromPhone = message.from;
      if (!fromPhone) continue;

      const fromJid = `${fromPhone}@c.us`;
      const msgId = message.id;
      const timestamp = parseInt(message.timestamp, 10);
      const type = message.type;

      // Extract profile name from contacts list
      const contactInfo = value.contacts?.find((c: any) => c.wa_id === fromPhone);
      const profileName = contactInfo?.profile?.name || `Asesor +${fromPhone}`;

      // Map content body and media parameters
      let bodyText = "";
      let hasMedia = false;
      let mediaId: string | null = null;

      if (type === "text") {
        bodyText = message.text?.body || "";
      } else if (type === "audio") {
        hasMedia = true;
        mediaId = message.audio?.id || null;
      } else if (type === "image") {
        hasMedia = true;
        bodyText = message.image?.caption || "";
        mediaId = message.image?.id || null;
      } else if (type === "document") {
        hasMedia = true;
        bodyText = message.document?.caption || "";
        mediaId = message.document?.id || null;
      }

      console.log(`[WHATSAPP-CLOUD] Webhook message received - Type: ${type}, From: ${fromPhone}, Body: ${bodyText}, Media ID: ${mediaId}`);

      // Create a mocked whatsapp-web.js Message object compatible with existing code
      const mockMsg: any = {
        id: {
          _serialized: msgId,
          fromMe: false,
        },
        from: fromJid,
        author: fromJid,
        body: bodyText,
        timestamp,
        fromMe: false,
        hasMedia,
        type: type === "text" ? "chat" : type,
        
        // Methods mapped to Cloud API
        react: async (emoji: string) => {
          await sendCloudReaction(fromJid, msgId, emoji);
        },
        getChat: async () => {
          return {
            id: {
              _serialized: fromJid
            },
            isGroup: false,
            sendStateRecording: async () => {},
            sendStateTyping: async () => {},
            clearState: async () => {},
            fetchMessages: async () => []
          };
        },
        getContact: async () => {
          return {
            pushname: profileName,
            name: profileName,
            id: {
              _serialized: fromJid
            }
          };
        },
        downloadMedia: async () => {
          if (!hasMedia || !mediaId) return null;
          const downloaded = await downloadMetaMedia(mediaId);
          if (!downloaded) return null;
          return {
            mimetype: downloaded.mimetype,
            data: downloaded.data,
            filename: "media"
          };
        }
      };

      // Hand over to the standard message processing pipeline of the bot
      try {
        console.log(`[WHATSAPP-CLOUD] Forwarding message ${msgId} to whatsappBot.handleIncomingMessage`);
        await whatsappBot.handleIncomingMessage(mockMsg, fromJid);
      } catch (err: any) {
        console.error(`[WHATSAPP-CLOUD] Error processing webhook message:`, err);
      }
    }
  }
}
