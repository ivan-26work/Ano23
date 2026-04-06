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
let messagesList = [];
let selectMode = false;
let currentTab = 'link';
let currentMessage = null;
let currentReplies = [];
let realtimeChannel = null;
let swRegistration = null;
let selectedCardType = 'message';
let deferredPrompt = null;
let lastReplyText = null;

const BASE_URL = 'https://ivan-26work.github.io/Ano23';



// ============================================================
// FONCTIONS UTILITAIRES GLOBALES
// ============================================================
function showSuccessBadge() {
  let badge = document.getElementById('successBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'successBadge';
    document.body.appendChild(badge);
  }
  badge.style.opacity = '1';
  setTimeout(() => {
    badge.style.opacity = '0';
  }, 3000);
}

function showErrorToast(message) {
  let toast = document.getElementById('errorToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'errorToast';
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: #ef4444; color: white; padding: 10px 18px; border-radius: 40px;
      font-weight: 700; font-size: 13px; z-index: 200; white-space: nowrap;
      font-family: 'Playfair Display', serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      opacity: 0; transition: opacity 0.3s; pointer-events: none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

function formatTimeAgo(ts) {
  if (!ts) return 'Date inconnue';
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (msgDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function getTypeIcon(type) { 
  if (type === 'question') return '❓';
  if (type === 'discussion') return '💬';
  return '💬';
}

function getTypeLabel(type) {
  if (type === 'question') return 'Question anonyme';
  if (type === 'discussion') return 'Discussion anonyme';
  return 'Message anonyme';
}



// ============================================================
// INITIALISATION PRINCIPALE
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = 'auth.html';
      return;
    }

    currentUser = session.user;
    currentUserId = currentUser.email.split('@')[0];

    document.getElementById('sbUserName').textContent = currentUser.email;
    document.getElementById('sbUserUid').textContent = `@${currentUserId}`;

    initTheme();
    initEventListeners();
    setupAvatarUpload();
    setupScrollHandlers();
    initCardSelection();
    updateProfilePreviews();
    updateCardBackgroundWithAvatar();
    makeCardTextEditable();
    initColorGrids();

    await registerServiceWorker();
    await requestNotifPermission();

    await loadMessages();
    subscribeToRealtime();

    // Vérifier si PWA déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      const btnInstall = document.getElementById('btnInstall');
      const btnInstallPWA = document.getElementById('btnInstallPWA');
      if (btnInstall) btnInstall.style.display = 'none';
      if (btnInstallPWA) btnInstallPWA.style.display = 'none';
    }

  } catch (err) {
    console.error('Init error:', err);
  }
});



// ============================================================
// HEADER & SIDEBAR & THEME
// ============================================================
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sbBackdrop')?.classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sbBackdrop')?.classList.remove('open');
}

function switchTab(tabName) {
  if (tabName === currentTab) return;
  currentTab = tabName;

  document.querySelectorAll('.header-tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(content =>
    content.classList.toggle('active', content.id === `tab-${tabName}`));
  
  if (tabName === 'inbox') renderInbox();
}

function initTheme() {
  const saved = localStorage.getItem('ano23-theme');
  const toggle = document.getElementById('themeToggle');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (toggle) toggle.checked = true;
  }
}

function toggleTheme() {
  const isDark = document.getElementById('themeToggle')?.checked;
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ano23-theme', theme);
}

function manualRefresh() {
  showSuccessBadge();
  loadMessages();
  if (currentMessage) {
    loadReplies(currentMessage.id).then(replies => {
      currentReplies = replies;
      updateSmallOverlayReplies();
    });
  }
}

function testNotification() {
  if (Notification.permission === 'granted') {
    sendNotification('Ano23', 'test');
  } else {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        sendNotification('Ano23', 'test');
      }
    });
  }
}



// ============================================================
// AVATAR UPLOAD & PROFIL
// ============================================================
function setupAvatarUpload() {
  const input = document.getElementById('avatarInput');
  const avatar = document.getElementById('sbAvatar');
  const editBtn = document.getElementById('avatarEditBtn');
  if (!input || !avatar) return;
  
  const saved = localStorage.getItem(`ano23-avatar-${currentUserId}`);
  if (saved) avatar.innerHTML = `<img src="${saved}" alt="avatar"/>`;
  
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const src = ev.target.result;
      avatar.innerHTML = `<img src="${src}" alt="avatar"/>`;
      localStorage.setItem(`ano23-avatar-${currentUserId}`, src);
      updateProfilePreviews();
      updateCardBackgroundWithAvatar();
    };
    r.readAsDataURL(file);
  });
  editBtn?.addEventListener('click', () => input.click());
}

