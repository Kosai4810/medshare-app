// =====================================
// MedShare - 医学部生専用情報共有アプリ
// =====================================

// 医学部のある大学データ（学生用メールドメイン付き）
const universities = [
    { id: 'tokyo', name: '東京大学', domain: 'g.ecc.u-tokyo.ac.jp' },
    { id: 'kyoto', name: '京都大学', domain: 'elms.kyoto-u.ac.jp' },
    { id: 'osaka', name: '大阪大学', domain: 'ecs.osaka-u.ac.jp' },
    { id: 'tohoku', name: '東北大学', domain: 'dc.tohoku.ac.jp' },
    { id: 'nagoya', name: '名古屋大学', domain: 's.thers.ac.jp' },
    { id: 'kyushu', name: '九州大学', domain: 's.kyushu-u.ac.jp' },
    { id: 'hokkaido', name: '北海道大学', domain: 'eis.hokudai.ac.jp' },
    { id: 'keio', name: '慶應義塾大学', domain: 'keio.jp' },
    { id: 'jikei', name: '東京慈恵会医科大学', domain: 'jikei.ac.jp' },
    { id: 'nihon-med', name: '日本医科大学', domain: 'nms.ac.jp' },
    { id: 'showa', name: '昭和大学', domain: 'showa-u.ac.jp' },
    { id: 'tokai', name: '東海大学', domain: 'tsc.u-tokai.ac.jp' },
    { id: 'kitasato', name: '北里大学', domain: 'st.kitasato-u.ac.jp' },
    { id: 'chiba', name: '千葉大学', domain: 's.chiba-u.jp' },
    { id: 'tsukuba', name: '筑波大学', domain: 's.tsukuba.ac.jp' },
    { id: 'kobe', name: '神戸大学', domain: 'stu.kobe-u.ac.jp' },
    { id: 'hiroshima', name: '広島大学', domain: 'hiroshima-u.ac.jp' },
    { id: 'okayama', name: '岡山大学', domain: 's.okayama-u.ac.jp' },
    { id: 'niigata', name: '新潟大学', domain: 'mail.cc.niigata-u.ac.jp' },
    { id: 'kanazawa', name: '金沢大学', domain: 'stu.kanazawa-u.ac.jp' },
    { id: 'nagasaki', name: '長崎大学', domain: 'ms.nagasaki-u.ac.jp' },
    { id: 'kumamoto', name: '熊本大学', domain: 'st.kumamoto-u.ac.jp' },
    { id: 'kagoshima', name: '鹿児島大学', domain: 'lofty.kagoshima-u.ac.jp' },
    { id: 'ryukyu', name: '琉球大学', domain: 'eve.u-ryukyu.ac.jp' },
    { id: 'yokohama-city', name: '横浜市立大学', domain: 'yokohama-cu.ac.jp' },
    { id: 'osaka-metro', name: '大阪公立大学', domain: 'omu.ac.jp' },
    { id: 'kyoto-pref', name: '京都府立医科大学', domain: 'koto.kpu-m.ac.jp' },
    { id: 'nara-med', name: '奈良県立医科大学', domain: 'naramed-u.ac.jp' },
    { id: 'wakayama-med', name: '和歌山県立医科大学', domain: 'wakayama-med.ac.jp' },
    { id: 'toho', name: '東邦大学', domain: 'st.toho-u.ac.jp' },
    { id: 'teikyo', name: '帝京大学', domain: 'stu.teikyo-u.ac.jp' },
    { id: 'tokyo-med', name: '東京医科大学', domain: 'tokyo-med.ac.jp' },
    { id: 'tokyo-womens', name: '東京女子医科大学', domain: 'twmu.ac.jp' },
    { id: 'nippon-med', name: '日本大学', domain: 'nihon-u.ac.jp' },
    { id: 'juntendo', name: '順天堂大学', domain: 'juntendo.ac.jp' },
    { id: 'other', name: 'その他の大学', domain: null },
];

// 学年データ（医学部6年制）
const yearLabels = {
    '1': '1年生',
    '2': '2年生',
    '3': '3年生',
    '4': '4年生',
    '5': '5年生',
    '6': '6年生',
    'graduate': '大学院生'
};

// 投稿タイプラベル
const typeLabels = {
    'exam': '試験対策',
    'info': '試験・授業情報',
    'clinical': '実習情報'
};

// アプリ状態
let currentYear = null;
let currentFilter = 'all';
let selectedFiles = [];
let reportingPostId = null;
let currentUser = null;
let pendingRegistration = null;
let editingPostId = null;
let aiMaterialFiles = [];
let generatedQuestions = null;

// =====================================
// ローカルストレージ操作
// =====================================

function getStorageKey(university, year) {
    return `medshare_${university}_${year}`;
}

// API経由で投稿を取得
async function getPosts(university, year) {
    try {
        const response = await fetch(`/api/posts/${university}/${year}`);
        const data = await response.json();
        if (data.success) {
            return data.posts;
        }
    } catch (error) {
        console.error('投稿取得エラー:', error);
    }
    return [];
}

