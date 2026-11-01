# HER Initiative Website

A multi-page site for the HER Initiative (Hormonal Empowerment Restoration):
static HTML/CSS/JS pages served by a small Node/Express/PostgreSQL backend
that also powers the sign-up/inquiry forms, an admin dashboard, and a member
area.

## Structure

```
her-initiative-site/
├── index.html            # Home page (condensed overview — the main entry point)
├── pages/                 # The rest of the public site, one file per page
│   ├── about.html           # Why HER Exists, Our Story, The Silence, Timeline, Who We Are
│   ├── programmes.html       # Five programmes + Knowledge Hub
│   ├── leadership.html        # Leadership (dynamic) + Advisory Board
│   ├── impact.html             # Reach, Impact metrics (dynamic), latest News (dynamic)
│   ├── news.html                # News list at /news and single posts at /news/:id
│   ├── get-involved.html        # Support banner + Join/Partner/Support forms + closing CTA
│   └── contact.html              # Contact details
├── partials/              # Shared header/nav and footer, injected server-side
│   ├── nav.html              # Header, desktop nav, and the mobile drawer markup
│   └── footer.html
├── css/styles.css         # All site styles (colors, layout, type)
├── js/                     # One file per page's behavior, plus shared scripts
│   ├── script.js             # Scroll-reveal animation (every page)
│   ├── nav.js                 # Mobile nav drawer (every page)
│   ├── home.js                  # Home page's dynamic teasers
│   ├── leadership.js             # Fetches /api/executives
│   ├── impact.js                  # Fetches /api/metrics
│   ├── news.js                     # News list, home teaser, and single-post view (/api/news)
│   ├── join.js, partner.js, support.js   # The three Get Involved forms
├── admin/                 # Admin/member dashboard (role-based) — see below
├── images/                # Logo + uploaded executive photos
├── uploads/               # News pictures and videos uploaded from the admin (not in git — back up)
└── server/                # Backend: Express API + PostgreSQL
    ├── index.js              # Routes for every page, static assets, and /api/*
    ├── render.js               # Injects partials/nav.html + footer.html into each page
    ├── db.js, session.js        # Postgres pool, session/auth middleware
    ├── mailer.js                  # Email notifications (signups, inquiries, events)
    ├── routes/*.js                 # One file per API area
    ├── scripts/create-admin.js      # CLI to create/reset the first admin account
    └── db/schema.sql, migrate.js     # Database schema + migration runner
```

There's no build step. Pages are plain HTML files; `server/render.js` does a
tiny server-side include (swap `<!--NAV-->` / `<!--FOOTER-->` comments for
the contents of `partials/nav.html` / `partials/footer.html`) so the header
and footer only need to be edited in one place.

## How to use

### Editing content

- **Edit a page:** open the file directly — `index.html` for Home, or the
  matching file in `pages/` for everything else. Each page is fully
  self-contained (no copy-pasting between files).
- **Edit the header/footer:** edit `partials/nav.html` or
  `partials/footer.html` — the change applies to every page automatically
  the next time the server restarts (partials are read once at startup).
- **Edit colors/fonts/spacing:** edit `css/styles.css`. Brand colors live at
  the top in the `:root` block.
- **Add a new page:** create the file under `pages/`, add `<!--NAV-->` and
  `<!--FOOTER-->` placeholders where the shared header/footer go, then add a
  matching `app.get('/your-path', ...)` route in `server/index.js` (see the
  existing routes for the pattern).

### Running the site

The forms and every dynamic section (Impact, News, Leadership, Home's
teasers) need the backend running — opening `index.html` directly in a
browser will not work.

1. `cd server && npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, SMTP
   credentials, and `SESSION_SECRET`.
3. `npm run migrate` — creates all tables.
   If you already had a database from before News had pictures/videos, run
   `npm run migrate:news` once as well.
4. `node scripts/create-admin.js` — creates your first admin login.
5. `npm start` — serves the whole site and the API at `http://localhost:3000`.

### Admin dashboard & member accounts

Sign in at `/admin/login`. What you see at `/admin` depends on your account's
role:
- **Admins** get full control: Dashboard summary, Executive Members (photo
  uploads — this is what populates the public Leadership page), Events &
  Meetings (with an optional "email all members" notification), Manage
  Users (create/edit/delete any account and set its role), Suggestion Box,
  Impact Metrics, and News.
- **Members** (accounts an admin creates for them — no self-registration)
  get a reduced view: read-only Executive Members and Events & Meetings,
  plus the Suggestion Box (read + post).

### Deploying to a live domain

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full walkthrough — provisioning
a Hostinger VPS, buying the domain, and wiring the two together.

## Brand colors in use

| Variable | Hex | Role |
|---|---|---|
| `--plum` | `#3D2145` | Primary bold background (hero, footer, etc.) — deep aubergine |
| `--ivory` | `#F7F2F0` | Main light background |
| `--ivory-dim` | `#CDA0E6` | Secondary lavender background |
| `--gold` | `#D4AF37` | Accent on dark backgrounds — true gold |
| `--ink` | `#241C22` | Body text |

## News (pictures & videos)

Admins create posts under **News** in `/admin`: title, optional summary, text,
and up to 10 pictures/videos at a time (images JPEG/PNG/WebP ≤ 10MB; videos
MP4/WebM/MOV ≤ 100MB). Files are stored in `uploads/news/` and served from
`/uploads/news/…`. Published posts show on `/news`, the latest three on the
Impact page, and a teaser on the home page. Unticking "Published" keeps a post
as a draft. Deleting a post or a single file also deletes it from disk.
