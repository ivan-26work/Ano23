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
let currentChatMessage = null;
let realtimeChannel = null;
let hasMessageShown = false;
let swRegistration = null;
let selectedCardType = 'message';

const BASE_URL = 'https://ivan-26work.github.io/Ano23';



// ============================================================
// MESSAGES ALÉATOIRES PAR TYPE DE CARTE
// ============================================================
const MESSAGES_ALEATOIRES = {
  message: [
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
  ],
  question: [
    "C'est quoi ton rêve le plus fou ? 🌟",
    "Si tu pouvais changer une chose dans ta vie, ce serait quoi ?",
    "Quel est ton plus grand secret ? 🤫",
    "Qu'est-ce qui te rend vraiment heureux(se) ? 😊",
    "Si tu pouvais vivre n'importe où, où serais-tu ?",
    "Quelle est la chose dont tu es le plus fier(e) ? 🏆",
    "As-tu un modèle ? 🌟",
    "Quel est ton plus grand regret ? 💭",
    "Que ferais-tu avec 1 million d'euros ? 💰",
    "Quel est ton plus beau souvenir ? 📸",
  ],
  discussion: [
    "Salut ! On discute ? 👋",
    "Quoi de neuf aujourd'hui ? 😊",
    "Comment tu te sens en ce moment ? 💭",
    "Raconte-moi ta journée ! 📅",
    "Tu penses à quoi en ce moment ? 🤔",
    "Un sujet qui te passionne ? 🔥",
    "Si on parlait de tout et de rien ? 💬",
    "Ton avis m'intéresse vraiment ! 🎯",
    "Dis-moi ce qui te rend heureux(se) ✨",
    "On a le temps de discuter ? ⏰",
  ]
};



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
    currentUserId = currentUser.email.split('@')[0];

    setText('sbUserName', currentUser.email);
    setText('sbUserUid', `@${currentUserId}`);

    initTheme();
    initEventListeners();
    setupAvatarUpload();
    setupScrollHandlers();
    initCardSelection();

    await registerServiceWorker();
    await requestNotifPermission();

    navigator.serviceWorker?.addEventListener('message', event => {
      if (event.data?.type === 'OPEN_INBOX') switchTab('inbox');
    });

    await loadMessages();
    subscribeToRealtime();

    const btnSendAnonymous = document.getElementById('btnSendAnonymous');
    if (btnSendAnonymous) {
      btnSendAnonymous.addEventListener('click', () => {
        window.open(`${BASE_URL}/sendmess.html`, '_blank');
      });
    }

  } catch (err) {
    console.error('Init error:', err);
  }
});



// ============================================================
// SÉLECTION DES CARTES (LINK)
// ============================================================
function initCardSelection() {
  const cards = document.querySelectorAll('.share-card');
  
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardType = card.getAttribute('data-card');
      selectCard(cardType);
    });
  });
  
  selectCard('message');
}

function selectCard(cardType) {
  selectedCardType = cardType;
  
  document.querySelectorAll('.share-card').forEach(card => {
    const isSelected = card.getAttribute('data-card') === cardType;
    card.setAttribute('data-selected', isSelected);
  });
}

function getSelectedCardType() {
  return selectedCardType;
}

function getCardLink() {
  const cardType = getSelectedCardType();
  if (cardType === 'discussion') {
    return `${BASE_URL}/live-chat.html?uid=${currentUserId}`;
  }
  if (cardType === 'question') {
    return `${BASE_URL}/envoyer.html?uid=${currentUserId}&type=question`;
  }
  return `${BASE_URL}/envoyer.html?uid=${currentUserId}`;
}



// ============================================================
// SERVICE WORKER
// ============================================================
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js');
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
// NOTIFICATIONS
// ============================================================
async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  setTimeout(async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') showToast('🔔 Notifications activées !', 2500);
  }, 3000);
}

