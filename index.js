const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

http.createServer((req, res) => {
    res.write("Nadee AI Bot is Alive and Running!");
    res.end();
}).listen(7860);

const genAI = new GoogleGenerativeAI('AQ.Ab8RN6LIQZdfMM4_1Vjiz1ao_OAJm3eVOxJXcWgJDcwRfYqrEQ');

// 🔴 ඔයාගේ පාස්වර්ඩ් එක මෙතන <db_password> කියන එක මකලා ඒ වෙනුවට හරියටම ටයිප් කරන්න 🔴
const MONGODB_URI = 'mongodb+srv://nadee:nadee123@cluster0.zhdroix.mongodb.net/whatsapp-bot?retryWrites=true&w=majority&appName=Cluster0';

const ASSISTANT_PERSONA = `You are Nadeesha Malith's personal WhatsApp assistant. Speak naturally like a polite 21-year-old Sri Lankan.

CRITICAL RULES FOR TONE (NEVER BREAK):
1. ADAPT TO THE SENDER: Look at the "Sender Name" provided below.
   - If the Sender Name contains words like "Amma", "Thaththa", "Sir", "Miss", "Madam", "Akka", "Aiya", or if they speak very formally: Be HIGHLY RESPECTFUL. NEVER use slang like 'machan' or 'bro'. Use 'oya' (ඔයා) or address them by their title respectfully.
   - If it's a friend or someone using casual slang/stickers: Then you can safely use 'machan', 'bro', 'ela'.
   - IF UNSURE: Always stay neutral and polite. Just use 'oya' (ඔයා).
2. NEVER ask robotic questions like "ඔයාට මොකක්ද ඕනේ උදව්ව?".
3. Keep replies very short (1-3 lines max).
4. If asked where Nadeesha is: Say Nadeesha is busy, please leave a message and you will tell him.`;

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ MongoDB එකට සාර්ථකව සම්බන්ධ වුණා!');
    
    const store = new MongoStore({ mongoose: mongoose });
    
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000
        }),
        puppeteer: {
            headless: true,
            timeout: 0,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        }
    });

    const botStartTime = Date.now() / 1000;

    client.on('qr', (qr) => {
        console.log('\n=========================================');
        console.log('🔴 මෙන්න අන්තිම QR Code එක! පහළ තියෙන ලින්ක් එක ඔබන්න:');
        console.log('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr));
        console.log('=========================================\n');
    });

    client.on('ready', () => {
        console.log('ගින්දර! Nadee AI Assistant දැන් 100% ක් Human වගේ වැඩ!');
    });

    client.on('remote_session_saved', () => {
        console.log('✅ Session එක MongoDB එකේ සේව් වුණා! දැන් සර්වර් එක රීස්ටාර්ට් වුණත් බෝට් ලොග් අවුට් වෙන්නේ නෑ.');
    });

    client.on('message', async (msg) => {
        if (msg.fromMe) return;
        if (msg.timestamp < botStartTime) return;

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

            const contact = await msg.getContact();
            const senderName = contact.name || contact.pushname || "Unknown Person";

            const chatModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
            
            const prompt = `${ASSISTANT_PERSONA}\n\nSender Name: ${senderName}\nUser Message: ${msg.body}`;
            const result = await chatModel.generateContent(prompt);
            const response = result.response.text();
            
            await msg.reply(response);
            
        } catch (error) {
            console.error('Error:', error);
        }
    });

    client.initialize();
}).catch(err => {
    console.error('MongoDB Connection Error:', err);
});