function updateProfilePreviews() {
  const savedAvatar = localStorage.getItem(`ano23-avatar-${currentUserId}`);
  const username = currentUserId;
  
  for (let i = 1; i <= 3; i++) {
    const avatarContainer = document.getElementById(`previewAvatar${i}`);
    const usernameSpan = document.getElementById(`previewUsername${i}`);
    if (usernameSpan) usernameSpan.textContent = username;
    if (avatarContainer && savedAvatar) {
      avatarContainer.innerHTML = `<img src="${savedAvatar}" alt="avatar">`;
    } else if (avatarContainer) {
      avatarContainer.innerHTML = '<i class="fas fa-user-circle"></i>';
    }
  }
}

function updateCardBackgroundWithAvatar() {
  const savedAvatar = localStorage.getItem(`ano23-avatar-${currentUserId}`);
  const defaultImage = "url('images/image.png')";
  let backgroundImage = defaultImage;
  if (savedAvatar) backgroundImage = `url('${savedAvatar}')`;
  
  const cards = document.querySelectorAll('.share-card');
  cards.forEach(card => {
    const oldBlur = card.querySelector('.share-card-bg-blur');
    if (oldBlur) oldBlur.remove();
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.filter = 'blur(20px)';
      ctx.drawImage(img, 0, 0);
      const blurredImageUrl = canvas.toDataURL('image/png');
      
      const blurDiv = document.createElement('div');
      blurDiv.className = 'share-card-bg-blur';
      blurDiv.style.backgroundImage = `url('${blurredImageUrl}')`;
      blurDiv.style.backgroundSize = 'cover';
      blurDiv.style.backgroundPosition = 'center';
      blurDiv.style.position = 'absolute';
      blurDiv.style.top = '0';
      blurDiv.style.left = '0';
      blurDiv.style.width = '100%';
      blurDiv.style.height = '100%';
      blurDiv.style.zIndex = '0';
      card.insertBefore(blurDiv, card.firstChild);
    };
    img.src = savedAvatar || 'images/image.png';
  });
  
  const actionsCard = document.querySelector('.actions-card');
  if (actionsCard) actionsCard.style.setProperty('--bg-image', backgroundImage);
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.style.setProperty('--bg-image', backgroundImage);
}



// ============================================================
// CARTES LINK - SÉLECTION
// ============================================================
function initCardSelection() {
  const cards = document.querySelectorAll('.share-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCard(card.getAttribute('data-card'));
    });
  });
  selectCard('message');
}

function selectCard(cardType) {
  selectedCardType = cardType;
  document.querySelectorAll('.share-card').forEach(card => {
    card.setAttribute('data-selected', card.getAttribute('data-card') === cardType);
  });
}

function getSelectedCardType() {
  return selectedCardType;
}

function getCardLink() {
  const cardType = getSelectedCardType();
  if (cardType === 'question') {
    return `${BASE_URL}/envoyer.html?uid=${currentUserId}&type=question`;
  }
  if (cardType === 'discussion') {
    return `${BASE_URL}/envoyer.html?uid=${currentUserId}&type=discussion`;
  }
  return `${BASE_URL}/envoyer.html?uid=${currentUserId}`;
}

function makeCardTextEditable() {
  document.querySelectorAll('.share-message-preview p').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const newText = prompt('Modifier le message de la carte :', el.textContent);
      if (newText && newText.trim() !== '') el.textContent = newText.trim();
    });
  });
}



// ============================================================
// ACTIONS DES CARTES LINK
// ============================================================
async function copyLink() {
  try {
    await navigator.clipboard.writeText(getCardLink());
    showSuccessBadge();
  } catch (e) { showErrorToast('Erreur copie'); }
}

