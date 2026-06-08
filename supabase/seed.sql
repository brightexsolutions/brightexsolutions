-- Brightex Solutions — Dummy Data Seed
-- Run AFTER 001_schema.sql
-- Use this to populate all tables with test data for admin dashboard development.

-- ─────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────
insert into clients (id, name, email, phone, company, classification, source, notes, last_contacted_at) values
  ('11111111-0000-0000-0000-000000000001', 'Amara Osei', 'amara@becointeriors.co.ke', '+254711001001', 'Beco Interiors', 'active', 'referral', 'E-commerce project completed. Interested in retainer.', now() - interval '3 days'),
  ('11111111-0000-0000-0000-000000000002', 'James Kariuki', 'james@talkways.co.ke', '+254722002002', 'Talkways Languages', 'active', 'contact_form', 'Happy with website results. Wants SEO retainer.', now() - interval '5 days'),
  ('11111111-0000-0000-0000-000000000003', 'Pastor David Mwangi', 'david@greenhouse.or.ke', '+254733003003', 'Greenhouse Worship', 'past', 'referral', 'Project complete. Good relationship.', now() - interval '30 days'),
  ('11111111-0000-0000-0000-000000000004', 'Sarah Ndung''u', 'sarah@africafeaturenetwork.com', '+254744004004', 'Africa Feature Network', 'active', 'direct', 'Ongoing editorial support.', now() - interval '7 days'),
  ('11111111-0000-0000-0000-000000000005', 'Janet Otieno', 'janet@amuchesoven.co.ke', '+254755005005', 'Amuches Oven', 'past', 'social', 'Online bakery system delivered.', now() - interval '60 days'),
  ('11111111-0000-0000-0000-000000000006', 'Dr. Kamau Mwangi', 'kamau@verbeducation.co.ke', '+254766006006', 'Verb Education', 'active', 'referral', 'CBC platform live. Discussing analytics upgrade.', now() - interval '2 days'),
  ('11111111-0000-0000-0000-000000000007', 'Lydia Wanjiku', 'lydia@wanjiku.co.ke', '+254777007007', 'Wanjiku Consulting', 'qualified', 'contact_form', 'Budget confirmed. Wants full website + CRM.', now() - interval '1 day'),
  ('11111111-0000-0000-0000-000000000008', 'Michael Onyango', 'michael@onyango.ke', '+254788008008', null, 'lead', 'contact_form', 'Enquired about mobile app. No response since.', now() - interval '14 days'),
  ('11111111-0000-0000-0000-000000000009', 'Grace Mutua', 'grace@mutua.co.ke', '+254799009009', 'Mutua Realty', 'ghost', 'direct', 'Was very interested, stopped responding after proposal.', now() - interval '21 days'),
  ('11111111-0000-0000-0000-000000000010', 'Purity Njeri', 'purity@njeri.co.ke', '+254700010010', 'Njeri Fashions', 'unqualified', 'social', 'Budget too small for scope required.', now() - interval '10 days');

-- ─────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────
insert into projects (id, client_id, name, type, status, budget, start_date, end_date, notes) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Beco Interiors E-Commerce', 'website', 'live', 180000, '2025-09-01', '2025-11-30', 'WordPress WooCommerce. Live at beco-interiors.netlify.app'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Talkways Languages Website', 'website', 'live', 95000, '2025-10-15', '2025-12-20', 'Education site with SEO. Live at talkwayslanguages.com'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Greenhouse Worship Site', 'website', 'live', 60000, '2025-08-01', '2025-09-30', 'Community website. Live at thegreenhouse-w-s.netlify.app'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Africa Feature Network Platform', 'website', 'live', 220000, '2025-06-01', '2025-10-31', 'WordPress media platform. Live at africafeaturenetwork.com'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'Amuches Oven Ordering System', 'website', 'live', 75000, '2025-07-01', '2025-08-31', 'Next.js ordering app. Live at amuches-oven.netlify.app'),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'CBC App — Verb Education', 'web_app', 'live', 450000, '2025-03-01', '2025-09-30', 'EdTech SaaS. Live at cbcapp.co.ke'),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'Wanjiku Consulting Website', 'website', 'design', 120000, '2026-05-20', null, 'Discovery complete. Moving into design phase.');

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
insert into tasks (project_id, title, status, priority, due_date) values
  ('22222222-0000-0000-0000-000000000007', 'Finalise brand moodboard', 'done', 'high', '2026-05-22'),
  ('22222222-0000-0000-0000-000000000007', 'Design homepage wireframes', 'in_progress', 'high', '2026-05-28'),
  ('22222222-0000-0000-0000-000000000007', 'Create services page layout', 'todo', 'normal', '2026-06-02'),
  ('22222222-0000-0000-0000-000000000007', 'Write copy for hero section', 'todo', 'normal', '2026-05-30'),
  ('22222222-0000-0000-0000-000000000007', 'Client design review call', 'todo', 'high', '2026-06-03');

