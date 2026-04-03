// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://waogbrxqyysibttlpoxj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhb2dicnhxeXlzaWJ0dGxwb3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjE3NzUsImV4cCI6MjA5MDczNzc3NX0.Op1DUBfefbO2RkoitXws-7cFLW1T0DJGBDh1YPDcB1w';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let currentUser = null;
let currentUserId = null;
let currentUserEmail = null;
let messagesList = [];
let selectMode = false;
let currentTab = 'link';
let currentMessage = null;
let deferredPrompt = null;
let realtimeChannel = null;
let hasMessageShown = false;

// Messages aléatoires
const MESSAGES_ALEATOIRES = [
    "!!! Envoie moi des messages ✉️❤️👇👇👇",
    "Demande moi n'importe quoi ! 👋",
    "Pose-moi ta question la plus folle ❓",
    "Balance ton secret, je garde tout 🤫",
    "Un petit message pour me faire plaisir ? 💬",
    "Tu as quelque chose à me dire ? 🎤",
    "Ose ! C'est anonyme 😏",
    "N'aie pas peur, je ne mords pas 😊",
    "Ton message sera lu avec attention 👀",
    "Je veux savoir ce que tu penses vraiment 🔥",
    "Dis-moi tout, je suis anonyme 🤫"
];

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }

        currentUser = session.user;
        currentUserEmail = currentUser.email;
        currentUserId = currentUserEmail.split('@')[0];

        // Afficher infos sidebar
        const sbUserName = document.getElementById('sbUserName');
        const sbUserUid = document.getElementById('sbUserUid');
        if (sbUserName) sbUserName.textContent = currentUserEmail;
        if (sbUserUid) sbUserUid.textContent = `@${currentUserId}`;

        // Initialiser les composants
        initTheme();
        initEventListeners();
        setupAvatarUpload();
        
        setupDimensionSelector();
        setupOverlayDimensionSelector();
        setupScrollHandlers();

        // État initial : enveloppe visible, message caché
        showEnvelopeOnly();

        // Charger les données
        await loadMessages();
        subscribeToRealtime();

    } catch (error) {
        console.error('Erreur initialisation:', error);
    }
});

// ============================================================
// GESTION AFFICHAGE ENVELOPPE/MESSAGE
// ============================================================
function showEnvelopeOnly() {
    const envelope = document.getElementById('animatedEnvelope');
    const msgContainer = document.getElementById('randomMessageContainer');
    if (envelope) envelope.style.display = 'flex';
    if (msgContainer) msgContainer.style.display = 'none';
}

function showMessageOnly() {
    const envelope = document.getElementById('animatedEnvelope');
    const msgContainer = document.getElementById('randomMessageContainer');
    if (envelope) envelope.style.display = 'none';
    if (msgContainer) msgContainer.style.display = 'flex';
}

function showBoth() {
    const envelope = document.getElementById('animatedEnvelope');
    const msgContainer = document.getElementById('randomMessageContainer');
    if (envelope) envelope.style.display = 'flex';
    if (msgContainer) msgContainer.style.display = 'flex';
}

// ============================================================
// BOUTON DÉ
// ============================================================
function randomizeMessage() {
    const randomIndex = Math.floor(Math.random() * MESSAGES_ALEATOIRES.length);
    const message = MESSAGES_ALEATOIRES[randomIndex];
    const msgEl = document.getElementById('randomMessage');
    if (msgEl) msgEl.textContent = message;

    if (!hasMessageShown) {
        showBoth();
        hasMessageShown = true;
    } else {
        showBoth();
    }
}