async function downloadCard() {
  const cardId = `shareCard${selectedCardType.charAt(0).toUpperCase() + selectedCardType.slice(1)}`;
  const el = document.getElementById(cardId);
  if (!el) return;
  
  const btn = document.getElementById('downloadCardBtn');
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const a = document.createElement('a');
    a.download = 'ano23-card.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    showSuccessBadge();
  } catch (e) { showErrorToast('Erreur'); }
  btn.innerHTML = origHtml;
  btn.disabled = false;
}

async function shareCard() {
  const cardId = `shareCard${selectedCardType.charAt(0).toUpperCase() + selectedCardType.slice(1)}`;
  const el = document.getElementById(cardId);
  if (!el) return;
  
  const btn = document.getElementById('shareCardBtn');
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  
  try {
    const link = getCardLink();
    await navigator.clipboard.writeText(link);
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'ano23-share.png', { type: 'image/png' });
    const text = `Message pour toi ! 👉 ${link}`;

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Ano23', text: text, files: [file] });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      const a = document.createElement('a');
      a.download = 'ano23-share.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    showSuccessBadge();
  } catch (e) { showErrorToast('Erreur'); }
  btn.innerHTML = origHtml;
  btn.disabled = false;
}



// ============================================================
// COULEURS - OVERLAY
// ============================================================
function initColorGrids() {
  const pureColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#f97316'];
  const gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #ff9a9e, #fecfef)',
    'linear-gradient(135deg, #ffecd2, #fcb69f)',
    'linear-gradient(135deg, #a6c1ee, #fbc2eb)',
    'linear-gradient(135deg, #fbc2eb, #a6c1ee)'
  ];
  
  const pureGrid = document.getElementById('pureColorsGrid');
  const gradGrid = document.getElementById('gradientsGrid');
  
  if (pureGrid) {
    pureGrid.innerHTML = '';
    pureColors.forEach(color => {
      const item = document.createElement('div');
      item.className = 'color-item';
      item.style.backgroundColor = color;
      item.style.background = color;
      item.style.width = '100%';
      item.style.aspectRatio = '1 / 1';
      item.style.borderRadius = '16px';
      item.style.cursor = 'pointer';
      item.dataset.value = color;
      item.dataset.type = 'pure';
      item.addEventListener('click', () => {
        document.querySelectorAll('.color-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        window.selectedColorItem = item;
      });
      pureGrid.appendChild(item);
    });
  }
  
  if (gradGrid) {
    gradGrid.innerHTML = '';
    gradients.forEach(grad => {
      const item = document.createElement('div');
      item.className = 'color-item';
      item.style.background = grad;
      item.style.width = '100%';
      item.style.aspectRatio = '1 / 1';
      item.style.borderRadius = '16px';
      item.style.cursor = 'pointer';
      item.dataset.value = grad;
      item.dataset.type = 'gradient';
      item.addEventListener('click', () => {
        document.querySelectorAll('.color-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        window.selectedColorItem = item;
      });
      gradGrid.appendChild(item);
    });
  }
}

function openColorOverlay() {
  document.getElementById('overlayColorFixed')?.classList.add('open');
}

function closeColorOverlay() {
  document.getElementById('overlayColorFixed')?.classList.remove('open');
}

function applyColorToCard() {
  if (window.selectedColorItem) {
    const selectedCard = document.querySelector('.share-card[data-selected="true"]');
    if (selectedCard) {
      const value = window.selectedColorItem.dataset.value;
      const type = window.selectedColorItem.dataset.type;
      const oldBlur = selectedCard.querySelector('.share-card-bg-blur');
      if (oldBlur) oldBlur.remove();
      if (type === 'pure') {
        selectedCard.style.background = value;
        selectedCard.style.backgroundImage = 'none';
      } else {
        selectedCard.style.background = value;
        selectedCard.style.backgroundImage = value;
      }
    }
  }
  closeColorOverlay();
}

function resetCardColor() {
  const selectedCard = document.querySelector('.share-card[data-selected="true"]');
  if (selectedCard) updateCardBackgroundWithAvatar();
  closeColorOverlay();
}



// ============================================================
// SERVICE WORKER & NOTIFICATIONS
// ============================================================
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js');
  } catch (err) { console.warn('SW registration failed:', err); }
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  setTimeout(async () => {
    await Notification.requestPermission();
  }, 3000);
}

