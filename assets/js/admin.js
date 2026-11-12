/**
 * Ibrahim Hossan Studio - Admin Dashboard Logic
 * Manages auth, live data persistence via server.js API, image uploads,
 * portfolio/video management, profile editor, stats/reviews/FAQs, and leads.
 */

let authToken = sessionStorage.getItem('ih_admin_token') || '';
let siteData = {
  profile: {},
  stats: [],
  portfolio: [],
  testimonials: [],
  faqs: [],
  inquiries: []
};
let currentPortfolioFilter = 'all';
let currentPortfolioSearch = '';
let currentInquiryFilter = 'all';

const TAB_META = {
  overview: { title: 'Dashboard Overview', subtitle: 'Monitor your portfolio metrics, videos, and client leads' },
  portfolio: { title: 'Portfolio & Videos', subtitle: 'Add, edit, or organize your video edits, designs, and campaigns' },
  profile: { title: 'Profile & Hero Bio', subtitle: 'Customize your portrait, headlines, story, and contact channels' },
  content: { title: 'Stats, Reviews & FAQs', subtitle: 'Update animated counters, testimonials, and client questions' },
  inquiries: { title: 'Client Inquiries', subtitle: 'Track and reply to project briefs submitted on your Contact page' },
  settings: { title: 'Security & Backup', subtitle: 'Manage theme preference, password security, and JSON backups' }
};

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initSidebarMobile();
  initLoginHandlers();
  initNavigationTabs();
  initTopbarActions();
  initFormHandlers();

  await checkInitialSession();
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  const bg = type === 'error'
    ? 'bg-red-600 text-white border-red-500'
    : 'bg-neutral-900 text-white border-accent';
  el.className = `toast-item pointer-events-auto p-3.5 px-4 rounded-xl border shadow-2xl text-xs font-semibold flex items-center justify-between gap-3 ${bg}`;
  el.innerHTML = `
    <span class="flex items-center gap-2">
      <span>${type === 'error' ? '⚠' : '✓'}</span>
      <span>${escapeHtml(message)}</span>
    </span>
    <button class="opacity-70 hover:opacity-100" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// Theme Sync (Light / Dark Mode)
function initThemeToggle() {
  const saved = localStorage.getItem('ih_theme') || 'light';
  applyTheme(saved);
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
      applyTheme(next);
    });
  });
}

window.applyTheme = function(theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
    localStorage.setItem('ih_theme', 'light');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    localStorage.setItem('ih_theme', 'dark');
  }

  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (theme === 'light') {
      btn.innerHTML = `<svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      btn.setAttribute('title', 'Switch to Dark Mode');
    } else {
      btn.innerHTML = `<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      btn.setAttribute('title', 'Switch to Light Mode');
    }
  });
};

// Mobile Sidebar Drawer
function initSidebarMobile() {
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const openBtn = document.getElementById('open-sidebar-btn');
  const closeBtn = document.getElementById('close-sidebar-btn');

  function open() {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
  }
  function close() {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  window.closeMobileSidebar = close;
}

// Authentication
async function checkInitialSession() {
  if (!authToken) {
    // Check if backend server is reachable
    try {
      const ping = await fetch('/api/auth/verify');
      if (!ping.ok) throw new Error();
    } catch (_) {
      document.getElementById('server-warning')?.classList.remove('hidden');
    }
    showLoginView();
    return;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    if (json.authenticated) {
      await loadAdminData();
      showAppView();
    } else {
      sessionStorage.removeItem('ih_admin_token');
      authToken = '';
      showLoginView();
    }
  } catch (_) {
    document.getElementById('server-warning')?.classList.remove('hidden');
    showLoginView();
  }
}

function showLoginView() {
  document.getElementById('admin-login-view')?.classList.remove('hidden');
  document.getElementById('admin-app-view')?.classList.add('hidden');
}

function showAppView() {
  document.getElementById('admin-login-view')?.classList.add('hidden');
  document.getElementById('admin-app-view')?.classList.remove('hidden');
  renderAllDashboardSections();
}

function initLoginHandlers() {
  const toggleBtn = document.getElementById('toggle-password-visibility');
  const passInput = document.getElementById('admin-password');
  toggleBtn?.addEventListener('click', () => {
    if (!passInput) return;
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  });

  const loginForm = document.getElementById('admin-login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');
    errBox?.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passInput.value })
      });
      const json = await res.json();
      if (!res.ok) {
        if (errBox) {
          errBox.textContent = json.error || 'Invalid password';
          errBox.classList.remove('hidden');
        }
        return;
      }
      authToken = json.token;
      sessionStorage.setItem('ih_admin_token', authToken);
      passInput.value = '';
      await loadAdminData();
      showAppView();
      showToast('Welcome back to Studio Admin!');
    } catch (err) {
      if (errBox) {
        errBox.textContent = 'Cannot reach server.js. Start local server at http://localhost:3000';
        errBox.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (_) {}
    sessionStorage.removeItem('ih_admin_token');
    authToken = '';
    showLoginView();
    showToast('Signed out safely');
  });
}

// API Persistence
async function loadAdminData() {
  const res = await fetch('/api/site-data?t=' + Date.now(), {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  if (res.status === 401) {
    sessionStorage.removeItem('ih_admin_token');
    authToken = '';
    showLoginView();
    return;
  }
  siteData = await res.json();
}

async function persistSiteData(toastMsg = 'Saved to live website!') {
  const res = await fetch('/api/site-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(siteData)
  });

  if (res.status === 401) {
    showToast('Session expired. Please log in again.', 'error');
    showLoginView();
    return false;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(err.error || 'Failed to save changes', 'error');
    return false;
  }

  renderAllDashboardSections();
  showToast(toastMsg);
  return true;
}

// Tab Navigation
function initNavigationTabs() {
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
      if (window.closeMobileSidebar) window.closeMobileSidebar();
    });
  });
}

window.switchTab = function(tabName) {
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.admin-tab').forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== `tab-${tabName}`);
  });
  const meta = TAB_META[tabName] || TAB_META.overview;
  document.getElementById('top-section-title').textContent = meta.title;
  document.getElementById('top-section-subtitle').textContent = meta.subtitle;
};

function initTopbarActions() {
  document.getElementById('topbar-add-project-btn')?.addEventListener('click', () => {
    switchTab('portfolio');
    openProjectModal();
  });

  // Portfolio Filters
  document.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPortfolioFilter = btn.getAttribute('data-cat');
      renderPortfolioManager();
    });
  });

  document.getElementById('portfolio-search')?.addEventListener('input', (e) => {
    currentPortfolioSearch = e.target.value.toLowerCase().trim();
    renderPortfolioManager();
  });

  // Inquiry Filters
  document.querySelectorAll('.inquiry-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.inquiry-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentInquiryFilter = btn.getAttribute('data-status');
      renderInquiriesManager();
    });
  });
}

// Render All Sections
function renderAllDashboardSections() {
  renderSidebarAndOverview();
  renderPortfolioManager();
  populateProfileForm();
  renderContentManagers();
  renderInquiriesManager();
}

function renderSidebarAndOverview() {
  const p = siteData.profile || {};
  const projects = siteData.portfolio || [];
  const inquiries = siteData.inquiries || [];

  const avatarUrl = p.photo || 'assets/images/ibrahim.jpg';
  document.getElementById('sidebar-avatar').src = avatarUrl;
  document.getElementById('overview-avatar').src = avatarUrl;
  document.getElementById('sidebar-name').textContent = p.name || 'Ibrahim Hossan';
  document.getElementById('overview-name').textContent = p.name || 'Ibrahim Hossan';

  const videoCount = projects.filter(x => x.category === 'video').length;
  const graphicsCount = projects.filter(x => x.category === 'graphics').length;
  const metaCount = projects.filter(x => x.category === 'meta').length;
  const newLeadsCount = inquiries.filter(x => x.status === 'New').length;

  document.getElementById('nav-portfolio-count').textContent = projects.length;
  document.getElementById('nav-inquiries-count').textContent = newLeadsCount || inquiries.length;

  document.getElementById('kpi-total-projects').textContent = projects.length;
  document.getElementById('kpi-video-count').textContent = videoCount;
  document.getElementById('kpi-other-count').textContent = graphicsCount + metaCount;
  document.getElementById('kpi-inquiries-count').textContent = inquiries.length;

  // Category Breakdown Bars
  const total = Math.max(projects.length, 1);
  const bars = [
    { label: 'Video Editing & Motion', count: videoCount, color: '#F15642' },
    { label: 'Graphic Design & Thumbnails', count: graphicsCount, color: '#F59E0B' },
    { label: 'Meta Ads & Funnels', count: metaCount, color: '#10B981' }
  ];
  document.getElementById('category-breakdown-bars').innerHTML = bars.map(b => {
    const pct = Math.round((b.count / total) * 100);
    return `
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs font-semibold">
          <span class="text-white">${b.label}</span>
          <span class="text-neutral-400">${b.count} projects (${pct}%)</span>
        </div>
        <div class="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${b.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  // Recent Projects
  const recentProjEl = document.getElementById('overview-recent-projects');
  if (!projects.length) {
    recentProjEl.innerHTML = `<p class="text-xs text-neutral-500 py-4 text-center">No projects added yet.</p>`;
  } else {
    recentProjEl.innerHTML = projects.slice(0, 4).map(proj => `
      <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${escapeHtml(proj.thumbnail)}" alt="" class="w-12 h-9 rounded-lg object-cover bg-neutral-950 flex-shrink-0">
          <div class="min-w-0">
            <div class="text-xs font-bold text-white truncate">${escapeHtml(proj.title)}</div>
            <div class="text-[11px] text-accent font-medium">${escapeHtml(proj.categoryLabel)}</div>
          </div>
        </div>
        <button onclick="openProjectModal(${proj.id})" class="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white flex-shrink-0">Edit</button>
      </div>
    `).join('');
  }

  // Recent Inquiries
  const recentInqEl = document.getElementById('overview-recent-inquiries');
  if (!inquiries.length) {
    recentInqEl.innerHTML = `<p class="text-xs text-neutral-500 py-4 text-center">No contact form leads received yet.</p>`;
  } else {
    recentInqEl.innerHTML = inquiries.slice(0, 4).map(inq => `
      <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div class="min-w-0">
          <div class="text-xs font-bold text-white truncate">${escapeHtml(inq.name)}</div>
          <div class="text-[11px] text-neutral-400 truncate">${escapeHtml(inq.service)}</div>
        </div>
        <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent flex-shrink-0">${escapeHtml(inq.status)}</span>
      </div>
    `).join('');
  }
}

