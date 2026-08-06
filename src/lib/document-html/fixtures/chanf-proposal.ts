/**
 * The CHANF proposal as a block document.
 *
 * This is the reference fixture for the block model: a real, complete,
 * hand-authored proposal (docs/fixtures/brightex_chanf_proposal_2026-08.html,
 * August 2026) re-expressed through the house builders. If the model cannot
 * carry this document without loss, the model is wrong.
 *
 * Copy is verbatim from the authored file, with one deliberate change: the six
 * em dashes it contained are replaced (Brightex copy never uses them, and the
 * phase names read better with a colon anyway). Everything the authored file
 * did not have, the shell now provides: a responsive layout for the link view,
 * A4 in print, `data-label` table collapsing, a print button that survives
 * upload sanitising, and derived section numbers and contents.
 *
 * Preview it at /api/admin/preview/block-document?fixture=chanf.
 */
import type { BlockDocument } from "../blocks";

export const CHANF_PROPOSAL: BlockDocument = {
  version: 2,
  type: "proposal",
  meta: {
    title: "Website Redesign Proposal: CHANF Healthcare Technical Training Institute",
    coverTag: "Website redesign & digital partnership proposal",
    coverTitle: "A recruitment website built to convert the attention CHANF has already earned.",
    coverSub:
      "A phased plan to rebuild chan-f.or.ke as a mobile-first, trust-driven recruitment platform, with a clear path into ongoing partnership.",
    reference_code: "BX-CHANF-0826",
    created_at: "2026-08-04",
    client: { name: "CHANF Healthcare Technical Training Institute", company: "CHANF Healthcare Technical Training Institute" },
    badges: [
      { label: "Investment", value: "KES 100,000 - 120,000" },
      { label: "Timeline", value: "6 to 8 weeks" },
      { label: "Delivery phases", value: "3" },
    ],
  },

  schedule: {
    mode: "standard",
    stages: [
      { label: "Deposit, to commence development", percent: 60, trigger: "on_signature" },
      { label: "On completion and launch", percent: 40, trigger: "on_completion" },
    ],
  },

  sections: [
    // ── 01 ──────────────────────────────────────────────────────────────────
    {
      id: "exec",
      tag: "Overview",
      title: "Executive Summary",
      blocks: [
        {
          id: "exec-kpi",
          kind: "kpi_row",
          items: [
            { value: "KES 100K - 120K", label: "Total investment" },
            { value: "6 to 8 weeks", label: "Delivery timeline" },
            { value: "3", label: "Delivery phases" },
            { value: "60 / 40", label: "Payment split" },
          ],
        },
        {
          id: "exec-lede",
          kind: "exec_lede",
          text:
            "CHANF does not have a visibility problem. It has a conversion problem: strong outcomes and real social activity are not being turned into applications, because the website that should be doing that work is currently down.",
          paragraphs: [
            "This proposal covers a full rebuild of chan-f.or.ke into a mobile-first recruitment platform with clear course information, working WhatsApp and enquiry funnels, authentic trust content, and analytics that finally show which efforts are producing enrolments. It is scoped in three phases so CHANF can see progress and results at each stage, not just at the end.",
          ],
        },
      ],
    },

    // ── 02 ──────────────────────────────────────────────────────────────────
    {
      id: "brief",
      tag: "Context",
      title: "Understanding the Brief",
      blocks: [
        {
          id: "brief-intro",
          kind: "prose",
          paragraphs: [
            "Since its founding during COVID, CHANF has built genuine credibility as a NITA and DOSH accredited healthcare training institute, including its first graduation on 7 November 2025 with 24 graduates and documented placements, among them a graduate now working as a caregiver in Canada. That track record is not currently visible anywhere a prospective student or parent would look.",
          ],
        },
        {
          id: "brief-cards",
          kind: "cards_grid",
          cards: [
            {
              icon: "!",
              title: "The site is currently down",
              body: "A lapsed hosting and subscription issue has taken chan-f.or.ke offline. This needs to be resolved immediately, independent of the rebuild timeline.",
            },
            {
              icon: "!",
              title: "Applications are fully manual",
              body: "There is no online application flow today. Prospective students enquire and apply through WhatsApp, calls, or in person, with no digital record or tracking.",
            },
            {
              icon: "!",
              title: "Enquiries depend on inconsistent paid boosting",
              body: "Facebook, Instagram and TikTok boosts drive most enquiries, but the schedule is irregular and many leads are low quality: job seekers rather than prospective students.",
            },
            {
              icon: "!",
              title: "No tracking on what actually works",
              body: "There is no analytics on the site and no consistent way to tell which channel, page, or campaign is producing real enrolments.",
            },
          ],
        },
        {
          id: "brief-note",
          kind: "note",
          heading: "Note",
          text:
            "CHANF already holds strong content assets, including quality photos and real success stories that perform well on WhatsApp. The rebuild is largely about harmonising and surfacing what already exists, not creating everything from scratch.",
        },
      ],
    },

    // ── 03 ──────────────────────────────────────────────────────────────────
    {
      id: "scope",
      tag: "Delivery plan",
      title: "Project Scope & Phases",
      blocks: [
        {
          id: "scope-intro",
          kind: "prose",
          paragraphs: [
            "Delivered in three phases so early wins (site recovery, visibility) land before the full rebuild is complete.",
          ],
        },
        {
          id: "scope-phases",
          kind: "phases",
          phases: [
            {
              name: "Phase 1: Stabilise & Discover",
              duration: "Week 1",
              items: [
                "Diagnose and resolve the hosting and subscription issue, bringing chan-f.or.ke back online",
                "Full content and asset audit: courses, fees, photos, testimonials, accreditation documents",
                "Confirm site architecture and sign off on final scope",
              ],
            },
            {
              name: "Phase 2: Core Website Design & Build",
              duration: "Weeks 2 to 5",
              items: [
                "Mobile-first design and build of nine pages: Home, About, Courses (one template serving all courses), Admissions, Gallery, Graduate Stories, Blog, FAQ and Contact",
                "Online application form, replacing the current fully manual process, with submissions delivered to a nominated CHANF inbox",
                "Website chat assistant that answers common questions (fees, intake dates, entry requirements, location) from a set of answers CHANF approves, and hands over to WhatsApp for anything it cannot answer",
                "WhatsApp Admissions button and enquiry funnel present sitewide",
                "Trust-building content: accreditation badges, graduation proof, testimonials, and the updated photography CHANF supplies",
                "Google Maps embed, social feed embeds, email newsletter signup",
                "Two rounds of revisions on the design, within the agreed scope",
              ],
            },
            {
              name: "Phase 3: Analytics, SEO Setup & Launch",
              duration: "Weeks 6 to 8",
              items: [
                "Google Analytics 4 and Search Console setup to track engagement, page behaviour, and conversions",
                'One-time on-page SEO setup across every page built: page titles, meta descriptions, headings, image alt text, internal linking and a sitemap, targeting searches such as "caregiving courses Kitengela" and "healthcare courses Kenya"',
                "Google Business Profile setup or claim, so the institute appears on Maps and in local search",
                "Cross-device testing, client review, and one round of launch corrections",
                "Domain and DNS cutover, and go-live",
              ],
            },
          ],
        },
        {
          id: "scope-needs",
          kind: "note",
          solid: true,
          heading: "What Brightex will need from CHANF to begin",
          text: "",
          items: [
            "Access to the domain registrar account for chan-f.or.ke (login, or added as an authorised manager), so DNS can be reviewed and migrated as part of Phase 1",
            "Access to the current hosting account, or confirmation of the hosting provider, so the outage can be diagnosed and a decision made on repair against migration",
            "Login access to the current website's admin or CMS, if it exists, for content and asset recovery",
            "Logo files, brand colours, and fonts, if already established. If CHANF does not have these formalised yet, Brightex can develop a simple brand identity (logo refinement, colour palette, typography) as a separate scoped add-on before the site build begins",
            "Current course list with fees, requirements, and durations",
            "Updated photography and any video content, replacing the existing outdated hospital images",
            "Testimonials and graduate stories, including any existing accreditation documents (NITA and DOSH) and trainer bios and photos if these should feature on the site",
            "Access to any existing Google Analytics, Search Console, or Google Business Profile accounts, if previously set up",
            "A single point of contact for content sign-off and questions during the build",
          ],
        },
        {
          id: "scope-assets",
          kind: "note",
          heading: "How to share photos, videos, and documents",
          text:
            "To keep everything organised and avoid assets getting lost across WhatsApp threads and email, please share all photo, video, and document assets through a single, structured Google Drive folder, shared with edit access to the Brightex team. A simple structure that works well:",
          mono: [
            "CHANF Website Assets/",
            "  01 - Logo & Branding/",
            "  02 - Course Photos/ (one subfolder per course)",
            "  03 - Campus & Facility Photos/",
            "  04 - Graduate Stories & Testimonials/ (photos, videos, written quotes)",
            "  05 - Trainer Photos & Bios/",
            "  06 - Accreditation Documents/ (NITA, DOSH certificates)",
            "  07 - Course Fee Sheets & Requirements/",
          ].join("\n"),
        },
      ],
    },

    // ── 04 ── Indicative: raised on the call, deliberately unpriced ─────────
    {
      id: "enhancements",
      tag: "Looking ahead",
      title: "Suggested Enhancements",
      indicative: true,
      blocks: [
        {
          id: "enh-intro",
          kind: "prose",
          paragraphs: [
            "These sit outside the scope and pricing in this proposal. They are flagged here because CHANF's team raised process gaps on the call, mainly around telling serious applicants apart from job seekers, and tracking students once they enrol, that these tools are built to solve. Worth discussing once the core site is live, not before.",
          ],
        },
        {
          id: "enh-cards",
          kind: "cards_grid",
          cards: [
            {
              icon: "1",
              title: "Internal CRM and lead tracker",
              points: [
                "Every website enquiry logged automatically instead of living only in WhatsApp threads",
                "Simple tagging to separate genuine applicants from job seekers, addressing the lead-quality issue raised on the call",
                "Gives the admissions team a single place to follow up, instead of scrolling chat history",
              ],
            },
            {
              icon: "2",
              title: "Learner dashboard and student portal",
              points: [
                "Enrolled students log in to see class schedules, results, and payment balances",
                "Reduces walk-in and phone-call admin load on staff",
                "Doubles as a source of authentic, ongoing testimonial and outcome content for the site",
              ],
            },
            {
              icon: "3",
              title: "WhatsApp automation",
              points: [
                "Extends the website chat assistant, which is included in this proposal, onto WhatsApp where most enquiries actually arrive",
                "Pre-qualifies enquiries so staff spend time on serious applicants first",
                "Requires a WhatsApp Business API account, which carries its own monthly cost",
              ],
            },
            {
              icon: "4",
              title: "Automated fee and payment tracking",
              points: [
                "Digital record of who has paid, what is outstanding, and payment deadlines per intake",
                "Removes reliance on manual spreadsheets or paper records",
              ],
            },
          ],
        },
        {
          id: "enh-note",
          kind: "note",
          heading: "How this streamlines things",
          text:
            "Today, enquiry tracking, applicant follow-up, and student records all happen manually across WhatsApp, phone calls, and paper. Each tool above digitises one part of that chain. They are independent of each other, so CHANF can adopt one, several, or none, and each would be scoped and priced separately once the core site is live and stable.",
        },
      ],
    },

    // ── 05 ─────────────────────────────────────────────────────────────────
    // gated: pricing blurs behind the walkthrough card when the document-level
    // gate is on. Nothing else in the proposal is withheld, so the client can
    // read and judge the whole plan and only the numbers wait for the call.
    {
      id: "investment",
      tag: "Pricing",
      title: "Investment & Pricing",
      gated: true,
      blocks: [
        {
          id: "inv-table",
          kind: "phased_investment_table",
          rows: [
            { phase: "Phase 1", desc: "Site recovery, content audit and discovery", amount: "15,000 - 20,000" },
            { phase: "Phase 2", desc: "Nine-page mobile-first build, online application form and website chat assistant", amount: "60,000 - 70,000" },
            { phase: "Phase 3", desc: "Analytics, one-time SEO setup, Google Business Profile and launch", amount: "25,000 - 30,000" },
          ],
          total: { label: "Total investment range", amount: "100,000 - 120,000" },
        },
        {
          id: "inv-terms",
          kind: "key_value_list",
          items: [
            {
              label: "Payment structure",
              detail: "60% deposit upfront to commence development, 40% due on completion and launch.",
            },
          ],
        },
        {
          id: "inv-hosting",
          kind: "note",
          heading: "Domain and hosting",
          text:
            "Brightex Solutions will handle initial domain and hosting setup. Annual domain renewal (approximately KES 2,000 to 3,500) and ongoing hosting costs remain CHANF's direct responsibility.",
        },
        {
          id: "inv-out",
          kind: "scope_out",
          heading: "Out of scope, available separately on request",
          rows: [
            {
              label: "Social media management and paid ad strategy",
              detail:
                "Not offered in-house by Brightex Solutions. This includes day-to-day posting, paid boosting strategy, and campaign management across TikTok, Instagram and Facebook. Brightex Solutions can recommend a trusted independent social media manager or agency to take this on.",
            },
            {
              label: "Ongoing SEO and content marketing",
              detail:
                "Phase 3 includes a one-time SEO setup: the pages built are correctly titled, described, structured and submitted. Ranking improves over months and is driven by publishing new content and earning links, which is continuing work. That is available from the Growth retainer tier, not as part of this build.",
            },
            {
              label: "LinkedIn and multi-platform content strategy",
              detail:
                "Ongoing thought-leadership and content strategy across platforms beyond the website's own blog is outside this scope.",
            },
            {
              label: "Graduate testimonial video production",
              detail:
                "Professional video testimonials can be scoped and priced separately if CHANF wants to pursue this as an enhancement.",
            },
          ],
        },
      ],
    },

    // ── 06 ──────────────────────────────────────────────────────────────────
    {
      id: "timeline",
      tag: "Schedule",
      title: "Timeline",
      blocks: [
        {
          id: "tl",
          kind: "timeline",
          rows: [
            { week: "Week 1", title: "Stabilise & Discover", desc: "Site recovery, content audit, architecture sign-off" },
            { week: "Weeks 2 to 5", title: "Design & Build", desc: "Core pages, application flow, WhatsApp funnel, trust content" },
            { week: "Weeks 6 to 7", title: "Analytics, SEO & Testing", desc: "GA4 and Search Console, on-page SEO, cross-device QA, client review" },
            { week: "Week 8", title: "Launch", desc: "Domain and DNS cutover, go-live, Google Business Profile submission", launch: true },
          ],
        },
      ],
    },

    // ── 07 ──────────────────────────────────────────────────────────────────
    {
      id: "success",
      tag: "Results",
      title: "Measuring Success",
      blocks: [
        {
          id: "succ-intro",
          kind: "prose",
          paragraphs: [
            "Once live, the site reports on the same things CHANF told us matter: traffic, enquiries, WhatsApp conversations, applications, and enrolments. Analytics set up in Phase 3 makes each of these visible rather than anecdotal.",
          ],
        },
        {
          id: "succ-table",
          kind: "data_table",
          headers: ["What we track", "How it is measured", "Realistic timeline"],
          rows: [
            ["Website traffic and search visibility", "GA4 and Google Search Console", "2 to 4 weeks post-launch"],
            ["Course page engagement", "Page views, time on page, scroll behaviour", "Immediate"],
            ["WhatsApp and Apply Now clicks", "Click tracking on CTA buttons", "Immediate"],
            ["Online applications submitted", "Application form submissions", "Immediate"],
            ["Search ranking for target keywords", "Search Console position tracking", "Moves over 3 to 6 months, and only with new content"],
            ["Enrolments per intake", "Cross-referenced with CHANF's admissions records", "Each intake cycle"],
          ],
        },
        {
          id: "succ-note",
          kind: "note",
          heading: "The honest picture",
          text:
            "The website will make traffic, enquiries, and applications visible and trackable from day one. It will not, by itself, guarantee more enrolments. That last step still depends on how quickly CHANF's team follows up on enquiries, how consistently course and intake information stays current on the site, and intake capacity. A monthly numbers review (included from the Growth retainer tier upward) is where the website's data and CHANF's admissions reality get looked at together, so decisions are based on what the numbers actually show, not assumptions.",
        },
      ],
    },

    // ── 08 ── Indicative: a post-launch decision, not part of this fee ──────
    {
      id: "retainer",
      tag: "Retainer",
      title: "Ongoing Partnership",
      indicative: true,
      blocks: [
        {
          id: "ret-intro",
          kind: "prose",
          paragraphs: [
            "Beyond launch, Brightex Solutions offers three retainer tiers to keep the site secure, current, and actively working toward enrolment growth. Scope stays deliberately focused on the website and its technical performance.",
          ],
        },
        {
          id: "ret-tiers",
          kind: "tiers",
          tiers: [
            {
              name: "Care",
              desc: "Keeping the site secure and current",
              price: "KES 8,000 - 15,000",
              features: [
                "Hosting and security monitoring",
                "Uptime checks",
                "Minor content updates (fees, intakes, courses)",
                "Monthly backup",
              ],
            },
            {
              name: "Growth",
              desc: "Actively growing enquiries",
              price: "KES 20,000 - 35,000",
              featured: true,
              features: [
                "Everything in Care",
                "Monthly SEO-targeted blog content",
                "Google Business Profile management",
                "Monthly analytics and enquiry report",
              ],
            },
            {
              name: "Scale",
              desc: "Full technical growth partner",
              price: "KES 40,000+",
              features: [
                "Everything in Growth",
                "WhatsApp and enquiry funnel optimisation",
                "Quarterly strategy review",
                "Priority turnaround on new pages and features",
              ],
            },
          ],
        },
        {
          id: "ret-note",
          kind: "note",
          heading: "Scope note",
          text:
            "Retainer tiers cover the website's technical health, content, and SEO performance. Social media posting and paid ad management are not included at any tier and remain a separate engagement with a specialist of CHANF's choosing.",
        },
      ],
    },

    // ── 09 ──────────────────────────────────────────────────────────────────
    {
      id: "about",
      tag: "Introduction",
      title: "About Brightex Solutions",
      blocks: [
        {
          id: "about-box",
          kind: "about",
          text:
            "Brightex Solutions builds and manages websites and digital systems for growing businesses and institutions across Kenya, led by a software engineering background of 3 to 5 years and hands-on delivery across education, hospitality, and service-based sectors.",
          paragraphs: [
            "Brightex Solutions previously delivered the website for Verb Education, a direct match to CHANF's own recruitment and student-conversion challenge, alongside work for Beco Interiors and Dreamville Estate & Hospitality.",
          ],
        },
        {
          id: "about-chips",
          kind: "chips",
          items: ["Education: Verb Education", "Service brands: Beco Interiors", "Hospitality: Dreamville Estate"],
        },
      ],
    },

    // ── 10 ──────────────────────────────────────────────────────────────────
    {
      id: "next",
      tag: "Moving forward",
      title: "Next Steps",
      blocks: [
        {
          id: "next-steps",
          kind: "steps",
          steps: [
            { title: "Review this proposal", desc: "CHANF's team reviews scope, phasing, and investment range" },
            { title: "Align on final scope", desc: "Confirm any adjustments, and the final figure within each phase range, before signing" },
            { title: "Sign the agreement and pay the 60% deposit", desc: "Formalises the engagement and triggers Phase 1" },
            { title: "Delivery across 3 phases", desc: "Site recovery through to launch, 6 to 8 weeks" },
            { title: "Ongoing partnership begins", desc: "CHANF selects a retainer tier post-launch" },
          ],
        },
      ],
    },
  ],
};
