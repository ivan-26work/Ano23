// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL  = 'https://waogbrxqyysibttlpoxj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhb2dicnhxeXlzaWJ0dGxwb3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjE3NzUsImV4cCI6MjA5MDczNzc3NX0.Op1DUBfefbO2RkoitXws-7cFLW1T0DJGBDh1YPDcB1w';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let currentUser     = null;
let currentUserId   = null;
let messagesList    = [];
let selectMode      = false;
let currentTab      = 'link';
let currentMessage  = null;
let realtimeChannel = null;
let hasMessageShown = false;
let swRegistration  = null;

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
  "Dis-moi tout, je suis anonyme 🤫",
];

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'auth.html'; return; }

    currentUser   = session.user;
    currentUserId = currentUser.email.split('@')[0];

    setText('sbUserName', currentUser.email);
    setText('sbUserUid',  `@${currentUserId}`);

    initTheme();
    initEventListeners();
    setupAvatarUpload();
    setupDimensionSelector();
    setupOverlayDimensionSelector();
    setupScrollHandlers();
    showEnvelopeOnly();

    // Service Worker + Notifications
    await registerServiceWorker();
    await requestNotifPermission();

    // Écouter messages du SW (ouvrir inbox depuis notif)
    navigator.serviceWorker?.addEventListener('message', event => {
      if (event.data?.type === 'OPEN_INBOX') switchTab('inbox');
    });

    await loadMessages();
    subscribeToRealtime();

  } catch (err) {
    console.error('Init error:', err);
  }
});

// ============================================================
// SERVICE WORKER
// ============================================================
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    swRegistration.addEventListener('updatefound', () => {
      const nw = swRegistration.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('🔄 Mise à jour disponible — rechargez', 5000);
        }
      });
    });
  } catch (err) {
    console.warn('SW registration failed:', err);
  }
}

// ============================================================
// NOTIFICATIONS — DEMANDE PERMISSION
// ============================================================
async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  setTimeout(async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') showToast('🔔 Notifications activées !', 2500);
  }, 3000);
}

// ============================================================
// NOTIFICATIONS — ENVOYER
// 3 méthodes en cascade : SW → Notification API → In-App
// ============================================================
async function sendNotification(title, body) {
  const url = '/index.html';

  // Méthode 1 : Via Service Worker (background aussi)
  if (swRegistration && Notification.permission === 'granted') {
    try {
      const sw = swRegistration.active || swRegistration.waiting || swRegistration.installing;
      if (sw) {
        sw.postMessage({ type: 'NEW_MESSAGE', title, body, url });
        return;
      }
    } catch (e) { console.warn('SW msg error:', e); }
  }

  // Méthode 2 : Notification API directe
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body, icon: '/images/logo.png', badge: '/images/logo.png',
        tag: 'ano23-new-message', renotify: true,
      });
      notif.onclick = () => { window.focus(); notif.close(); switchTab('inbox'); };
      return;
    } catch (e) { console.warn('Notif API error:', e); }
  }

  // Méthode 3 : Notification in-app bleue
  showInAppNotif(title, body);
}

// ============================================================
// NOTIFICATION IN-APP — Fond bleu, texte noir
// ============================================================
function showInAppNotif(title, body) {
  document.querySelector('.ano23-inapp-notif')?.remove();

  const notif = document.createElement('div');
  notif.className = 'ano23-inapp-notif';
  notif.innerHTML = `
    <div style="font-size:22px;flex-shrink:0">🔔</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:800;color:#000;margin-bottom:2px">${title}</div>
      <div style="font-size:12px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${body}</div>
    </div>
    <button class="inapp-close-btn" style="background:rgba(0,0,0,0.12);border:none;border-radius:8px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;color:#000;flex-shrink:0">✕</button>
  `;

  Object.assign(notif.style, {
    position:     'fixed',
    top:          '12px',
    left:         '12px',
    right:        '12px',
    zIndex:       '999',
    background:   '#0ea5e9',
    borderRadius: '16px',
    padding:      '14px 16px',
    display:      'flex',
    alignItems:   'center',
    gap:          '12px',
    boxShadow:    '0 8px 24px rgba(14,165,233,0.45)',
    cursor:       'pointer',
    transform:    'translateY(-120px)',
    transition:   'transform 0.35s cubic-bezier(.22,1,.36,1)',
    fontFamily:   'DM Sans, sans-serif',
  });

  document.body.appendChild(notif);
  requestAnimationFrame(() => { notif.style.transform = 'translateY(0)'; });

  const dismiss = () => {
    notif.style.transform = 'translateY(-120px)';
    setTimeout(() => notif.remove(), 350);
  };

  notif.addEventListener('click', e => {
    if (!e.target.classList.contains('inapp-close-btn')) {
      switchTab('inbox');
    }
    dismiss();
  });
  notif.querySelector('.inapp-close-btn')?.addEventListener('click', e => {
    e.stopPropagation(); dismiss();
  });
  setTimeout(dismiss, 5000);
}

