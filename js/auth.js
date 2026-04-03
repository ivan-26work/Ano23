// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://waogbrxqyysibttlpoxj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indhb2dicnhxeXlzaWJ0dGxwb3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjE3NzUsImV4cCI6MjA5MDczNzc3NX0.Op1DUBfefbO2RkoitXws-7cFLW1T0DJGBDh1YPDcB1w';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ===== DOM =====
const profileCard = document.getElementById('profileCard');
const flipScene = document.getElementById('flipScene');
const profileEmail = document.getElementById('profileEmail');
const profileUid = document.getElementById('profileUid');
const profileLoginBtn = document.getElementById('profileLoginBtn');
const profileOtherBtn = document.getElementById('profileOtherBtn');

const flipCard = document.getElementById('flipCard');
const btnGoRegister = document.getElementById('btn-go-register');
const btnGoLogin = document.getElementById('btn-go-login');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnForgot = document.getElementById('btn-forgot');
const btnCloseForgot = document.getElementById('btn-close-modal');
const btnSendReset = document.getElementById('btn-send-reset');
const modalForgot = document.getElementById('modal-forgot');

// Guide overlay
const guideOverlay = document.getElementById('guideOverlay');
const guideFlipCard = document.getElementById('guideFlipCard');
let guideStep = 1;

// ===== FLIP =====
let isFlipped = false;

if (btnGoRegister) btnGoRegister.addEventListener('click', () => setFlip(true));
if (btnGoLogin) btnGoLogin.addEventListener('click', () => setFlip(false));

function setFlip(state) {
  isFlipped = state;
  if (flipCard) flipCard.classList.toggle('flipped', isFlipped);
}

// ===== TOGGLE PASSWORD VISIBILITY =====
document.querySelectorAll('.toggle-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const eyeShow = btn.querySelector('.eye-show');
    const eyeHide = btn.querySelector('.eye-hide');
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    if (eyeShow) eyeShow.style.display = isText ? '' : 'none';
    if (eyeHide) eyeHide.style.display = isText ? 'none' : '';
  });
});

// ===== PASSWORD STRENGTH =====
const rPw = document.getElementById('r-pw');
const rConfirm = document.getElementById('r-confirm');
if (rPw) rPw.addEventListener('input', function () {
  checkStrength(this.value);
  checkMatch();
});
if (rConfirm) rConfirm.addEventListener('input', checkMatch);

function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const lvls = [
    { w: '0%', c: 'transparent', t: '' },
    { w: '25%', c: '#ef4444', t: '🔴 Très faible' },
    { w: '50%', c: '#f97316', t: '🟠 Faible' },
    { w: '75%', c: '#eab308', t: '🟡 Moyen' },
    { w: '100%', c: '#22c55e', t: '🟢 Fort' },
  ];
  const lvl = pw.length === 0 ? lvls[0] : (lvls[score] || lvls[1]);
  const fill = document.getElementById('s-fill');
  const label = document.getElementById('s-label');
  if (fill) fill.style.width = lvl.w;
  if (fill) fill.style.background = lvl.c;
  if (label) label.textContent = lvl.t;
}

function checkMatch() {
  const pw = rPw ? rPw.value : '';
  const cfm = rConfirm ? rConfirm.value : '';
  const icon = document.getElementById('match-icon');
  if (!icon) return;
  if (!cfm) { icon.textContent = ''; return; }
  icon.textContent = pw === cfm ? '✅' : '❌';
}

// ===== MODAL MOT DE PASSE OUBLIÉ =====
if (btnForgot) btnForgot.addEventListener('click', () => openModal());
if (btnCloseForgot) btnCloseForgot.addEventListener('click', () => closeModal());
if (modalForgot) modalForgot.addEventListener('click', e => { if (e.target === modalForgot) closeModal(); });

function openModal() {
  if (modalForgot) modalForgot.classList.add('open');
  const forgotEmail = document.getElementById('forgot-email');
  if (forgotEmail) forgotEmail.focus();
}

function closeModal() {
  if (modalForgot) modalForgot.classList.remove('open');
  const forgotEmail = document.getElementById('forgot-email');
  if (forgotEmail) forgotEmail.value = '';
  setMsg('forgot-email-msg', '');
  clearAlert('forgot-alert');
}

// ===== FORGOT PASSWORD =====
if (btnSendReset) {
  btnSendReset.addEventListener('click', async () => {
    clearAlert('forgot-alert');
    setMsg('forgot-email-msg', '');

    const email = document.getElementById('forgot-email').value.trim();
    if (!isEmail(email)) {
      setMsg('forgot-email-msg', 'Entrez une adresse e-mail valide');
      return;
    }

    setLoading(btnSendReset, true);

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://ivan-26work.github.io/Ano23/auth.html'
    });

    setLoading(btnSendReset, false);

    if (error) {
      showAlert('forgot-alert', '❌ ' + translateError(error.message), 'error');
    } else {
      showAlert('forgot-alert', '✅ Lien envoyé ! Vérifiez votre boîte e-mail.', 'success');
      setTimeout(() => closeModal(), 3000);
    }
  });
}