// ローカルキャッシュ用（後方互換性）
function getPostsLocal(university, year) {
    const key = getStorageKey(university, year);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function savePosts(university, year, posts) {
    const key = getStorageKey(university, year);
    localStorage.setItem(key, JSON.stringify(posts));
}

function getRecentTimelines() {
    const data = localStorage.getItem('medshare_recent');
    return data ? JSON.parse(data) : [];
}

function saveRecentTimeline(university, year) {
    const recent = getRecentTimelines();
    const key = `${university}_${year}`;
    const filtered = recent.filter(r => `${r.university}_${r.year}` !== key);
    filtered.unshift({ university, year, timestamp: Date.now() });
    const trimmed = filtered.slice(0, 5);
    localStorage.setItem('medshare_recent', JSON.stringify(trimmed));
}

function getLikes() {
    const data = localStorage.getItem('medshare_likes');
    return data ? JSON.parse(data) : {};
}

function saveLike(postId, liked) {
    const likes = getLikes();
    if (liked) {
        likes[postId] = true;
    } else {
        delete likes[postId];
    }
    localStorage.setItem('medshare_likes', JSON.stringify(likes));
}

// ポイント管理
function getUserPoints(userId) {
    const data = localStorage.getItem('medshare_points');
    const points = data ? JSON.parse(data) : {};
    return points[userId] || 0;
}

function addPoints(userId, amount) {
    const data = localStorage.getItem('medshare_points');
    const points = data ? JSON.parse(data) : {};
    points[userId] = (points[userId] || 0) + amount;
    localStorage.setItem('medshare_points', JSON.stringify(points));
    updatePointsDisplay();
    return points[userId];
}

function updatePointsDisplay() {
    if (!currentUser) return;
    const points = getUserPoints(currentUser.id);
    const display = document.getElementById('user-points');
    if (display) {
        display.textContent = `${points} pt`;
    }
}

// アバター管理
function getAvatars() {
    const data = localStorage.getItem('medshare_avatars');
    return data ? JSON.parse(data) : {};
}

function saveAvatar(userId, imageData) {
    const avatars = getAvatars();
    avatars[userId] = imageData;
    localStorage.setItem('medshare_avatars', JSON.stringify(avatars));
}

function getUserAvatar(userId) {
    const avatars = getAvatars();
    return avatars[userId] || null;
}

function updateAvatarDisplay() {
    if (!currentUser) return;
    const avatarContainer = document.getElementById('user-avatar');
    const avatar = getUserAvatar(currentUser.id);

    if (avatar) {
        avatarContainer.innerHTML = `<img src="${avatar}" alt="avatar">`;
    } else {
        avatarContainer.innerHTML = '<span class="avatar-placeholder">👤</span>';
    }
}

// ランキング機能（API経由）
async function getRankings(scope) {
    try {
        const url = scope === 'university' && currentUser
            ? `/api/rankings/${scope}?universityId=${currentUser.universityId}`
            : `/api/rankings/${scope}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            return data.rankings.map(user => ({
                id: user.id,
                nickname: user.nickname,
                universityId: user.university_id,
                points: user.points || 0,
                avatar: user.avatar
            }));
        }
    } catch (error) {
        console.error('ランキング取得エラー:', error);
    }
    return [];
}

async function renderRankings(scope) {
    const rankings = await getRankings(scope);
    const container = document.getElementById('ranking-list');

    if (rankings.length === 0) {
        container.innerHTML = '<div class="ranking-empty">まだランキングデータがありません</div>';
        return;
    }

    container.innerHTML = rankings.map((user, index) => {
        const position = index + 1;
        const uni = universities.find(u => u.id === user.universityId);
        const uniName = uni ? uni.name : '不明';
        const isOwn = currentUser && user.id === currentUser.id;
        const isTop3 = position <= 3;

        const avatarHtml = user.avatar
            ? `<img src="${user.avatar}" alt="avatar">`
            : '👤';

        return `
            <div class="ranking-item ${isOwn ? 'own' : ''} ${isTop3 ? 'top-3' : ''}">
                <div class="ranking-position">${position}</div>
                <div class="ranking-avatar">${avatarHtml}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${escapeHtml(user.nickname)}</div>
                    <div class="ranking-university">${escapeHtml(uniName)}</div>
                </div>
                <div class="ranking-points">${user.points} pt</div>
            </div>
        `;
    }).join('');
}

function openRankingModal() {
    document.getElementById('ranking-modal').classList.add('active');
    // デフォルトで全国ランキングを表示
    document.querySelectorAll('.ranking-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.scope === 'national');
    });
    renderRankings('national');
}

function closeRankingModal() {
    document.getElementById('ranking-modal').classList.remove('active');
}

function getReports() {
    const data = localStorage.getItem('medshare_reports');
    return data ? JSON.parse(data) : [];
}

function saveReport(postId, reason, university, year) {
    const reports = getReports();
    reports.push({ postId, reason, university, year, timestamp: Date.now() });
    localStorage.setItem('medshare_reports', JSON.stringify(reports));
}

function hasTermsAccepted() {
    return localStorage.getItem('medshare_terms_accepted') === 'true';
}

function acceptTerms() {
    localStorage.setItem('medshare_terms_accepted', 'true');
}

// =====================================
// 認証機能
// =====================================

function getUsers() {
    const data = localStorage.getItem('medshare_users');
    return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
    localStorage.setItem('medshare_users', JSON.stringify(users));
}

function getCurrentSession() {
    const data = localStorage.getItem('medshare_session');
    return data ? JSON.parse(data) : null;
}

function saveSession(user) {
    localStorage.setItem('medshare_session', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('medshare_session');
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

function getPendingUsers() {
    const data = localStorage.getItem('medshare_pending_users');
    return data ? JSON.parse(data) : [];
}

function savePendingUsers(users) {
    localStorage.setItem('medshare_pending_users', JSON.stringify(users));
}

function generateVerificationToken() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}

// メールドメイン検証
function validateEmailDomain(email, universityId) {
    const uni = universities.find(u => u.id === universityId);
    if (!uni || !uni.domain) {
        // その他の大学の場合は.ac.jpで終わればOK
        return email.endsWith('.ac.jp');
    }
    return email.endsWith('@' + uni.domain);
}

function getUniversityByEmail(email) {
    for (const uni of universities) {
        if (uni.domain && email.endsWith('@' + uni.domain)) {
            return uni;
        }
    }
    return null;
}

// サーバーAPIを使った新規登録
async function registerUserAPI(nickname, email, password, universityId) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, email, password, universityId })
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'サーバーに接続できません' };
    }
}

// サーバーAPIを使ったログイン
async function loginUserAPI(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        // サーバーに接続できない場合はローカル認証にフォールバック
        return loginUser(email, password);
    }
}

// ローカル用: 仮登録（デモ/オフライン用）
function createPendingUser(nickname, email, password, universityId) {
    const users = getUsers();
    const pendingUsers = getPendingUsers();

    // メールドメイン検証
    if (!validateEmailDomain(email, universityId)) {
        const uni = universities.find(u => u.id === universityId);
        if (uni && uni.domain) {
            return { success: false, message: `${uni.name}の学番メール（@${uni.domain}）を使用してください` };
        }
        return { success: false, message: '大学の学番メールアドレス（.ac.jp）を使用してください' };
    }

    if (users.find(u => u.email === email)) {
        return { success: false, message: 'このメールアドレスは既に登録されています' };
    }

    const filteredPending = pendingUsers.filter(u => u.email !== email);
    const token = generateVerificationToken();
    const newPendingUser = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        nickname,
        email,
        password: hashPassword(password),
        universityId,
        token,
        createdAt: Date.now()
    };

    filteredPending.push(newPendingUser);
    savePendingUsers(filteredPending);

    return { success: true, token, email };
}

function verifyAndRegisterUser(token) {
    const pendingUsers = getPendingUsers();
    const pendingUser = pendingUsers.find(u => u.token === token);

    if (!pendingUser) {
        return { success: false, message: '無効な認証リンクです' };
    }

    if (Date.now() - pendingUser.createdAt > 24 * 60 * 60 * 1000) {
        return { success: false, message: '認証リンクの有効期限が切れています' };
    }

    const users = getUsers();
    const newUser = {
        id: pendingUser.id,
        nickname: pendingUser.nickname,
        email: pendingUser.email,
        password: pendingUser.password,
        universityId: pendingUser.universityId,
        createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);

    const filteredPending = pendingUsers.filter(u => u.token !== token);
    savePendingUsers(filteredPending);

    return {
        success: true,
        user: {
            id: newUser.id,
            nickname: newUser.nickname,
            email: newUser.email,
            universityId: newUser.universityId
        }
    };
}

function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === hashPassword(password));

    if (!user) {
        return { success: false, message: 'メールアドレスまたはパスワードが正しくありません' };
    }

    const sessionUser = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        universityId: user.universityId
    };
    saveSession(sessionUser);

    return { success: true, user: sessionUser };
}

function logoutUser() {
    clearSession();
    currentUser = null;
}

// =====================================
// UI操作
// =====================================

function updateUserUI() {
    const userMenu = document.getElementById('user-menu');
    const userNickname = document.getElementById('user-nickname');
    const userUniversity = document.getElementById('user-university');

    if (currentUser) {
        userMenu.classList.remove('hidden');
        userNickname.textContent = currentUser.nickname;
        const uni = universities.find(u => u.id === currentUser.universityId);
        userUniversity.textContent = uni ? `(${uni.name})` : '';
        updatePointsDisplay();
        updateAvatarDisplay();
    } else {
        userMenu.classList.add('hidden');
    }
}

function showAuthScreen() {
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('selection-screen').classList.remove('active');
    document.getElementById('timeline-screen').classList.remove('active');
}

function showSelectionScreen() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('selection-screen').classList.add('active');
    document.getElementById('timeline-screen').classList.remove('active');

    // 所属大学を表示
    if (currentUser) {
        const uni = universities.find(u => u.id === currentUser.universityId);
        document.getElementById('current-university-display').textContent = uni ? uni.name : '不明';
    }

    renderRecentTimelines();
}

function initUniversitySelect() {
    const select = document.getElementById('register-university');
    universities.forEach(uni => {
        const option = document.createElement('option');
        option.value = uni.id;
        option.textContent = uni.name;
        select.appendChild(option);
    });
}

function renderRecentTimelines() {
    const container = document.getElementById('recent-list');
    const recent = getRecentTimelines();

    // 現在のユーザーの大学のタイムラインのみ表示
    const userRecent = recent.filter(r => currentUser && r.university === currentUser.universityId);

    if (userRecent.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); font-size: 0.9rem;">まだアクセスしたタイムラインはありません</p>';
        return;
    }

    container.innerHTML = userRecent.map(r => {
        const yearName = yearLabels[r.year] || r.year;
        const date = new Date(r.timestamp).toLocaleDateString('ja-JP');

        return `
            <div class="recent-item" data-year="${r.year}">
                <div class="recent-item-title">${yearName}</div>
                <div class="recent-item-date">${date}にアクセス</div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', () => {
            const year = item.dataset.year;
            goToTimeline(year);
        });
    });
}

