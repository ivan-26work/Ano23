// ============================================================
// CONFIGURATION SUPABASE
// ============================================================
const SUPABASE_URL = 'https://waogbrxqyysibttlpoxj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhb2dicnhxeXlzaWJ0dGxwb3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjE3NzUsImV4cCI6MjA5MDczNzc3NX0.Op1DUBfefbO2RkoitXws-7cFLW1T0DJGBDh1YPDcB1w';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// VARIABLES GLOBALES
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

// Messages aléatoires pour la carte Link
const MESSAGES_ALEATOIRES = [
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
        // Vérifier la session
        const { data: { session } } = await sb.auth.getSession();
        
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }
        
        currentUser = session.user;
        currentUserEmail = currentUser.email;
        currentUserId = currentUserEmail.split('@')[0]; // ipoteivan5
        
        // Afficher les infos utilisateur dans la sidebar
        const sbUserName = document.getElementById('sbUserName');
        const sbUserUid = document.getElementById('sbUserUid');
        if (sbUserName) sbUserName.textContent = currentUserEmail;
        if (sbUserUid) sbUserUid.textContent = `@${currentUserId}`;
        
        // Charger les messages
        await loadMessages();
        
        // Écouter les nouveaux messages en temps réel
        subscribeToRealtime();
        
        // Initialiser les événements
        initEventListeners();
        
        // Générer un message aléatoire par défaut
        randomizeMessage();
        
        // Mettre à jour les stats
        updateStats();
        
    } catch (error) {
        console.error('Erreur initialisation:', error);
        showToast('❌ Erreur de chargement', 3000);
    }
});

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
        renderInbox();
        updateStats();
        
    } catch (error) {
        console.error('Erreur chargement messages:', error);
        messagesList = [];
        renderInbox();
        updateStats();
    }
}

// ============================================================
// TEMPS RÉEL - ÉCOUTE DES NOUVEAUX MESSAGES
// ============================================================
function subscribeToRealtime() {
    if (realtimeChannel) {
        try {
            sb.removeChannel(realtimeChannel);
        } catch (e) {
            console.warn('Erreur suppression canal:', e);
        }
    }
    
    try {
        realtimeChannel = sb
            .channel(`messages-${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${currentUserId}`
                },
                (payload) => {
                    if (payload.new) {
                        messagesList.unshift(payload.new);
                        renderInbox();
                        updateStats();
                        showToast('✨ Nouveau message anonyme reçu !');
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${currentUserId}`
                },
                (payload) => {
                    if (payload.new) {
                        const index = messagesList.findIndex(m => m && m.id === payload.new.id);
                        if (index !== -1) {
                            messagesList[index] = payload.new;
                            renderInbox();
                            updateStats();
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${currentUserId}`
                },
                (payload) => {
                    if (payload.old) {
                        messagesList = messagesList.filter(m => m && m.id !== payload.old.id);
                        renderInbox();
                        updateStats();
                    }
                }
            )
            .subscribe();
    } catch (error) {
        console.warn('Erreur subscription temps réel:', error);
    }
}

