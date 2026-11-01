require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const { sessionMiddleware } = require('./session');
const { sendPage } = require('./render');
const signupRouter = require('./routes/signup');
const partnerRouter = require('./routes/partner');
const supportRouter = require('./routes/support');
const volunteerRouter = require('./routes/volunteer');
const contactRouter = require('./routes/contact');
const authRouter = require('./routes/auth');
const metricsRouter = require('./routes/metrics');
const executivesRouter = require('./routes/executives');
const eventsRouter = require('./routes/events');
const usersRouter = require('./routes/users');
const suggestionsRouter = require('./routes/suggestions');
const adminSummaryRouter = require('./routes/admin-summary');
const siteImagesRouter = require('./routes/site-images');
const submissionsRouter = require('./routes/submissions');
const newsRouter = require('./routes/news');
const resourcesRouter = require('./routes/resources');
const { SECTION_SLUGS } = require('./resource-sections');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
app.use(sessionMiddleware);

app.get('/robots.txt', (req, res) => res.type('text/plain').sendFile(path.join(ROOT, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.type('application/xml').sendFile(path.join(ROOT, 'sitemap.xml')));

app.get('/', (req, res) => sendPage(res, path.join(ROOT, 'index.html')));
app.get('/about', (req, res) => sendPage(res, path.join(PAGES, 'about.html')));
app.get('/programmes', (req, res) => sendPage(res, path.join(PAGES, 'programmes.html')));
app.get('/her-stories', (req, res) => sendPage(res, path.join(PAGES, 'her-stories.html')));
app.get('/leadership', (req, res) => sendPage(res, path.join(PAGES, 'leadership.html')));
app.get('/impact', (req, res) => sendPage(res, path.join(PAGES, 'impact.html')));
app.get('/news', (req, res) => sendPage(res, path.join(PAGES, 'news.html')));
app.get('/news/:id', (req, res) => sendPage(res, path.join(PAGES, 'news.html')));
app.get('/resources', (req, res) => sendPage(res, path.join(PAGES, 'resources.html')));
const sendResourceArticlePage = (req, res, next) => {
  if (!SECTION_SLUGS.includes(req.params.section)) return next();
  if (req.params.id !== undefined && !/^\d+$/.test(req.params.id)) return next();
  sendPage(res, path.join(PAGES, 'resource-articles.html'));
};
app.get('/resources/:section', sendResourceArticlePage);
app.get('/resources/:section/:id', sendResourceArticlePage);
app.get('/get-involved', (req, res) => sendPage(res, path.join(PAGES, 'get-involved.html')));
app.get('/join', (req, res) => sendPage(res, path.join(PAGES, 'join.html')));
app.get('/volunteer', (req, res) => sendPage(res, path.join(PAGES, 'volunteer.html')));
app.get('/partner', (req, res) => sendPage(res, path.join(PAGES, 'partner.html')));
app.get('/support', (req, res) => sendPage(res, path.join(PAGES, 'support.html')));
app.get('/contact', (req, res) => sendPage(res, path.join(PAGES, 'contact.html')));
app.get('/privacy-policy', (req, res) => sendPage(res, path.join(PAGES, 'privacy-policy.html')));
app.get('/terms-of-use', (req, res) => sendPage(res, path.join(PAGES, 'terms-of-use.html')));
app.get('/health-disclaimer', (req, res) => sendPage(res, path.join(PAGES, 'health-disclaimer.html')));

app.get('/admin', (req, res) => res.sendFile(path.join(ROOT, 'admin', 'dashboard.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(ROOT, 'admin', 'login.html')));
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.get('/portal', (req, res) => res.redirect(301, '/admin'));
app.get('/portal/login', (req, res) => res.redirect(301, '/admin/login'));
const staticOptions = { maxAge: '1d' };
app.use('/css', express.static(path.join(ROOT, 'css'), staticOptions));
app.use('/js', express.static(path.join(ROOT, 'js'), staticOptions));
app.use('/images', express.static(path.join(ROOT, 'images'), staticOptions));
app.use('/uploads', express.static(path.join(ROOT, 'uploads'), { maxAge: '7d' }));

app.use('/api', signupRouter);
app.use('/api', partnerRouter);
app.use('/api', supportRouter);
app.use('/api', volunteerRouter);
app.use('/api', contactRouter);
app.use('/api', authRouter);
app.use('/api', metricsRouter);
app.use('/api', executivesRouter);
app.use('/api', eventsRouter);
app.use('/api', usersRouter);
app.use('/api', suggestionsRouter);
app.use('/api', adminSummaryRouter);
app.use('/api', siteImagesRouter);
app.use('/api', submissionsRouter);
app.use('/api', newsRouter);
app.use('/api', resourcesRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'A file is too large. Images can be up to 10MB and videos up to 100MB.',
      LIMIT_FILE_COUNT: 'You can upload up to 10 files at a time.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
    };
    return res.status(400).json({ error: messages[err.code] || err.message });
  }
  if (err.isUploadError || /Only JPEG, PNG, or WebP/.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HER Initiative server running at http://localhost:${PORT}`));