function goToTimeline(year) {
    if (!currentUser) return;

    currentYear = year;
    saveRecentTimeline(currentUser.universityId, year);

    const uni = universities.find(u => u.id === currentUser.universityId);
    const uniName = uni ? uni.name : '不明';
    const yearName = yearLabels[year] || year;
    document.getElementById('timeline-title').textContent = `${uniName} 医学部 ${yearName}`;

    document.getElementById('selection-screen').classList.remove('active');
    document.getElementById('timeline-screen').classList.add('active');

    renderPosts();
}

function goBack() {
    document.getElementById('timeline-screen').classList.remove('active');
    document.getElementById('selection-screen').classList.add('active');

    resetPostForm();
    currentFilter = 'all';
    updateFilterButtons();
    renderRecentTimelines();
}

function renderPosts() {
    if (!currentUser) return;

    const timeline = document.getElementById('timeline');
    const posts = getPosts(currentUser.universityId, currentYear);
    const likes = getLikes();

    // 科目リストも更新
    renderSubjectList();

    const filteredPosts = currentFilter === 'all'
        ? posts
        : posts.filter(p => p.type === currentFilter);

    document.getElementById('post-count').textContent = `${posts.length}件の投稿`;

    if (filteredPosts.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">まだ投稿がありません</div>
                <div class="empty-state-sub">最初の投稿者になりましょう!</div>
            </div>
        `;
        return;
    }

    const sortedPosts = [...filteredPosts].sort((a, b) => b.timestamp - a.timestamp);

    timeline.innerHTML = sortedPosts.map(post => {
        const isLiked = likes[post.id];
        const typeIcon = post.type === 'exam' ? '📝' : post.type === 'clinical' ? '🏥' : '📚';
        const isOwnPost = currentUser && post.authorId === currentUser.id;

        let filesHtml = '';
        if (post.files && post.files.length > 0) {
            filesHtml = `
                <div class="post-files">
                    ${post.files.map(f => `
                        <div class="post-file" onclick="downloadFile('${f.name}', '${f.data}')">
                            📎 ${f.name}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 自分の投稿の場合、編集・削除ボタンを表示
        const ownPostActions = isOwnPost ? `
            <div class="own-post-actions">
                <button class="edit-btn" onclick="startEditPost('${post.id}')">編集</button>
                <button class="delete-btn" onclick="deletePost('${post.id}')">削除</button>
            </div>
        ` : '';

        // 編集済み表示
        const editedLabel = post.editedAt ? `<span class="edited-label">(編集済み)</span>` : '';

        return `
            <div class="post-card ${isOwnPost ? 'own-post' : ''}" data-id="${post.id}">
                <div class="post-card-header">
                    <span class="post-type-badge ${post.type}">${typeIcon} ${typeLabels[post.type]}</span>
                    <div class="post-meta">
                        ${post.subject ? `<div class="post-subject">${escapeHtml(post.subject)}</div>` : ''}
                        ${post.professor ? `<div class="post-professor">担当: ${escapeHtml(post.professor)}</div>` : ''}
                    </div>
                    ${ownPostActions}
                </div>
                <div class="post-card-body">
                    <div class="post-title">${escapeHtml(post.title)}</div>
                    ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
                    ${filesHtml}
                </div>
                <div class="post-card-footer">
                    <span class="post-author">${post.author || '匿名'} ${editedLabel}</span>
                    <span class="post-date">${formatDate(post.timestamp)}</span>
                    <div class="post-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                            ${isLiked ? '❤️' : '🤍'} ${post.likes || 0}
                        </button>
                        <button class="report-btn" onclick="openReportModal('${post.id}')">
                            通報
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleLike(postId) {
    if (!currentUser) return;

    const posts = getPosts(currentUser.universityId, currentYear);
    const likes = getLikes();
    const isLiked = likes[postId];

    const post = posts.find(p => p.id === postId);
    if (post) {
        post.likes = (post.likes || 0) + (isLiked ? -1 : 1);
        savePosts(currentUser.universityId, currentYear, posts);
    }

    saveLike(postId, !isLiked);
    renderPosts();
}

function downloadFile(filename, dataUrl) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'たった今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;
    return date.toLocaleDateString('ja-JP');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function resetPostForm() {
    document.getElementById('post-title').value = '';
    document.getElementById('post-subject-select').value = '';
    document.getElementById('post-subject-other').value = '';
    document.getElementById('post-subject-other').classList.add('hidden');
    document.getElementById('post-professor').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-file').value = '';
    document.getElementById('file-preview').innerHTML = '';
    selectedFiles = [];

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn[data-type="exam"]').classList.add('active');
    document.getElementById('post-type').value = 'exam';
    updateAiGeneratorVisibility();
}

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

function showTermsModal() {
    document.getElementById('terms-modal').classList.add('active');
}

function hideTermsModal() {
    document.getElementById('terms-modal').classList.remove('active');
}

function openReportModal(postId) {
    reportingPostId = postId;
    document.getElementById('report-modal').classList.add('active');
    document.querySelectorAll('input[name="report-reason"]').forEach(r => r.checked = false);
}

function closeReportModal() {
    reportingPostId = null;
    document.getElementById('report-modal').classList.remove('active');
}

function submitReport() {
    const reason = document.querySelector('input[name="report-reason"]:checked');
    if (!reason) {
        showToast('通報理由を選択してください');
        return;
    }

    if (currentUser) {
        saveReport(reportingPostId, reason.value, currentUser.universityId, currentYear);
    }
    closeReportModal();
    showToast('通報を受け付けました。確認後対応いたします。');
}

// 投稿の削除
function deletePost(postId) {
    if (!currentUser) return;

    if (!confirm('この投稿を削除しますか？')) return;

    const posts = getPosts(currentUser.universityId, currentYear);
    const post = posts.find(p => p.id === postId);

    if (!post || post.authorId !== currentUser.id) {
        showToast('この投稿を削除する権限がありません');
        return;
    }

    const filteredPosts = posts.filter(p => p.id !== postId);
    savePosts(currentUser.universityId, currentYear, filteredPosts);
    renderPosts();
    showToast('投稿を削除しました');
}

// 投稿の編集モードを開始
function startEditPost(postId) {
    if (!currentUser) return;

    const posts = getPosts(currentUser.universityId, currentYear);
    const post = posts.find(p => p.id === postId);

    if (!post || post.authorId !== currentUser.id) {
        showToast('この投稿を編集する権限がありません');
        return;
    }

    editingPostId = postId;

    // フォームに値をセット
    document.getElementById('post-title').value = post.title || '';

    // 科目の設定
    const subjectSelect = document.getElementById('post-subject-select');
    const subjectOther = document.getElementById('post-subject-other');
    const existingSubject = post.subject || '';

    // 既存の科目リストにあるか確認
    let found = false;
    for (let i = 0; i < subjectSelect.options.length; i++) {
        if (subjectSelect.options[i].value === existingSubject) {
            subjectSelect.value = existingSubject;
            subjectOther.classList.add('hidden');
            found = true;
            break;
        }
    }
    if (!found && existingSubject) {
        subjectSelect.value = '__other__';
        subjectOther.value = existingSubject;
        subjectOther.classList.remove('hidden');
    }

    document.getElementById('post-professor').value = post.professor || '';
    document.getElementById('post-content').value = post.content || '';
    document.getElementById('post-type').value = post.type;

    // タブを更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === post.type);
    });

    // ファイルをセット
    selectedFiles = post.files ? [...post.files] : [];
    const preview = document.getElementById('file-preview');
    preview.innerHTML = '';
    selectedFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-preview-item';
        item.innerHTML = `
            📎 ${file.name}
            <span class="remove-file" data-name="${file.name}">×</span>
        `;
        preview.appendChild(item);
        item.querySelector('.remove-file').addEventListener('click', () => {
            selectedFiles = selectedFiles.filter(f => f.name !== file.name);
            item.remove();
        });
    });

    // ボタンのテキストを変更
    document.getElementById('submit-post-btn').textContent = '更新する';

    // フォームまでスクロール
    document.querySelector('.post-form-container').scrollIntoView({ behavior: 'smooth' });

    showToast('編集モード: 内容を変更して「更新する」をクリック');
}