// ============================================================
// AFFICHAGE DE L'INBOX
// ============================================================
function renderInbox() {
    const feed = document.getElementById('inboxFeed');
    if (!feed) return;
    
    feed.innerHTML = '';
    
    if (selectMode) {
        feed.classList.add('select-mode');
    } else {
        feed.classList.remove('select-mode');
    }
    
    if (!messagesList || messagesList.length === 0) {
        feed.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text3);">📭 Aucun message pour le moment</div>';
        return;
    }
    
    messagesList.forEach(msg => {
        if (!msg) return;
        
        const card = document.createElement('div');
        card.className = `msg-card ${msg.read ? 'read' : 'unread'}`;
        
        const preview = msg.content && msg.content.length > 30 
            ? msg.content.substring(0, 30) + '…' 
            : (msg.content || 'Message vide');
        const timeAgo = msg.created_at ? formatTimeAgo(msg.created_at) : 'Date inconnue';
        
        card.innerHTML = `
            <div class="msg-check ${msg.selected ? 'on' : ''}" data-id="${msg.id}"></div>
            <div class="msg-body">
                <div class="msg-label">
                    ${!msg.read ? '<span class="animated-emoji">🔔</span>' : '📖'} Message anonyme
                </div>
                <div class="msg-preview">${!msg.read ? 'Nouveau message !' : preview}${!msg.read ? ' <span class="arrow-hint">👉</span>' : ''}</div>
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

// ============================================================
// FORMATAGE DU TEMPS
// ============================================================
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Date inconnue';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
}

// ============================================================
// MISE À JOUR DES STATS
// ============================================================
function updateStats() {
    const total = messagesList ? messagesList.length : 0;
    const unread = messagesList ? messagesList.filter(m => m && !m.read).length : 0;
    
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const monthMessages = messagesList 
        ? messagesList.filter(m => m && m.created_at && new Date(m.created_at) > monthAgo).length 
        : 0;
    
    const inboxCountEl = document.getElementById('inboxCount');
    const unreadCountEl = document.getElementById('unreadCount');
    const statTotalEl = document.getElementById('statTotal');
    const statUnreadEl = document.getElementById('statUnread');
    const statMonthEl = document.getElementById('statMonth');
    const notifDotEl = document.getElementById('notifDot');
    
    if (inboxCountEl) inboxCountEl.textContent = `${total} message${total > 1 ? 's' : ''}`;
    if (unreadCountEl) unreadCountEl.textContent = unread > 0 ? `(${unread})` : '';
    if (statTotalEl) statTotalEl.textContent = total;
    if (statUnreadEl) statUnreadEl.textContent = unread;
    if (statMonthEl) statMonthEl.textContent = monthMessages;
    if (notifDotEl) notifDotEl.style.display = unread > 0 ? 'flex' : 'none';
}

// ============================================================
// MARQUER COMME LU
// ============================================================
async function markAsRead(messageId) {
    if (!messageId) return;
    
    try {
        const { error } = await sb
            .from('messages')
            .update({ read: true })
            .eq('id', messageId);
        
        if (error) throw error;
        
        const msg = messagesList.find(m => m && m.id === messageId);
        if (msg) msg.read = true;
        
    } catch (error) {
        console.error('Erreur marquage lu:', error);
    }
}

// ============================================================
// SUPPRESSION DE MESSAGES
// ============================================================
async function deleteMessages(ids) {
    if (!ids || ids.length === 0) return;
    
    try {
        const { error } = await sb
            .from('messages')
            .delete()
            .in('id', ids);
        
        if (error) throw error;
        
        messagesList = messagesList.filter(m => !ids.includes(m.id));
        renderInbox();
        updateStats();
        showToast(`✅ ${ids.length} message${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`, 2000);
        
    } catch (error) {
        console.error('Erreur suppression:', error);
        showToast('❌ Erreur lors de la suppression', 3000);
    }
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#22c55e';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '40px';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '200';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.animation = 'fadeInUp 0.3s ease';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================================
// PETIT OVERLAY - LECTURE DU MESSAGE
// ============================================================
function openSmallOverlay(msg) {
    if (!msg) return;
    
    currentMessage = msg;
    
    if (!msg.read) {
        markAsRead(msg.id);
    }
    
    const smallIcon = document.getElementById('smallIcon');
    const smallType = document.getElementById('smallType');
    const smallTime = document.getElementById('smallTime');
    const smallText = document.getElementById('smallText');
    const overlaySmall = document.getElementById('overlaySmall');
    
    if (smallIcon) smallIcon.textContent = '💬';
    if (smallType) smallType.textContent = 'Message anonyme';
    if (smallTime) smallTime.textContent = msg.created_at ? formatTimeAgo(msg.created_at) : 'Date inconnue';
    if (smallText) smallText.textContent = msg.content || 'Message vide';
    if (overlaySmall) overlaySmall.classList.add('open');
}

// Fermeture du petit overlay
function closeSmallOverlay() {
    const overlaySmall = document.getElementById('overlaySmall');
    if (overlaySmall) overlaySmall.classList.remove('open');
}

// ============================================================
// GRAND OVERLAY - RÉPONSE
// ============================================================
function openLargeOverlay() {
    if (!currentMessage) return;
    
    const overlaySmall = document.getElementById('overlaySmall');
    const originalMsgDisplay = document.getElementById('originalMsgDisplay');
    const replyInput = document.getElementById('replyInput');
    const frameReply = document.getElementById('frameReply');
    const colorA = document.getElementById('colorA');
    const colorB = document.getElementById('colorB');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const overlayLarge = document.getElementById('overlayLarge');
    
    if (overlaySmall) overlaySmall.classList.remove('open');
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

// ============================================================
// GÉNÉRATION DU LIEN ANONYME
// ============================================================
function getAnonymousLink() {
    return `https://ivan-26work.github.io/Ano23/envoyer.html?uid=${currentUserId}`;
}

// ============================================================
// CARTE LINK - PARTAGE
// ============================================================
async function shareLinkCard() {
    const el = document.getElementById('shareCard');
    const btn = document.getElementById('shareLinkCardBtn');
    if (!el || !btn) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳…';
    btn.disabled = true;
    
    try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'ano23-share.png', { type: 'image/png' });
        const text = `📩 Envoie-moi un message anonyme !\n\n👉 ${getAnonymousLink()}`;
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: 'Ano23', text, files: [file] });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            showToast('📸 Image prête pour ton statut WhatsApp', 3000);
        }
    } catch (e) {
        console.error('Erreur partage:', e);
        showToast('❌ Erreur lors du partage', 3000);
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ============================================================
// CARTE LINK - TÉLÉCHARGEMENT
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
        const link = document.createElement('a');
        link.download = 'ano23-share.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('✅ Image téléchargée', 2000);
    } catch (e) {
        console.error('Erreur téléchargement:', e);
        showToast('❌ Erreur lors du téléchargement', 3000);
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ============================================================
// COPIER LE LIEN
// ============================================================
async function copyLink() {
    try {
        await navigator.clipboard.writeText(getAnonymousLink());
        const btn = document.getElementById('copyLinkBtn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copié !';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
        showToast('✅ Lien copié !', 2000);
    } catch (e) {
        console.error('Erreur copie:', e);
        showToast('❌ Impossible de copier le lien', 3000);
    }
}

// ============================================================
// MESSAGE ALÉATOIRE
// ============================================================
function randomizeMessage() {
    const randomIndex = Math.floor(Math.random() * MESSAGES_ALEATOIRES.length);
    const randomMessageEl = document.getElementById('randomMessage');
    if (randomMessageEl) {
        randomMessageEl.textContent = MESSAGES_ALEATOIRES[randomIndex];
    }
}

// ============================================================
// RÉPONSE - TÉLÉCHARGEMENT
// ============================================================
async function downloadReplyImage() {
    const el = document.getElementById('captureArea');
    const btn = document.getElementById('downloadBtn');
    if (!el || !btn) return;
    
    btn.innerHTML = '⏳…';
    btn.disabled = true;
    
    try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const link = document.createElement('a');
        link.download = 'ano23-reponse.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('✅ Réponse téléchargée', 2000);
    } catch (e) {
        console.error('Erreur téléchargement:', e);
        showToast('❌ Erreur lors du téléchargement', 3000);
    }
    
    btn.innerHTML = '📸 Télécharger';
    const replyInput = document.getElementById('replyInput');
    if (replyInput && replyInput.value.trim()) {
        btn.disabled = false;
    }
}

// ============================================================
// RÉPONSE - PARTAGE
// ============================================================
async function shareReplyImage() {
    const el = document.getElementById('captureArea');
    const btn = document.getElementById('shareBtn');
    if (!el || !btn) return;
    
    btn.innerHTML = '⏳…';
    btn.disabled = true;
    
    try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'ano23-reponse.png', { type: 'image/png' });
        const text = `🤔 Réponse anonyme sur Ano23\n\n👉 ${getAnonymousLink()}`;
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: 'Ano23', text, files: [file] });
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            await downloadReplyImage();
        }
    } catch (e) {
        console.error('Erreur partage:', e);
        showToast('❌ Erreur lors du partage', 3000);
    }
    
    btn.innerHTML = '📤 Envoyer';
    const replyInput = document.getElementById('replyInput');
    if (replyInput && replyInput.value.trim()) {
        btn.disabled = false;
    }
}