// ============================================================
// SCROLL HANDLERS (cacher/montrer barres flottantes)
// ============================================================
function setupScrollHandlers() {
    const scrollArea = document.querySelector('.scroll-area');
    const linkFooter = document.querySelector('.link-footer');
    const replyToolbar = document.querySelector('#overlayLarge .toolbar');

    if (scrollArea && linkFooter) {
        let lastScrollTop = 0;
        scrollArea.addEventListener('scroll', () => {
            const scrollTop = scrollArea.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 50) {
                linkFooter.classList.add('hide');
            } else {
                linkFooter.classList.remove('hide');
            }
            lastScrollTop = scrollTop;
        });
    }

    // Pour l'overlay réponse
    const overlayLarge = document.getElementById('overlayLarge');
    if (overlayLarge && replyToolbar) {
        overlayLarge.addEventListener('scroll', () => {
            const scrollTop = overlayLarge.scrollTop;
            if (scrollTop > 50) {
                replyToolbar.classList.add('hide');
            } else {
                replyToolbar.classList.remove('hide');
            }
        });
    }
}

// ============================================================
// DIMENSION SELECTOR (carte Link)
// ============================================================
function setupDimensionSelector() {
    const select = document.getElementById('dimensionSelect');
    const shareCard = document.querySelector('.share-card');

    if (select && shareCard) {
        select.addEventListener('change', (e) => {
            const ratio = e.target.value;
            shareCard.style.aspectRatio = ratio;
        });
    }
}

// ============================================================
// DIMENSION SELECTOR (overlay réponse)
// ============================================================
function setupOverlayDimensionSelector() {
    const toolbarContent = document.querySelector('#overlayLarge .toolbar-content');
    if (toolbarContent && !document.getElementById('dimensionSelectOverlay')) {
        const select = document.createElement('select');
        select.id = 'dimensionSelectOverlay';
        select.className = 'dimension-select-overlay';
        select.innerHTML = `
            <option value="400">📱 Petit (400px)</option>
            <option value="440">📱🔹 (440px)</option>
            <option value="480">📱📱 Standard (480px)</option>
            <option value="520">📱🔹 Large (520px)</option>
            <option value="560">📱🔹🔹 (560px)</option>
            <option value="600">🖥️ Très large (600px)</option>
        `;

        select.addEventListener('change', (e) => {
            const captureArea = document.getElementById('captureArea');
            if (captureArea) {
                captureArea.style.maxWidth = e.target.value + 'px';
                captureArea.style.margin = '0 auto';
            }
        });

        toolbarContent.appendChild(select);
    }
}

// ============================================================
// CHARGEMENT DES MESSAGES
// ============================================================
async function loadMessages() {
    try {
        const { data, error } = await sb
            .from('messages')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        messagesList = Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Erreur chargement messages:', error);
        messagesList = [];
    }
    renderInbox();
    updateStats();
}