// 編集をキャンセル
function cancelEdit() {
    editingPostId = null;
    resetPostForm();
    document.getElementById('submit-post-btn').textContent = '投稿する';
}

// 投稿を更新
function updatePost() {
    if (!currentUser || !editingPostId) return;

    const title = document.getElementById('post-title').value.trim();
    const subjectSelect = document.getElementById('post-subject-select').value;
    const subjectOther = document.getElementById('post-subject-other').value.trim();
    const subject = subjectSelect === '__other__' ? subjectOther : subjectSelect;
    const professor = document.getElementById('post-professor').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const type = document.getElementById('post-type').value;

    if (!title) {
        showToast('タイトルを入力してください');
        return;
    }

    const posts = getPosts(currentUser.universityId, currentYear);
    const postIndex = posts.findIndex(p => p.id === editingPostId);

    if (postIndex === -1) {
        showToast('投稿が見つかりません');
        return;
    }

    if (posts[postIndex].authorId !== currentUser.id) {
        showToast('この投稿を編集する権限がありません');
        return;
    }

    // 投稿を更新
    posts[postIndex] = {
        ...posts[postIndex],
        type,
        title,
        subject,
        professor,
        content,
        files: selectedFiles,
        editedAt: Date.now()
    };

    savePosts(currentUser.universityId, currentYear, posts);

    editingPostId = null;
    resetPostForm();
    document.getElementById('submit-post-btn').textContent = '投稿する';
    renderPosts();
    showToast('投稿を更新しました');
}

