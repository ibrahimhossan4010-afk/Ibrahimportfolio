/**
 * Ibrahim Hossan - Portfolio Main JavaScript
 * Handles dynamic CMS data loading, theme toggle (Light / Dark mode), navigation,
 * portfolio filtering, smart video modal player, FAQ, and WhatsApp + lead tracking.
 */

const DEFAULT_SITE_DATA = {
  profile: {
    name: "Ibrahim Hossan",
    brandShort: "IH",
    tagline: "Creative & Growth",
    roleTitle: "Video Editor | Graphic Designer | Meta Marketing Specialist",
    availability: "Available for Freelance & Long-Term Projects",
    heroTitle1: "Visuals That Captivate.",
    heroTitle2: "Campaigns That Convert.",
    heroSubtitle: "I am Ibrahim Hossan—a creative specialist combining high-retention Video Editing, high-converting Graphics Design, and ROI-driven Meta Marketing to turn casual viewers into loyal paying customers.",
    aboutShort: "I am a dedicated creative professional specializing in high-impact Video Editing, Graphic Design, and ROI-focused Meta Marketing.",
    aboutStory: "With a deep passion for visual storytelling and digital growth, I help content creators, businesses, and personal brands cut through the digital noise. My work bridges the gap between captivating creative media and cold, measurable business revenue.",
    phone: "01986494589",
    whatsapp: "8801986494589",
    email: "ibrahimhossan.connect@gmail.com",
    photo: "assets/images/ibrahim.jpg"
  },
  stats: [
    { value: 120, suffix: "+", label: "Projects Completed", accent: false },
    { value: 4.2, suffix: "x", label: "Average ROAS Delivered", accent: true },
    { value: 98, suffix: "%", label: "Client Retention & Trust", accent: false },
    { value: 24, suffix: "h", label: "Avg. Turnaround Time", accent: false }
  ],
  portfolio: [
    {
      id: 1,
      title: "High-Energy Tech Product Reel",
      category: "video",
      categoryLabel: "Video Editing",
      thumbnail: "assets/images/project-video-1.svg",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      imageUrl: "",
      description: "Dynamic fast-paced short-form video edit featuring custom motion graphics, sound design, sound FX, and punchy captions engineered for maximum Instagram Reel & TikTok retention.",
      metrics: "450K+ Views | 18% Engagement Rate",
      tools: ["Adobe Premiere Pro", "After Effects", "CapCut Pro"]
    },
    {
      id: 2,
      title: "Viral YouTube Documentary Style Edit",
      category: "video",
      categoryLabel: "Video Editing",
      thumbnail: "assets/images/project-video-2.svg",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      imageUrl: "",
      description: "Long-form YouTube video edit with dynamic map animations, engaging b-roll pacing, cinematic color grading, and crisp audio leveling.",
      metrics: "1.2M Views | 68% Retention Rate",
      tools: ["Premiere Pro", "DaVinci Resolve", "Audition"]
    },
    {
      id: 3,
      title: "High-CTR YouTube Thumbnails Pack",
      category: "graphics",
      categoryLabel: "Graphics Design",
      thumbnail: "assets/images/project-thumb-1.svg",
      videoUrl: "",
      imageUrl: "assets/images/project-thumb-1.svg",
      description: "A series of psychology-driven, high-contrast YouTube thumbnails crafted to drastically increase Click-Through-Rate (CTR) across education and business channels.",
      metrics: "+14.2% Average CTR Increase",
      tools: ["Adobe Photoshop", "Lightroom"]
    },
    {
      id: 4,
      title: "E-Commerce Meta Ad Creatives & Video Ads",
      category: "meta",
      categoryLabel: "Meta Marketing",
      thumbnail: "assets/images/project-meta-1.svg",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
      imageUrl: "",
      description: "Full-funnel Meta advertising campaign featuring high-converting UGC style video hooks, carousel designs, and precision audience targeting.",
      metrics: "4.2x ROAS | $24,000+ Revenue Generated",
      tools: ["Meta Ads Manager", "Premiere Pro", "Photoshop"]
    },
    {
      id: 5,
      title: "Luxury Brand Identity & Social Kit",
      category: "graphics",
      categoryLabel: "Graphics Design",
      thumbnail: "assets/images/project-branding-1.svg",
      videoUrl: "",
      imageUrl: "assets/images/project-branding-1.svg",
      description: "Complete visual identity kit including logo design, color typography guidelines, Instagram grid templates, and promotional banner assets.",
      metrics: "Full Brand Launch Suite",
      tools: ["Adobe Illustrator", "Photoshop"]
    },
    {
      id: 6,
      title: "Lead Generation Campaign for EdTech",
      category: "meta",
      categoryLabel: "Meta Marketing",
      thumbnail: "assets/images/project-meta-2.svg",
      videoUrl: "",
      imageUrl: "assets/images/project-meta-2.svg",
      description: "Comprehensive Facebook & Instagram lead ad campaign with custom landing page integration, Meta Pixel tracking, and CBO scaling strategy.",
      metrics: "1,850+ Qualified Leads | $1.20 Cost Per Lead",
      tools: ["Meta Ads Manager", "Pixel / CAPI", "Analytics"]
    }
  ],
  testimonials: [
    {
      id: 1,
      name: "Tariq Mahmud",
      initials: "TM",
      role: "Content Creator & Founder",
      quote: "Ibrahim took our raw footage and turned it into high-octane Instagram Reels that doubled our organic reach within 3 weeks. His pacing and sound effects are top tier!"
    },
    {
      id: 2,
      name: "Nadia Rahman",
      initials: "NR",
      role: "E-Commerce Brand Manager",
      quote: "The YouTube thumbnails and ad graphics Ibrahim designed increased our click-through rate dramatically. He understands viewer psychology better than most designers."
    },
    {
      id: 3,
      name: "Arif Hossain",
      initials: "AH",
      role: "Digital Business Owner",
      quote: "Running Meta Ads with Ibrahim generated an immediate 4.2x ROAS for our product launch. Professional, honest, and extremely fast with revisions!"
    }
  ],
  faqs: [
    {
      id: 1,
      question: "What is your typical turnaround time for video editing?",
      answer: "For short-form content (Reels, TikToks, Shorts), standard delivery is 24 to 48 hours. Long-form YouTube edits or motion graphic commercials typically take 3 to 5 business days depending on footage length and complexity."
    },
    {
      id: 2,
      question: "How do revisions work if I need changes?",
      answer: "Your satisfaction is my priority. Every project includes revisions to make sure the cuts, pacing, graphics, color grading, and audio match your exact vision."
    },
    {
      id: 3,
      question: "What budget do I need to start Meta (Facebook/Instagram) Ads?",
      answer: "You can start testing with an ad spend as low as $10 - $20 per day. I set up proper A/B split tests to identify winning creatives before scaling your budget to maximize return on ad spend (ROAS)."
    },
    {
      id: 4,
      question: "Can I hire you for on-demand or monthly retainers?",
      answer: "Yes! I work on both single on-demand projects and monthly retainer packages for creators and businesses requiring ongoing video editing, graphic design, or ad campaign management."
    }
  ]
};