// ============================================================
// TEMPS RÉEL
// ============================================================
function subscribeToRealtime() {
    if (realtimeChannel) {
        try {
            sb.removeChannel(realtimeChannel);
        } catch (e) { }
    }

    try {
        realtimeChannel = sb
            .channel(`messages-${currentUserId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `user_id=eq.${currentUserId}`
            }, ({ new: msg }) => {
                if (msg) {
                    messagesList.unshift(msg);
                    renderInbox();
                    updateStats();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `user_id=eq.${currentUserId}`
            }, ({ new: msg }) => {
                if (msg) {
                    const index = messagesList.findIndex(m => m.id === msg.id);
                    if (index !== -1) {
                        messagesList[index] = msg;
                        renderInbox();
                        updateStats();
                    }
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'messages',
                filter: `user_id=eq.${currentUserId}`
            }, ({ old: msg }) => {
                if (msg) {
                    messagesList = messagesList.filter(m => m.id !== msg.id);
                    renderInbox();
                    updateStats();
                }
            })
            .subscribe();
    } catch (error) {
        console.warn('Erreur temps réel:', error);
    }
}

// ============================================================
// AFFICHAGE DE L'INBOX
// ============================================================
function renderInbox() {
    const feed = document.getElementById('inboxFeed');
    if (!feed) return;
    feed.innerHTML = '';
    feed.classList.toggle('select-mode', selectMode);

    if (!messagesList.length) {
        feed.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text3);font-size:15px;font-weight:600;">📭 Aucun message pour le moment</div>`;
        return;
    }

    messagesList.forEach(msg => {
        if (!msg) return;
        const card = document.createElement('div');
        card.className = `msg-card ${msg.read ? 'read' : 'unread'}`;

        const preview = (msg.content || '').length > 30
            ? msg.content.substring(0, 30) + '…'
            : (msg.content || 'Message vide');
        const timeAgo = formatTimeAgo(msg.created_at);
        const typeIcon = getTypeIcon(msg.type);
        const typeLabel = getTypeLabel(msg.type);

        card.innerHTML = `
            <div class="msg-check ${msg.selected ? 'on' : ''}" data-id="${msg.id}"></div>
            <div class="msg-body">
                <div class="msg-label">
                    ${!msg.read ? '<span class="animated-emoji">🔔</span>' : typeIcon} ${typeLabel}
                </div>
                <div class="msg-preview">${!msg.read ? 'Nouveau message ! <span class="arrow-hint">👉</span>' : preview}</div>
                <div class="msg-time">${timeAgo}</div>
            </div>
        `;

        if (selectMode) {
            const checkDiv = card.querySelector('.msg-check');
            checkDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                msg.selected = !msg.selected;
                renderInbox();
            });
        } else {
            card.addEventListener('click', () => openSmallOverlay(msg));
        }

        feed.appendChild(card);
    });
}

function getTypeIcon(type) {
    if (type === 'question') return '❓';
    if (type === 'secret') return '🤫';
    return '💬';
}

function getTypeLabel(type) {
    if (type === 'question') return 'Question anonyme';
    if (type === 'secret') return 'Secret';
    return 'Message anonyme';
}

// ============================================================
// FORMATAGE DU TEMPS
// ============================================================
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Date inconnue';
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)}j`;
    return new Date(timestamp).toLocaleDateString('fr-FR');
}

// ============================================================
// STATISTIQUES
// ============================================================
function updateStats() {
    const total = messagesList.length;
    const unread = messagesList.filter(m => m && !m.read).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthly = messagesList.filter(m => m?.created_at && new Date(m.created_at) >= monthStart).length;

    const inboxCount = document.getElementById('inboxCount');
    const unreadCount = document.getElementById('unreadCount');
    const statTotal = document.getElementById('statTotal');
    const statUnread = document.getElementById('statUnread');
    const statMonth = document.getElementById('statMonth');
    const notifDot = document.getElementById('notifDot');

    if (inboxCount) inboxCount.textContent = `${total} message${total > 1 ? 's' : ''}`;
    if (unreadCount) unreadCount.textContent = unread > 0 ? `(${unread})` : '';
    if (statTotal) statTotal.textContent = total;
    if (statUnread) statUnread.textContent = unread;
    if (statMonth) statMonth.textContent = monthly;
    if (notifDot) notifDot.style.display = unread > 0 ? 'flex' : 'none';
}

// ============================================================
// LIEN ANONYME
// ============================================================
function getAnonymousLink() {
    return `https://ivan-26work.github.io/Ano23/envoyer.html?uid=${currentUserId}`;
}

