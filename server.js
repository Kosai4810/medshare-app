const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// OpenAI初期化
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3000;

// Nodemailer Gmail設定
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// 仮登録ユーザーの保存（本番ではDBを使用）
const pendingUsers = new Map();
const verifiedUsers = new Map();

// 大学データ
const universities = {
    'tokyo': { name: '東京大学', domain: 'g.ecc.u-tokyo.ac.jp' },
    'kyoto': { name: '京都大学', domain: 'elms.kyoto-u.ac.jp' },
    'osaka': { name: '大阪大学', domain: 'ecs.osaka-u.ac.jp' },
    'tohoku': { name: '東北大学', domain: 'dc.tohoku.ac.jp' },
    'nagoya': { name: '名古屋大学', domain: 's.thers.ac.jp' },
    'kyushu': { name: '九州大学', domain: 's.kyushu-u.ac.jp' },
    'hokkaido': { name: '北海道大学', domain: 'eis.hokudai.ac.jp' },
    'keio': { name: '慶應義塾大学', domain: 'keio.jp' },
    'jikei': { name: '東京慈恵会医科大学', domain: 'jikei.ac.jp' },
    'nihon-med': { name: '日本医科大学', domain: 'nms.ac.jp' },
    'showa': { name: '昭和大学', domain: 'showa-u.ac.jp' },
    'tokai': { name: '東海大学', domain: 'tsc.u-tokai.ac.jp' },
    'kitasato': { name: '北里大学', domain: 'st.kitasato-u.ac.jp' },
    'chiba': { name: '千葉大学', domain: 's.chiba-u.jp' },
    'tsukuba': { name: '筑波大学', domain: 's.tsukuba.ac.jp' },
    'kobe': { name: '神戸大学', domain: 'stu.kobe-u.ac.jp' },
    'hiroshima': { name: '広島大学', domain: 'hiroshima-u.ac.jp' },
    'okayama': { name: '岡山大学', domain: 's.okayama-u.ac.jp' },
    'niigata': { name: '新潟大学', domain: 'mail.cc.niigata-u.ac.jp' },
    'kanazawa': { name: '金沢大学', domain: 'stu.kanazawa-u.ac.jp' },
    'nagasaki': { name: '長崎大学', domain: 'ms.nagasaki-u.ac.jp' },
    'kumamoto': { name: '熊本大学', domain: 'st.kumamoto-u.ac.jp' },
    'kagoshima': { name: '鹿児島大学', domain: 'lofty.kagoshima-u.ac.jp' },
    'ryukyu': { name: '琉球大学', domain: 'eve.u-ryukyu.ac.jp' },
    'yokohama-city': { name: '横浜市立大学', domain: 'yokohama-cu.ac.jp' },
    'osaka-metro': { name: '大阪公立大学', domain: 'omu.ac.jp' },
    'kyoto-pref': { name: '京都府立医科大学', domain: 'koto.kpu-m.ac.jp' },
    'nara-med': { name: '奈良県立医科大学', domain: 'naramed-u.ac.jp' },
    'wakayama-med': { name: '和歌山県立医科大学', domain: 'wakayama-med.ac.jp' },
    'toho': { name: '東邦大学', domain: 'st.toho-u.ac.jp' },
    'teikyo': { name: '帝京大学', domain: 'stu.teikyo-u.ac.jp' },
    'tokyo-med': { name: '東京医科大学', domain: 'tokyo-med.ac.jp' },
    'tokyo-womens': { name: '東京女子医科大学', domain: 'twmu.ac.jp' },
    'nippon-med': { name: '日本大学', domain: 'nihon-u.ac.jp' },
    'juntendo': { name: '順天堂大学', domain: 'juntendo.ac.jp' },
    'other': { name: 'その他の大学', domain: null },
};

// メールドメイン検証
function validateEmailDomain(email, universityId) {
    const uni = universities[universityId];
    if (!uni || !uni.domain) {
        return email.endsWith('.ac.jp');
    }
    return email.endsWith('@' + uni.domain);
}

// トークン生成
function generateToken() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}

// 簡易ハッシュ（本番ではbcryptを使用）
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// =====================================
// API エンドポイント
// =====================================