async function sendNotification(title, body) {
  const url = './index.html';

  if (swRegistration && Notification.permission === 'granted') {
    try {
      const sw = swRegistration.active || swRegistration.waiting || swRegistration.installing;
      if (sw) {
        sw.postMessage({ type: 'NEW_MESSAGE', title, body, url });
        return;
      }
    } catch (e) { console.warn('SW msg error:', e); }
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body, icon: './images/logo.png', badge: './images/logo.png',
        tag: 'ano23-new-message', renotify: true,
      });
      notif.onclick = () => { window.focus(); notif.close(); switchTab('inbox'); };
      return;
    } catch (e) { console.warn('Notif API error:', e); }
  }

  showInAppNotif(title, body);
}

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
    <button class="inapp-close-btn">✕</button>
  `;

  Object.assign(notif.style, {
    position: 'fixed', top: '12px', left: '12px', right: '12px',
    zIndex: '999', background: '#0ea5e9', borderRadius: '16px',
    padding: '14px 16px', display: 'flex', alignItems: 'center',
    gap: '12px', boxShadow: '0 8px 24px rgba(14,165,233,0.45)',
    cursor: 'pointer', transform: 'translateY(-120px)',
    transition: 'transform 0.35s cubic-bezier(.22,1,.36,1)',
    fontFamily: 'DM Sans, sans-serif',
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

  document.querySelectorAll('.header-tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(content =>
    content.classList.toggle('active', content.id === `tab-${tabName}`));

  const linkFooter = document.getElementById('linkFooter');
  if (linkFooter) {
    linkFooter.style.display = tabName === 'inbox' ? 'none' : 'flex';
  }
  
  if (tabName === 'inbox') renderInbox();
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
    }, { passive: true });
  }
}



// ============================================================
// CHARGEMENT DES MESSAGES
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
// REALTIME + NOTIFICATIONS
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
        sendNotification(
          `📩 Nouveau message — Ano23`,
          `💬 Tu as reçu un nouveau message anonyme`
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
// RENDER INBOX (AFFICHAGE DES MESSAGES)
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

    const preview = (msg.content || '').length > 30 ? msg.content.substring(0, 30) + '…' : (msg.content || 'Message vide');
    const timeAgo = formatTimeAgo(msg.created_at);
    const typeIcon = getTypeIcon(msg.type);
    const typeLabel = getTypeLabel(msg.type);

    const showChatButton = msg.is_chat === true && msg.sender_id;
    
    let messageHtml = `
      <div class="msg-check ${msg.selected ? 'on' : ''}" data-id="${msg.id}"></div>
      <div class="msg-body">
        <div class="msg-label">${!msg.read ? '<span class="animated-emoji">🔔</span>' : typeIcon} ${typeLabel}</div>
        <div class="msg-preview">${!msg.read ? 'Nouveau message ! <span class="arrow-hint">👉</span>' : preview}</div>
        <div class="msg-time">${timeAgo}</div>
      </div>
    `;
    
    if (showChatButton) {
      messageHtml += `
        <div class="msg-actions">
          <button class="msg-chat-btn" data-id="${msg.id}" data-sender="${msg.sender_id}" data-content="${encodeURIComponent(msg.content)}" data-type="${msg.type}">
            <i class="fas fa-comment-dots"></i> Chat
          </button>
        </div>
      `;
    }
    
    card.innerHTML = messageHtml;

    if (selectMode) {
      card.querySelector('.msg-check').addEventListener('click', e => {
        e.stopPropagation(); msg.selected = !msg.selected; renderInbox();
      });
    } else {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.msg-chat-btn')) {
          openSmallOverlay(msg);
        }
      });
    }
    feed.appendChild(card);
  });

  document.querySelectorAll('.msg-chat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const senderId = btn.getAttribute('data-sender');
      const content = decodeURIComponent(btn.getAttribute('data-content') || '');
      const type = btn.getAttribute('data-type');
      openChatOverlay({ id, user_id: senderId, sender_id: senderId, content, type, is_chat: true });
    });
  });
}



// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================
function getTypeIcon(type) { 
  if (type === 'question') return '❓';
  if (type === 'discussion') return '💬';
  if (type === 'secret') return '🤫';
  return '💬';
}

function getTypeLabel(type) {
  if (type === 'question') return 'Question anonyme';
  if (type === 'discussion') return 'Discussion anonyme';
  if (type === 'secret') return 'Secret';
  return 'Message anonyme';
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function formatTimeAgo(ts) {
  if (!ts) return 'Date inconnue';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)}j`;
  return new Date(ts).toLocaleDateString('fr-FR');
}