// ============================================================
// SHARE LINK CARD (copie lien + partage image)
// ============================================================
async function shareLinkCard() {
    const el = document.getElementById('shareCard');
    const btn = document.getElementById('shareLinkCardBtn');
    if (!el || !btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳…';
    btn.disabled = true;

    try {
        // 1. Copier le lien
        const link = getAnonymousLink();
        await navigator.clipboard.writeText(link);

        // 2. Capturer la carte
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'ano23-share.png', { type: 'image/png' });

        // 3. Message avec instruction
        const message = `📩 Message anonyme pour moi !\n\n📎 Ajoute cette image à ton statut\n🔗 Lien copié ! Colle-le dans la légende\n\nMerci ! 🙏`;

        // 4. Partage
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
                title: 'Ano23',
                text: message,
                files: [file]
            });
        } else {
            // Fallback WhatsApp
            const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');

            const a = document.createElement('a');
            a.download = 'ano23-share.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        }

    } catch (error) {
        console.error('Erreur partage:', error);
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ============================================================
// TÉLÉCHARGEMENT DE LA CARTE LINK
// ============================================================
async function downloadLinkCard() {
    const el = document.getElementById('shareCard');
    const btn = document.getElementById('downloadLinkCardBtn');
    if (!el || !btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳…';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const a = document.createElement('a');
        a.download = 'ano23-share.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    } catch (error) {
        console.error('Erreur téléchargement:', error);
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ============================================================
// COPIER LE LIEN
// ============================================================
async function copyLink() {
    try {
        const link = getAnonymousLink();
        await navigator.clipboard.writeText(link);

        const btn = document.getElementById('copyLinkBtn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copié !';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
    } catch (error) {
        console.error('Erreur copie:', error);
    }
}

// ============================================================
// OVERLAY LECTURE
// ============================================================
function openSmallOverlay(msg) {
    if (!msg) return;
    currentMessage = msg;
    if (!msg.read) markAsRead(msg.id);

    const smallIcon = document.getElementById('smallIcon');
    const smallType = document.getElementById('smallType');
    const smallTime = document.getElementById('smallTime');
    const smallText = document.getElementById('smallText');
    const overlaySmall = document.getElementById('overlaySmall');

    if (smallIcon) smallIcon.textContent = getTypeIcon(msg.type);
    if (smallType) smallType.textContent = getTypeLabel(msg.type);
    if (smallTime) smallTime.textContent = formatTimeAgo(msg.created_at);
    if (smallText) smallText.textContent = msg.content || 'Message vide';
    if (overlaySmall) overlaySmall.classList.add('open');
}

function closeSmallOverlay() {
    const overlaySmall = document.getElementById('overlaySmall');
    if (overlaySmall) overlaySmall.classList.remove('open');
}

async function markAsRead(messageId) {
    try {
        await sb.from('messages').update({ read: true }).eq('id', messageId);
        const msg = messagesList.find(m => m.id === messageId);
        if (msg) {
            msg.read = true;
            renderInbox();
            updateStats();
        }
    } catch (error) {
        console.error('Erreur marquage lu:', error);
    }
}

// ============================================================
// OVERLAY RÉPONSE
// ============================================================
function openLargeOverlay() {
    if (!currentMessage) return;
    closeSmallOverlay();

    const originalMsgDisplay = document.getElementById('originalMsgDisplay');
    const replyInput = document.getElementById('replyInput');
    const frameReply = document.getElementById('frameReply');
    const colorA = document.getElementById('colorA');
    const colorB = document.getElementById('colorB');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const overlayLarge = document.getElementById('overlayLarge');

    if (originalMsgDisplay) originalMsgDisplay.textContent = currentMessage.content || '...';
    if (replyInput) replyInput.value = '';
    if (frameReply) frameReply.style.background = 'none';
    if (colorA) colorA.value = '#0ea5e9';
    if (colorB) colorB.value = '#0284c7';
    if (downloadBtn) downloadBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;
    if (overlayLarge) overlayLarge.classList.add('open');
}

function closeLargeOverlay() {
    const overlayLarge = document.getElementById('overlayLarge');
    if (overlayLarge) overlayLarge.classList.remove('open');
}

function applyGradient() {
    const colorA = document.getElementById('colorA')?.value;
    const colorB = document.getElementById('colorB')?.value;
    const frameReply = document.getElementById('frameReply');
    if (colorA && colorB && frameReply) {
        frameReply.style.background = `linear-gradient(135deg, ${colorA}, ${colorB})`;
    }
}

// ============================================================
// TÉLÉCHARGEMENT RÉPONSE
// ============================================================
async function downloadReplyImage() {
    const el = document.getElementById('captureArea');
    const btn = document.getElementById('downloadBtn');
    if (!el || !btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳…';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const a = document.createElement('a');
        a.download = 'ano23-reponse.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    } catch (error) {
        console.error('Erreur téléchargement:', error);
    }

    btn.innerHTML = originalText;
    const replyInput = document.getElementById('replyInput');
    if (replyInput && replyInput.value.trim()) {
        btn.disabled = false;
    }
}

// ============================================================
// PARTAGE RÉPONSE
// ============================================================
async function shareReplyImage() {
    const el = document.getElementById('captureArea');
    const btn = document.getElementById('shareBtn');
    if (!el || !btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳…';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'ano23-reponse.png', { type: 'image/png' });
        const link = getAnonymousLink();
        const text = `🤔 Réponse anonyme sur Ano23\n\n👉 ${link}`;

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
                title: 'Ano23',
                text: text,
                files: [file]
            });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            await downloadReplyImage();
        }
    } catch (error) {
        console.error('Erreur partage:', error);
    }

    btn.innerHTML = originalText;
    const replyInput = document.getElementById('replyInput');
    if (replyInput && replyInput.value.trim()) {
        btn.disabled = false;
    }
}

// ============================================================
// SÉLECTION ET SUPPRESSION DES MESSAGES
// ============================================================
function enterSelectMode() {
    selectMode = true;
    const btnSelect = document.getElementById('btnSelect');
    const btnConfirmDel = document.getElementById('btnConfirmDel');
    if (btnSelect) btnSelect.style.display = 'none';
    if (btnConfirmDel) btnConfirmDel.classList.add('show');
    renderInbox();
}

function exitSelectMode() {
    selectMode = false;
    messagesList.forEach(m => { if (m) m.selected = false; });
    const btnSelect = document.getElementById('btnSelect');
    const btnConfirmDel = document.getElementById('btnConfirmDel');
    if (btnSelect) btnSelect.style.display = 'flex';
    if (btnConfirmDel) btnConfirmDel.classList.remove('show');
    renderInbox();
}

async function confirmDelete() {
    const selectedIds = messagesList.filter(m => m?.selected).map(m => m.id);
    if (selectedIds.length === 0) return;

    if (!confirm(`Supprimer ${selectedIds.length} message${selectedIds.length > 1 ? 's' : ''} ?`)) return;

    try {
        const { error } = await sb.from('messages').delete().in('id', selectedIds);
        if (error) throw error;
        messagesList = messagesList.filter(m => !selectedIds.includes(m.id));
        exitSelectMode();
        updateStats();
    } catch (error) {
        console.error('Erreur suppression:', error);
    }
}

// ============================================================
// SIDEBAR
// ============================================================
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sbBackdrop');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sbBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
}