-- ─────────────────────────────────────────────
-- SALES PIPELINE
-- ─────────────────────────────────────────────
insert into sales (client_id, service, estimated_value, status, notes) values
  ('11111111-0000-0000-0000-000000000007', 'Full website + CRM integration', 120000, 'negotiation', 'Client wants discount on CRM module. Holding at 120K.'),
  ('11111111-0000-0000-0000-000000000006', 'Analytics dashboard upgrade — CBC App', 180000, 'proposal', 'Proposal sent 2026-05-20. Awaiting board approval.'),
  ('11111111-0000-0000-0000-000000000001', 'SEO retainer (3 months)', 90000, 'won', 'Starting June 2026.'),
  ('11111111-0000-0000-0000-000000000008', 'Mobile app — Android', 350000, 'lead', 'Initial enquiry only. Budget not confirmed.');

-- ─────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────
insert into invoices (id, client_id, project_id, invoice_number, items, subtotal, tax, total, status, due_date) values
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'BRX-2025-001',
    '[{"description":"E-Commerce Website Design & Development","qty":1,"unit_price":180000,"total":180000}]',
    180000, 0, 180000, 'paid', '2025-12-15'),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'BRX-2025-002',
    '[{"description":"Website Design & Development","qty":1,"unit_price":80000,"total":80000},{"description":"SEO Setup","qty":1,"unit_price":15000,"total":15000}]',
    95000, 0, 95000, 'paid', '2026-01-10'),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000006', 'BRX-2025-003',
    '[{"description":"CBC Learning Platform — Phase 1","qty":1,"unit_price":450000,"total":450000}]',
    450000, 0, 450000, 'paid', '2025-10-01'),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', null, 'BRX-2026-001',
    '[{"description":"SEO Retainer — June 2026","qty":1,"unit_price":30000,"total":30000}]',
    30000, 0, 30000, 'sent', '2026-06-05'),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000007', 'BRX-2026-002',
    '[{"description":"Website Design — Deposit (50%)","qty":1,"unit_price":60000,"total":60000}]',
    60000, 0, 60000, 'draft', '2026-06-10');

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────
insert into payments (invoice_id, amount, method, reference, confirmation_sent, date) values
  ('33333333-0000-0000-0000-000000000001', 180000, 'mpesa', 'QJH3820KE1', true, '2025-12-10'),
  ('33333333-0000-0000-0000-000000000002', 95000, 'bank', 'TXN-2026-0110', true, '2026-01-08'),
  ('33333333-0000-0000-0000-000000000003', 450000, 'bank', 'TXN-2025-0930', true, '2025-09-28');

-- ─────────────────────────────────────────────
-- INCOME RECORDS
-- ─────────────────────────────────────────────
insert into income_records (source, description, client_id, amount, currency, date, category) values
  ('invoice_payment', 'Beco Interiors — E-Commerce project', '11111111-0000-0000-0000-000000000001', 180000, 'KES', '2025-12-10', 'service_revenue'),
  ('invoice_payment', 'Talkways Languages — Website + SEO', '11111111-0000-0000-0000-000000000002', 95000, 'KES', '2026-01-08', 'service_revenue'),
  ('invoice_payment', 'Verb Education — CBC App Phase 1', '11111111-0000-0000-0000-000000000006', 450000, 'KES', '2025-09-28', 'service_revenue');