async function sendNotification(title, msgType) {
  const url = './index.html';
  if (swRegistration && Notification.permission === 'granted') {
    try {
      const sw = swRegistration.active || swRegistration.waiting || swRegistration.installing;
      if (sw) {
        sw.postMessage({ type: 'NEW_MESSAGE', title, msgType: msgType || 'message', url });
        return;
      }
    } catch (e) { console.warn('SW msg error:', e); }
  }
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title || 'Ano23', {
        body: 'Nouveau message anonyme',
        icon: './images/logo.png',
        badge: './images/logo.png',
        tag: 'ano23-new-message',
        renotify: true,
      });
      notif.onclick = () => { window.focus(); notif.close(); switchTab('inbox'); };
    } catch (e) { console.warn('Notif API error:', e); }
  }
}



// ============================================================
// MESSAGES ET INBOX
// ============================================================
async function loadMessages() {
  try {
    const { data, error } = await sb
      .from('messages').select('*')
      .eq('user_id', currentUserId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    messagesList = data || [];
  } catch (err) {
    console.error('loadMessages:', err);
    messagesList = [];
  }
  renderInbox();
  updateStats();
}

async function loadReplies(parentId) {
  try {
    const { data, error } = await sb
      .from('messages').select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return [];
  }
}

function renderInbox() {
  const feed = document.getElementById('inboxFeed');
  if (!feed) return;
  feed.innerHTML = '';
  feed.classList.toggle('select-mode', selectMode);

  if (!messagesList.length) {
    feed.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text3);font-size:15px;font-weight:600;">Aucun message pour le moment</div>`;
    return;
  }

  messagesList.forEach(msg => {
    const card = document.createElement('div');
    card.className = `msg-card ${msg.read ? 'read' : 'unread'}`;
    const preview = (msg.content || '').length > 30 ? msg.content.substring(0, 30) + '…' : (msg.content || 'Message vide');
    const timeAgo = formatTimeAgo(msg.created_at);
    const typeIcon = getTypeIcon(msg.type);
    const typeLabel = getTypeLabel(msg.type);

    card.innerHTML = `
      <div class="msg-check ${msg.selected ? 'on' : ''}" data-id="${msg.id}"></div>
      <div class="msg-body">
        <div class="msg-label">${!msg.read ? '🔔' : typeIcon} ${typeLabel}</div>
        <div class="msg-preview">${!msg.read ? 'Nouveau message' : preview}</div>
        <div class="msg-time">${timeAgo}</div>
      </div>
      <div class="msg-reply-indicator" id="replyIndicator-${msg.id}" style="display: none;">
        <i class="fas fa-check-circle" style="color: #0ea5e9;"></i>
      </div>
    `;

    if (selectMode) {
      card.querySelector('.msg-check').addEventListener('click', e => {
        e.stopPropagation();
        msg.selected = !msg.selected;
        renderInbox();
      });
    } else {
      card.addEventListener('click', () => openSmallOverlay(msg));
    }
    feed.appendChild(card);
    
    loadReplies(msg.id).then(replies => {
      if (replies.length > 0) {
        const indicator = document.getElementById(`replyIndicator-${msg.id}`);
        if (indicator) indicator.style.display = 'flex';
      }
    });
  });
}

function updateStats() {
  const total = messagesList.length;
  const unread = messagesList.filter(m => m && !m.read).length;
  const month1 = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthly = messagesList.filter(m => m?.created_at && new Date(m.created_at) >= month1).length;

  document.getElementById('inboxCount').textContent = `${total} message${total > 1 ? 's' : ''}`;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statUnread').textContent = unread;
  document.getElementById('statMonth').textContent = monthly;

  const badge = document.getElementById('unreadBadge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline-block' : 'none';
  }
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'flex' : 'none';
}