function updateStats() {
  const total = messagesList.length;
  const unread = messagesList.filter(m => m && !m.read).length;
  const month1 = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthly = messagesList.filter(m => m?.created_at && new Date(m.created_at) >= month1).length;

  setText('inboxCount', `${total} message${total > 1 ? 's' : ''}`);
  setText('statTotal', total);
  setText('statUnread', unread);
  setText('statMonth', monthly);

  const badge = document.getElementById('unreadBadge');
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = unread > 0 ? 'flex' : 'none';
}

function getAnonymousLink(cardType = null) {
  const type = cardType || selectedCardType;
  if (type === 'discussion') {
    return `${BASE_URL}/live-chat.html?uid=${currentUserId}`;
  }
  if (type === 'question') {
    return `${BASE_URL}/envoyer.html?uid=${currentUserId}&type=question`;
  }
  return `${BASE_URL}/envoyer.html?uid=${currentUserId}`;
}



// ============================================================
// CARTES LINK (PARTAGER, TÉLÉCHARGER, COPIER, DÉ)
// ============================================================
async function shareLinkCard() {
  const cardType = getSelectedCardType();
  const cardId = `shareCard${cardType.charAt(0).toUpperCase() + cardType.slice(1)}`;
  const el = document.getElementById(cardId);
  const btn = document.getElementById('shareLinkCardBtn');
  
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    const link = getAnonymousLink(cardType);
    await navigator.clipboard.writeText(link);
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'ano23-share.png', { type: 'image/png' });
    const text = `📩 ${getCardTitle(cardType)}\n\n👉 ${link}`;

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Ano23', text: text, files: [file] });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      const a = document.createElement('a');
      a.download = 'ano23-share.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
    showToast('✅ Lien copié et image prête !', 2000);
  } catch (e) {
    console.error('shareLinkCard:', e);
    showToast(`❌ Erreur: ${e.message}`, 3000);
  }
  btn.innerHTML = orig;
  btn.disabled = false;
}

function getCardTitle(cardType) {
  const titles = {
    message: 'Message anonyme pour moi',
    question: 'Question anonyme pour moi',
    discussion: 'Discussion anonyme'
  };
  return titles[cardType] || 'Message anonyme';
}

async function downloadLinkCard() {
  const cardType = getSelectedCardType();
  const cardId = `shareCard${cardType.charAt(0).toUpperCase() + cardType.slice(1)}`;
  const el = document.getElementById(cardId);
  const btn = document.getElementById('downloadLinkCardBtn');
  
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const a = document.createElement('a');
    a.download = 'ano23-share.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('✅ Image téléchargée', 2000);
  } catch (e) {
    console.error('downloadLinkCard:', e);
    showToast(`❌ Erreur: ${e.message}`, 3000);
  }
  btn.innerHTML = orig;
  btn.disabled = false;
}

async function copyLink() {
  const cardType = getSelectedCardType();
  try {
    await navigator.clipboard.writeText(getAnonymousLink(cardType));
    const btn = document.getElementById('copyLinkBtn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => btn.innerHTML = orig, 2000);
    }
    showToast('✅ Lien copié !', 2000);
  } catch (e) {
    console.error('copyLink:', e);
    showToast('❌ Erreur copie', 2000);
  }
}