-- ─────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────
insert into expenses (description, category, amount, currency, date, vendor, tax_deductible) values
  ('Domain renewal — brightexsolutions.co.ke', 'subscription', 1500, 'KES', '2026-01-15', 'Namecheap', true),
  ('Adobe Creative Cloud — annual', 'software', 32000, 'KES', '2026-01-01', 'Adobe', true),
  ('Figma Pro — annual', 'software', 18000, 'KES', '2026-02-01', 'Figma', true),
  ('Transport to client meeting — Westlands', 'transport', 800, 'KES', '2026-05-20', null, true),
  ('Business cards printing', 'marketing', 3500, 'KES', '2026-03-10', 'Print Express Nairobi', true);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS (business costs)
-- ─────────────────────────────────────────────
insert into subscriptions (name, provider, category, amount, currency, billing_cycle, next_renewal_date, auto_renew, login_url) values
  ('brightexsolutions.co.ke domain', 'Namecheap', 'domain', 1500, 'KES', 'yearly', '2027-01-15', true, 'https://namecheap.com'),
  ('Vercel Hobby (free)', 'Vercel', 'hosting', 0, 'KES', 'monthly', '2026-06-01', true, 'https://vercel.com'),
  ('Adobe Creative Cloud', 'Adobe', 'software', 32000, 'KES', 'yearly', '2027-01-01', true, 'https://adobe.com'),
  ('Figma Professional', 'Figma', 'tool', 18000, 'KES', 'yearly', '2027-02-01', true, 'https://figma.com'),
  ('ChatGPT Plus', 'OpenAI', 'software', 2600, 'KES', 'monthly', '2026-06-01', true, 'https://chat.openai.com'),
  ('Supabase Free Tier', 'Supabase', 'software', 0, 'KES', 'monthly', '2026-06-01', true, 'https://supabase.com');

-- ─────────────────────────────────────────────
-- TEAM MEMBERS
-- ─────────────────────────────────────────────
insert into team_members (id, name, email, phone, role, skill_tags, rate_type, default_rate, active) values
  ('44444444-0000-0000-0000-000000000001', 'Kevin Ochieng', 'kevin@dev.co.ke', '+254711100001', 'subcontractor', ARRAY['frontend', 'react', 'nextjs'], 'hourly', 2500, true),
  ('44444444-0000-0000-0000-000000000002', 'Fatma Ali', 'fatma@design.co.ke', '+254722200002', 'subcontractor', ARRAY['ui_design', 'figma', 'branding'], 'fixed', 40000, true),
  ('44444444-0000-0000-0000-000000000003', 'Brenda Achieng', 'brenda@marketing.co.ke', '+254733300003', 'marketing', null, null, null, true),
  ('44444444-0000-0000-0000-000000000004', 'Moses Kiprop', 'moses@finance.co.ke', '+254744400004', 'finance', null, null, null, true);

-- ─────────────────────────────────────────────
-- TASKS (assigned to subcontractor)
-- ─────────────────────────────────────────────
insert into tasks (project_id, title, description, assigned_to, status, priority, due_date) values
  ('22222222-0000-0000-0000-000000000007', 'Build homepage component', 'Implement the homepage in Next.js from approved wireframes.', '44444444-0000-0000-0000-000000000001', 'todo', 'high', '2026-06-05'),
  ('22222222-0000-0000-0000-000000000007', 'Design contact page mockup', 'Figma mockup for contact page — split screen layout.', '44444444-0000-0000-0000-000000000002', 'in_progress', 'normal', '2026-05-29');

-- ─────────────────────────────────────────────
-- SUBCONTRACTOR PAYOUTS
-- ─────────────────────────────────────────────
insert into subcontractor_payouts (subcontractor_id, project_id, amount, currency, status, due_date) values
  ('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007', 30000, 'KES', 'pending', '2026-06-10'),
  ('44444444-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000007', 40000, 'KES', 'pending', '2026-06-10');

