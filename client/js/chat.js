/* ══════════════════════════════════════════════════════════════════
   chat.js — Real-time-like chat page logic with polling
   ══════════════════════════════════════════════════════════════════ */

let currentPartnerId = null;
let pollInterval = null;
let lastMessageId = 0;

// ─── INIT CHAT PAGE ───────────────────────────────────────────────
async function initChatPage() {
  const user = await requireAuth('student');
  if (!user) return;

  populateNavUser(user);
  await loadConversations();

  // Check if partner preselected via URL
  const params = new URLSearchParams(window.location.search);
  const partnerId = params.get('partner');

  if (partnerId) {
    openConversation(partnerId);
  }

  // Send message
  const form = document.getElementById('chatForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });
  }
  const input = document.getElementById("chatInput");

  if (input) {
    input.addEventListener("keydown", function (e) {

      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }

    });
  }

  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.chat-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

// ─── LOAD CONVERSATIONS ───────────────────────────────────────────
async function loadConversations() {
  const sidebar = document.getElementById('conversationList');
  if (!sidebar) return;

  const res = await apiRequest('/api/chat/conversations');
  if (!res.success || !res.conversations.length) {
    sidebar.innerHTML = `<div class="empty-state" style="padding:2rem 1rem">
      <div class="empty-state-icon">💬</div>
      <div class="empty-state-title">No conversations yet</div>
      <div class="empty-state-text">Accept a connection to start chatting</div>
    </div>`;
    return;
  }

  sidebar.innerHTML = res.conversations.map(c => `
    <div class="chat-contact ${c.id === currentPartnerId ? 'active' : ''}"
onclick="openConversation('${c.id}')" id="contact-${c.id}">    
  <div class="student-avatar" style="width:44px;height:44px;font-size:0.9rem">${getInitials(c.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="chat-contact-name">${c.name}</div>
        <div class="chat-contact-preview">${c.last_message || 'Say hello!'}</div>
      </div>
      <div style="font-size:0.7rem;color:var(--text-muted);flex-shrink:0">${c.last_time ? formatDateTime(c.last_time) : ''}</div>
    </div>
  `).join('');
}

// ─── OPEN CONVERSATION ────────────────────────────────────────────
async function openConversation(partnerId) {
  currentPartnerId = partnerId;
  lastMessageId = 0;

  // Highlight active contact
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  const activeContact = document.getElementById(`contact-${partnerId}`);
  if (activeContact) activeContact.classList.add('active');

  // Show chat main area
  const chatMain = document.querySelector('.chat-main');
  const emptyState = document.getElementById('chatEmpty');
  if (chatMain) chatMain.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  await loadMessages(partnerId, true);

  // Start polling
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    if (currentPartnerId === partnerId) loadMessages(partnerId, false);
  }, 3000);
}

// ─── LOAD MESSAGES ────────────────────────────────────────────────
async function loadMessages(partnerId, fullLoad = false) {
  const res = await apiRequest(`/api/chat/conversation/${partnerId}`);
  if (!res.success) return;

  const container = document.getElementById('chatMessages');
  if (!container) return;

  const currentUser = await apiRequest('/api/auth/me');
  const myId = currentUser.user?.id;

  // Update header
  const headerEl = document.getElementById('chatHeaderName');
  const headerAvatar = document.getElementById('chatHeaderAvatar');
  if (res.partner) {
    if (headerEl) headerEl.textContent = res.partner.name;
    if (headerAvatar) headerAvatar.textContent = getInitials(res.partner.name);
  }

  // Build messages
  if (fullLoad) {
    container.innerHTML = '';
    lastMessageId = null;
  }

  const newMessages = res.messages.filter(
    m => !lastMessageId || m._id > lastMessageId
  );

  if (newMessages.length === 0) return;

  newMessages.forEach(msg => {

    const isMine = msg.sender_id === myId;

    const div = document.createElement('div');
    div.className = `message ${isMine ? 'sent' : 'received'}`;

    div.innerHTML = `
    <div class="message-bubble">${escapeHtml(msg.message)}</div>
    <span class="message-time">${formatDateTime(msg.timestamp)}</span>
  `;

    container.appendChild(div);

    lastMessageId = msg._id;

  });

  container.scrollTop = container.scrollHeight;

}

// ─── SEND MESSAGE ─────────────────────────────────────────────────
async function sendMessage() {
  if (!currentPartnerId) return;
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  const res = await apiRequest('/api/chat/send', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: currentPartnerId, message })
  });

  if (res.success) {
    await loadMessages(currentPartnerId, false);
    await loadConversations();
  } else {
    showToast(res.message, 'error');
  }
}

// ─── ESCAPE HTML ─────────────────────────────────────────────────
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initChatPage);