// =====================================
// AI問題生成機能
// =====================================

function updateAiGeneratorVisibility() {
    const aiSection = document.getElementById('ai-generator-section');
    const currentType = document.getElementById('post-type').value;
    if (aiSection) {
        aiSection.classList.toggle('hidden', currentType !== 'exam');
    }
}

function updateCreateTestButton() {
    const btn = document.getElementById('create-test-btn');
    if (btn) {
        btn.disabled = aiMaterialFiles.length === 0;
    }
}

function openAiTypeModal() {
    document.getElementById('ai-type-modal').classList.add('active');
}

function closeAiTypeModal() {
    document.getElementById('ai-type-modal').classList.remove('active');
}

function showGeneratingModal() {
    document.getElementById('ai-generating-modal').classList.add('active');
}

function hideGeneratingModal() {
    document.getElementById('ai-generating-modal').classList.remove('active');
}

function showResultModal() {
    document.getElementById('ai-result-modal').classList.add('active');
}

function closeResultModal() {
    document.getElementById('ai-result-modal').classList.remove('active');
}

// デモ用のサンプル問題生成
function generateSampleQuestions(type) {
    const subjects = ['解剖学', '生理学', '生化学', '病理学', '薬理学'];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];

    const questions = [];
    const count = 5;

    for (let i = 1; i <= count; i++) {
        if (type === 'short') {
            questions.push({
                type: 'short',
                number: i,
                question: `${subject}に関する単答式問題${i}: この器官/物質の名称を答えよ。`,
                answer: `解答例${i}`
            });
        } else if (type === 'multiple') {
            questions.push({
                type: 'multiple',
                number: i,
                question: `${subject}に関する4択問題${i}: 次のうち正しいものはどれか。`,
                choices: ['A. 選択肢1', 'B. 選択肢2', 'C. 選択肢3（正解）', 'D. 選択肢4'],
                answer: 'C'
            });
        } else if (type === 'essay') {
            questions.push({
                type: 'essay',
                number: i,
                question: `${subject}に関する記述問題${i}: このメカニズムについて詳しく説明せよ。`,
                answer: `模範解答: ${subject}における重要な概念について、以下の点を含めて説明する必要がある...`
            });
        }
    }

    return questions;
}

function renderGeneratedQuestions(questions) {
    const container = document.getElementById('ai-generated-questions');

    container.innerHTML = questions.map(q => {
        let choicesHtml = '';
        if (q.choices) {
            choicesHtml = `
                <div class="ai-choices">
                    ${q.choices.map(c => `<div class="ai-choice">${escapeHtml(c)}</div>`).join('')}
                </div>
            `;
        }

        return `
            <div class="ai-question">
                <div class="ai-question-number">問${q.number}</div>
                <div class="ai-question-text">${escapeHtml(q.question)}</div>
                ${choicesHtml}
                <div class="ai-answer"><strong>解答:</strong> ${escapeHtml(q.answer)}</div>
            </div>
        `;
    }).join('');
}