// ============================================================
// SWITCH TAB
// ============================================================
function switchTab(tabName) {
  if (tabName === currentTab) return;
  currentTab = tabName;

  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === `tab-${tabName}`));

  const delBtn = document.getElementById('btnDeleteHeader');
  if (delBtn) delBtn.classList.toggle('show', tabName === 'inbox');
  if (tabName === 'inbox') renderInbox();
}

// ============================================================
// ENVELOPPE / MESSAGE
// ============================================================
function showEnvelopeOnly() {
  const env = document.getElementById('animatedEnvelope');
  const msg = document.getElementById('randomMessageContainer');
  if (env) env.style.display = 'flex';
  if (msg) msg.style.display = 'none';
}

function showBoth() {
  const env = document.getElementById('animatedEnvelope');
  const msg = document.getElementById('randomMessageContainer');
  if (env) env.style.display = 'flex';
  if (msg) msg.style.display = 'flex';
}

function randomizeMessage() {
  const el = document.getElementById('randomMessage');
  if (el) el.textContent = MESSAGES_ALEATOIRES[Math.floor(Math.random() * MESSAGES_ALEATOIRES.length)];
  showBoth();
  hasMessageShown = true;
}

// ============================================================
// SCROLL HANDLERS
// ============================================================
function setupScrollHandlers() {
  const scrollArea  = document.querySelector('.scroll-area');
  const linkFooter  = document.querySelector('.link-footer');
  const replyToolbar = document.querySelector('#overlayLarge .toolbar');

  if (scrollArea && linkFooter) {
    let lastY = 0;
    scrollArea.addEventListener('scroll', () => {
      const y = scrollArea.scrollTop;
      linkFooter.classList.toggle('hide', y > lastY && y > 50);
      lastY = y;
    }, { passive: true });
  }
  const overlayLarge = document.getElementById('overlayLarge');
  if (overlayLarge && replyToolbar) {
    overlayLarge.addEventListener('scroll', () => {
      replyToolbar.classList.toggle('hide', overlayLarge.scrollTop > 50);
    }, { passive: true });
  }
}

// ============================================================
// DIMENSION SELECTORS
// ============================================================
function setupDimensionSelector() {
  const select    = document.getElementById('dimensionSelect');
  const shareCard = document.querySelector('.share-card');
  if (select && shareCard) {
    select.addEventListener('change', e => { shareCard.style.aspectRatio = e.target.value; });
  }
}

function setupOverlayDimensionSelector() {
  const tc = document.querySelector('#overlayLarge .toolbar-content');
  if (!tc || document.getElementById('dimensionSelectOverlay')) return;
  const select = document.createElement('select');
  select.id = 'dimensionSelectOverlay';
  select.className = 'dimension-select-overlay';
  select.innerHTML = `
    <option value="400">📱 Petit (400px)</option>
    <option value="440">📱 (440px)</option>
    <option value="480" selected>📱 Standard (480px)</option>
    <option value="520">📱 Large (520px)</option>
    <option value="560">📱 (560px)</option>
    <option value="600">🖥️ Très large (600px)</option>
  `;
  select.addEventListener('change', e => {
    const area = document.getElementById('captureArea');
    if (area) { area.style.maxWidth = e.target.value + 'px'; area.style.margin = '0 auto'; }
  });
  tc.appendChild(select);
}

// ============================================================
// CHARGEMENT MESSAGES
// ============================================================
async function loadMessages() {
  try {
    const { data, error } = await sb
      .from('messages').select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    messagesList = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('loadMessages:', err);
    messagesList = [];
  }
  renderInbox();
  updateStats();
}

