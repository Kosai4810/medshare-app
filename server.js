const express = require('express');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase初期化
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

// Resend初期化
const resend = new Resend(process.env.RESEND_API_KEY);

// OpenAI初期化（オプション）
let openai = null;
if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

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

// 簡易ハッシュ
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
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'このメールアドレスは既に登録されています' });
        }

        const token = generateToken();
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify?token=${token}`;

        // 既存の仮登録を削除
        await supabase.from('pending_users').delete().eq('email', email);

        // 仮登録保存
        const { error: insertError } = await supabase.from('pending_users').insert({
            email,
            password: hashPassword(password),
            nickname,
            university_id: universityId,
            token
        });

        if (insertError) {
            console.error('仮登録エラー:', insertError);
            return res.status(500).json({ success: false, message: 'データベースエラー' });
        }

        // Resendでメール送信
        await resend.emails.send({
            from: process.env.FROM_EMAIL || 'MedShare <onboarding@resend.dev>',
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
                </div>
            `
        });
        res.json({ success: true, message: '認証メールを送信しました' });

    } catch (error) {
        console.error('登録エラー:', error);
        res.status(500).json({ success: false, message: 'エラーが発生しました' });
    }
});

// メール認証
app.get('/verify', async (req, res) => {
    const { token } = req.query;

    const { data: pendingUser, error } = await supabase
        .from('pending_users')
        .select('*')
        .eq('token', token)
        .single();

    if (error || !pendingUser) {
        return res.send(`
            <html><head><meta charset="utf-8"><title>認証エラー</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #ef4444;">認証エラー</h1>
                <p>無効または期限切れのリンクです。</p>
                <a href="/" style="color: #0891b2;">トップページに戻る</a>
            </body></html>
        `);
    }

    // 24時間チェック
    const createdAt = new Date(pendingUser.created_at).getTime();
    if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
        await supabase.from('pending_users').delete().eq('token', token);
        return res.send(`
            <html><head><meta charset="utf-8"><title>認証エラー</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #ef4444;">リンクの有効期限切れ</h1>
                <p>再度登録してください。</p>
                <a href="/" style="color: #0891b2;">トップページに戻る</a>
            </body></html>
        `);
    }

    // 本登録
    const { data: newUser, error: insertError } = await supabase.from('users').insert({
        email: pendingUser.email,
        password: pendingUser.password,
        nickname: pendingUser.nickname,
        university_id: pendingUser.university_id
    }).select().single();

    if (insertError) {
        console.error('本登録エラー:', insertError);
        return res.send('<h1>エラーが発生しました</h1>');
    }

    await supabase.from('pending_users').delete().eq('token', token);

    res.send(`
        <html>
        <head>
            <meta charset="utf-8">
            <title>認証完了 - MedShare</title>
            <script>
                const user = {
                    id: "${newUser.id}",
                    nickname: "${newUser.nickname}",
                    email: "${newUser.email}",
                    universityId: "${newUser.university_id}"
                };
                localStorage.setItem('medshare_session', JSON.stringify(user));
                setTimeout(() => { window.location.href = '/'; }, 2000);
            </script>
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #0891b2;">🎉 認証完了！</h1>
            <p>${newUser.nickname}さん、MedShareへようこそ！</p>
            <p style="color: #666;">自動でアプリに移動します...</p>
        </body>
        </html>
    `);
});

// ログイン
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    // テスト用アカウント
    if (email === 'a@a' && password === '123456') {
        return res.json({
            success: true,
            user: {
                id: 'test-user-001',
                nickname: 'テストユーザー',
                email: 'a@a',
                universityId: 'tokyo',
                points: 100,
                avatar: null
            }
        });
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', hashPassword(password))
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    res.json({
        success: true,
        user: {
            id: user.id,
            nickname: user.nickname,
            email: user.email,
            universityId: user.university_id,
            points: user.points,
            avatar: user.avatar
        }
    });
});