// 新規登録（仮登録 + メール送信）
app.post('/api/register', async (req, res) => {
    try {
        const { nickname, email, password, universityId } = req.body;

        // バリデーション
        if (!nickname || !email || !password || !universityId) {
            return res.status(400).json({ success: false, message: '全ての項目を入力してください' });
        }

        if (!validateEmailDomain(email, universityId)) {
            const uni = universities[universityId];
            if (uni && uni.domain) {
                return res.status(400).json({
                    success: false,
                    message: `${uni.name}の学番メール（@${uni.domain}）を使用してください`
                });
            }
            return res.status(400).json({ success: false, message: '大学のメールアドレスを使用してください' });
        }

        // 既存ユーザーチェック
        for (const [_, user] of verifiedUsers) {
            if (user.email === email) {
                return res.status(400).json({ success: false, message: 'このメールアドレスは既に登録されています' });
            }
        }

        // トークン生成
        const token = generateToken();
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify?token=${token}`;

        // 仮登録保存
        pendingUsers.set(token, {
            id: generateToken(),
            nickname,
            email,
            password: hashPassword(password),
            universityId,
            createdAt: Date.now()
        });

        // メール送信（Gmail経由）
        const mailOptions = {
            from: `MedShare <${process.env.GMAIL_USER}>`,
            to: email,
            subject: '【MedShare】メールアドレスの確認',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #0891b2;">MedShare</h1>
                    <p>こんにちは、${nickname}さん</p>
                    <p>MedShareへの登録ありがとうございます。</p>
                    <p>以下のボタンをクリックして、メールアドレスの確認を完了してください：</p>
                    <p style="margin: 30px 0;">
                        <a href="${verifyUrl}"
                           style="background: #0891b2; color: white; padding: 12px 24px;
                                  text-decoration: none; border-radius: 8px; font-weight: bold;">
                            メールアドレスを確認する
                        </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        このリンクは24時間有効です。<br>
                        心当たりがない場合は、このメールを無視してください。
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        MedShare - 医学部生専用 情報共有プラットフォーム
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('メール送信成功:', email);
        res.json({ success: true, message: '認証メールを送信しました' });

    } catch (error) {
        console.error('登録エラー:', error);
        res.status(500).json({ success: false, message: 'メールの送信に失敗しました。Gmail設定を確認してください。' });
    }
});

// メール認証（トークン検証）
app.get('/verify', (req, res) => {
    const { token } = req.query;

    if (!token || !pendingUsers.has(token)) {
        return res.send(`
            <html>
            <head><meta charset="utf-8"><title>認証エラー</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #ef4444;">認証エラー</h1>
                <p>無効または期限切れのリンクです。</p>
                <a href="/" style="color: #0891b2;">トップページに戻る</a>
            </body>
            </html>
        `);
    }

    const pendingUser = pendingUsers.get(token);

    // 有効期限チェック（24時間）
    if (Date.now() - pendingUser.createdAt > 24 * 60 * 60 * 1000) {
        pendingUsers.delete(token);
        return res.send(`
            <html>
            <head><meta charset="utf-8"><title>認証エラー</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #ef4444;">リンクの有効期限切れ</h1>
                <p>認証リンクの有効期限が切れています。再度登録してください。</p>
                <a href="/" style="color: #0891b2;">トップページに戻る</a>
            </body>
            </html>
        `);
    }

    // 本登録
    const newUser = {
        id: pendingUser.id,
        nickname: pendingUser.nickname,
        email: pendingUser.email,
        password: pendingUser.password,
        universityId: pendingUser.universityId,
        createdAt: Date.now()
    };

    verifiedUsers.set(newUser.id, newUser);
    pendingUsers.delete(token);

    // 成功ページを表示（自動でアプリにリダイレクト）
    res.send(`
        <html>
        <head>
            <meta charset="utf-8">
            <title>認証完了 - MedShare</title>
            <script>
                // LocalStorageにセッション情報を保存
                const user = {
                    id: "${newUser.id}",
                    nickname: "${newUser.nickname}",
                    email: "${newUser.email}",
                    universityId: "${newUser.universityId}"
                };
                localStorage.setItem('medshare_session', JSON.stringify(user));

                // 3秒後にリダイレクト
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            </script>
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #0891b2;">🎉 認証完了！</h1>
            <p>${newUser.nickname}さん、MedShareへようこそ！</p>
            <p>アカウントが正常に作成されました。</p>
            <p style="color: #666;">3秒後に自動でアプリに移動します...</p>
            <p><a href="/" style="color: #0891b2;">今すぐアプリを開く</a></p>
        </body>
        </html>
    `);
});

// ログイン
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    for (const [_, user] of verifiedUsers) {
        if (user.email === email && user.password === hashPassword(password)) {
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    nickname: user.nickname,
                    email: user.email,
                    universityId: user.universityId
                }
            });
        }
    }

    res.status(401).json({ success: false, message: 'メールアドレスまたはパスワードが正しくありません' });
});

// AI問題生成
app.post('/api/generate-questions', async (req, res) => {
    try {
        const { type, materials } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ success: false, message: 'OpenAI APIキーが設定されていません' });
        }

        if (!materials || materials.length === 0) {
            return res.status(400).json({ success: false, message: '教材をアップロードしてください' });
        }

        const typeLabels = {
            'short': '単答式問題（用語や短い答えを問う問題）',
            'multiple': '4択問題（4つの選択肢から正解を1つ選ぶ問題）',
            'essay': '記述問題（詳しく説明させる問題）'
        };

        const typeInstructions = {
            'short': `以下の形式で5問作成してください：
問1: [問題文]
解答: [短い答え]`,
            'multiple': `以下の形式で5問作成してください：
問1: [問題文]
A. [選択肢1]
B. [選択肢2]
C. [選択肢3]
D. [選択肢4]
解答: [正解の選択肢（A/B/C/D）]`,
            'essay': `以下の形式で5問作成してください：
問1: [問題文]
模範解答: [詳しい解答]`
        };

        // 画像を含むメッセージを構築
        const content = [
            {
                type: 'text',
                text: `以下の医学教材に基づいて、${typeLabels[type]}を5問作成してください。

問題は教材の内容に基づいた実践的なものにしてください。
医学部の試験対策として役立つ問題を作成してください。

${typeInstructions[type]}

問題のみを出力し、余計な説明は不要です。`
            }
        ];

        // 画像ファイルを追加
        for (const material of materials) {
            if (material.data.startsWith('data:image')) {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: material.data
                    }
                });
            }
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ],
            max_tokens: 4000
        });

        const generatedText = response.choices[0].message.content;

        // テキストをパースして問題オブジェクトに変換
        const questions = parseQuestions(generatedText, type);

        res.json({ success: true, questions });

    } catch (error) {
        console.error('AI生成エラー:', error);
        res.status(500).json({ success: false, message: 'AI問題生成に失敗しました: ' + error.message });
    }
});

// 問題テキストをパース
function parseQuestions(text, type) {
    const questions = [];
    const lines = text.split('\n').filter(line => line.trim());

    let currentQuestion = null;
    let questionNumber = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        // 問題の開始を検出
        if (trimmed.match(/^問\d+[:：]/)) {
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            questionNumber++;
            currentQuestion = {
                type: type,
                number: questionNumber,
                question: trimmed.replace(/^問\d+[:：]\s*/, ''),
                choices: type === 'multiple' ? [] : undefined,
                answer: ''
            };
        }
        // 選択肢を検出（4択の場合）
        else if (type === 'multiple' && trimmed.match(/^[A-D][.．]/)) {
            if (currentQuestion) {
                currentQuestion.choices.push(trimmed);
            }
        }
        // 解答を検出
        else if (trimmed.match(/^(解答|模範解答)[:：]/)) {
            if (currentQuestion) {
                currentQuestion.answer = trimmed.replace(/^(解答|模範解答)[:：]\s*/, '');
            }
        }
        // 問題文の続き
        else if (currentQuestion && !currentQuestion.answer) {
            if (type !== 'multiple' || !trimmed.match(/^[A-D][.．]/)) {
                currentQuestion.question += ' ' + trimmed;
            }
        }
    }

    // 最後の問題を追加
    if (currentQuestion) {
        questions.push(currentQuestion);
    }

    return questions;
}

// ルートパスでindex.htmlを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel用エクスポート
module.exports = app;

// ローカル開発用
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════╗
║           MedShare Server Started!                ║
╠═══════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                       ║
╚═══════════════════════════════════════════════════╝
        `);
    });
}