function subscribeToRealtime() {
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  realtimeChannel = sb
    .channel(`messages-${currentUserId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `user_id=eq.${currentUserId}`
    }, ({ new: msg }) => {
      if (!msg) return;
      if (msg.parent_id) {
        if (currentMessage && currentMessage.id === msg.parent_id) {
          loadReplies(msg.parent_id).then(replies => {
            currentReplies = replies;
            updateSmallOverlayReplies();
          });
        }
        const indicator = document.getElementById(`replyIndicator-${msg.parent_id}`);
        if (indicator) indicator.style.display = 'flex';
      } else {
        messagesList.unshift(msg);
        renderInbox();
        updateStats();
        sendNotification('Ano23', msg.type);
      }
    })
    .subscribe();
}



// ============================================================
// OVERLAY LECTURE
// ============================================================
async function openSmallOverlay(msg) {
  if (!msg) return;
  currentMessage = msg;
  if (!msg.read) await markAsRead(msg.id);
  
  currentReplies = await loadReplies(msg.id);
  
  document.getElementById('smallIcon').innerHTML = `<i class="fas fa-envelope"></i>`;
  document.getElementById('smallType').textContent = getTypeLabel(msg.type);
  document.getElementById('smallTime').textContent = formatTimeAgo(msg.created_at);
  document.getElementById('smallText').innerHTML = `
    <div class="original-message">${escapeHtml(msg.content || 'Message vide')}</div>
    <div class="replies-section">
      <div class="replies-title">Reponses :</div>
      <div id="repliesList" class="replies-list"></div>
    </div>
  `;
  
  updateSmallOverlayReplies();
  document.getElementById('overlaySmall')?.classList.add('open');
}

function closeSmallOverlay() {
  document.getElementById('overlaySmall')?.classList.remove('open');
  currentReplies = [];
}

async function markAsRead(id) {
  try {
    await sb.from('messages').update({ read: true }).eq('id', id);
    const msg = messagesList.find(m => m.id === id);
    if (msg) { msg.read = true; renderInbox(); updateStats(); }
  } catch (e) { console.error('markAsRead:', e); }
}

function updateSmallOverlayReplies() {
  const container = document.getElementById('repliesList');
  if (!container) return;
  if (!currentReplies || currentReplies.length === 0) {
    container.innerHTML = '<div class="no-replies">Aucune reponse pour le moment</div>';
    return;
  }
  container.innerHTML = currentReplies.map(reply => `
    <div class="reply-item">
      <div class="reply-content">reply: ${escapeHtml(reply.content)}</div>
      <div class="reply-time">${formatTimeAgo(reply.created_at)}</div>
    </div>
  `).join('');
}



// ============================================================
// OVERLAY RÉPONSE
// ============================================================
function openLargeOverlay() {
  if (!currentMessage) return;
  closeSmallOverlay();
  
  const selectedCard = document.querySelector('.share-card[data-selected="true"]');
  const captureArea = document.getElementById('captureArea');
  if (selectedCard && captureArea) {
    const blurDiv = selectedCard.querySelector('.share-card-bg-blur');
    if (blurDiv) {
      const bgImage = blurDiv.style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        captureArea.style.backgroundImage = bgImage;
        captureArea.style.backgroundSize = 'cover';
        captureArea.style.backgroundPosition = 'center';
      }
    } else {
      const cardBg = selectedCard.style.background;
      if (cardBg && cardBg !== 'none') captureArea.style.background = cardBg;
    }
  }
  
  document.getElementById('originalMsgDisplay').textContent = currentMessage.content || '...';
  document.getElementById('replyInput').value = '';
  document.getElementById('replyArea').style.background = 'none';
  document.getElementById('colorA').value = '#0ea5e9';
  document.getElementById('colorB').value = '#0284c7';
  document.getElementById('downloadBtn').disabled = true;
  document.getElementById('sendReplyBtn').disabled = true;
  document.getElementById('overlayLarge')?.classList.add('open');
}

function closeLargeOverlay() {
  document.getElementById('overlayLarge')?.classList.remove('open');
}

function applyGradient() {
  const a = document.getElementById('colorA')?.value;
  const b = document.getElementById('colorB')?.value;
  const replyArea = document.getElementById('replyArea');
  if (a && b && replyArea) replyArea.style.background = `linear-gradient(135deg, ${a}, ${b})`;
}

async function downloadReplyImage() {
  const el = document.getElementById('captureArea');
  const btn = document.getElementById('downloadBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const a = document.createElement('a');
    a.download = 'ano23-reponse.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    showSuccessBadge();
  } catch (e) { showErrorToast('Erreur'); }
  btn.innerHTML = orig;
  if (document.getElementById('replyInput').value.trim()) {
    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('sendReplyBtn').disabled = false;
  }
}

async function shareReplyImage() {
  const el = document.getElementById('captureArea');
  const btn = document.getElementById('sendReplyBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'ano23-reponse.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Ano23', files: [file] });
    } else {
      const a = document.createElement('a');
      a.download = 'ano23-reponse.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    showSuccessBadge();
  } catch (e) { showErrorToast('Erreur'); }
  btn.innerHTML = orig;
  btn.disabled = false;
}



// ============================================================
// ENVOI DE RÉPONSE AVEC MODALE
// ============================================================
async function sendAndConfirmReply() {
  const replyText = document.getElementById('replyInput')?.value.trim();
  if (!replyText) {
    showErrorToast('Ecris une reponse d\'abord');
    return;
  }
  
  lastReplyText = replyText;
  const btn = document.getElementById('sendReplyBtn');
  const origHtml = btn?.innerHTML;
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
  }
  
  try {
    const { error } = await sb.from('messages').insert({
      user_id: currentUserId,
      parent_id: currentMessage.id,
      content: replyText,
      type: 'reply',
      read: false,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    
    currentReplies = await loadReplies(currentMessage.id);
    updateSmallOverlayReplies();
    const indicator = document.getElementById(`replyIndicator-${currentMessage.id}`);
    if (indicator) indicator.style.display = 'flex';
    
    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('sendReplyBtn').disabled = true;
    openConfirmModal();
  } catch (err) {
    console.error(err);
    showErrorToast('Erreur');
  }
  if (btn) {
    btn.innerHTML = origHtml;
    btn.disabled = false;
  }
}

function openConfirmModal() {
  document.getElementById('modalConfirm')?.classList.add('open');
}

function closeConfirmModal() {
  document.getElementById('modalConfirm')?.classList.remove('open');
}

async function confirmKeepReply() {
  closeConfirmModal();
  showSuccessBadge();
  await shareReplyImage();
}

async function confirmCancelReply() {
  if (!currentMessage) { closeConfirmModal(); return; }
  const lastReply = currentReplies[currentReplies.length - 1];
  if (lastReply) {
    try {
      await sb.from('messages').delete().eq('id', lastReply.id);
      currentReplies = await loadReplies(currentMessage.id);
      updateSmallOverlayReplies();
      if (currentReplies.length === 0) {
        const indicator = document.getElementById(`replyIndicator-${currentMessage.id}`);
        if (indicator) indicator.style.display = 'none';
      }
      if (lastReplyText) {
        document.getElementById('replyInput').value = lastReplyText;
        lastReplyText = null;
      }
      showSuccessBadge();
    } catch (err) { showErrorToast('Erreur'); }
  }
  closeConfirmModal();
}



// ============================================================
// SÉLECTION ET SUPPRESSION DES MESSAGES
// ============================================================
function enterSelectMode() {
  selectMode = true;
  const btnSelect = document.getElementById('btnSelect');
  if (btnSelect) {
    btnSelect.innerHTML = '<i class="fas fa-trash-can"></i> Supprimer';
    btnSelect.classList.add('delete-mode');
  }
  document.getElementById('btnCancelSelect')?.classList.add('show');
  renderInbox();
}

function exitSelectMode() {
  selectMode = false;
  const btnSelect = document.getElementById('btnSelect');
  if (btnSelect) {
    btnSelect.innerHTML = '<i class="fas fa-check-square"></i> Selectionner';
    btnSelect.classList.remove('delete-mode');
  }
  document.getElementById('btnCancelSelect')?.classList.remove('show');
  messagesList.forEach(m => { if (m) m.selected = false; });
  renderInbox();
  updateStats();
}

async function confirmDelete() {
  const ids = messagesList.filter(m => m?.selected).map(m => m.id);
  if (!ids.length) { showErrorToast('Aucun message selectionne'); return; }
  if (!confirm(`Supprimer ${ids.length} message${ids.length > 1 ? 's' : ''} ?`)) return;
  try {
    const { error } = await sb.from('messages').delete().in('id', ids);
    if (error) throw error;
    messagesList = messagesList.filter(m => !ids.includes(m.id));
    showSuccessBadge();
    exitSelectMode();
    updateStats();
  } catch (e) { showErrorToast('Erreur'); }
}



// ============================================================
// LOGOUT
// ============================================================
async function logout() {
  try {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  } catch (e) { console.error('logout:', e); }
}



// ============================================================
// PWA INSTALLATION
// ============================================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btnInstall = document.getElementById('btnInstall');
  const btnInstallPWA = document.getElementById('btnInstallPWA');
  if (btnInstall) btnInstall.style.display = 'flex';
  if (btnInstallPWA) btnInstallPWA.style.display = 'flex';
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  const btnInstall = document.getElementById('btnInstall');
  const btnInstallPWA = document.getElementById('btnInstallPWA');
  if (btnInstall) btnInstall.style.display = 'none';
  if (btnInstallPWA) btnInstallPWA.style.display = 'none';
}



// ============================================================
// SCROLL HANDLERS
// ============================================================
function setupScrollHandlers() {
  const overlayLarge = document.getElementById('overlayLarge');
  const replyToolbar = document.querySelector('#overlayLarge .toolbar');
  if (overlayLarge && replyToolbar) {
    overlayLarge.addEventListener('scroll', () => {
      replyToolbar.classList.toggle('hide', overlayLarge.scrollTop > 50);
    });
  }
}



// ============================================================
// ÉCOUTEURS D'ÉVÉNEMENTS
// ============================================================
function initEventListeners() {
  document.querySelectorAll('.header-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('menuBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sbBackdrop')?.addEventListener('click', closeSidebar);
  document.getElementById('themeToggle')?.addEventListener('change', toggleTheme);
  document.getElementById('btnLogout')?.addEventListener('click', logout);
  document.getElementById('logoImgWrap')?.addEventListener('click', manualRefresh);
  document.getElementById('btnRefresh')?.addEventListener('click', () => window.location.reload());
  document.getElementById('btnTestNotif')?.addEventListener('click', testNotification);

  document.getElementById('copyLinkBtn')?.addEventListener('click', copyLink);
  document.getElementById('downloadCardBtn')?.addEventListener('click', downloadCard);
  document.getElementById('shareCardBtn')?.addEventListener('click', shareCard);
  
  document.getElementById('colorBtn')?.addEventListener('click', openColorOverlay);
  document.getElementById('colorResetBtn')?.addEventListener('click', resetCardColor);
  document.getElementById('colorOkBtn')?.addEventListener('click', applyColorToCard);

  document.getElementById('btnSelect')?.addEventListener('click', () => {
    if (selectMode) confirmDelete();
    else enterSelectMode();
  });
  document.getElementById('btnCancelSelect')?.addEventListener('click', exitSelectMode);

  document.getElementById('closeSmall')?.addEventListener('click', closeSmallOverlay);
  document.getElementById('overlaySmall')?.addEventListener('click', e => {
    if (e.target === document.getElementById('overlaySmall')) closeSmallOverlay();
  });
  document.getElementById('btnReplySmall')?.addEventListener('click', openLargeOverlay);
  
  document.getElementById('closeLargeBtn')?.addEventListener('click', closeLargeOverlay);
  document.getElementById('downloadBtn')?.addEventListener('click', downloadReplyImage);
  document.getElementById('sendReplyBtn')?.addEventListener('click', sendAndConfirmReply);
  
  document.getElementById('colorA')?.addEventListener('input', applyGradient);
  document.getElementById('colorB')?.addEventListener('input', applyGradient);
  
  document.getElementById('modalConfirmOk')?.addEventListener('click', confirmKeepReply);
  document.getElementById('modalConfirmCancel')?.addEventListener('click', confirmCancelReply);
  document.getElementById('modalConfirm')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalConfirm')) closeConfirmModal();
  });

  const replyInput = document.getElementById('replyInput');
  if (replyInput) {
    replyInput.addEventListener('input', e => {
      const has = e.target.value.trim().length > 0;
      document.getElementById('downloadBtn').disabled = !has;
      document.getElementById('sendReplyBtn').disabled = !has;
    });
  }
  
  document.getElementById('btnInstall')?.addEventListener('click', installPWA);
  document.getElementById('btnInstallPWA')?.addEventListener('click', installPWA);
}