// 投稿一覧取得
app.get('/api/posts/:universityId/:year', async (req, res) => {
    const { universityId, year } = req.params;

    const { data: posts, error } = await supabase
        .from('posts')
        .select('*, users(nickname, avatar)')
        .eq('university_id', universityId)
        .eq('year', year)
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(500).json({ success: false, message: 'データ取得エラー' });
    }

    const formattedPosts = posts.map(post => ({
        id: post.id,
        type: post.type,
        title: post.title,
        subject: post.subject,
        professor: post.professor,
        content: post.content,
        files: post.files || [],
        likes: post.likes,
        author: post.users?.nickname || '匿名',
        authorId: post.user_id,
        authorAvatar: post.users?.avatar,
        timestamp: new Date(post.created_at).getTime(),
        editedAt: post.edited_at ? new Date(post.edited_at).getTime() : null
    }));

    res.json({ success: true, posts: formattedPosts });
});

// 投稿作成
app.post('/api/posts', async (req, res) => {
    const { userId, universityId, year, type, title, subject, professor, content, files } = req.body;

    const { data: post, error } = await supabase.from('posts').insert({
        user_id: userId,
        university_id: universityId,
        year,
        type,
        title,
        subject,
        professor,
        content,
        files: files || []
    }).select().single();

    if (error) {
        console.error('投稿エラー:', error);
        return res.status(500).json({ success: false, message: '投稿に失敗しました' });
    }

    // ポイント加算
    let points = 1;
    if (files && files.length > 0) {
        points += files.length * 10;
    }

    await supabase.from('users').update({
        points: supabase.rpc('increment_points', { user_id: userId, amount: points })
    }).eq('id', userId);

    // 簡易的にポイント加算
    const { data: userData } = await supabase.from('users').select('points').eq('id', userId).single();
    await supabase.from('users').update({ points: (userData?.points || 0) + points }).eq('id', userId);

    res.json({ success: true, post, earnedPoints: points });
});

// 投稿更新
app.put('/api/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const { userId, type, title, subject, professor, content, files } = req.body;

    const { data: existingPost } = await supabase.from('posts').select('user_id').eq('id', postId).single();

    if (!existingPost || existingPost.user_id !== userId) {
        return res.status(403).json({ success: false, message: '権限がありません' });
    }

    const { error } = await supabase.from('posts').update({
        type, title, subject, professor, content, files,
        edited_at: new Date().toISOString()
    }).eq('id', postId);

    if (error) {
        return res.status(500).json({ success: false, message: '更新に失敗しました' });
    }

    res.json({ success: true });
});

// 投稿削除
app.delete('/api/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.body;

    const { data: existingPost } = await supabase.from('posts').select('user_id').eq('id', postId).single();

    if (!existingPost || existingPost.user_id !== userId) {
        return res.status(403).json({ success: false, message: '権限がありません' });
    }

    await supabase.from('likes').delete().eq('post_id', postId);
    await supabase.from('posts').delete().eq('id', postId);

    res.json({ success: true });
});

// いいね
app.post('/api/posts/:postId/like', async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.body;

    const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

    if (existingLike) {
        // いいね解除
        await supabase.from('likes').delete().eq('id', existingLike.id);
        await supabase.rpc('decrement_likes', { post_id: postId });

        const { data: post } = await supabase.from('posts').select('likes').eq('id', postId).single();
        await supabase.from('posts').update({ likes: Math.max(0, (post?.likes || 1) - 1) }).eq('id', postId);

        res.json({ success: true, liked: false });
    } else {
        // いいね追加
        await supabase.from('likes').insert({ user_id: userId, post_id: postId });

        const { data: post } = await supabase.from('posts').select('likes').eq('id', postId).single();
        await supabase.from('posts').update({ likes: (post?.likes || 0) + 1 }).eq('id', postId);

        res.json({ success: true, liked: true });
    }
});

// ユーザーのいいね状態取得
app.get('/api/users/:userId/likes', async (req, res) => {
    const { userId } = req.params;

    const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);

    const likedPostIds = likes ? likes.map(l => l.post_id) : [];
    res.json({ success: true, likedPostIds });
});

