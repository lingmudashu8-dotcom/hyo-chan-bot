const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');

// === 1. Webサーバー設定 (スマホとの通信用) ===
const app = express();
app.use(cors());
app.use(express.json());

// 許可状態を保持する変数（メモリ内保存）
let permissionGranted = false;

// スマホ側が「許可されたか？」を確認する窓口
app.get('/check', (req, res) => {
    res.json({ granted: permissionGranted });
});

// スマホ側が「更新したよ！」と報告してフラグを下ろす窓口
app.post('/reset', (req, res) => {
    permissionGranted = false;
    console.log("情報：スマホ側で背景更新が完了し、フラグをリセットしました。");
    res.json({ success: true });
});

// Renderのポートで待機
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Webサーバーが起動しました（Port: ${PORT}）`);
});

// === 2. Discord Bot設定 ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // メッセージを読み取るために必須
    ]
});

// ログイン成功時のログ
client.once(Events.ClientReady, (c) => {
    console.log(`✅ Discordにログイン成功！名前: ${c.user.tag}`);
});

// メッセージを受け取った時の処理
client.on(Events.MessageCreate, async (message) => {
    // 1. 自分自身のメッセージは無視（無限ループ防止）
    if (message.author.id === client.user.id) return;

    // 2. 受信したすべてのメッセージをログに出す（デバッグ用）
    console.log(`📩 受信：[${message.author.username}] "${message.content}" (Webhook: ${message.webhookId ? 'はい' : 'いいえ'})`);

    // 3. キーワード「自動学習を実行しました」が含まれているかチェック
    if (message.content.includes("自動学習を実行しました")) {
        console.log("🎯 キーワードを検知！ボタン付きメッセージを送信します。");

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

        try {
            await message.channel.send({
                content: '🚨 **司令塔！地形更新の要請が届きました！**\n現在のトカゲの姿勢は安全ですか？背景を上書きして良い場合はボタンを押してください。',
                components: [row]
            });
        } catch (error) {
            console.error("❌ ボタン送信エラー:", error);
        }
    }
});

// ボタンが押された時の処理
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    console.log(`🔘 ボタンが押されました: ${interaction.customId} (実行者: ${interaction.user.username})`);

    if (interaction.customId === 'allow_update') {
        permissionGranted = true; // 許可フラグを立てる
        await interaction.update({
            content: '✅ **地形更新を許可しました！**\nスマホ側が数秒以内に背景をパシャッと更新します。',
            components: []
        });
    } else if (interaction.customId === 'deny_update') {
        permissionGranted = false; // 却下
        await interaction.update({
            content: '❌ **更新を却下しました。**\n現在の背景のまま監視を継続します。',
            components: []
        });
    }
});

// エラー発生時のログ
client.on('error', (error) => {
    console.error("❌ Discord Botエラー:", error);
});

// トークンを使ってログイン
client.login(process.env.DISCORD_TOKEN);