let activeSiteData = DEFAULT_SITE_DATA;

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initMobileMenu();
  await loadSiteData();
  hydrateProfileAndContent();
  initPortfolio();
  initModal();
  initFAQ();
  initCounters();
  initContactForm();
});

async function loadSiteData() {
  // Try Node backend API first, then static JSON, then localStorage override, then default
  try {
    const res = await fetch('/api/site-data?t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      if (json && json.profile) {
        activeSiteData = json;
        return;
      }
    }
  } catch (_) {}

  try {
    const res = await fetch('data/site_data.json?t=' + Date.now());
    if (res.ok) {
      const json = await res.json();
      if (json && json.profile) {
        activeSiteData = json;
        return;
      }
    }
  } catch (_) {}

  try {
    const localOverride = localStorage.getItem('ih_site_data_override');
    if (localOverride) {
      const parsed = JSON.parse(localOverride);
      if (parsed && parsed.profile) {
        activeSiteData = parsed;
      }
    }
  } catch (_) {}
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hydrateProfileAndContent() {
  const p = activeSiteData.profile || DEFAULT_SITE_DATA.profile;

  document.querySelectorAll('[data-cms="profile-name"]').forEach(el => {
    el.textContent = p.name;
  });
  document.querySelectorAll('[data-cms="brand-short"]').forEach(el => {
    el.textContent = p.brandShort || 'IH';
  });
  document.querySelectorAll('[data-cms="profile-tagline"]').forEach(el => {
    el.textContent = p.tagline || 'Creative & Growth';
  });
  document.querySelectorAll('[data-cms="profile-availability"]').forEach(el => {
    el.textContent = p.availability;
  });
  document.querySelectorAll('[data-cms="hero-title-1"]').forEach(el => {
    el.textContent = p.heroTitle1;
  });
  document.querySelectorAll('[data-cms="hero-title-2"]').forEach(el => {
    el.textContent = p.heroTitle2;
  });
  document.querySelectorAll('[data-cms="hero-subtitle"]').forEach(el => {
    el.textContent = p.heroSubtitle;
  });
  document.querySelectorAll('[data-cms="about-short"]').forEach(el => {
    el.textContent = p.aboutShort;
  });
  document.querySelectorAll('[data-cms="about-story"]').forEach(el => {
    el.textContent = p.aboutStory;
  });
  document.querySelectorAll('[data-cms="profile-photo"]').forEach(img => {
    if (p.photo) img.src = p.photo;
    img.alt = p.name;
  });
  document.querySelectorAll('[data-cms="contact-phone"]').forEach(el => {
    el.textContent = p.phone;
  });
  document.querySelectorAll('[data-cms="contact-email"]').forEach(el => {
    el.textContent = p.email;
  });
  document.querySelectorAll('[data-cms="email-link"]').forEach(a => {
    a.href = `mailto:${p.email}`;
  });
  document.querySelectorAll('[data-cms="whatsapp-link"]').forEach(a => {
    const waNum = (p.whatsapp || '8801986494589').replace(/[^0-9]/g, '');
    const customMsg = a.getAttribute('data-wa-text');
    a.href = customMsg
      ? `https://wa.me/${waNum}?text=${encodeURIComponent(customMsg)}`
      : `https://wa.me/${waNum}`;
  });

  // Render Dynamic Stats if container exists
  const statsContainer = document.getElementById('stats-grid');
  if (statsContainer && Array.isArray(activeSiteData.stats) && activeSiteData.stats.length) {
    statsContainer.innerHTML = activeSiteData.stats.map(s => `
      <div class="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
        <div class="font-display text-4xl lg:text-5xl font-extrabold ${s.accent ? 'text-accent' : 'text-white'} mb-1 counter-val" data-target="${escapeHtml(s.value)}" data-suffix="${escapeHtml(s.suffix || '')}">
          0
        </div>
        <p class="text-sm text-neutral-400 font-medium">${escapeHtml(s.label)}</p>
      </div>
    `).join('');
  }

  // Render Dynamic Testimonials if container exists
  const testContainer = document.getElementById('testimonials-grid');
  if (testContainer && Array.isArray(activeSiteData.testimonials) && activeSiteData.testimonials.length) {
    testContainer.innerHTML = activeSiteData.testimonials.map(t => `
      <div class="p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 relative">
        <div class="flex text-amber-400 mb-4 text-sm">★★★★★</div>
        <p class="text-sm text-neutral-300 leading-relaxed italic mb-6">
          "${escapeHtml(t.quote)}"
        </p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-bold text-accent">
            ${escapeHtml(t.initials || t.name.slice(0, 2).toUpperCase())}
          </div>
          <div>
            <h5 class="text-sm font-bold text-white">${escapeHtml(t.name)}</h5>
            <p class="text-xs text-neutral-500">${escapeHtml(t.role)}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render Dynamic FAQs if container exists
  const faqContainer = document.getElementById('faq-list');
  if (faqContainer && Array.isArray(activeSiteData.faqs) && activeSiteData.faqs.length) {
    faqContainer.innerHTML = activeSiteData.faqs.map((f, idx) => `
      <div class="faq-item ${idx === 0 ? 'active' : ''}">
        <button class="faq-trigger">
          <span>${escapeHtml(f.question)}</span>
          <span class="faq-icon">+</span>
        </button>
        <div class="faq-content">
          ${escapeHtml(f.answer)}
        </div>
      </div>
    `).join('');
  }
}

// Theme Toggle (Light / Dark Mode)
function initThemeToggle() {
  const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
  const currentTheme = localStorage.getItem('ih_theme') || 'light';
  applyTheme(currentTheme);

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const isLight = document.documentElement.classList.contains('light');
      const targetTheme = isLight ? 'dark' : 'light';
      applyTheme(targetTheme);
    });
  });
}

function applyTheme(theme) {
  const html = document.documentElement;
  const toggleButtons = document.querySelectorAll('.theme-toggle-btn');

  if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
    localStorage.setItem('ih_theme', 'light');
  } else {
    html.classList.remove('light');
    html.classList.add('dark');
    localStorage.setItem('ih_theme', 'dark');
  }

  toggleButtons.forEach(btn => {
    if (theme === 'light') {
      btn.innerHTML = `
        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      `;
      btn.setAttribute('title', 'Switch to Dark Mode');
      btn.setAttribute('aria-label', 'Switch to Dark Mode');
    } else {
      btn.innerHTML = `
        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      `;
      btn.setAttribute('title', 'Switch to Light Mode');
      btn.setAttribute('aria-label', 'Switch to Light Mode');
    }
  });
}

// Mobile Navigation
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!menuBtn || !mobileNav) return;

  menuBtn.addEventListener('click', () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isExpanded);
    mobileNav.classList.toggle('hidden');
  });

  const links = mobileNav.querySelectorAll('a');
  links.forEach(l => {
    l.addEventListener('click', () => {
      mobileNav.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// Convert standard YouTube / Shorts / Vimeo / Drive URLs to inline playable media descriptors
function normalizeVideoUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';

  // Direct MP4 / WebM / OGG / MOV video file
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)) {
    return { type: 'mp4', src: url };
  }

  // YouTube watch / shorts / youtu.be / embed / live
  const ytWatch = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (ytWatch) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1&rel=0` };
  }

  // Vimeo
  const vimeo = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
  }

  // Google Drive: stream inline via local /api/drive-video proxy so viewers never get prompted to download
  const gdrive = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=|drive\.usercontent\.google\.com\/download\?(?:[^#]*&)?id=)([a-zA-Z0-9_-]+)/);
  if (gdrive) {
    const fileId = encodeURIComponent(gdrive[1]);
    return {
      type: 'mp4',
      src: `/api/drive-video?id=${fileId}`,
      fallbackIframe: `https://drive.google.com/file/d/${fileId}/preview`
    };
  }

  return { type: 'iframe', src: url };
}

// Portfolio Filtering & Rendering
function initPortfolio() {
  const container = document.getElementById('portfolio-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!container) return;

  const items = Array.isArray(activeSiteData.portfolio) ? activeSiteData.portfolio : DEFAULT_SITE_DATA.portfolio;

  function render(category = 'all') {
    container.innerHTML = '';
    const filtered = category === 'all'
      ? items
      : items.filter(item => item.category === category);

    if (filtered.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-neutral-400 text-sm">No projects found in this category yet.</div>`;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'portfolio-card cursor-pointer';
      const isVideo = Boolean(item.videoUrl);
      const toolsArr = Array.isArray(item.tools) ? item.tools : [];

      card.innerHTML = `
        <div class="thumb-wrapper">
          <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" loading="lazy" />
          ${isVideo ? `
            <div class="play-badge">
              <svg class="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          ` : `
            <div class="play-badge" style="background: rgba(241,86,66,0.85);">
              <svg class="w-6 h-6 stroke-current fill-none stroke-2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          `}
        </div>
        <div class="p-5">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="text-xs uppercase tracking-wider font-semibold text-accent" style="color: var(--accent);">${escapeHtml(item.categoryLabel)}</span>
            <span class="text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full truncate max-w-[160px]">${escapeHtml(item.metrics)}</span>
          </div>
          <h3 class="text-lg font-bold text-white mb-2 leading-snug hover:text-accent transition-colors">${escapeHtml(item.title)}</h3>
          <p class="text-sm text-neutral-400 line-clamp-2 mb-4">${escapeHtml(item.description)}</p>
          <div class="flex items-center justify-between pt-3 border-t border-neutral-800">
            <div class="flex flex-wrap gap-1.5">
              ${toolsArr.map(t => `<span class="text-[11px] bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded">${escapeHtml(t)}</span>`).join('')}
            </div>
            <button class="view-project-btn text-xs font-semibold text-white hover:text-accent flex items-center gap-1" data-id="${item.id}">
              ${isVideo ? 'Watch' : 'View'}
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openModal(item));
      container.appendChild(card);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-filter');
      render(cat);
    });
  });

  render('all');
}