// ランキング取得
app.get('/api/rankings/:scope', async (req, res) => {
    const { scope } = req.params;
    const { universityId } = req.query;

    let query = supabase.from('users').select('id, nickname, university_id, points, avatar').order('points', { ascending: false });

    if (scope === 'university' && universityId) {
        query = query.eq('university_id', universityId);
    }

    const { data: users, error } = await query.limit(50);

    if (error) {
        return res.status(500).json({ success: false, message: 'データ取得エラー' });
    }

    res.json({ success: true, rankings: users });
});

// アバター更新
app.put('/api/users/:userId/avatar', async (req, res) => {
    const { userId } = req.params;
    const { avatar } = req.body;

    const { error } = await supabase.from('users').update({ avatar }).eq('id', userId);

    if (error) {
        return res.status(500).json({ success: false, message: '更新に失敗しました' });
    }

    res.json({ success: true });
});

// ポイント加算
app.post('/api/users/:userId/points', async (req, res) => {
    const { userId } = req.params;
    const { amount } = req.body;

    const { data: user } = await supabase.from('users').select('points').eq('id', userId).single();
    const newPoints = (user?.points || 0) + amount;

    await supabase.from('users').update({ points: newPoints }).eq('id', userId);

    res.json({ success: true, points: newPoints });
});

// AI問題生成
app.post('/api/generate-questions', async (req, res) => {
    try {
        const { type, materials } = req.body;

        if (!openai) {
            return res.status(500).json({ success: false, message: 'OpenAI APIキーが設定されていません' });
        }

        if (!materials || materials.length === 0) {
            return res.status(400).json({ success: false, message: '教材をアップロードしてください' });
        }

        const typeLabels = {
            'short': '単答式問題',
            'multiple': '4択問題',
            'essay': '記述問題'
        };

        const typeInstructions = {
            'short': '問1: [問題文]\n解答: [短い答え]',
            'multiple': '問1: [問題文]\nA. [選択肢1]\nB. [選択肢2]\nC. [選択肢3]\nD. [選択肢4]\n解答: [正解]',
            'essay': '問1: [問題文]\n模範解答: [詳しい解答]'
        };

        const content = [
            {
                type: 'text',
                text: `以下の医学教材に基づいて、${typeLabels[type]}を5問作成してください。\n\n${typeInstructions[type]}\n\n問題のみを出力してください。`
            }
        ];

        for (const material of materials) {
            if (material.data.startsWith('data:image')) {
                content.push({ type: 'image_url', image_url: { url: material.data } });
            }
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content }],
            max_tokens: 4000
        });

        const generatedText = response.choices[0].message.content;
        const questions = parseQuestions(generatedText, type);

        res.json({ success: true, questions });

    } catch (error) {
        console.error('AI生成エラー:', error);
        res.status(500).json({ success: false, message: 'AI問題生成に失敗しました' });
    }
});

function parseQuestions(text, type) {
    const questions = [];
    const lines = text.split('\n').filter(line => line.trim());
    let currentQuestion = null;
    let questionNumber = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^問\d+[:：]/)) {
            if (currentQuestion) questions.push(currentQuestion);
            questionNumber++;
            currentQuestion = {
                type, number: questionNumber,
                question: trimmed.replace(/^問\d+[:：]\s*/, ''),
                choices: type === 'multiple' ? [] : undefined,
                answer: ''
            };
        } else if (type === 'multiple' && trimmed.match(/^[A-D][.．]/)) {
            if (currentQuestion) currentQuestion.choices.push(trimmed);
        } else if (trimmed.match(/^(解答|模範解答)[:：]/)) {
            if (currentQuestion) currentQuestion.answer = trimmed.replace(/^(解答|模範解答)[:：]\s*/, '');
        }
    }
    if (currentQuestion) questions.push(currentQuestion);
    return questions;
}

// ルートパス
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;

// ローカル開発用
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