function randomizeMessage() {
  const cardType = getSelectedCardType();
  const messages = MESSAGES_ALEATOIRES[cardType] || MESSAGES_ALEATOIRES.message;
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  
  const cardId = `shareCard${cardType.charAt(0).toUpperCase() + cardType.slice(1)}`;
  const card = document.getElementById(cardId);
  if (card) {
    const msgContainer = card.querySelector('.share-message');
    if (msgContainer) {
      msgContainer.innerHTML = `
        <div class="animated-message">
          <p>✨ ${randomMsg} ✨</p>
        </div>
      `;
    }
  }
}



// ============================================================
// OVERLAY LECTURE (PETIT)
// ============================================================
function openSmallOverlay(msg) {
  if (!msg) return;
  currentMessage = msg;
  if (!msg.read) markAsRead(msg.id);
  
  const icon = document.getElementById('smallIcon');
  const typeLabel = document.getElementById('smallType');
  const timeDisplay = document.getElementById('smallTime');
  const textDisplay = document.getElementById('smallText');
  
  if (icon) icon.innerHTML = `<i class="fas ${getIconClass(msg.type)}"></i>`;
  if (typeLabel) typeLabel.textContent = getTypeLabel(msg.type);
  if (timeDisplay) timeDisplay.textContent = formatTimeAgo(msg.created_at);
  if (textDisplay) textDisplay.textContent = msg.content || 'Message vide';
  
  document.getElementById('overlaySmall')?.classList.add('open');
}

function getIconClass(type) {
  if (type === 'question') return 'fa-question-circle';
  if (type === 'discussion') return 'fa-comments';
  if (type === 'secret') return 'fa-lock';
  return 'fa-envelope';
}

function closeSmallOverlay() {
  document.getElementById('overlaySmall')?.classList.remove('open');
}

async function markAsRead(id) {
  try {
    await sb.from('messages').update({ read: true }).eq('id', id);
    const msg = messagesList.find(m => m.id === id);
    if (msg) { msg.read = true; renderInbox(); updateStats(); }
  } catch (e) { console.error('markAsRead:', e); }
}



// ============================================================
// OVERLAY RÉPONSE (GRAND AVEC IMAGE)
// ============================================================
function openLargeOverlay() {
  if (!currentMessage) return;
  closeSmallOverlay();
  setText('originalMsgDisplay', currentMessage.content || '...');
  const ri = document.getElementById('replyInput');
  if (ri) ri.value = '';
  const fr = document.getElementById('frameReply');
  if (fr) fr.style.background = 'none';
  const ca = document.getElementById('colorA');
  if (ca) ca.value = '#0ea5e9';
  const cb = document.getElementById('colorB');
  if (cb) cb.value = '#0284c7';
  const dl = document.getElementById('downloadBtn');
  if (dl) dl.disabled = true;
  const sh = document.getElementById('shareBtn');
  if (sh) sh.disabled = true;
  document.getElementById('overlayLarge')?.classList.add('open');
}

function closeLargeOverlay() {
  document.getElementById('overlayLarge')?.classList.remove('open');
}

function applyGradient() {
  const a = document.getElementById('colorA')?.value;
  const b = document.getElementById('colorB')?.value;
  const fr = document.getElementById('frameReply');
  if (a && b && fr) fr.style.background = `linear-gradient(135deg, ${a}, ${b})`;
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
    showToast('✅ Image téléchargée', 2000);
  } catch (e) {
    console.error('downloadReplyImage:', e);
    showToast(`❌ Erreur: ${e.message}`, 3000);
  }
  btn.innerHTML = orig;
  const ri = document.getElementById('replyInput');
  if (ri?.value.trim()) btn.disabled = false;
}

async function shareReplyImage() {
  const el = document.getElementById('captureArea');
  const btn = document.getElementById('shareBtn');
  if (!el || !btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: false });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'ano23-reponse.png', { type: 'image/png' });
    const text = `🤔 Réponse anonyme sur Ano23\n\n👉 ${getAnonymousLink()}`;

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Ano23', text: text, files: [file] });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      await downloadReplyImage();
    }
  } catch (e) {
    console.error('shareReplyImage:', e);
    showToast(`❌ Erreur: ${e.message}`, 3000);
  }
  btn.innerHTML = orig;
  const ri = document.getElementById('replyInput');
  if (ri?.value.trim()) btn.disabled = false;
}