// Portfolio Manager
function renderPortfolioManager() {
  const grid = document.getElementById('admin-portfolio-grid');
  if (!grid) return;

  const filtered = (siteData.portfolio || []).filter(item => {
    const matchCat = currentPortfolioFilter === 'all' || item.category === currentPortfolioFilter;
    const matchSearch = !currentPortfolioSearch ||
      item.title.toLowerCase().includes(currentPortfolioSearch) ||
      item.description.toLowerCase().includes(currentPortfolioSearch);
    return matchCat && matchSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="col-span-full admin-card p-12 text-center space-y-3">
        <p class="text-sm text-neutral-400">No projects match this filter.</p>
        <button onclick="openProjectModal()" class="btn-primary text-xs py-2 px-5">+ Add First Project</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <div class="admin-card overflow-hidden flex flex-col justify-between group">
      <div>
        <div class="relative aspect-video bg-neutral-950 overflow-hidden border-b border-neutral-800">
          <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <span class="absolute top-3 left-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-black/75 text-white backdrop-blur-sm">
            ${escapeHtml(item.categoryLabel)}
          </span>
          ${item.videoUrl ? `<span class="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-accent text-white">▶ Video</span>` : ''}
        </div>
        <div class="p-5 space-y-2">
          <div class="text-[11px] font-semibold text-accent">${escapeHtml(item.metrics || 'Case Study')}</div>
          <h4 class="font-display text-base font-bold text-white leading-snug">${escapeHtml(item.title)}</h4>
          <p class="text-xs text-neutral-400 line-clamp-2">${escapeHtml(item.description)}</p>
        </div>
      </div>
      <div class="px-5 pb-5 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1">
          ${(item.tools || []).slice(0, 2).map(t => `<span class="text-[10px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-400">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openProjectModal(${item.id})" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white hover:border-accent">Edit</button>
          <button onclick="deleteProject(${item.id})" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.setThumbPreset = function(url) {
  document.getElementById('proj-thumb-url').value = url;
};

window.openProjectModal = function(projectId = null) {
  const modal = document.getElementById('project-editor-modal');
  const heading = document.getElementById('project-modal-heading');
  const form = document.getElementById('project-editor-form');
  form.reset();

  if (projectId) {
    const existing = (siteData.portfolio || []).find(p => p.id === projectId);
    if (existing) {
      heading.textContent = 'Edit Project';
      document.getElementById('proj-id').value = existing.id;
      document.getElementById('proj-title').value = existing.title;
      document.getElementById('proj-category').value = existing.category;
      document.getElementById('proj-metrics').value = existing.metrics || '';
      document.getElementById('proj-tools').value = (existing.tools || []).join(', ');
      document.getElementById('proj-video-url').value = existing.videoUrl || '';
      document.getElementById('proj-thumb-url').value = existing.thumbnail || '';
      document.getElementById('proj-desc').value = existing.description || '';
    }
  } else {
    heading.textContent = 'Add New Project';
    document.getElementById('proj-id').value = '';
    document.getElementById('proj-thumb-url').value = 'assets/images/project-video-1.svg';
  }

  modal.classList.add('active');
};

window.closeProjectModal = function() {
  document.getElementById('project-editor-modal')?.classList.remove('active');
};

window.deleteProject = async function(id) {
  if (!confirm('Delete this project from your portfolio?')) return;
  siteData.portfolio = (siteData.portfolio || []).filter(p => p.id !== id);
  await persistSiteData('Project deleted');
};

// Profile Editor
function populateProfileForm() {
  const p = siteData.profile || {};
  document.getElementById('edit-name').value = p.name || '';
  document.getElementById('edit-brand-short').value = p.brandShort || 'IH';
  document.getElementById('edit-tagline').value = p.tagline || '';
  document.getElementById('edit-availability').value = p.availability || '';
  document.getElementById('edit-hero-1').value = p.heroTitle1 || '';
  document.getElementById('edit-hero-2').value = p.heroTitle2 || '';
  document.getElementById('edit-hero-subtitle').value = p.heroSubtitle || '';
  document.getElementById('edit-about-short').value = p.aboutShort || '';
  document.getElementById('edit-about-story').value = p.aboutStory || '';
  document.getElementById('edit-phone').value = p.phone || '';
  document.getElementById('edit-whatsapp').value = p.whatsapp || '';
  document.getElementById('edit-email').value = p.email || '';
  document.getElementById('edit-photo-url').value = p.photo || 'assets/images/ibrahim.jpg';
  document.getElementById('profile-photo-preview').src = p.photo || 'assets/images/ibrahim.jpg';
  updateLiveProfilePreview();
}

function updateLiveProfilePreview() {
  document.getElementById('live-preview-img').src = document.getElementById('edit-photo-url').value || 'assets/images/ibrahim.jpg';
  document.getElementById('live-preview-avail').textContent = document.getElementById('edit-availability').value || 'Available';
  document.getElementById('live-preview-h1').textContent = document.getElementById('edit-hero-1').value || '';
  document.getElementById('live-preview-h2').textContent = document.getElementById('edit-hero-2').value || '';
  document.getElementById('live-preview-sub').textContent = document.getElementById('edit-hero-subtitle').value || '';
  document.getElementById('live-preview-contact').textContent = document.getElementById('edit-phone').value || '';
  document.getElementById('live-preview-email').textContent = document.getElementById('edit-email').value || '';
}

// Content Managers (Stats, Reviews, FAQs)
function renderContentManagers() {
  // Stats
  const statsList = document.getElementById('stats-editor-list');
  const stats = siteData.stats || [];
  statsList.innerHTML = stats.map((s, idx) => `
    <div class="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
      <div class="text-xs font-bold text-accent uppercase">Metric Card 0${idx + 1}</div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] text-neutral-400 uppercase mb-1">Number</label>
          <input type="number" step="any" data-stat-idx="${idx}" data-field="value" value="${escapeHtml(s.value)}" class="stat-input w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
        </div>
        <div>
          <label class="block text-[10px] text-neutral-400 uppercase mb-1">Suffix</label>
          <input type="text" data-stat-idx="${idx}" data-field="suffix" value="${escapeHtml(s.suffix)}" class="stat-input w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
        </div>
        <div>
          <label class="block text-[10px] text-neutral-400 uppercase mb-1">Highlight</label>
          <select data-stat-idx="${idx}" data-field="accent" class="stat-input w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white">
            <option value="false" ${!s.accent ? 'selected' : ''}>Standard</option>
            <option value="true" ${s.accent ? 'selected' : ''}>Coral Accent</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-[10px] text-neutral-400 uppercase mb-1">Label</label>
        <input type="text" data-stat-idx="${idx}" data-field="label" value="${escapeHtml(s.label)}" class="stat-input w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
      </div>
    </div>
  `).join('');

  // Testimonials
  const testList = document.getElementById('testimonials-editor-list');
  const reviews = siteData.testimonials || [];
  testList.innerHTML = reviews.map(r => `
    <div class="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between space-y-3">
      <div>
        <div class="text-xs font-bold text-white">${escapeHtml(r.name)}</div>
        <div class="text-[11px] text-accent mb-2">${escapeHtml(r.role)}</div>
        <p class="text-xs text-neutral-400 italic line-clamp-3">"${escapeHtml(r.quote)}"</p>
      </div>
      <div class="flex justify-end gap-2 pt-2 border-t border-neutral-800">
        <button onclick="openTestimonialModal(${r.id})" class="text-[11px] font-semibold text-neutral-300 hover:text-white">Edit</button>
        <button onclick="deleteTestimonial(${r.id})" class="text-[11px] font-semibold text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  `).join('');

  // FAQs
  const faqList = document.getElementById('faqs-editor-list');
  const faqs = siteData.faqs || [];
  faqList.innerHTML = faqs.map(f => `
    <div class="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-start justify-between gap-4">
      <div class="space-y-1">
        <div class="text-xs font-bold text-white">${escapeHtml(f.question)}</div>
        <div class="text-xs text-neutral-400">${escapeHtml(f.answer)}</div>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <button onclick="openFaqModal(${f.id})" class="text-xs font-semibold text-neutral-300 hover:text-white">Edit</button>
        <button onclick="deleteFaq(${f.id})" class="text-xs font-semibold text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  `).join('');
}

window.openTestimonialModal = function(id = null) {
  const modal = document.getElementById('testimonial-modal');
  const form = document.getElementById('testimonial-form');
  form.reset();
  if (id) {
    const item = (siteData.testimonials || []).find(t => t.id === id);
    if (item) {
      document.getElementById('testimonial-modal-title').textContent = 'Edit Client Review';
      document.getElementById('test-id').value = item.id;
      document.getElementById('test-name').value = item.name;
      document.getElementById('test-role').value = item.role;
      document.getElementById('test-quote').value = item.quote;
    }
  } else {
    document.getElementById('testimonial-modal-title').textContent = 'Add Client Review';
    document.getElementById('test-id').value = '';
  }
  modal.classList.add('active');
};
window.closeTestimonialModal = () => document.getElementById('testimonial-modal')?.classList.remove('active');

window.deleteTestimonial = async function(id) {
  if (!confirm('Remove this testimonial?')) return;
  siteData.testimonials = (siteData.testimonials || []).filter(t => t.id !== id);
  await persistSiteData('Testimonial deleted');
};

window.openFaqModal = function(id = null) {
  const modal = document.getElementById('faq-modal');
  const form = document.getElementById('faq-form');
  form.reset();
  if (id) {
    const item = (siteData.faqs || []).find(f => f.id === id);
    if (item) {
      document.getElementById('faq-modal-title').textContent = 'Edit FAQ';
      document.getElementById('faq-id').value = item.id;
      document.getElementById('faq-question').value = item.question;
      document.getElementById('faq-answer').value = item.answer;
    }
  } else {
    document.getElementById('faq-modal-title').textContent = 'Add FAQ';
    document.getElementById('faq-id').value = '';
  }
  modal.classList.add('active');
};
window.closeFaqModal = () => document.getElementById('faq-modal')?.classList.remove('active');

window.deleteFaq = async function(id) {
  if (!confirm('Delete this FAQ?')) return;
  siteData.faqs = (siteData.faqs || []).filter(f => f.id !== id);
  await persistSiteData('FAQ deleted');
};

// Client Inquiries
function renderInquiriesManager() {
  const container = document.getElementById('inquiries-list');
  if (!container) return;

  const list = (siteData.inquiries || []).filter(inq => {
    return currentInquiryFilter === 'all' || inq.status === currentInquiryFilter;
  });

  if (!list.length) {
    container.innerHTML = `
      <div class="admin-card p-12 text-center space-y-2">
        <div class="text-2xl">📬</div>
        <div class="text-sm font-bold text-white">No Inquiries Here Yet</div>
        <p class="text-xs text-neutral-400">When clients submit the consultation form on your Contact page, their leads will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(inq => {
    const dateStr = inq.date ? new Date(inq.date).toLocaleString() : 'Recent';
    const waReply = `https://wa.me/${(siteData.profile?.whatsapp || '8801986494589').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${inq.name}, thanks for reaching out regarding ${inq.service}!`)}`;
    return `
      <div class="admin-card p-5 sm:p-6 space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-display text-base font-bold text-white">${escapeHtml(inq.name)}</h4>
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-accent/15 text-accent">${escapeHtml(inq.service)}</span>
            </div>
            <div class="text-xs text-neutral-400 mt-0.5">
              Contact: <strong class="text-neutral-200">${escapeHtml(inq.contact)}</strong> &bull; ${escapeHtml(dateStr)}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select onchange="updateInquiryStatus(${inq.id}, this.value)" class="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
              <option value="New" ${inq.status === 'New' ? 'selected' : ''}>New</option>
              <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
              <option value="Completed" ${inq.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
            <button onclick="deleteInquiry(${inq.id})" class="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white">Delete</button>
          </div>
        </div>
        <p class="text-xs sm:text-sm text-neutral-300 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800">
          ${escapeHtml(inq.message)}
        </p>
        <div class="flex justify-end">
          <a href="${waReply}" target="_blank" class="text-xs font-semibold text-green-500 hover:underline">Open WhatsApp Reply ↗</a>
        </div>
      </div>
    `;
  }).join('');
}

window.updateInquiryStatus = async function(id, status) {
  const item = (siteData.inquiries || []).find(i => i.id === id);
  if (item) {
    item.status = status;
    await persistSiteData('Lead status updated');
  }
};

window.deleteInquiry = async function(id) {
  if (!confirm('Delete this lead inquiry?')) return;
  siteData.inquiries = (siteData.inquiries || []).filter(i => i.id !== id);
  await persistSiteData('Lead deleted');
};

// Form & Upload Listeners
function initFormHandlers() {
  // Live Profile Preview Inputs
  ['edit-photo-url', 'edit-availability', 'edit-hero-1', 'edit-hero-2', 'edit-hero-subtitle', 'edit-phone', 'edit-email'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateLiveProfilePreview);
  });

  // Upload Profile Photo
  document.getElementById('profile-photo-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadedUrl = await uploadImageFile(file);
    if (uploadedUrl) {
      document.getElementById('edit-photo-url').value = uploadedUrl;
      document.getElementById('profile-photo-preview').src = uploadedUrl;
      updateLiveProfilePreview();
      showToast('Portrait uploaded! Click Save Changes to apply.');
    }
  });

  // Upload Project Thumbnail
  document.getElementById('proj-thumb-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadedUrl = await uploadImageFile(file);
    if (uploadedUrl) {
      document.getElementById('proj-thumb-url').value = uploadedUrl;
      showToast('Thumbnail uploaded!');
    }
  });

  // Save Profile Form
  document.getElementById('profile-editor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    siteData.profile = {
      ...siteData.profile,
      name: document.getElementById('edit-name').value.trim(),
      brandShort: document.getElementById('edit-brand-short').value.trim() || 'IH',
      tagline: document.getElementById('edit-tagline').value.trim(),
      availability: document.getElementById('edit-availability').value.trim(),
      heroTitle1: document.getElementById('edit-hero-1').value.trim(),
      heroTitle2: document.getElementById('edit-hero-2').value.trim(),
      heroSubtitle: document.getElementById('edit-hero-subtitle').value.trim(),
      aboutShort: document.getElementById('edit-about-short').value.trim(),
      aboutStory: document.getElementById('edit-about-story').value.trim(),
      phone: document.getElementById('edit-phone').value.trim(),
      whatsapp: document.getElementById('edit-whatsapp').value.trim(),
      email: document.getElementById('edit-email').value.trim(),
      photo: document.getElementById('edit-photo-url').value.trim()
    };
    await persistSiteData('Profile & Hero updated!');
  });

  // Save Project Modal Form
  document.getElementById('project-editor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('proj-id').value;
    const cat = document.getElementById('proj-category').value;
    const catLabels = { video: 'Video Editing', graphics: 'Graphics Design', meta: 'Meta Marketing' };
    const toolsRaw = document.getElementById('proj-tools').value;
    const tools = toolsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const thumb = document.getElementById('proj-thumb-url').value.trim();
    const videoUrl = document.getElementById('proj-video-url').value.trim();

    const payload = {
      id: idVal ? Number(idVal) : Date.now(),
      title: document.getElementById('proj-title').value.trim(),
      category: cat,
      categoryLabel: catLabels[cat] || 'Creative Work',
      thumbnail: thumb,
      videoUrl: videoUrl,
      imageUrl: videoUrl ? '' : thumb,
      metrics: document.getElementById('proj-metrics').value.trim(),
      tools,
      description: document.getElementById('proj-desc').value.trim()
    };

    siteData.portfolio = siteData.portfolio || [];
    if (idVal) {
      const idx = siteData.portfolio.findIndex(p => p.id === Number(idVal));
      if (idx !== -1) siteData.portfolio[idx] = payload;
    } else {
      siteData.portfolio.unshift(payload);
    }

    closeProjectModal();
    await persistSiteData(idVal ? 'Project updated!' : 'New project published!');
  });

  // Save Stats
  document.getElementById('save-stats-btn')?.addEventListener('click', async () => {
    const inputs = document.querySelectorAll('.stat-input');
    const updated = [...(siteData.stats || [])];
    inputs.forEach(inp => {
      const idx = Number(inp.getAttribute('data-stat-idx'));
      const field = inp.getAttribute('data-field');
      if (!updated[idx]) return;
      if (field === 'value') updated[idx].value = parseFloat(inp.value) || 0;
      else if (field === 'accent') updated[idx].accent = inp.value === 'true';
      else updated[idx][field] = inp.value;
    });
    siteData.stats = updated;
    await persistSiteData('Homepage stats updated!');
  });

  // Save Testimonial
  document.getElementById('testimonial-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('test-id').value;
    const name = document.getElementById('test-name').value.trim();
    const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const item = {
      id: idVal ? Number(idVal) : Date.now(),
      name,
      initials,
      role: document.getElementById('test-role').value.trim(),
      quote: document.getElementById('test-quote').value.trim()
    };
    siteData.testimonials = siteData.testimonials || [];
    if (idVal) {
      const idx = siteData.testimonials.findIndex(t => t.id === Number(idVal));
      if (idx !== -1) siteData.testimonials[idx] = item;
    } else {
      siteData.testimonials.push(item);
    }
    closeTestimonialModal();
    await persistSiteData('Client review saved!');
  });

  // Save FAQ
  document.getElementById('faq-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = document.getElementById('faq-id').value;
    const item = {
      id: idVal ? Number(idVal) : Date.now(),
      question: document.getElementById('faq-question').value.trim(),
      answer: document.getElementById('faq-answer').value.trim()
    };
    siteData.faqs = siteData.faqs || [];
    if (idVal) {
      const idx = siteData.faqs.findIndex(f => f.id === Number(idVal));
      if (idx !== -1) siteData.faqs[idx] = item;
    } else {
      siteData.faqs.push(item);
    }
    closeFaqModal();
    await persistSiteData('FAQ saved!');
  });

  // Change Password
  document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('curr-pass').value;
    const newPassword = document.getElementById('new-pass').value;
    const confirmPassword = document.getElementById('confirm-pass').value;

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }

    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || 'Could not update password', 'error');
      return;
    }
    e.target.reset();
    showToast('Admin password updated successfully!');
  });
}

async function uploadImageFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image exceeds 5MB limit', 'error');
    return null;
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ filename: file.name, dataUrl })
  });
  const json = await res.json();
  if (!res.ok) {
    showToast(json.error || 'Upload failed', 'error');
    return null;
  }
  return json.url;
}

window.exportSiteDataBackup = function() {
  const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ibrahim-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON backup downloaded');
};
