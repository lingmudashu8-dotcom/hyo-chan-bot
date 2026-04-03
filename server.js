const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const app = express();
app.use(cors());
app.use(express.json());

// 伝言掲示板のデータ（許可が出たかどうかのフラグ）
let permissionGranted = false;

// === ① スマホと会話するためのAPI（掲示板） ===
app.get('/check', (req, res) => {
    // スマホから「許可出た？」と聞かれたら答える
    res.json({ granted: permissionGranted });
});

app.post('/reset', (req, res) => {
    // スマホが更新を終えたらフラグを下ろす
    permissionGranted = false;
    res.json({ success: true });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('中継サーバーがポート ' + listener.address().port + ' で起動しました！');
});

// === ② Discord Botの処理 ===
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

// メッセージを監視
client.on('messageCreate', async (message) => {
    // v12のスマホが送信する「自動学習を実行しました」という言葉に反応する
    if (message.webhookId && message.content.includes("自動学習を実行しました")) {
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

        await message.reply({ content: '司令塔！地形更新の要請が来ています！', components: [row] });
    }
});

// ボタンが押された時の処理
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'allow_update') {
        permissionGranted = true; // 掲示板のフラグを立てる！
        await interaction.update({ content: '✅ **更新を許可しました！** スマホ側で背景を更新します。', components: [] });
    } else if (interaction.customId === 'deny_update') {
        permissionGranted = false;
        await interaction.update({ content: '❌ **却下しました。** 背景は更新されません。', components: [] });
    }
});

// トークンを使ってログイン
client.login(process.env.DISCORD_TOKEN);
