const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(ROOT, 'partials', 'nav.html'), 'utf8');
const footer = fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8');

function sendPage(res, filePath) {
  const html = fs
    .readFileSync(filePath, 'utf8')
    .replace('<!--NAV-->', nav)
    .replace('<!--FOOTER-->', footer);
  res.type('html').send(html);
}

module.exports = { sendPage };