// ============================================================
// OVERLAY CHAT (RÉPONSE RAPIDE)
// ============================================================
async function openChatOverlay(msg) {
  if (!msg.sender_id) {
    document.getElementById('overlayChatError')?.classList.add('open');
    return;
  }
  
  currentChatMessage = msg;
  const overlay = document.getElementById('overlayChat');
  const textarea = document.getElementById('chatReplyInput');
  if (textarea) textarea.value = '';
  if (overlay) overlay.classList.add('open');
}

function closeChatOverlay() {
  const overlay = document.getElementById('overlayChat');
  if (overlay) overlay.classList.remove('open');
  currentChatMessage = null;
}

async function sendChatMessage() {
  const textarea = document.getElementById('chatReplyInput');
  const message = textarea?.value.trim();
  
  if (!message) {
    showToast('✏️ Écris un message d\'abord !', 2000);
    return;
  }
  
  if (!currentChatMessage) {
    showToast('❌ Erreur: message original introuvable', 2000);
    return;
  }
  
  if (!currentChatMessage.sender_id) {
    showToast('❌ Erreur: destinataire inconnu', 2000);
    return;
  }
  
  const sendBtn = document.getElementById('sendChatBtn');
  const origHtml = sendBtn?.innerHTML;
  if (sendBtn) {
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    sendBtn.disabled = true;
  }
  
  try {
    const { error } = await sb.from('messages').insert({
      user_id: currentChatMessage.sender_id,
      sender_id: currentUserId,
      content: message,
      type: 'discussion',
      is_chat: true,
      read: false,
      created_at: new Date().toISOString(),
    });
    
    if (error) throw error;
    
    showToast('✅ Message envoyé anonymement !', 2000);
    closeChatOverlay();
    
  } catch (err) {
    console.error('sendChatMessage:', err);
    showToast(`❌ Erreur: ${err.message}`, 3000);
  }
  
  if (sendBtn) {
    sendBtn.innerHTML = origHtml;
    sendBtn.disabled = false;
  }
}

function closeChatErrorOverlay() {
  document.getElementById('overlayChatError')?.classList.remove('open');
}



// ============================================================
// SÉLECTION / SUPPRESSION DES MESSAGES
// ============================================================
function enterSelectMode() {
  selectMode = true;
  
  const btnSelect = document.getElementById('btnSelect');
  if (btnSelect) {
    btnSelect.innerHTML = '<i class="fas fa-trash-can"></i> Supprimer';
    btnSelect.classList.add('delete-mode');
  }
  
  const btnCancelHeader = document.getElementById('btnCancelHeader');
  if (btnCancelHeader) btnCancelHeader.classList.add('show');
  
  renderInbox();
}

function exitSelectMode() {
  selectMode = false;
  
  const btnSelect = document.getElementById('btnSelect');
  if (btnSelect) {
    btnSelect.innerHTML = '<i class="fas fa-check-square"></i> Sélectionner';
    btnSelect.classList.remove('delete-mode');
  }
  
  const btnCancelHeader = document.getElementById('btnCancelHeader');
  if (btnCancelHeader) btnCancelHeader.classList.remove('show');
  
  messagesList.forEach(m => { if (m) m.selected = false; });
  
  renderInbox();
  updateStats();
}

async function confirmDelete() {
  const ids = messagesList.filter(m => m?.selected).map(m => m.id);
  if (!ids.length) {
    showToast('Aucun message sélectionné', 2000);
    return;
  }
  
  if (!confirm(`Supprimer ${ids.length} message${ids.length > 1 ? 's' : ''} ?`)) return;
  
  try {
    const { error } = await sb.from('messages').delete().in('id', ids);
    if (error) throw error;
    messagesList = messagesList.filter(m => !ids.includes(m.id));
    showToast(`✅ ${ids.length} message${ids.length > 1 ? 's supprimés' : ' supprimé'}`, 2000);
    exitSelectMode();
    updateStats();
  } catch (e) {
    console.error('confirmDelete:', e);
    showToast('❌ Erreur lors de la suppression', 2000);
  }
}



