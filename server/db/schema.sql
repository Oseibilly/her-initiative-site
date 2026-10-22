CREATE TABLE IF NOT EXISTS community_signups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  newsletter BOOLEAN NOT NULL DEFAULT false,
  support_groups BOOLEAN NOT NULL DEFAULT false,
  events BOOLEAN NOT NULL DEFAULT false,
  volunteering BOOLEAN NOT NULL DEFAULT false,
  financial_support BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_inquiries (
  id SERIAL PRIMARY KEY,
  organization TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  partnership_opportunities BOOLEAN NOT NULL DEFAULT false,
  healthcare_collaboration BOOLEAN NOT NULL DEFAULT false,
  corporate_partnerships BOOLEAN NOT NULL DEFAULT false,
  research_collaborations BOOLEAN NOT NULL DEFAULT false,
  sponsorship_information BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_interests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  donating BOOLEAN NOT NULL DEFAULT false,
  sponsorship BOOLEAN NOT NULL DEFAULT false,
  programmes BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_metrics (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO impact_metrics (key, label, value, sort_order) VALUES
  ('people_reached', 'People reached', 0, 1),
  ('people_educated', 'People educated', 0, 2),
  ('communities_engaged', 'Communities engaged', 0, 3),
  ('volunteers_advocates', 'Volunteers and advocates', 0, 4),
  ('partnerships', 'Partnerships', 0, 5),
  ('learning_outcomes', 'Learning and outcomes', 0, 6)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS news_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executives (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  notify_members BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS volunteer_applications (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_images (
  key TEXT PRIMARY KEY,
  image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'partnerships', 'programs', 'media')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