-- ─────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────
insert into bookings (booker_name, booker_email, booker_phone, purpose, scheduled_at, status, notes) values
  ('Lydia Wanjiku', 'lydia@wanjiku.co.ke', '+254777007007', 'project_review', now() + interval '2 days', 'confirmed', 'Design review for homepage wireframes'),
  ('Dr. Kamau Mwangi', 'kamau@verbeducation.co.ke', '+254766006006', 'consultation', now() + interval '5 days', 'pending', 'Discussing analytics upgrade scope'),
  ('James Kariuki', 'james@talkways.co.ke', '+254722002002', 'intro_call', now() + interval '8 days', 'pending', 'Intro call for SEO retainer discussion'),
  ('New Prospect', 'prospect@example.com', null, 'intro_call', now() - interval '1 day', 'completed', 'Completed — no follow-up yet');

-- ─────────────────────────────────────────────
-- CHAT FAQs
-- ─────────────────────────────────────────────
insert into chat_faqs (question, answer, keywords, category, order_index, active) values
  ('What services does Brightex offer?',
   'We offer web design & development, mobile app development, UI/UX design, SEO, branding, and custom software solutions for businesses across Kenya and East Africa.',
   ARRAY['services', 'what do you do', 'offerings', 'help', 'offer'],
   'services', 1, true),
  ('How much does a website cost?',
   'Our websites start from KES 50,000 for simple business sites, and go up to KES 500,000+ for complex e-commerce or SaaS platforms. Every project is quoted individually — book a free call to get an accurate estimate.',
   ARRAY['price', 'cost', 'how much', 'pricing', 'rates', 'charges'],
   'pricing', 2, true),
  ('How long does a project take?',
   'A standard business website typically takes 4–8 weeks. Complex web apps and e-commerce platforms take 3–6 months. We''ll give you a clear timeline during our discovery call.',
   ARRAY['how long', 'timeline', 'duration', 'weeks', 'months', 'turnaround'],
   'process', 3, true),
  ('Do you work with clients outside Kenya?',
   'Yes! We work with clients across East Africa and internationally. We communicate via WhatsApp, Zoom, and email — distance is no barrier.',
   ARRAY['outside kenya', 'international', 'remote', 'africa', 'diaspora'],
   'general', 4, true),
  ('How do I get started?',
   'The easiest way is to book a free 30-minute intro call using the /book link. We''ll discuss your project, answer questions, and give you a quote. No commitment required.',
   ARRAY['get started', 'begin', 'start', 'how to', 'contact', 'quote'],
   'process', 5, true),
  ('What is CBC App?',
   'CBC App is a Kenya curriculum (CBC) learning platform we built for Verb Education — designed for students and teachers with curriculum-aligned content, progress tracking, and analytics. Visit cbcapp.co.ke to learn more.',
   ARRAY['cbc', 'education', 'verb', 'school', 'learning platform'],
   'products', 6, true);

-- ─────────────────────────────────────────────
-- ANNOUNCEMENTS
-- ─────────────────────────────────────────────
insert into announcements (title, body, type, cta_label, cta_url, display_location, active, ends_at) values
  ('Now Booking for Q3 2026',
   'Limited slots available for new projects starting July 2026. Book a discovery call to secure your spot.',
   'offer',
   'Book a Call',
   '/book',
   ARRAY['home_hero'],
   true,
   '2026-06-30 23:59:00+03');

-- ─────────────────────────────────────────────
-- SITES (monitoring)
-- ─────────────────────────────────────────────
insert into sites (name, url, platform, hosting, integration_level, status, last_checked, response_time_ms) values
  ('Brightex Solutions (main)', 'https://www.brightexsolutions.com', 'nextjs', 'vercel', 'active', 'up', now() - interval '1 hour', 210),
  ('Beco Interiors', 'https://beco-interiors.netlify.app', 'nextjs', 'netlify', 'passive', 'up', now() - interval '2 hours', 380),
  ('Talkways Languages', 'https://talkwayslanguages.com', 'wordpress', 'hostinger', 'wordpress', 'up', now() - interval '2 hours', 520),
  ('Greenhouse Worship', 'https://thegreenhouse-w-s.netlify.app', 'nextjs', 'netlify', 'passive', 'up', now() - interval '3 hours', 290),
  ('Africa Feature Network', 'https://africafeaturenetwork.com', 'wordpress', 'cpanel', 'wordpress', 'degraded', now() - interval '1 hour', 1850),
  ('Amuches Oven', 'https://amuches-oven.netlify.app', 'nextjs', 'netlify', 'passive', 'up', now() - interval '2 hours', 320);

