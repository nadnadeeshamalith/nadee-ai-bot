const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// 🔴 අලුත් මොළය: ගෞරවයෙන් කතා කරන්න උගන්නලා තියෙන්නේ
const ASSISTANT_PERSONA = `You are Nadeesha Malith's personal WhatsApp assistant. Speak naturally like a polite 21-year-old Sri Lankan.

CRITICAL RULES FOR TONE (NEVER BREAK):
1. ADAPT TO THE SENDER: Look at the "Sender Name" provided below.
   - If the Sender Name contains words like "Amma", "Thaththa", "Sir", "Miss", "Madam", "Akka", "Aiya", or if they speak very formally: Be HIGHLY RESPECTFUL. NEVER use slang like 'machan' or 'bro'. Use 'oya' (ඔයා) or address them by their title respectfully.
   - If it's a friend or someone using casual slang/stickers: Then you can safely use 'machan', 'bro', 'ela'.
   - IF UNSURE: Always stay neutral and polite. Just use 'oya' (ඔයා).
2. NEVER ask robotic questions like "ඔයාට මොකක්ද ඕනේ උදව්ව?".
3. Keep replies very short (1-3 lines max).
4. If asked where Nadeesha is: Say Nadeesha is busy, please leave a message and you will tell him.`;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const botStartTime = Date.now() / 1000;

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code එක Scan කරන්න...');
});

client.on('ready', () => {
    console.log('ගින්දර! Nadee AI Assistant දැන් 100% ක් Human වගේ වැඩ!');
});

client.on('message', async (msg) => {
    if (msg.fromMe) return;

    if (msg.timestamp < botStartTime) {
        return;
    }

    try {
        const chat = await msg.getChat();

        if (chat.isGroup) {
            const myId = client.info?.wid?._serialized;
            const isMentioned = myId && msg.mentionedIds.includes(myId);
            
            let isReplyToMe = false;
            if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.fromMe) isReplyToMe = true;
            }

            if (!isMentioned && !isReplyToMe) {
                return; 
            }
        }

        // 🔴 අලුත් කෑල්ල: මැසේජ් එක එවපු කෙනාගේ නම ගන්නවා
        const contact = await msg.getContact();
        const senderName = contact.name || contact.pushname || "Unknown Person";

        const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
        
        // 🔴 නමයි, මැසේජ් එකයි දෙකම AI එකට යවනවා
        const prompt = `${ASSISTANT_PERSONA}\n\nSender Name: ${senderName}\nUser Message: ${msg.body}`;
        const result = await chatModel.generateContent(prompt);
        const response = result.response.text();
        
        await msg.reply(response);
        
    } catch (error) {
        console.error('Error:', error);
    }
});

client.initialize();