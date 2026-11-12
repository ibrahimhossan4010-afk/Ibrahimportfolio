# Ibrahim Hossan - Premium Creative Portfolio

Modern, high-performance creative portfolio website inspired by [nondon.co](https://nondon.co/), customized for **Ibrahim Hossan** — Specialist in **Video Editing**, **Graphic Design**, and **Meta Marketing**.

---

## 🚀 Quick Preview & Running Locally

1. **Option 1 (Instant Click)**: Double-click [`open_portfolio.bat`](file:///c:/Users/SBMC/Desktop/portfolio/open_portfolio.bat) or double-click [`index.html`](file:///c:/Users/SBMC/Desktop/portfolio/index.html). It will open in your default browser immediately!
2. **Option 2 (Local Development Server via Node.js)**:
   ```bash
   npx serve .
   ```
   Open `http://localhost:3000` in your browser.

---

## 📂 Site Structure & Pages

* [`index.html`](file:///c:/Users/SBMC/Desktop/portfolio/index.html) — **Homepage**:
  * Hero section with Ibrahim's photo, verified badges, headline, and direct CTA buttons
  * Continuous Infinite Software & Skills Marquee (Premiere Pro, After Effects, DaVinci, Photoshop, Meta Ads Manager, etc.)
  * Animated Stats Counters (120+ Projects, 4.2x ROAS, 98% Retention, 24h Delivery)
  * Core Services Highlights (Video Editing, Graphic Design, Meta Ads)
  * Dynamic Portfolio Grid with category filters and interactive video/media modal
  * 4-Step Working Process
  * Client Reviews & Testimonials
  * Interactive FAQ Accordion
  * Call-to-Action consultation banner & WhatsApp button

* [`services.html`](file:///c:/Users/SBMC/Desktop/portfolio/services.html) — **Services & Pricing**:
  * In-depth breakdown of Video Editing, Graphic Design, and Meta Ads solutions
  * Packages & Retainer Tiers (Starter Booster, Growth Brand Scaler, Meta Ads Funnel)
  * Flexible On-Demand Consultation

* [`portfolio.html`](file:///c:/Users/SBMC/Desktop/portfolio/portfolio.html) — **Portfolio Showcase**:
  * Category filtering (`All`, `Video Editing`, `Graphic Design`, `Meta Marketing`)
  * Interactive Modal Player for video playback and high-res case study viewing
  * Detailed Case Studies (Shorts 3-sec hook retention, 4.2x ROAS Meta campaign)

* [`about.html`](file:///c:/Users/SBMC/Desktop/portfolio/about.html) — **About Ibrahim Hossan**:
  * Personal biography and visual storytelling philosophy
  * Detailed software & technical proficiency bars (Adobe Premiere Pro, After Effects, DaVinci Resolve, Photoshop, Illustrator, Meta Ads Manager)
  * Core work ethics and client guarantees

* [`contact.html`](file:///c:/Users/SBMC/Desktop/portfolio/contact.html) — **Contact & Consultation**:
  * Direct WhatsApp chat (`01986494589` / `+8801986494589`)
  * Email contact (`ibrahimhossan.connect@gmail.com`)
  * Interactive Consultation Brief Form (auto-formats message, saves lead to Admin Inquiries, and opens WhatsApp)

* [`admin.html`](file:///c:/Users/SBMC/Desktop/portfolio/admin.html) — **Studio Admin Dashboard**:
  * Password-protected portal (`server.js` using `crypto.scryptSync` + session tokens)
  * **Overview**: KPI counters, Portfolio Mix breakdown, Recent Projects & Client Leads
  * **Portfolio & Videos Manager**: Add/Edit/Delete projects, upload custom thumbnails, attach YouTube/Shorts/Vimeo/Drive/MP4 videos
  * **Profile & Hero Editor**: Live preview card, upload new portrait photo, edit bio, headlines & contact info
  * **Stats, Reviews & FAQs**: Edit homepage stats counters, client testimonials, and FAQ items
  * **Client Inquiries**: Track contact form leads (`New`, `Contacted`, `Completed`) with 1-click WhatsApp reply
  * **Security & Backup**: Light/Dark theme switch, password change, and JSON backup export (`data/site_data.json`)

---

## 🔐 Admin Dashboard Login (Local Server)

Start the local server with `node server.js` and visit:
* **Live Portfolio**: `http://localhost:3000`
* **Admin Dashboard**: `http://localhost:3000/admin.html`
* **Initial Default Password**: `ibrahim@2026` *(Change anytime inside Admin -> Security & Backup)*

---

## 🎨 Design System (Inspired by Nondon.co)

* **Background Colors**: Deep Obsidian `#0a0a0a` & Card Surfaces `#161616`
* **Accent Color**: Signature Coral Orange-Red `#F15642` with hover `#CD240F`
* **Typography**: Plus Jakarta Sans (Headings) & Poppins (Body)
* **Components**: Custom glow pills, glassmorphism headers, responsive mobile drawer, floating WhatsApp quick-action widget.

---

## 📹 How to Update Your Videos & Projects

Whenever you want to add or update your video showcase:
1. Open [`assets/js/main.js`](file:///c:/Users/SBMC/Desktop/portfolio/assets/js/main.js)
2. In the `portfolioData` array, replace any `videoUrl` with your YouTube video link (e.g. `https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1`), Vimeo link, or local video path.
3. Update title, description, and metrics as desired.

---

## 🌐 Free Hosting Options

You can host this website completely free of cost on:
* **GitHub Pages**: Push this folder to a GitHub repository and enable Pages in repository settings.
* **Vercel**: Drag and drop this folder onto [vercel.com](https://vercel.com).
* **Netlify**: Drag and drop this folder onto [netlify.com](https://netlify.com).
