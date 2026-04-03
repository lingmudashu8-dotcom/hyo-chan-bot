const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

let permissionGranted = false;

// スマホ（監視側）が許可状態を確認するためのエンドポイント
app.get('/check', (req, res) => {
    res.json({ granted: permissionGranted });
});

// スマホが更新完了した際にフラグをリセットする
app.post('/reset', (req, res) => {
    permissionGranted = false;
    res.json({ success: true });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('中継サーバーがポート ' + listener.address().port + ' で起動しました！');
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
    console.log(`Botがログインしました: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // 自分自身（Bot）のメッセージは無視して無限ループを防止
    if (message.author.id === client.user.id) return;

    // デバッグログ：受信メッセージをターミナルに表示
    console.log(`受信メッセージ: "${message.content}" (送信者ID: ${message.author.id}, Webhook: ${!!message.webhookId})`);

    // キーワードが含まれているかチェック
    if (message.content.includes("自動学習を実行しました")) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('allow_update')
                    .setLabel('✅ 更新を許可')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('deny_update')
                    .setLabel('❌ 却下')
                    .setStyle(ButtonStyle.Danger),
            );

        // Webhook相手にはreplyよりchannel.sendの方が安定します
        await message.channel.send({ 
            content: '司令塔！地形更新の要請が来ています！', 
            components: [row] 
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'allow_update') {
        permissionGranted = true;
        await interaction.update({ content: '✅ **更新を許可しました！** スマホ側で背景を更新します。', components: [] });
    } else if (interaction.customId === 'deny_update') {
        permissionGranted = false;
        await interaction.update({ content: '❌ **却下しました。** 背景は更新されません。', components: [] });
    }
});

client.login(process.env.DISCORD_TOKEN);