// ============================================================
// THÈME CLAIR/SOMBRE
// ============================================================
function initTheme() {
    const savedTheme = localStorage.getItem('ano23-theme');
    const themeToggle = document.getElementById('themeToggle');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.checked = true;
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = themeToggle ? themeToggle.checked : false;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ano23-theme', theme);
}

// ============================================================
// AVATAR UPLOAD
// ============================================================
function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    const sbAvatar = document.getElementById('sbAvatar');
    const avatarEditBtn = document.getElementById('avatarEditBtn');

    if (!avatarInput || !sbAvatar) return;

    const savedAvatar = localStorage.getItem(`ano23-avatar-${currentUserId}`);
    if (savedAvatar) {
        sbAvatar.innerHTML = `<img src="${savedAvatar}" alt="avatar"/>`;
    }

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imgData = event.target.result;
            sbAvatar.innerHTML = `<img src="${imgData}" alt="avatar"/>`;
            localStorage.setItem(`ano23-avatar-${currentUserId}`, imgData);
        };
        reader.readAsDataURL(file);
    });

    if (avatarEditBtn) {
        avatarEditBtn.addEventListener('click', () => {
            avatarInput.click();
        });
    }
}

// ============================================================
// PWA INSTALLATION
// ============================================================
function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    const btnInstall = document.getElementById('btnInstall');
    if (btnInstall) {
        btnInstall.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
            }
        });
    }
}