// ============================================================
// REALTIME + NOTIFICATION
// ============================================================
function subscribeToRealtime() {
  if (realtimeChannel) { try { sb.removeChannel(realtimeChannel); } catch (e) {} }

  try {
    realtimeChannel = sb
      .channel(`messages-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `user_id=eq.${currentUserId}`
      }, ({ new: msg }) => {
        if (!msg) return;
        messagesList.unshift(msg);
        renderInbox(); updateStats();
        // 🔔 Notification
        sendNotification(
          `📩 Nouveau ${getTypeLabel(msg.type)} — Ano23`,
          (msg.content || '').substring(0, 60) || 'Tu as reçu un message anonyme !'
        );
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `user_id=eq.${currentUserId}`
      }, ({ new: msg }) => {
        if (!msg) return;
        const i = messagesList.findIndex(m => m.id === msg.id);
        if (i !== -1) { messagesList[i] = msg; renderInbox(); updateStats(); }
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: `user_id=eq.${currentUserId}`
      }, ({ old: msg }) => {
        if (!msg) return;
        messagesList = messagesList.filter(m => m.id !== msg.id);
        renderInbox(); updateStats();
      })
      .subscribe();
  } catch (err) { console.warn('Realtime error:', err); }
}

// ============================================================
// RENDER INBOX
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

    const preview   = (msg.content || '').length > 30 ? msg.content.substring(0, 30) + '…' : (msg.content || 'Message vide');
    const timeAgo   = formatTimeAgo(msg.created_at);
    const typeIcon  = getTypeIcon(msg.type);
    const typeLabel = getTypeLabel(msg.type);

    card.innerHTML = `
      <div class="msg-check ${msg.selected ? 'on' : ''}" data-id="${msg.id}"></div>
      <div class="msg-body">
        <div class="msg-label">${!msg.read ? '<span class="animated-emoji">🔔</span>' : typeIcon} ${typeLabel}</div>
        <div class="msg-preview">${!msg.read ? 'Nouveau message ! <span class="arrow-hint">👉</span>' : preview}</div>
        <div class="msg-time">${timeAgo}</div>
      </div>
    `;

    if (selectMode) {
      card.querySelector('.msg-check').addEventListener('click', e => {
        e.stopPropagation(); msg.selected = !msg.selected; renderInbox();
      });
    } else {
      card.addEventListener('click', () => openSmallOverlay(msg));
    }
    feed.appendChild(card);
  });
}

// ============================================================
// HELPERS
// ============================================================
function getTypeIcon(type)  { return type === 'question' ? '❓' : type === 'secret' ? '🤫' : '💬'; }
function getTypeLabel(type) { return type === 'question' ? 'Question anonyme' : type === 'secret' ? 'Secret' : 'Message anonyme'; }
function setText(id, val)   { const el = document.getElementById(id); if (el) el.textContent = val; }

function formatTimeAgo(ts) {
  if (!ts) return 'Date inconnue';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000)     return 'À l\'instant';
  if (diff < 3600000)   return `Il y a ${Math.floor(diff/60000)} min`;
  if (diff < 86400000)  return `Il y a ${Math.floor(diff/3600000)}h`;
  if (diff < 604800000) return `Il y a ${Math.floor(diff/86400000)}j`;
  return new Date(ts).toLocaleDateString('fr-FR');
}

function updateStats() {
  const total   = messagesList.length;
  const unread  = messagesList.filter(m => m && !m.read).length;
  const month1  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthly = messagesList.filter(m => m?.created_at && new Date(m.created_at) >= month1).length;

  setText('inboxCount',  `${total} message${total > 1 ? 's' : ''}`);
  setText('unreadCount', unread > 0 ? `(${unread})` : '');
  setText('statTotal',   total);
  setText('statUnread',  unread);
  setText('statMonth',   monthly);

  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'flex' : 'none';
}

function getAnonymousLink() {
  return `https://ivan-26work.github.io/Ano23/envoyer.html?uid=${currentUserId}`;
}

// ============================================================
// CARTE LINK
// ============================================================
async function shareLinkCard() {
  const el = document.getElementById('shareCard');
  const btn = document.getElementById('shareLinkCardBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳…'; btn.disabled = true;
  try {
    const link = getAnonymousLink();
    await navigator.clipboard.writeText(link);
    const canvas = await html2canvas(el, { scale:2, backgroundColor:null, useCORS:true });
    const blob   = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file   = new File([blob], 'ano23-share.png', { type:'image/png' });
    const message = `📩 Message anonyme pour moi !\n\n📎 Ajoute cette image à ton statut\n🔗 Lien copié ! Colle-le dans la légende\n\nMerci ! 🙏`;
    if (navigator.share && navigator.canShare?.({ files:[file] })) {
      await navigator.share({ title:'Ano23', text:message, files:[file] });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      const a = document.createElement('a'); a.download = 'ano23-share.png'; a.href = canvas.toDataURL('image/png'); a.click();
    }
  } catch (e) { console.error('shareLinkCard:', e); }
  btn.innerHTML = orig; btn.disabled = false;
}

async function downloadLinkCard() {
  const el = document.getElementById('shareCard');
  const btn = document.getElementById('downloadLinkCardBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳…'; btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale:2, backgroundColor:null, useCORS:true });
    const a = document.createElement('a'); a.download = 'ano23-share.png'; a.href = canvas.toDataURL('image/png'); a.click();
  } catch (e) { console.error('downloadLinkCard:', e); }
  btn.innerHTML = orig; btn.disabled = false;
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(getAnonymousLink());
    const btn = document.getElementById('copyLinkBtn');
    if (btn) { const orig = btn.innerHTML; btn.innerHTML = '✅ Copié !'; setTimeout(() => btn.innerHTML = orig, 2000); }
    showToast('✅ Lien copié !', 2000);
  } catch (e) { console.error('copyLink:', e); }
}