// Modal View / Video Player
function initModal() {
  const modal = document.getElementById('project-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  if (!modal) return;

  function closeModal() {
    modal.classList.remove('active');
    const container = document.getElementById('modal-media-container');
    if (container) {
      const vid = container.querySelector('video');
      if (vid) {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
      }
      container.innerHTML = '';
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

function openModal(item) {
  const modal = document.getElementById('project-modal');
  const mediaContainer = document.getElementById('modal-media-container');
  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-desc');
  const metaEl = document.getElementById('modal-metrics');
  const toolsEl = document.getElementById('modal-tools');
  const ctaBtn = document.getElementById('modal-cta');

  if (!modal || !mediaContainer) return;

  titleEl.textContent = item.title;
  descEl.textContent = item.description;
  metaEl.textContent = item.metrics;
  const toolsArr = Array.isArray(item.tools) ? item.tools : [];
  toolsEl.innerHTML = toolsArr.map(t => `<span class="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">${escapeHtml(t)}</span>`).join('');

  if (item.videoUrl) {
    const media = normalizeVideoUrl(item.videoUrl);
    if (media.type === 'mp4') {
      mediaContainer.innerHTML = `
        <div class="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800">
          <video src="${escapeHtml(media.src)}" class="w-full h-full" controls autoplay playsinline controlsList="nodownload" oncontextmenu="return false"></video>
        </div>
      `;
      const videoEl = mediaContainer.querySelector('video');
      if (videoEl && media.fallbackIframe) {
        videoEl.addEventListener('error', () => {
          if (!modal.classList.contains('active')) return;
          mediaContainer.innerHTML = `
            <div class="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800">
              <iframe src="${escapeHtml(media.fallbackIframe)}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          `;
        }, { once: true });
      }
    } else {
      mediaContainer.innerHTML = `
        <div class="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800">
          <iframe src="${escapeHtml(media.src)}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      `;
    }
  } else {
    mediaContainer.innerHTML = `
      <div class="relative w-full aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
        <img src="${escapeHtml(item.imageUrl || item.thumbnail)}" alt="${escapeHtml(item.title)}" class="max-h-full max-w-full object-contain" />
      </div>
    `;
  }

  if (ctaBtn) {
    const waNum = (activeSiteData.profile?.whatsapp || '8801986494589').replace(/[^0-9]/g, '');
    ctaBtn.href = `https://wa.me/${waNum}?text=${encodeURIComponent(`Hi Ibrahim, I am interested in a project similar to "${item.title}". Let's discuss!`)}`;
  }

  modal.classList.add('active');
}

// FAQ Accordion
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

// Animated Numbers
function initCounters() {
  const counters = document.querySelectorAll('.counter-val');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-target'));
        const suffix = el.getAttribute('data-suffix') || '';
        const isDecimal = target % 1 !== 0;
        let current = 0;
        const step = target / 40;

        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            el.textContent = (isDecimal ? target.toFixed(1) : Math.round(target)) + suffix;
            clearInterval(timer);
          } else {
            el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current)) + suffix;
          }
        }, 30);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

// Interactive Contact & WhatsApp Form (also logs to Admin Inquiries)
function initContactForm() {
  const form = document.getElementById('consultation-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('form-name')?.value.trim() || 'Client';
    const contact = document.getElementById('form-contact')?.value.trim() || 'N/A';
    const service = document.getElementById('form-service')?.value || 'Creative Services';
    const message = document.getElementById('form-message')?.value.trim() || 'I want to discuss a new project.';

    // Save inquiry to Node backend so Ibrahim sees it inside Admin Dashboard
    try {
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, service, message })
      });
    } catch (_) {}

    const waNum = (activeSiteData.profile?.whatsapp || '8801986494589').replace(/[^0-9]/g, '');
    const text = `*New Inquiry for ${activeSiteData.profile?.name || 'Ibrahim Hossan'}*\n\n*Name:* ${name}\n*Contact/Email:* ${contact}\n*Service Needed:* ${service}\n*Message:* ${message}`;
    const whatsappUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
  });
}