// ============================================================
// DÉCONNEXION
// ============================================================
async function logout() {
    try {
        await sb.auth.signOut();
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
}

// ============================================================
// INITIALISATION DES ÉVÉNEMENTS
// ============================================================
function initEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab === currentTab) return;
            currentTab = tab;

            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.tab === tab);
            });

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `tab-${tab}`);
            });

            const deleteHeaderBtn = document.getElementById('btnDeleteHeader');
            if (deleteHeaderBtn) {
                deleteHeaderBtn.classList.toggle('show', tab === 'inbox');
            }

            if (tab === 'inbox') {
                renderInbox();
            }
        });
    });

    // Sidebar
    const menuBtn = document.getElementById('menuBtn');
    const sbBackdrop = document.getElementById('sbBackdrop');
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (sbBackdrop) sbBackdrop.addEventListener('click', closeSidebar);

    // Thème
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('change', toggleTheme);

    // Déconnexion
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', logout);

    // Carte Link
    const shareLinkCardBtn = document.getElementById('shareLinkCardBtn');
    const downloadLinkCardBtn = document.getElementById('downloadLinkCardBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const diceBtn = document.getElementById('diceBtn');

    if (shareLinkCardBtn) shareLinkCardBtn.addEventListener('click', shareLinkCard);
    if (downloadLinkCardBtn) downloadLinkCardBtn.addEventListener('click', downloadLinkCard);
    if (copyLinkBtn) copyLinkBtn.addEventListener('click', copyLink);
    if (diceBtn) diceBtn.addEventListener('click', randomizeMessage);

    // Inbox sélection/suppression
    const btnDeleteHeader = document.getElementById('btnDeleteHeader');
    const btnSelect = document.getElementById('btnSelect');
    const btnConfirmDel = document.getElementById('btnConfirmDel');

    if (btnDeleteHeader) btnDeleteHeader.addEventListener('click', enterSelectMode);
    if (btnSelect) btnSelect.addEventListener('click', enterSelectMode);
    if (btnConfirmDel) btnConfirmDel.addEventListener('click', confirmDelete);

    // Overlay small
    const closeSmall = document.getElementById('closeSmall');
    const overlaySmall = document.getElementById('overlaySmall');
    const btnReplySmall = document.getElementById('btnReplySmall');

    if (closeSmall) closeSmall.addEventListener('click', closeSmallOverlay);
    if (overlaySmall) {
        overlaySmall.addEventListener('click', (e) => {
            if (e.target === overlaySmall) closeSmallOverlay();
        });
    }
    if (btnReplySmall) btnReplySmall.addEventListener('click', openLargeOverlay);

    // Overlay large
    const closeLargeBtn = document.getElementById('closeLargeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const colorA = document.getElementById('colorA');
    const colorB = document.getElementById('colorB');
    const replyInput = document.getElementById('replyInput');

    if (closeLargeBtn) closeLargeBtn.addEventListener('click', closeLargeOverlay);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadReplyImage);
    if (shareBtn) shareBtn.addEventListener('click', shareReplyImage);
    if (colorA) colorA.addEventListener('input', applyGradient);
    if (colorB) colorB.addEventListener('input', applyGradient);

    if (replyInput) {
        replyInput.addEventListener('input', (e) => {
            const hasText = e.target.value.trim().length > 0;
            if (downloadBtn) downloadBtn.disabled = !hasText;
            if (shareBtn) shareBtn.disabled = !hasText;
        });
    }
}