// ============================================================
// OVERLAYS
// ============================================================
function openSmallOverlay(msg) {
  if (!msg) return;
  currentMessage = msg;
  if (!msg.read) markAsRead(msg.id);
  setText('smallIcon', getTypeIcon(msg.type));
  setText('smallType', getTypeLabel(msg.type));
  setText('smallTime', formatTimeAgo(msg.created_at));
  setText('smallText', msg.content || 'Message vide');
  document.getElementById('overlaySmall')?.classList.add('open');
}
function closeSmallOverlay() { document.getElementById('overlaySmall')?.classList.remove('open'); }

async function markAsRead(id) {
  try {
    await sb.from('messages').update({ read:true }).eq('id', id);
    const msg = messagesList.find(m => m.id === id);
    if (msg) { msg.read = true; renderInbox(); updateStats(); }
  } catch (e) { console.error('markAsRead:', e); }
}

function openLargeOverlay() {
  if (!currentMessage) return;
  closeSmallOverlay();
  setText('originalMsgDisplay', currentMessage.content || '...');
  const ri = document.getElementById('replyInput'); if (ri) ri.value = '';
  const fr = document.getElementById('frameReply'); if (fr) fr.style.background = 'none';
  const ca = document.getElementById('colorA'); if (ca) ca.value = '#0ea5e9';
  const cb = document.getElementById('colorB'); if (cb) cb.value = '#0284c7';
  const dl = document.getElementById('downloadBtn'); if (dl) dl.disabled = true;
  const sh = document.getElementById('shareBtn');    if (sh) sh.disabled = true;
  document.getElementById('overlayLarge')?.classList.add('open');
}
function closeLargeOverlay() { document.getElementById('overlayLarge')?.classList.remove('open'); }

function applyGradient() {
  const a = document.getElementById('colorA')?.value;
  const b = document.getElementById('colorB')?.value;
  const fr = document.getElementById('frameReply');
  if (a && b && fr) fr.style.background = `linear-gradient(135deg,${a},${b})`;
}

async function downloadReplyImage() {
  const el = document.getElementById('captureArea');
  const btn = document.getElementById('downloadBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML; btn.innerHTML = '⏳…'; btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale:2, backgroundColor:null, useCORS:true });
    const a = document.createElement('a'); a.download = 'ano23-reponse.png'; a.href = canvas.toDataURL('image/png'); a.click();
  } catch (e) { console.error('downloadReplyImage:', e); }
  btn.innerHTML = orig;
  const ri = document.getElementById('replyInput');
  if (ri?.value.trim()) btn.disabled = false;
}

async function shareReplyImage() {
  const el = document.getElementById('captureArea');
  const btn = document.getElementById('shareBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML; btn.innerHTML = '⏳…'; btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale:2, backgroundColor:null, useCORS:true });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'ano23-reponse.png', { type:'image/png' });
    const text = `🤔 Réponse anonyme sur Ano23\n\n👉 ${getAnonymousLink()}`;
    if (navigator.share && navigator.canShare?.({ files:[file] })) {
      await navigator.share({ title:'Ano23', text, files:[file] });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      await downloadReplyImage();
    }
  } catch (e) { console.error('shareReplyImage:', e); }
  btn.innerHTML = orig;
  const ri = document.getElementById('replyInput');
  if (ri?.value.trim()) btn.disabled = false;
}

// ============================================================
// SÉLECTION / SUPPRESSION
// ============================================================
function enterSelectMode() {
  selectMode = true;
  const bs = document.getElementById('btnSelect');
  const bc = document.getElementById('btnConfirmDel');
  if (bs) bs.style.display = 'none';
  if (bc) bc.classList.add('show');
  renderInbox();
}

function exitSelectMode() {
  selectMode = false;
  messagesList.forEach(m => { if (m) m.selected = false; });
  const bs = document.getElementById('btnSelect');
  const bc = document.getElementById('btnConfirmDel');
  if (bs) bs.style.display = 'flex';
  if (bc) bc.classList.remove('show');
  renderInbox();
}