// ============================================================
// APPLICATION DU DÉGRADÉ
// ============================================================
function applyGradient() {
    const colorA = document.getElementById('colorA');
    const colorB = document.getElementById('colorB');
    const frameReply = document.getElementById('frameReply');
    
    if (colorA && colorB && frameReply) {
        frameReply.style.background = `linear-gradient(135deg, ${colorA.value}, ${colorB.value})`;
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
        showToast('❌ Erreur lors de la déconnexion', 3000);
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
// THÈME (CLAIR/SOMBRE)
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
        const btnInstall = document.getElementById('btnInstall');
        if (btnInstall) btnInstall.style.display = 'flex';
    });
    
    const btnInstall = document.getElementById('btnInstall');
    if (btnInstall) {
        btnInstall.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
            } else {
                showToast('Pour installer : Menu → "Ajouter à l\'écran d\'accueil"', 4000);
            }
        });
    }
}

// ============================================================
// MODE SÉLECTION INBOX
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
    if (messagesList) {
        messagesList.forEach(m => { if (m) m.selected = false; });
    }
    const btnSelect = document.getElementById('btnSelect');
    const btnConfirmDel = document.getElementById('btnConfirmDel');
    if (btnSelect) btnSelect.style.display = 'flex';
    if (btnConfirmDel) btnConfirmDel.classList.remove('show');
    renderInbox();
}

async function confirmDelete() {
    if (!messagesList) return;
    
    const selectedIds = messagesList.filter(m => m && m.selected).map(m => m.id);
    if (selectedIds.length === 0) return;
    
    if (confirm(`Supprimer ${selectedIds.length} message${selectedIds.length > 1 ? 's' : ''} ?`)) {
        await deleteMessages(selectedIds);
        exitSelectMode();
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
    initTheme();
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
    
    // Inbox sélection
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
    const colorAEl = document.getElementById('colorA');
    const colorBEl = document.getElementById('colorB');
    const replyInput = document.getElementById('replyInput');
    const overlayLarge = document.getElementById('overlayLarge');
    
    if (closeLargeBtn) closeLargeBtn.addEventListener('click', closeLargeOverlay);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadReplyImage);
    if (shareBtn) shareBtn.addEventListener('click', shareReplyImage);
    if (colorAEl) colorAEl.addEventListener('input', applyGradient);
    if (colorBEl) colorBEl.addEventListener('input', applyGradient);
    
    if (replyInput) {
        replyInput.addEventListener('input', (e) => {
            const hasText = e.target.value.trim().length > 0;
            if (downloadBtn) downloadBtn.disabled = !hasText;
            if (shareBtn) shareBtn.disabled = !hasText;
        });
    }
    
    // Avatar
    setupAvatarUpload();
    
    // PWA
    setupPWA();
}

// ============================================================
// ANIMATION CSS SUPPLÉMENTAIRE
// ============================================================
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);