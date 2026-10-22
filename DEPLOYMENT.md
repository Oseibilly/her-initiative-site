# Deploying to a Hostinger VPS

This walks through taking the site from your machine to a live domain, with
both the domain and the VPS bought through Hostinger.

Do steps 1–2 in the Hostinger hPanel. From step 3 onward you're in a
terminal connected to the VPS.

## 1. Provision the VPS (Hostinger dashboard)

1. In hPanel, create a new VPS. Pick a plain **Ubuntu LTS** template — 22.04,
   24.04, and 26.04 all work (this project was deployed and tested on 26.04)
   — not one of the pre-built app templates, since this project manages its
   own Node/Postgres/nginx stack.
2. Note the VPS's public **IP address** — you'll need it for DNS and SSH.
3. Set a root password or upload an SSH key during setup (SSH key is safer).

## 2. Point the domain at the VPS (Hostinger hPanel)

Since the domain is also on Hostinger, this is done entirely in hPanel — no
separate DNS provider needed.

1. In hPanel, go to **Domains**, select your domain, and open **DNS / Name
   Servers**. Make sure it's using Hostinger's default nameservers (it will
   be, unless you changed them) — that's what lets you manage DNS from the
   same dashboard.
2. Open the domain's **DNS Zone Editor** (sometimes just called "DNS
   Records").
3. Edit (or add) the **A record** for `@` (the root domain) so its value is
   the VPS's IP address. Hostinger usually pre-creates this pointing at
   shared hosting — change it to your VPS's IP instead.
4. Do the same for the **A record** for `www`.
5. Leave TTL at its default. Save.

DNS can take anywhere from a few minutes to a few hours to propagate. You
can check propagation with `nslookup yourdomain.com` or a site like
whatsmydns.net. You can move on to the next steps while it propagates.

DNS can take a few minutes to a few hours to propagate. You can move on to
the next steps while it does.

## 3. Connect to the VPS

```
ssh root@YOUR_VPS_IP
```

## 4. Basic server setup

```bash
apt update && apt upgrade -y

# Create a non-root user to run things under
adduser deploy
usermod -aG sudo deploy
su - deploy
```

Do the rest of these steps as `deploy`, using `sudo` where needed.

## 5. Install Node.js, PostgreSQL, nginx, git

```bash
# Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib nginx git

node --version   # sanity check
```

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # opens 80 + 443
sudo ufw enable
```

## 7. Get the code onto the server

Easiest long-term option: push this project to a GitHub repo, then clone it
here (lets you `git pull` for future updates). If you'd rather skip GitHub
for now, `scp`/`rsync` the folder up instead — either works.

```bash
git clone https://github.com/YOUR_ACCOUNT/her-initiative-site.git
cd her-initiative-site/server
npm install --omit=dev
```

## 8. Set up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE DATABASE her_initiative;"
sudo -u postgres psql -c "CREATE USER her_app WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE her_initiative TO her_app;"
```

Use a fresh, strong password here — don't reuse your local dev one.

## 9. Configure environment variables

```bash
cp .env.example .env
nano .env
```

Fill in:
- `DATABASE_URL=postgres://her_app:CHOOSE_A_STRONG_PASSWORD@localhost:5432/her_initiative`
- `PORT=3000`
- Your real SMTP credentials and `NOTIFY_EMAIL`

Then run the migration:

```bash
npm run migrate
```

## 10. Keep the app running with PM2

```bash
sudo npm install -g pm2
pm2 start index.js --name her-initiative
pm2 save
pm2 startup   # follow the printed instructions (runs pm2 on boot)
```

Useful commands later: `pm2 logs her-initiative`, `pm2 restart her-initiative`.

## 11. Set up nginx as a reverse proxy

`deploy/nginx.conf.example` in this repo is a ready-to-edit template.

```bash
sudo cp ~/her-initiative-site/deploy/nginx.conf.example /etc/nginx/sites-available/her-initiative
sudo nano /etc/nginx/sites-available/her-initiative   # set your real domain
sudo ln -s /etc/nginx/sites-available/her-initiative /etc/nginx/sites-enabled/
sudo nginx -t   # test the config
sudo systemctl restart nginx
```

At this point `http://yourdomain.com` should load the site (via nginx →
the Node app on port 3000).

## 12. Add HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d herinitiativegh.org -d www.herinitiativegh.org
```

Certbot edits the nginx config to add the cert and redirect HTTP → HTTPS
automatically. It also sets up auto-renewal — no further action needed.
`https://yourdomain.com` should now load the site with a valid padlock.

**Once HTTPS is live**, switch the admin login over to secure-only cookies:

```bash
sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' ~/her-initiative-site/server/.env
pm2 restart her-initiative
```

Before this, `/admin` login works fine over HTTP but the session cookie
isn't marked `Secure`. After flipping `NODE_ENV`, admin login will only work
over `https://`, not `http://`.

## Admin panel and member accounts

One login area, one `users` table (`email`, `password_hash`, `full_name`,
`role` — `'admin'` or `'member'`), one session mechanism
(`server/session.js`). Everyone signs in at **`/admin/login`**; what they see
at **`/admin`** depends on their role:

- **Admins** see everything: Dashboard (summary counts), Executive Members
  (photo/name/position — this is what populates the public site's "Who's
  Behind It" section), Events & Meetings (with an optional "email all
  members" checkbox), Manage Users (create/edit/delete any account, and set
  its role), Suggestion Box (read/post/moderate), Impact Metrics, and News.
- **Members** see a reduced view: Executive Members and Events & Meetings
  (both read-only), and the Suggestion Box (read + post, same board as
  admins see).

`/portal` and `/portal/login` (the old separate member area) now just
redirect to `/admin` and `/admin/login`.

**Create or update the first admin account** (every other account — admin
or member — is created from inside `/admin` → Manage Users once you're
logged in):

```bash
cd server && node scripts/create-admin.js
```

Follow the prompts. Run this in a real interactive terminal (SSH session),
not piped/scripted — the prompt needs a live TTY. Re-running it with the
same email updates that account's password and forces its role back to
`admin` — this is also how you reset a forgotten admin password.

Requires `SESSION_SECRET` to be set in `.env` (see `.env.example`). Executive
photos are saved to `images/executives/` on the server (created
automatically) and served statically — no extra setup needed, but back that
folder up along with the database if you ever migrate servers.

## Updating the site later

```bash
ssh deploy@YOUR_VPS_IP
cd her-initiative-site
git pull                       # if using the git-based workflow
cd server && npm install --omit=dev   # only if dependencies changed
pm2 restart her-initiative
```