async function generateQuestions(type) {
    closeAiTypeModal();
    showGeneratingModal();

    try {
        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                materials: aiMaterialFiles
            })
        });

        const result = await response.json();
        hideGeneratingModal();

        if (result.success) {
            generatedQuestions = result.questions;
            renderGeneratedQuestions(generatedQuestions);
            showResultModal();
        } else {
            showToast(result.message || 'AI問題生成に失敗しました');
        }
    } catch (error) {
        hideGeneratingModal();
        console.error('API Error:', error);
        showToast('サーバーに接続できません');
    }
}

// =====================================
// 科目別表示機能
// =====================================

function getSubjectsFromPosts(posts) {
    const subjects = {};
    posts.forEach(post => {
        if (post.subject && post.subject.trim()) {
            const subjectName = post.subject.trim();
            if (!subjects[subjectName]) {
                subjects[subjectName] = { name: subjectName, count: 0, posts: [] };
            }
            subjects[subjectName].count++;
            subjects[subjectName].posts.push(post);
        }
    });
    return Object.values(subjects).sort((a, b) => b.count - a.count);
}

function updateSubjectSelect() {
    if (!currentUser) return;

    const posts = getPosts(currentUser.universityId, currentYear);
    const subjects = getSubjectsFromPosts(posts);
    const select = document.getElementById('post-subject-select');

    // 既存のオプションをクリア（最初の2つは残す）
    while (select.options.length > 2) {
        select.remove(2);
    }

    // 科目を追加
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.name;
        option.textContent = subject.name;
        select.insertBefore(option, select.options[1]); // 「その他」の前に挿入
    });
}

function renderSubjectList() {
    if (!currentUser) return;

    const posts = getPosts(currentUser.universityId, currentYear);
    const subjects = getSubjectsFromPosts(posts);
    const container = document.getElementById('subject-list');

    // 科目セレクトも更新
    updateSubjectSelect();

    if (subjects.length === 0) {
        container.innerHTML = '<p class="no-subjects">まだ科目が登録されていません</p>';
        return;
    }

    container.innerHTML = subjects.map(subject => `
        <div class="subject-card" data-subject="${escapeHtml(subject.name)}">
            <span class="subject-name">${escapeHtml(subject.name)}</span>
            <span class="subject-count">${subject.count}件</span>
        </div>
    `).join('');

    // クリックイベント
    container.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', () => {
            openSubjectModal(card.dataset.subject);
        });
    });
}

