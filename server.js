const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected to TikAsk bridge');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.action === 'join' && data.username) {
                const tiktokUsername = data.username;
                console.log(`Connecting to TikTok Live for: ${tiktokUsername}`);

                const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

                tiktokLiveConnection.connect().then(state => {
                    console.log(`Connected to room: ${state.roomId}`);
                    ws.send(JSON.stringify({ type: 'status', message: `Connected to @${tiktokUsername}` }));
                }).catch(err => {
                    console.error('Connection error:', err);
                    ws.send(JSON.stringify({ type: 'error', message: 'Failed to connect. Make sure user is live.' }));
                });

                // استقبال التعليقات
                tiktokLiveConnection.on('chat', chatData => {
                    ws.send(JSON.stringify({
                        type: 'chat',
                        user: chatData.uniqueId,
                        nickname: chatData.nickname,
                        profilePicture: chatData.profilePictureUrl,
                        comment: chatData.comment
                    }));
                });

                // استقبال الهدايا
                tiktokLiveConnection.on('gift', giftData => {
                    if (giftData.giftType === 1 || !giftData.repeatEnd) {
                        ws.send(JSON.stringify({
                            type: 'gift',
                            user: giftData.uniqueId,
                            giftName: giftData.giftName,
                            giftCount: giftData.repeatCount
                        }));
                    }
                });
            }
        } catch (e) {
            console.error('Invalid message format', e);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TikAsk bridge running on port ${PORT}`);
});
