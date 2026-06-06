import 'dotenv/config';
import { handleIncomingWebhook } from '../server/_core/whatsapp-cloud';

const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "924468603915380",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "573185462265",
              "phone_number_id": "108753615119734"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Eduardo Test"
                },
                "wa_id": "573166569719"
              }
            ],
            "messages": [
              {
                "from": "573166569719",
                "id": "wamid.mocktest_final_ok_" + Date.now(),
                "timestamp": String(Math.floor(Date.now() / 1000)),
                "text": {
                  "body": "Hola, busco un apartamento en Bogota"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

async function test() {
  console.log("Invoking handleIncomingWebhook...");
  await handleIncomingWebhook(payload);
  console.log("Waiting 30 seconds for the buffer to process and message to send...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  console.log("Test finished.");
}

test().catch(console.error);