function openSubjectModal(subjectName) {
    if (!currentUser) return;

    const posts = getPosts(currentUser.universityId, currentYear);
    const subjectPosts = posts.filter(p => p.subject && p.subject.trim() === subjectName);

    document.getElementById('subject-modal-title').textContent = subjectName;

    const container = document.getElementById('subject-posts');
    const likes = getLikes();

    if (subjectPosts.length === 0) {
        container.innerHTML = '<p class="no-posts">この科目の投稿はありません</p>';
    } else {
        const sortedPosts = [...subjectPosts].sort((a, b) => b.timestamp - a.timestamp);
        container.innerHTML = sortedPosts.map(post => {
            const isLiked = likes[post.id];
            const typeIcon = post.type === 'exam' ? '📝' : post.type === 'clinical' ? '🏥' : '📚';
            const isOwnPost = currentUser && post.authorId === currentUser.id;

            let filesHtml = '';
            if (post.files && post.files.length > 0) {
                filesHtml = `
                    <div class="post-files">
                        ${post.files.map(f => `
                            <div class="post-file" onclick="downloadFile('${f.name}', '${f.data}')">
                                📎 ${f.name}
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            const ownPostActions = isOwnPost ? `
                <div class="own-post-actions">
                    <button class="edit-btn" onclick="closeSubjectModal(); startEditPost('${post.id}');">編集</button>
                    <button class="delete-btn" onclick="deletePost('${post.id}'); openSubjectModal('${escapeHtml(subjectName)}');">削除</button>
                </div>
            ` : '';

            const editedLabel = post.editedAt ? `<span class="edited-label">(編集済み)</span>` : '';

            return `
                <div class="post-card ${isOwnPost ? 'own-post' : ''}" data-id="${post.id}">
                    <div class="post-card-header">
                        <span class="post-type-badge ${post.type}">${typeIcon} ${typeLabels[post.type] || post.type}</span>
                        <div class="post-meta">
                            ${post.professor ? `<div class="post-professor">担当: ${escapeHtml(post.professor)}</div>` : ''}
                        </div>
                        ${ownPostActions}
                    </div>
                    <div class="post-card-body">
                        <div class="post-title">${escapeHtml(post.title)}</div>
                        ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
                        ${filesHtml}
                    </div>
                    <div class="post-card-footer">
                        <span class="post-author">${post.author || '匿名'} ${editedLabel}</span>
                        <span class="post-date">${formatDate(post.timestamp)}</span>
                        <div class="post-actions">
                            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}'); openSubjectModal('${escapeHtml(subjectName)}');">
                                ${isLiked ? '❤️' : '🤍'} ${post.likes || 0}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('subject-modal').classList.add('active');
}

function closeSubjectModal() {
    document.getElementById('subject-modal').classList.remove('active');
}

function postGeneratedQuestions() {
    if (!generatedQuestions || !currentUser) return;

    const questionTypeLabels = {
        'short': '単答式',
        'multiple': '4択',
        'essay': '記述式'
    };

    const questionType = generatedQuestions[0]?.type || 'short';
    const typeLabel = questionTypeLabels[questionType];

    // 問題をテキスト形式に変換
    let content = `【AI生成 ${typeLabel}問題】\n\n`;
    generatedQuestions.forEach(q => {
        content += `■ 問${q.number}\n${q.question}\n`;
        if (q.choices) {
            content += q.choices.join('\n') + '\n';
        }
        content += `▶ 解答: ${q.answer}\n\n`;
    });

    // 投稿フォームに設定
    document.getElementById('post-title').value = `AI生成 ${typeLabel}問題（${generatedQuestions.length}問）`;
    document.getElementById('post-content').value = content;
    document.getElementById('post-type').value = 'exam';

    // タブを更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'exam');
    });
    updateAiGeneratorVisibility();

    // AI問題生成ボーナスポイント（5pt）を記録
    localStorage.setItem('medshare_ai_bonus_pending', 'true');

    closeResultModal();
    showToast('問題をフォームに設定しました。科目を選んで「投稿する」で共有すると +5pt ボーナス！');

    // AIファイルをリセット
    aiMaterialFiles = [];
    document.getElementById('ai-file-preview').innerHTML = '';
    updateCreateTestButton();
}

// =====================================
// イベントリスナー
// =====================================

document.addEventListener('DOMContentLoaded', () => {
    // セッションチェック
    const session = getCurrentSession();
    if (session) {
        currentUser = session;
        updateUserUI();
        showSelectionScreen();
    } else {
        showAuthScreen();
    }

    // 利用規約チェック
    if (!hasTermsAccepted()) {
        showTermsModal();
    }

    // 大学セレクト初期化
    initUniversitySelect();

    // 利用規約同意
    document.getElementById('accept-terms-btn').addEventListener('click', () => {
        acceptTerms();
        hideTermsModal();
    });

    // 通報モーダル
    document.getElementById('cancel-report-btn').addEventListener('click', closeReportModal);
    document.getElementById('submit-report-btn').addEventListener('click', submitReport);

    // 認証タブ切り替え
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.tab === 'login') {
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
            } else {
                document.getElementById('login-form').classList.add('hidden');
                document.getElementById('register-form').classList.remove('hidden');
            }
        });
    });

    // 大学選択時にメールドメインヒントを表示
    document.getElementById('register-university').addEventListener('change', (e) => {
        const hint = document.getElementById('email-hint');
        const uni = universities.find(u => u.id === e.target.value);
        if (uni && uni.domain) {
            hint.textContent = `使用可能なメール: @${uni.domain}`;
        } else if (uni) {
            hint.textContent = '大学のメールアドレス（.ac.jp）を使用してください';
        } else {
            hint.textContent = '';
        }
    });

    // ログインフォーム
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        const result = loginUser(email, password);
        if (result.success) {
            currentUser = result.user;
            updateUserUI();
            showSelectionScreen();
            showToast(`ようこそ、${currentUser.nickname}さん！`);
        } else {
            showToast(result.message);
        }
    });

    // 新規登録フォーム
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const universityId = document.getElementById('register-university').value;
        const nickname = document.getElementById('register-nickname').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;

        if (!universityId) {
            showToast('大学を選択してください');
            return;
        }

        if (password !== passwordConfirm) {
            showToast('パスワードが一致しません');
            return;
        }

        if (password.length < 8) {
            showToast('パスワードは8文字以上で入力してください');
            return;
        }

        // サーバーAPIを使用してメール送信
        showToast('処理中...');
        const result = await registerUserAPI(nickname, email, password, universityId);

        if (result.success) {
            // メール送信成功
            document.getElementById('verify-email-display').textContent = email;
            document.getElementById('verify-modal').classList.add('active');
            // デモリンクを非表示（実際のメールが送信されるため）
            const demoNotice = document.querySelector('.demo-notice');
            if (demoNotice) {
                demoNotice.innerHTML = `
                    <p><strong>認証メールを送信しました</strong></p>
                    <p>メールボックスを確認してください。<br>迷惑メールフォルダもご確認ください。</p>
                `;
            }
        } else {
            showToast(result.message);
        }
    });

    // メール認証キャンセル
    document.getElementById('cancel-verify-btn').addEventListener('click', () => {
        document.getElementById('verify-modal').classList.remove('active');
        pendingRegistration = null;
    });

    // デモ用認証リンク
    document.getElementById('demo-verify-link').addEventListener('click', (e) => {
        e.preventDefault();
        if (!pendingRegistration) {
            showToast('認証情報が見つかりません');
            return;
        }

        const result = verifyAndRegisterUser(pendingRegistration.token);
        if (result.success) {
            currentUser = result.user;
            saveSession(currentUser);
            updateUserUI();
            document.getElementById('verify-modal').classList.remove('active');
            showSelectionScreen();
            showToast('アカウントを作成しました！');
            pendingRegistration = null;
        } else {
            showToast(result.message);
        }
    });

    // ログアウト
    document.getElementById('logout-btn').addEventListener('click', () => {
        logoutUser();
        updateUserUI();
        showAuthScreen();
        showToast('ログアウトしました');
    });

    // アバタークリックでファイル選択
    document.getElementById('user-avatar').addEventListener('click', () => {
        document.getElementById('avatar-input').click();
    });

    // アバター画像選択
    document.getElementById('avatar-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('画像サイズは5MB以下にしてください');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            // 画像をリサイズして保存（Base64が大きくなりすぎないように）
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const resizedData = canvas.toDataURL('image/jpeg', 0.8);
                saveAvatar(currentUser.id, resizedData);
                updateAvatarDisplay();
                showToast('プロフィール画像を更新しました');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ランキングボタン
    document.getElementById('ranking-btn').addEventListener('click', openRankingModal);

    // ランキングモーダルを閉じる
    document.getElementById('close-ranking-btn').addEventListener('click', closeRankingModal);

    // ランキングタブ切り替え
    document.querySelectorAll('.ranking-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderRankings(tab.dataset.scope);
        });
    });

    // 学年選択時
    document.getElementById('year-select').addEventListener('change', (e) => {
        const goBtn = document.getElementById('go-timeline-btn');
        goBtn.disabled = !e.target.value;
    });

    // タイムラインへボタン
    document.getElementById('go-timeline-btn').addEventListener('click', () => {
        const year = document.getElementById('year-select').value;
        if (year) {
            goToTimeline(year);
        }
    });

    // 戻るボタン
    document.getElementById('back-btn').addEventListener('click', goBack);

    // タブ切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('post-type').value = btn.dataset.type;
            updateAiGeneratorVisibility();
        });
    });

    // AI教材ファイル選択
    const aiFileInput = document.getElementById('ai-material-file');
    if (aiFileInput) {
        aiFileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const preview = document.getElementById('ai-file-preview');

            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) {
                    showToast('ファイルサイズは20MB以下にしてください');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    aiMaterialFiles.push({ name: file.name, data: event.target.result });

                    const item = document.createElement('div');
                    item.className = 'ai-file-item';
                    item.innerHTML = `
                        📄 ${file.name}
                        <span class="remove-ai-file" data-name="${file.name}">×</span>
                    `;
                    preview.appendChild(item);

                    item.querySelector('.remove-ai-file').addEventListener('click', () => {
                        aiMaterialFiles = aiMaterialFiles.filter(f => f.name !== file.name);
                        item.remove();
                        updateCreateTestButton();
                    });

                    updateCreateTestButton();
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // オリジナルテスト作成ボタン
    const createTestBtn = document.getElementById('create-test-btn');
    if (createTestBtn) {
        createTestBtn.addEventListener('click', openAiTypeModal);
    }

    // AI問題タイプ選択
    document.querySelectorAll('.ai-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            generateQuestions(btn.dataset.type);
        });
    });

    // AIモーダルのキャンセル
    const cancelAiTypeBtn = document.getElementById('cancel-ai-type-btn');
    if (cancelAiTypeBtn) {
        cancelAiTypeBtn.addEventListener('click', closeAiTypeModal);
    }

    // AI結果モーダル
    const closeAiResultBtn = document.getElementById('close-ai-result-btn');
    if (closeAiResultBtn) {
        closeAiResultBtn.addEventListener('click', closeResultModal);
    }

    const postAiResultBtn = document.getElementById('post-ai-result-btn');
    if (postAiResultBtn) {
        postAiResultBtn.addEventListener('click', postGeneratedQuestions);
    }

    // 科目モーダルの閉じるボタン
    const closeSubjectModalBtn = document.getElementById('close-subject-modal');
    if (closeSubjectModalBtn) {
        closeSubjectModalBtn.addEventListener('click', closeSubjectModal);
    }

    // 科目選択の切り替え
    const subjectSelect = document.getElementById('post-subject-select');
    const subjectOther = document.getElementById('post-subject-other');
    if (subjectSelect && subjectOther) {
        subjectSelect.addEventListener('change', () => {
            if (subjectSelect.value === '__other__') {
                subjectOther.classList.remove('hidden');
                subjectOther.focus();
            } else {
                subjectOther.classList.add('hidden');
                subjectOther.value = '';
            }
        });
    }

    // ファイル選択
    document.getElementById('post-file').addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('file-preview');

        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                showToast('ファイルサイズは10MB以下にしてください');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                selectedFiles.push({ name: file.name, data: event.target.result });

                const item = document.createElement('div');
                item.className = 'file-preview-item';
                item.innerHTML = `
                    📎 ${file.name}
                    <span class="remove-file" data-name="${file.name}">×</span>
                `;
                preview.appendChild(item);

                item.querySelector('.remove-file').addEventListener('click', () => {
                    selectedFiles = selectedFiles.filter(f => f.name !== file.name);
                    item.remove();
                });
            };
            reader.readAsDataURL(file);
        });
    });

    // 投稿送信（新規 or 更新）
    document.getElementById('submit-post-btn').addEventListener('click', () => {
        if (!currentUser) {
            showToast('ログインしてください');
            return;
        }

        // 編集モードの場合は更新処理
        if (editingPostId) {
            updatePost();
            return;
        }

        const title = document.getElementById('post-title').value.trim();
        const subjectSelect = document.getElementById('post-subject-select').value;
        const subjectOther = document.getElementById('post-subject-other').value.trim();
        const subject = subjectSelect === '__other__' ? subjectOther : subjectSelect;
        const professor = document.getElementById('post-professor').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const type = document.getElementById('post-type').value;

        if (!subject) {
            showToast('科目を選択してください');
            return;
        }

        if (!title) {
            showToast('タイトルを入力してください');
            return;
        }

        const posts = getPosts(currentUser.universityId, currentYear);

        const newPost = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type,
            title,
            subject,
            professor,
            content,
            author: currentUser.nickname,
            authorId: currentUser.id,
            files: selectedFiles,
            likes: 0,
            timestamp: Date.now()
        };

        posts.push(newPost);
        savePosts(currentUser.universityId, currentYear, posts);

        // ポイント加算
        let earnedPoints = 1; // 投稿で1pt
        if (selectedFiles.length > 0) {
            earnedPoints += selectedFiles.length * 10; // ファイル1つにつき10pt
        }

        // AI問題生成ボーナス（5pt）
        if (localStorage.getItem('medshare_ai_bonus_pending') === 'true') {
            earnedPoints += 5;
            localStorage.removeItem('medshare_ai_bonus_pending');
        }

        addPoints(currentUser.id, earnedPoints);

        resetPostForm();
        renderPosts();
        showToast(`投稿しました！ +${earnedPoints}pt 獲得`);
    });

    // フィルターボタン
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            updateFilterButtons();
            renderPosts();
        });
    });
});