// ===== ENVOI MESSAGE AUTOMATIQUE =====
async function sendAutoMessage(userId, content) {
  try {
    await sb.from('messages').insert({
      user_id: userId,
      content: content,
      type: 'message',
      is_chat: false,
      read: false,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erreur envoi message auto:', err);
  }
}

// ===== GUIDE OVERLAY =====
function showGuide() {
  if (!guideOverlay) return;
  guideOverlay.style.display = 'flex';
  guideStep = 1;
  if (guideFlipCard) guideFlipCard.classList.remove('flipped1', 'flipped2');
}

function closeGuide() {
  if (guideOverlay) guideOverlay.style.display = 'none';
  window.location.href = 'index.html';
}

function nextGuideStep() {
  if (guideStep === 1) {
    guideStep = 2;
    if (guideFlipCard) guideFlipCard.classList.add('flipped1');
  } else if (guideStep === 2) {
    guideStep = 3;
    if (guideFlipCard) guideFlipCard.classList.add('flipped2');
  } else {
    closeGuide();
  }
}

function skipGuide() {
  nextGuideStep();
}

// Boutons du guide
document.querySelectorAll('.guide-next').forEach(btn => {
  btn.addEventListener('click', nextGuideStep);
});
document.querySelectorAll('.guide-skip').forEach(btn => {
  btn.addEventListener('click', skipGuide);
});
document.querySelector('.guide-ok')?.addEventListener('click', closeGuide);

// Lien retour à la connexion
document.getElementById('guideBackToLogin')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeGuide();
});

// ===== LOGIN =====
if (btnLogin) {
  btnLogin.addEventListener('click', async () => {
    clearAlert('l-alert');
    setMsg('l-email-msg', '');
    setMsg('l-pw-msg', '');

    const email = document.getElementById('l-email').value.trim();
    const pw = document.getElementById('l-pw').value;
    let valid = true;

    if (!isEmail(email)) { setMsg('l-email-msg', 'E-mail invalide'); valid = false; }
    if (pw.length < 6) { setMsg('l-pw-msg', 'Minimum 6 caractères'); valid = false; }
    if (!valid) return;

    setLoading(btnLogin, true);

    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });

    setLoading(btnLogin, false);

    if (error) {
      showAlert('l-alert', '❌ ' + translateError(error.message), 'error');
    } else {
      const userId = email.split('@')[0];
      await sendAutoMessage(userId, 'Heureux de vous revoir ! 👋');
      
      // Vérifier si première connexion pour afficher le guide
      const guideShown = localStorage.getItem(`ano23_guide_${userId}`);
      if (!guideShown) {
        localStorage.setItem(`ano23_guide_${userId}`, 'true');
        showGuide();
      } else {
        window.location.href = 'index.html';
      }
    }
  });
}

// ===== REGISTER =====
if (btnRegister) {
  btnRegister.addEventListener('click', async () => {
    clearAlert('r-alert');
    setMsg('r-email-msg', '');
    setMsg('r-pw-msg', '');
    setMsg('r-confirm-msg', '');

    const email = document.getElementById('r-email').value.trim();
    const pw = document.getElementById('r-pw').value;
    const confirm = document.getElementById('r-confirm').value;
    let valid = true;

    if (!isEmail(email)) { setMsg('r-email-msg', 'E-mail invalide'); valid = false; }
    if (pw.length < 8) { setMsg('r-pw-msg', 'Minimum 8 caractères'); valid = false; }
    if (pw !== confirm) { setMsg('r-confirm-msg', 'Les mots de passe ne correspondent pas'); valid = false; }
    if (!valid) return;

    setLoading(btnRegister, true);

    const { data, error } = await sb.auth.signUp({ email, password: pw });

    setLoading(btnRegister, false);

    if (error) {
      showAlert('r-alert', '❌ ' + translateError(error.message), 'error');
    } else {
      const userId = email.split('@')[0];
      await sendAutoMessage(userId, 'Bienvenue sur Ano23 ! Partagez votre lien pour recevoir des messages anonymes. 🔗');
      
      showAlert('r-alert', '✅ Compte créé ! Vérifiez votre e-mail puis connectez-vous.', 'success');
      setTimeout(() => setFlip(false), 2800);
    }
  });
}

// ===== CARTE PROFIL (quand déjà connecté) =====
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  
  if (session) {
    if (profileCard) profileCard.style.display = 'block';
    if (flipScene) flipScene.style.display = 'none';
    
    const email = session.user.email;
    const userId = email.split('@')[0];
    
    if (profileEmail) profileEmail.textContent = email;
    if (profileUid) profileUid.textContent = `@${userId}`;
  } else {
    if (profileCard) profileCard.style.display = 'none';
    if (flipScene) flipScene.style.display = 'block';
  }
}

// ===== BOUTONS PROFIL =====
if (profileLoginBtn) {
  profileLoginBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

if (profileOtherBtn) {
  profileOtherBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    if (profileCard) profileCard.style.display = 'none';
    if (flipScene) flipScene.style.display = 'block';
  });
}

// ===== HELPERS =====
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function setMsg(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert show ${type}`;
}

function clearAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.className = 'alert';
}

function setLoading(btn, on) {
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  btn.disabled = on;
  if (text) text.style.display = on ? 'none' : '';
  if (spinner) spinner.style.display = on ? 'inline-block' : 'none';
}

function translateError(msg) {
  const map = {
    'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
    'Email not confirmed': 'Veuillez confirmer votre e-mail d\'abord.',
    'User already registered': 'Cet e-mail est déjà utilisé.',
    'Password should be at least 6': 'Le mot de passe est trop court.',
    'Unable to validate email address': 'Adresse e-mail invalide.',
    'For security purposes': 'Trop de tentatives. Attendez quelques secondes.',
  };
  for (const key in map) {
    if (msg.includes(key)) return map[key];
  }
  return msg;
}

// ===== INIT =====
checkSession();