async function confirmDelete() {
  const ids = messagesList.filter(m => m?.selected).map(m => m.id);
  if (!ids.length) return;
  if (!confirm(`Supprimer ${ids.length} message${ids.length > 1 ? 's' : ''} ?`)) return;
  try {
    const { error } = await sb.from('messages').delete().in('id', ids);
    if (error) throw error;
    messagesList = messagesList.filter(m => !ids.includes(m.id));
    showToast(`✅ ${ids.length} message${ids.length > 1 ? 's supprimés' : ' supprimé'}`, 2000);
  } catch (e) { console.error('confirmDelete:', e); }
  exitSelectMode(); updateStats();
}

// ============================================================
// SIDEBAR / THÈME / AVATAR / LOGOUT
// ============================================================
function openSidebar()  { document.getElementById('sidebar')?.classList.add('open'); document.getElementById('sbBackdrop')?.classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('sbBackdrop')?.classList.remove('open'); }

function initTheme() {
  const saved = localStorage.getItem('ano23-theme');
  const toggle = document.getElementById('themeToggle');
  if (saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); if (toggle) toggle.checked = true; }
}
function toggleTheme() {
  const isDark = document.getElementById('themeToggle')?.checked;
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ano23-theme', theme);
}

function setupAvatarUpload() {
  const input   = document.getElementById('avatarInput');
  const avatar  = document.getElementById('sbAvatar');
  const editBtn = document.getElementById('avatarEditBtn');
  if (!input || !avatar) return;
  const saved = localStorage.getItem(`ano23-avatar-${currentUserId}`);
  if (saved) avatar.innerHTML = `<img src="${saved}" alt="avatar"/>`;
  input.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => { const src = ev.target.result; avatar.innerHTML = `<img src="${src}" alt="avatar"/>`; localStorage.setItem(`ano23-avatar-${currentUserId}`, src); };
    r.readAsDataURL(file);
  });
  editBtn?.addEventListener('click', () => input.click());
}

async function logout() {
  try { await sb.auth.signOut(); window.location.href = 'auth.html'; }
  catch (e) { console.error('logout:', e); }
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, duration = 3000) {
  document.querySelector('.ano23-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'ano23-toast';
  Object.assign(toast.style, {
    position:'fixed', bottom:'24px', left:'50%',
    transform:'translateX(-50%) translateY(20px)',
    background:'#22c55e', color:'white', padding:'11px 20px',
    borderRadius:'40px', fontWeight:'700', fontSize:'13px',
    zIndex:'150', boxShadow:'0 4px 16px rgba(0,0,0,.2)',
    whiteSpace:'nowrap', transition:'opacity .3s,transform .3s',
    opacity:'0', fontFamily:'DM Sans,sans-serif',
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function initEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.getElementById('menuBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sbBackdrop')?.addEventListener('click', closeSidebar);
  document.getElementById('themeToggle')?.addEventListener('change', toggleTheme);
  document.getElementById('btnLogout')?.addEventListener('click', logout);
  document.getElementById('shareLinkCardBtn')?.addEventListener('click', shareLinkCard);
  document.getElementById('downloadLinkCardBtn')?.addEventListener('click', downloadLinkCard);
  document.getElementById('copyLinkBtn')?.addEventListener('click', copyLink);
  document.getElementById('diceBtn')?.addEventListener('click', randomizeMessage);
  document.getElementById('btnDeleteHeader')?.addEventListener('click', enterSelectMode);
  document.getElementById('btnSelect')?.addEventListener('click', enterSelectMode);
  document.getElementById('btnConfirmDel')?.addEventListener('click', confirmDelete);
  document.getElementById('closeSmall')?.addEventListener('click', closeSmallOverlay);
  document.getElementById('overlaySmall')?.addEventListener('click', e => {
    if (e.target === document.getElementById('overlaySmall')) closeSmallOverlay();
  });
  document.getElementById('btnReplySmall')?.addEventListener('click', openLargeOverlay);
  document.getElementById('closeLargeBtn')?.addEventListener('click', closeLargeOverlay);
  document.getElementById('downloadBtn')?.addEventListener('click', downloadReplyImage);
  document.getElementById('shareBtn')?.addEventListener('click', shareReplyImage);
  document.getElementById('colorA')?.addEventListener('input', applyGradient);
  document.getElementById('colorB')?.addEventListener('input', applyGradient);
  document.getElementById('replyInput')?.addEventListener('input', e => {
    const has = e.target.value.trim().length > 0;
    const dl = document.getElementById('downloadBtn'); if (dl) dl.disabled = !has;
    const sh = document.getElementById('shareBtn');    if (sh) sh.disabled = !has;
  });
}