// ============================================================
// SIDEBAR, THÈME, AVATAR, LOGOUT
// ============================================================
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sbBackdrop')?.classList.add('open');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sbBackdrop')?.classList.remove('open');
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
    };
    r.readAsDataURL(file);
  });
  editBtn?.addEventListener('click', () => input.click());
}

async function logout() {
  try {
    await sb.auth.signOut();
    window.location.href = 'auth.html';
  } catch (e) {
    console.error('logout:', e);
  }
}



// ============================================================
// TOAST (NOTIFICATION TEMPORAIRE)
// ============================================================
function showToast(message, duration = 3000) {
  document.querySelector('.ano23-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'ano23-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}



// ============================================================
// PWA INSTALLATION
// ============================================================
let deferredPrompt = null;

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
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  const btnInstall = document.getElementById('btnInstall');
  const btnInstallPWA = document.getElementById('btnInstallPWA');
  if (btnInstall) btnInstall.style.display = 'none';
  if (btnInstallPWA) btnInstallPWA.style.display = 'none';
}



// ============================================================
// ÉCOUTEURS D'ÉVÉNEMENTS (INIT)
// ============================================================
function initEventListeners() {
  document.querySelectorAll('.header-tab-btn').forEach(btn => {
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

  document.getElementById('btnSelect')?.addEventListener('click', () => {
    if (selectMode) {
      confirmDelete();
    } else {
      enterSelectMode();
    }
  });
  
  document.getElementById('btnCancelHeader')?.addEventListener('click', exitSelectMode);

  document.getElementById('closeSmall')?.addEventListener('click', closeSmallOverlay);
  document.getElementById('overlaySmall')?.addEventListener('click', e => {
    if (e.target === document.getElementById('overlaySmall')) closeSmallOverlay();
  });

  document.getElementById('btnReplySmall')?.addEventListener('click', openLargeOverlay);
  document.getElementById('btnChatSmall')?.addEventListener('click', () => {
    if (currentMessage && currentMessage.is_chat && currentMessage.sender_id) {
      closeSmallOverlay();
      openChatOverlay(currentMessage);
    }
  });
  
  document.getElementById('closeLargeBtn')?.addEventListener('click', closeLargeOverlay);
  document.getElementById('downloadBtn')?.addEventListener('click', downloadReplyImage);
  document.getElementById('shareBtn')?.addEventListener('click', shareReplyImage);

  document.getElementById('colorA')?.addEventListener('input', applyGradient);
  document.getElementById('colorB')?.addEventListener('input', applyGradient);

  document.getElementById('replyInput')?.addEventListener('input', e => {
    const has = e.target.value.trim().length > 0;
    const dl = document.getElementById('downloadBtn');
    const sh = document.getElementById('shareBtn');
    if (dl) dl.disabled = !has;
    if (sh) sh.disabled = !has;
  });
  
  document.getElementById('closeChatBtn')?.addEventListener('click', closeChatOverlay);
  document.getElementById('cancelChatBtn')?.addEventListener('click', closeChatOverlay);
  document.getElementById('sendChatBtn')?.addEventListener('click', sendChatMessage);
  document.getElementById('overlayChat')?.addEventListener('click', e => {
    if (e.target === document.getElementById('overlayChat')) closeChatOverlay();
  });
  
  document.getElementById('closeChatErrorBtn')?.addEventListener('click', closeChatErrorOverlay);
  document.getElementById('overlayChatError')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('overlayChatError')) closeChatErrorOverlay();
  });
  
  document.getElementById('btnInstall')?.addEventListener('click', installPWA);
  document.getElementById('btnInstallPWA')?.addEventListener('click', installPWA);
}