-- ─────────────────────────────────────────────
-- SYSTEM ALERTS
-- ─────────────────────────────────────────────
insert into system_alerts (type, severity, message, entity_type, acknowledged) values
  ('site_down', 'warning', 'Africa Feature Network response time exceeded 1500ms — site may be degraded.', 'site', false),
  ('ssl_expiring', 'warning', 'Talkways Languages SSL certificate expires in 28 days.', 'site', false),
  ('wp_update', 'info', 'Africa Feature Network is running WordPress 6.4. WordPress 6.8 is available.', 'site', false);

-- ─────────────────────────────────────────────
-- SOCIAL POSTS (content planning)
-- ─────────────────────────────────────────────
insert into social_posts (created_by, platforms, caption, hashtags, scheduled_at, status) values
  ('44444444-0000-0000-0000-000000000003',
   ARRAY['instagram', 'facebook'],
   'Excited to announce we just launched a new e-commerce experience for Beco Interiors! 🛒 From wireframe to live store — every detail crafted for a seamless shopping experience. #WebDesign #Ecommerce #Kenya',
   ARRAY['WebDesign', 'Ecommerce', 'Kenya', 'BrightexSolutions'],
   now() + interval '3 days',
   'pending_approval'),
  ('44444444-0000-0000-0000-000000000003',
   ARRAY['linkedin', 'instagram'],
   'Did you know that 78% of users judge a business''s credibility based on their website? Your website is your first impression — make it count. DM us to discuss your next project.',
   ARRAY['WebDevelopment', 'DigitalMarketing', 'BusinessGrowth', 'Nairobi'],
   now() + interval '7 days',
   'draft');

-- ─────────────────────────────────────────────
-- CALENDAR EVENTS (manual examples)
-- ─────────────────────────────────────────────
insert into calendar_events (title, type, start_at, end_at, all_day, entity_type) values
  ('Wanjiku Consulting — Design Review', 'booking', now() + interval '2 days 10 hours', now() + interval '2 days 10 hours 30 minutes', false, 'booking'),
  ('CBC App Analytics Scope Call', 'booking', now() + interval '5 days 14 hours', now() + interval '5 days 15 hours', false, 'booking'),
  ('Subscription: Adobe CC renewal', 'subscription_renewal', '2027-01-01 00:00:00+03', null, true, 'subscription'),
  ('Subscription: Figma Pro renewal', 'subscription_renewal', '2027-02-01 00:00:00+03', null, true, 'subscription'),
  ('Wanjiku site — Homepage component due', 'task_deadline', '2026-06-05 23:59:00+03', null, true, 'project'),
  ('Social post: Beco Interiors launch', 'social_post', now() + interval '3 days', null, true, null);

-- ─────────────────────────────────────────────
-- COMMUNICATIONS LOG
-- ─────────────────────────────────────────────
insert into communications (client_id, type, subject, body, direction, status) values
  ('11111111-0000-0000-0000-000000000007', 'email', 'Project proposal — Wanjiku Consulting website', 'Sent full proposal with scope, timeline, and pricing breakdown.', 'out', 'sent'),
  ('11111111-0000-0000-0000-000000000006', 'whatsapp', 'Analytics upgrade discussion', 'Discussed scope of analytics dashboard upgrade. Client interested — awaiting board approval.', 'out', 'sent'),
  ('11111111-0000-0000-0000-000000000001', 'email', 'SEO retainer invoice', 'Sent BRX-2026-001 for June SEO retainer.', 'out', 'sent');

-- ─────────────────────────────────────────────
-- AVAILABILITY SLOTS (Mon–Fri, 9am–5pm EAT)
-- ─────────────────────────────────────────────
insert into availability_slots (day_of_week, start_time, end_time, active) values
  (1, '09:00', '17:00', true),  -- Monday
  (2, '09:00', '17:00', true),  -- Tuesday
  (3, '09:00', '17:00', true),  -- Wednesday
  (4, '09:00', '17:00', true),  -- Thursday
  (5, '09:00', '17:00', true);  -- Friday
