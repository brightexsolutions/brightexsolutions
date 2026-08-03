/**
 * Intake questionnaire schema.
 *
 * The requirements a client needs to give us are almost entirely determined by
 * what they are asking for: an ERP engagement needs user counts, branches and
 * data migration; a branding job needs deliverable counts and usage; an
 * automation job needs volumes and the systems involved. The original form
 * asked three or four generic questions per type, which was never enough to
 * quote from, so a discovery call had to re-collect everything.
 *
 * Questions are declared as data rather than JSX so that:
 *   - the wizard renders them,
 *   - the admin detail sheet reads back the same labels (no drift),
 *   - and the AI proposal generator gets a labelled, complete brief.
 *
 * Everything here is optional to answer. The form must never feel like an
 * interrogation, so most questions carry a "Not sure yet" escape hatch.
 */

// ─── Service types ────────────────────────────────────────────────────────────

export const SERVICE_TYPES = [
  "website",
  "mobile",
  "erp",
  "design",
  "consultancy",
  "ai_automation",
  "other",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_META: Record<ServiceType, { label: string; icon: string; sub: string; noun: string }> = {
  website: {
    label: "Website or Web App",
    icon: "🌐",
    sub: "A new site, a redesign, an online store, or a web-based tool",
    noun: "website",
  },
  mobile: {
    label: "Mobile App",
    icon: "📱",
    sub: "An Android or iPhone app for customers or for your team",
    noun: "mobile app",
  },
  erp: {
    label: "Business System or ERP",
    icon: "⚙️",
    sub: "Custom software to run sales, stock, staff, finance or operations",
    noun: "system",
  },
  design: {
    label: "Design & Branding",
    icon: "🎨",
    sub: "Logo, brand identity, print, packaging or social media design",
    noun: "design project",
  },
  consultancy: {
    label: "Business Consultancy",
    icon: "💼",
    sub: "Strategy, digital transformation, process or advisory work",
    noun: "engagement",
  },
  ai_automation: {
    label: "AI & Automation",
    icon: "🤖",
    sub: "AI assistants, workflow automation or connecting your systems",
    noun: "automation",
  },
  other: {
    label: "Something Else",
    icon: "🔧",
    sub: "Not sure which of the above fits? Start here",
    noun: "project",
  },
};

/** Short labels used in emails, admin lists and notifications. */
export const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_TYPES.map((t) => [t, SERVICE_META[t].label])
);

// ─── Field model ──────────────────────────────────────────────────────────────

export type FieldKind = "text" | "textarea" | "chips" | "yesno" | "scale";

export interface IntakeField {
  kind: FieldKind;
  /** Key inside the intake `specifics` JSON object. */
  key: string;
  label: string;
  /** Helper line under the label. */
  note?: string;
  placeholder?: string;
  rows?: number;
  /** chips: available options. */
  options?: string[];
  /** chips: allow more than one selection. Defaults to true. */
  multi?: boolean;
  /** chips: append a free-text "Something else" box. */
  allowOther?: boolean;
  /** yesno: nested question revealed when the answer is Yes. */
  followUp?: IntakeField;
  /** Only render when this predicate passes against the current answers. */
  showIf?: (answers: Record<string, unknown>) => boolean;
}

export interface IntakeSection {
  title: string;
  /** One-line framing so the client understands why we are asking. */
  intro?: string;
  fields: IntakeField[];
}

// ─── Shared option sets ───────────────────────────────────────────────────────

const PAYMENT_METHODS = ["M-Pesa", "Card (Visa / Mastercard)", "Bank transfer", "Cash on delivery", "PayPal", "Not sure yet"];
const NOT_SURE = "Not sure yet";

// ─── Website ──────────────────────────────────────────────────────────────────

const WEBSITE_SECTIONS: IntakeSection[] = [
  {
    title: "What the site is for",
    intro: "This shapes the structure and how much we need to build.",
    fields: [
      {
        kind: "chips",
        key: "site_purpose",
        label: "What should the site do for you?",
        note: "Pick everything that applies.",
        options: [
          "Show what we do (brochure site)",
          "Bring in enquiries and leads",
          "Sell products online",
          "Take bookings or appointments",
          "Let customers log in to an account",
          "Publish articles or news",
          "Replace an internal manual process",
          NOT_SURE,
        ],
      },
      {
        kind: "yesno",
        key: "has_existing_site",
        label: "Do you have a website already?",
        followUp: {
          kind: "text",
          key: "existing_url",
          label: "What is the address?",
          placeholder: "https://yourwebsite.co.ke",
        },
      },
      {
        kind: "textarea",
        key: "existing_problems",
        label: "What is not working about the current site?",
        note: "The more honest the better. It tells us what to avoid repeating.",
        placeholder: "It is slow, we cannot edit it ourselves, it looks dated on phones, we never get enquiries from it...",
        rows: 3,
        showIf: (a) => a.has_existing_site === true,
      },
      {
        kind: "chips",
        key: "pages",
        label: "Which pages do you expect to need?",
        note: "A rough list is fine. We will refine it together.",
        options: [
          "Home", "About us", "Services", "Products", "Portfolio or past work",
          "Blog or news", "Pricing", "Team", "FAQ", "Contact",
          "Careers", "Gallery", "Testimonials", NOT_SURE,
        ],
        allowOther: true,
      },
    ],
  },
  {
    title: "Selling and bookings",
    fields: [
      {
        kind: "yesno",
        key: "needs_ecommerce",
        label: "Will you sell products or services directly on the site?",
      },
      {
        kind: "chips",
        key: "catalogue_size",
        label: "Roughly how many products or items?",
        options: ["Under 20", "20 to 100", "100 to 500", "Over 500", NOT_SURE],
        multi: false,
        showIf: (a) => a.needs_ecommerce === true,
      },
      {
        kind: "chips",
        key: "payment_methods",
        label: "How should customers pay?",
        options: PAYMENT_METHODS,
        showIf: (a) => a.needs_ecommerce === true,
      },
      {
        kind: "chips",
        key: "fulfilment",
        label: "How do orders reach the customer?",
        options: ["Delivery we arrange", "Courier or third party", "Customer collects", "Digital or instant delivery", NOT_SURE],
        showIf: (a) => a.needs_ecommerce === true,
      },
      {
        kind: "yesno",
        key: "needs_stock_tracking",
        label: "Do you need stock levels tracked automatically?",
        showIf: (a) => a.needs_ecommerce === true,
      },
      {
        kind: "yesno",
        key: "needs_bookings",
        label: "Will customers book appointments or slots on the site?",
        followUp: {
          kind: "textarea",
          key: "booking_details",
          label: "What is being booked, and how does it work today?",
          placeholder: "Clients book a 1 hour consultation. Right now they WhatsApp us and we write it in a diary.",
          rows: 2,
        },
      },
    ],
  },
  {
    title: "Content, brand and access",
    intro: "What already exists decides how much groundwork the project carries.",
    fields: [
      {
        kind: "chips",
        key: "assets_ready",
        label: "What do you already have ready?",
        note: "Anything missing, we can help produce.",
        options: [
          "Logo", "Brand colours and fonts", "Written text or copy",
          "Professional photos", "Product list with prices", "Domain name",
          "Hosting", "Business email addresses", "None of these yet",
        ],
      },
      {
        kind: "text",
        key: "domain_name",
        label: "If you already have a domain, what is it?",
        placeholder: "yourbusiness.co.ke",
      },
      {
        kind: "chips",
        key: "content_updates",
        label: "After launch, who updates the content?",
        note: "This decides whether you need an admin area you can log into.",
        options: [
          "We want to edit it ourselves",
          "Brightex should handle updates for us",
          "It rarely changes",
          NOT_SURE,
        ],
        multi: false,
      },
      {
        kind: "chips",
        key: "languages",
        label: "Which languages should the site be in?",
        options: ["English", "Swahili", "Both English and Swahili", "Other"],
        multi: false,
        allowOther: true,
      },
    ],
  },
  {
    title: "Connections and growth",
    fields: [
      {
        kind: "chips",
        key: "integrations",
        label: "Should the site connect to anything you already use?",
        options: [
          "M-Pesa", "WhatsApp", "Google Analytics", "Email newsletter",
          "Social media feeds", "Accounting software", "An existing system or database",
          "Google Maps", "None", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "yesno",
        key: "needs_seo",
        label: "Do you want to be found on Google for what you sell?",
        note: "Search visibility is work in its own right, so it helps to know upfront.",
      },
      {
        kind: "yesno",
        key: "needs_maintenance",
        label: "Would you like us to look after the site after launch?",
        note: "Hosting, updates, backups and fixes.",
      },
    ],
  },
];

// ─── Mobile ───────────────────────────────────────────────────────────────────

const MOBILE_SECTIONS: IntakeSection[] = [
  {
    title: "Who it is for",
    fields: [
      {
        kind: "chips",
        key: "platforms",
        label: "Which phones must it run on?",
        options: ["Android", "iPhone (iOS)", "Both", NOT_SURE],
        multi: false,
      },
      {
        kind: "chips",
        key: "audience",
        label: "Who will use the app?",
        options: ["Our customers or the public", "Our staff or team", "Both", "Partners or agents"],
        multi: false,
      },
      {
        kind: "textarea",
        key: "user_journey",
        label: "Walk us through what someone does in the app",
        note: "From opening it to finishing the thing they came to do. Plain language is perfect.",
        placeholder: "They open the app, search for a product, add it to a cart, pay with M-Pesa, then track the delivery.",
        rows: 4,
      },
    ],
  },
  {
    title: "What it needs to do",
    fields: [
      {
        kind: "chips",
        key: "features",
        label: "Which of these does the app need?",
        options: [
          "User accounts and login", "Sign in with Google or Facebook", "Browse a catalogue",
          "Search and filter", "Shopping cart and checkout", "In-app payments",
          "Booking or scheduling", "Chat or messaging", "Push notifications",
          "Maps and location", "Camera or photo upload", "Documents or downloads",
          "Reports and dashboards", "Works without internet", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "chips",
        key: "payment_methods",
        label: "If money changes hands in the app, how?",
        options: [...PAYMENT_METHODS, "No payments in the app"],
      },
      {
        kind: "yesno",
        key: "needs_admin_panel",
        label: "Do you need a web dashboard to manage the app's content and users?",
        note: "Most apps need one. It is where you add products, view orders and see users.",
      },
      {
        kind: "yesno",
        key: "has_backend",
        label: "Is there an existing system or website the app must connect to?",
        followUp: {
          kind: "text",
          key: "backend_details",
          label: "What is it?",
          placeholder: "Our website, our stock system, QuickBooks...",
        },
      },
    ],
  },
  {
    title: "Practicalities",
    fields: [
      {
        kind: "yesno",
        key: "has_store_accounts",
        label: "Do you already have Google Play or Apple developer accounts?",
        note: "These are needed to publish. We can set them up if not.",
      },
      {
        kind: "yesno",
        key: "has_reference",
        label: "Is there an existing app you would point at and say 'like that'?",
        followUp: {
          kind: "text",
          key: "reference_apps",
          label: "Which app or apps?",
          placeholder: "App name, or a Play Store or App Store link",
        },
      },
      {
        kind: "chips",
        key: "data_sensitivity",
        label: "Will the app hold sensitive personal or financial data?",
        options: ["Yes, financial", "Yes, personal or health", "Basic contact details only", NOT_SURE],
        multi: false,
      },
    ],
  },
];

// ─── ERP / business system ────────────────────────────────────────────────────

const ERP_SECTIONS: IntakeSection[] = [
  {
    title: "What the system runs",
    fields: [
      {
        kind: "chips",
        key: "modules",
        label: "Which parts of the business should it handle?",
        note: "Pick everything you would want, even if it comes in later phases.",
        options: [
          "Sales and invoicing", "Inventory and stock", "Purchasing and suppliers",
          "Customers (CRM)", "Staff and HR", "Payroll", "Accounting and expenses",
          "Projects and jobs", "Deliveries and logistics", "Bookings and scheduling",
          "Point of sale", "Reporting and dashboards", "Document management", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "textarea",
        key: "business_process",
        label: "Describe how this works in your business today",
        note: "Walk us through the process step by step, including the annoying parts.",
        placeholder: "A customer orders on WhatsApp, we write it in a book, the storekeeper checks stock, then we invoice in Excel...",
        rows: 4,
      },
      {
        kind: "textarea",
        key: "pain_points",
        label: "Where does it break down or cost you money?",
        placeholder: "Stock goes missing, invoices get forgotten, we cannot tell which products actually make a profit...",
        rows: 3,
      },
    ],
  },
  {
    title: "Scale and people",
    fields: [
      {
        kind: "chips",
        key: "team_size",
        label: "How many people will use the system?",
        options: ["Just me", "2 to 10", "11 to 50", "51 to 200", "Over 200", NOT_SURE],
        multi: false,
      },
      {
        kind: "chips",
        key: "roles",
        label: "What kinds of users will there be?",
        note: "Different roles usually see different things.",
        options: [
          "Owner or director", "Manager", "Accountant or finance", "Sales staff",
          "Storekeeper", "Field or delivery staff", "Customers themselves", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "chips",
        key: "locations",
        label: "How many branches or locations?",
        options: ["One", "2 to 5", "More than 5", "Mobile or field based", NOT_SURE],
        multi: false,
      },
      {
        kind: "chips",
        key: "access_needs",
        label: "Where does it need to work?",
        options: ["Office computers", "Phones and tablets", "From home or on the road", "Where internet is unreliable", NOT_SURE],
      },
    ],
  },
  {
    title: "Existing data and connections",
    fields: [
      {
        kind: "yesno",
        key: "has_current_system",
        label: "Do you use anything for this today, even paper or Excel?",
        followUp: {
          kind: "text",
          key: "current_system",
          label: "What is it?",
          placeholder: "Excel spreadsheets, QuickBooks, Sage, a custom system, paper books...",
        },
      },
      {
        kind: "chips",
        key: "data_migration",
        label: "Does existing data need to move into the new system?",
        options: [
          "Yes, customers", "Yes, products or stock", "Yes, historical sales",
          "Yes, staff records", "No, we will start fresh", NOT_SURE,
        ],
      },
      {
        kind: "chips",
        key: "integrations",
        label: "What must it connect to?",
        options: [
          "M-Pesa", "KRA eTIMS", "Bank accounts", "SMS notifications", "WhatsApp",
          "Accounting software", "Our website", "Barcode scanners", "None", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "chips",
        key: "reporting_needs",
        label: "What do you most want to be able to see at a glance?",
        options: [
          "Daily sales", "Profit per product or job", "Stock levels and reorder alerts",
          "Money owed to us", "Money we owe", "Staff performance", "Expenses", NOT_SURE,
        ],
        allowOther: true,
      },
    ],
  },
  {
    title: "Running it",
    fields: [
      {
        kind: "chips",
        key: "hosting_preference",
        label: "Where should the system live?",
        options: ["Online, accessible anywhere", "On our own computers or server", "Whatever you recommend"],
        multi: false,
      },
      {
        kind: "yesno",
        key: "needs_training",
        label: "Will your team need training on the new system?",
      },
      {
        kind: "yesno",
        key: "needs_audit_trail",
        label: "Do you need a record of who changed what?",
        note: "Common where cash, stock or compliance is involved.",
      },
    ],
  },
];

// ─── Design & branding ────────────────────────────────────────────────────────

const DESIGN_SECTIONS: IntakeSection[] = [
  {
    title: "What needs designing",
    fields: [
      {
        kind: "chips",
        key: "design_types",
        label: "What do you need?",
        options: [
          "Logo", "Full brand identity", "Business cards", "Letterhead and documents",
          "Flyers or posters", "Social media templates", "Social media posts (ongoing)",
          "Packaging or labels", "Signage or banners", "Vehicle branding",
          "Pitch deck or presentation", "Company profile", "Menu or price list",
          "T-shirts or merchandise", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "textarea",
        key: "quantities",
        label: "Roughly how many pieces, and how often?",
        note: "For example: one logo, plus 12 social posts a month.",
        placeholder: "One logo and brand kit, then about 8 social media posts per month",
        rows: 2,
      },
      {
        kind: "chips",
        key: "usage",
        label: "Where will these be used?",
        options: ["Social media", "Printed materials", "Website", "Packaging", "Outdoor or signage", "Presentations", NOT_SURE],
      },
    ],
  },
  {
    title: "Your brand today",
    fields: [
      {
        kind: "chips",
        key: "brand_stage",
        label: "Where is your brand right now?",
        options: [
          "Starting from nothing",
          "We have a logo but nothing else",
          "We have a brand but it needs refreshing",
          "We have full guidelines to follow",
        ],
        multi: false,
      },
      {
        kind: "textarea",
        key: "brand_personality",
        label: "If your brand were a person, how would you describe them?",
        note: "Three or four words is plenty.",
        placeholder: "Trustworthy, modern, a bit bold, not corporate",
        rows: 2,
      },
      {
        kind: "text",
        key: "colour_preferences",
        label: "Any colours you want used, or definitely avoided?",
        placeholder: "Green and white please, nothing red",
      },
      {
        kind: "textarea",
        key: "admired_brands",
        label: "Which brands do you admire the look of?",
        note: "Kenyan or international, in any industry.",
        placeholder: "Safaricom's simplicity, Java House's warmth...",
        rows: 2,
      },
    ],
  },
  {
    title: "Deliverables",
    fields: [
      {
        kind: "chips",
        key: "file_needs",
        label: "What do you need handed over at the end?",
        options: [
          "Print-ready files", "Web and social sized files", "Editable source files",
          "A brand guidelines document", NOT_SURE,
        ],
      },
      {
        kind: "yesno",
        key: "needs_copywriting",
        label: "Do you need the wording written too, or will you provide it?",
        note: "Answer Yes if you would like us to write it.",
      },
    ],
  },
];

// ─── Consultancy ──────────────────────────────────────────────────────────────

const CONSULTANCY_SECTIONS: IntakeSection[] = [
  {
    title: "The challenge",
    fields: [
      {
        kind: "chips",
        key: "focus_areas",
        label: "What area is this about?",
        options: [
          "Business strategy", "Digital transformation", "Process and operations",
          "Choosing the right software", "Market entry or expansion", "Pricing and revenue",
          "Team structure and roles", "Funding or investor readiness", "Compliance", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "textarea",
        key: "challenge",
        label: "Describe the situation in your own words",
        note: "What is happening, and what makes it a problem now?",
        placeholder: "We have grown from 3 to 20 staff in a year and nothing is written down. Orders get lost between people.",
        rows: 4,
      },
      {
        kind: "textarea",
        key: "tried_already",
        label: "What have you already tried?",
        note: "Saves us proposing something you have ruled out.",
        placeholder: "We bought a system last year but nobody used it...",
        rows: 2,
      },
    ],
  },
  {
    title: "Your business",
    fields: [
      {
        kind: "chips",
        key: "business_stage",
        label: "Where is the business at?",
        options: ["An idea", "Just launched", "Growing", "Established and steady", "Restructuring"],
        multi: false,
      },
      {
        kind: "chips",
        key: "team_size",
        label: "How many people work in the business?",
        options: ["Just me", "2 to 10", "11 to 50", "Over 50"],
        multi: false,
      },
      {
        kind: "chips",
        key: "stakeholders",
        label: "Who else needs to be part of this conversation?",
        options: ["Just me", "Business partners", "A board or investors", "Department heads", "The wider team"],
      },
    ],
  },
  {
    title: "What you want out of it",
    fields: [
      {
        kind: "textarea",
        key: "desired_outcome",
        label: "What would make this engagement worth it?",
        note: "A decision made, a plan on paper, a process fixed, a system chosen.",
        placeholder: "A clear plan we can act on next quarter, and a recommendation on which system to buy",
        rows: 3,
      },
      {
        kind: "chips",
        key: "engagement_style",
        label: "What shape should the work take?",
        options: [
          "A one-off session or workshop",
          "A written strategy or report",
          "Ongoing advisory over a few months",
          "Hands-on help implementing it",
          NOT_SURE,
        ],
        multi: false,
      },
      {
        kind: "text",
        key: "deadline_driver",
        label: "Is anything forcing a date on this?",
        placeholder: "Investor meeting in March, licence renewal, new financial year...",
      },
    ],
  },
];

// ─── AI & automation ──────────────────────────────────────────────────────────

const AI_SECTIONS: IntakeSection[] = [
  {
    title: "What you want automated",
    fields: [
      {
        kind: "chips",
        key: "focus_areas",
        label: "What kind of help are you after?",
        options: [
          "AI assistant answering customer questions",
          "Automatic replies on WhatsApp or social",
          "Repetitive admin work done automatically",
          "Reports generated on a schedule",
          "Connecting two systems that do not talk",
          "Documents or quotes generated automatically",
          "Sorting or extracting data from documents",
          "Reminders and follow-ups sent automatically",
          NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "textarea",
        key: "current_process",
        label: "How does this get done today, step by step?",
        note: "The detail here matters more than anything else in this form.",
        placeholder: "A customer WhatsApps us, someone checks the price list in Excel, types a quote in Word, saves it as PDF and sends it back.",
        rows: 4,
      },
      {
        kind: "chips",
        key: "volume",
        label: "How often does this happen?",
        options: ["A few times a week", "Several times a day", "Dozens of times a day", "Hundreds of times a day", NOT_SURE],
        multi: false,
      },
      {
        kind: "chips",
        key: "time_spent",
        label: "Roughly how much time does it eat up?",
        options: ["Under an hour a week", "A few hours a week", "Hours every day", "It is someone's full-time job", NOT_SURE],
        multi: false,
      },
    ],
  },
  {
    title: "Where the work lives",
    fields: [
      {
        kind: "chips",
        key: "systems_involved",
        label: "Which tools or systems are involved?",
        options: [
          "WhatsApp", "Email", "Excel or Google Sheets", "Our website",
          "An accounting system", "A CRM", "An internal system or database",
          "Social media", "Paper records", NOT_SURE,
        ],
        allowOther: true,
      },
      {
        kind: "chips",
        key: "who_does_it",
        label: "Who handles it now?",
        options: ["Me", "One staff member", "A whole team", "Nobody, it gets missed", NOT_SURE],
        multi: false,
      },
      {
        kind: "chips",
        key: "data_sensitivity",
        label: "Does this involve sensitive information?",
        options: ["Customer personal details", "Financial or payment data", "Health records", "Nothing sensitive", NOT_SURE],
      },
    ],
  },
  {
    title: "How it should behave",
    fields: [
      {
        kind: "chips",
        key: "human_in_loop",
        label: "Should a person approve things before they go out?",
        options: [
          "Yes, always review first",
          "Only for anything unusual or high value",
          "No, let it run on its own",
          NOT_SURE,
        ],
        multi: false,
      },
      {
        kind: "textarea",
        key: "success_measure",
        label: "How would you know it is working?",
        placeholder: "Customers get a reply within a minute instead of a day, and nobody has to type quotes anymore",
        rows: 2,
      },
    ],
  },
];

// ─── Something else ───────────────────────────────────────────────────────────

const OTHER_SECTIONS: IntakeSection[] = [
  {
    title: "Tell us more",
    intro: "No fixed questions here. Give us whatever helps us understand it.",
    fields: [
      {
        kind: "textarea",
        key: "extra",
        label: "What do you have in mind?",
        note: "Describe it however makes sense to you.",
        placeholder: "Take as much space as you need...",
        rows: 5,
      },
      {
        kind: "textarea",
        key: "who_for",
        label: "Who is it for, and what should it do for them?",
        rows: 3,
      },
      {
        kind: "text",
        key: "closest_fit",
        label: "If you had to pick, which of our services is it closest to?",
        placeholder: "Maybe a website, maybe a system, honestly not sure",
      },
    ],
  },
];

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SERVICE_SECTIONS: Record<ServiceType, IntakeSection[]> = {
  website: WEBSITE_SECTIONS,
  mobile: MOBILE_SECTIONS,
  erp: ERP_SECTIONS,
  design: DESIGN_SECTIONS,
  consultancy: CONSULTANCY_SECTIONS,
  ai_automation: AI_SECTIONS,
  other: OTHER_SECTIONS,
};

// ─── Legacy answers ───────────────────────────────────────────────────────────

/**
 * Questions that existed in the v1 questionnaire and were retired or renamed
 * in v2. Intake links were already circulating before this rebuild, so
 * submissions carrying these keys are sitting in the database (and a browser
 * tab left open on the old form can still post them). Without these labels
 * they would read back as raw keys like "has_branding" in the admin panel.
 *
 * Keys that kept both their name and meaning are absent here on purpose: the
 * live schema already labels them.
 */
export const LEGACY_FIELD_LABELS: Record<string, string> = {
  references:          "Reference sites (v1)",
  has_branding:        "Had existing branding (v1)",
  has_existing_brand:  "Had existing brand (v1)",
  style_notes:         "Look and feel wanted (v1)",
  automation_goal:     "What to automate (v1)",
  has_current_process: "Had a current process (v1)",
  has_reference:       "Had a reference app (v1)",
  reference_apps:      "Reference apps (v1)",
  pain_points:         "Where it breaks down",
  extra:               "Additional context",
};

// ─── Migrating v1 answers into the v2 form ────────────────────────────────────

/**
 * Chip options whose wording changed between v1 and v2. Case differences are
 * handled automatically, so only genuine rewordings belong here.
 *
 * A value mapped to null had its question replaced by a different mechanism
 * entirely (an online store is now the needs_ecommerce toggle, not a page), so
 * it is preserved as free text rather than forced onto a chip that means
 * something subtly different.
 */
const LEGACY_VALUE_MAP: Record<string, Record<string, string | null>> = {
  pages: {
    "Portfolio / Work": "Portfolio or past work",
    "Blog": "Blog or news",
    "Online Store / Shop": null,
    "Booking / Appointments": null,
    "Custom pages": null,
  },
  design_types: {
    "Business Card": "Business cards",
    "Flyer / Poster": "Flyers or posters",
    "Social Media Kit": "Social media templates",
    "Full Brand Identity": "Full brand identity",
    "Packaging Design": "Packaging or labels",
    "Presentation / Pitch Deck": "Pitch deck or presentation",
  },
  platforms: {
    "iOS (iPhone)": "iPhone (iOS)",
  },
  focus_areas: {
    "Business Strategy": "Business strategy",
    "Digital Transformation": "Digital transformation",
    "Process Optimisation": "Process and operations",
    "Market Entry / Expansion": "Market entry or expansion",
    "Tech / Software Advisory": "Choosing the right software",
    "AI Chat Assistant": "AI assistant answering customer questions",
    "Workflow / Process Automation": "Repetitive admin work done automatically",
    "Data & Reporting Automation": "Reports generated on a schedule",
    "Integrations Between Systems": "Connecting two systems that do not talk",
    "Content / Document Generation": "Documents or quotes generated automatically",
  },
  audience: {
    "My customers / public": "Our customers or the public",
    "Internal staff / team": "Our staff or team",
  },
  team_size: {
    "2 – 10 people": "2 to 10",
    "11 – 50 people": "11 to 50",
    "50+ people": "51 to 200",
  },
};

/**
 * v1 answers that are expressed by a different question in v2.
 *
 * A client who asked for an "Online Store / Shop" page was telling us they
 * want to sell online, which v2 asks directly. Turning the matching toggle on
 * is a fair reading of what they already said, and they can correct it in the
 * form. Only applied where the target has not been answered, so an explicit
 * answer is never overwritten by an inference.
 */
const IMPLIED_BY_VALUE: Record<string, Record<string, { field: string; value: unknown }>> = {
  pages: {
    "Online Store / Shop": { field: "needs_ecommerce", value: true },
    "Booking / Appointments": { field: "needs_bookings", value: true },
  },
};

/** Top-level fields that moved out of `specifics` between v1 and v2. */
const LEGACY_FIELD_MOVES: { from: string; to: string }[] = [
  // The website questionnaire asked for reference sites; that question is now
  // asked once for the whole project rather than per service.
  { from: "references", to: "reference_links" },
];

/** Resolves a stored value against a field's current options. */
function matchOption(field: IntakeField, value: string): string | null {
  const options = field.options ?? [];
  if (options.includes(value)) return value;

  const lower = value.trim().toLowerCase();
  const caseMatch = options.find((o) => o.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  const mapped = LEGACY_VALUE_MAP[field.key]?.[value];
  if (mapped && options.includes(mapped)) return mapped;

  return null;
}

/**
 * Reshapes answers stored under an older version of the questionnaire so the
 * current form can render them.
 *
 * Two things changed between versions and both lose data if ignored. Question
 * wording moved on, so a stored "About Us" no longer lights up the "About us"
 * chip. More seriously, some questions changed kind: a mobile app's feature
 * list was free text in v1 and is a chip list in v2, so a client's carefully
 * written spec sat in an array-typed field, invisible, and would have been
 * wiped the moment they touched a chip.
 *
 * Nothing is ever discarded. Anything that cannot be matched to a current
 * option is preserved as free text in the field's "something else" box, where
 * the client can see and edit it.
 */
export function migrateLegacyAnswers(
  serviceType: string,
  answers: Record<string, unknown>
): Record<string, unknown> {
  const fields = fieldsFor(serviceType);
  if (fields.length === 0) return { ...answers };

  const out: Record<string, unknown> = { ...answers };

  for (const field of fields) {
    const value = out[field.key];
    if (value === undefined || value === null || value === "") continue;

    const otherKey = `${field.key}_other`;
    const spillover: string[] = [];
    const existingOther = typeof out[otherKey] === "string" ? (out[otherKey] as string) : "";

    if (field.kind === "chips") {
      const multi = field.multi !== false;
      const rawValues = Array.isArray(value)
        ? (value as unknown[]).map(String)
        : [String(value)];

      const matched: string[] = [];
      for (const raw of rawValues) {
        const hit = matchOption(field, raw);
        if (hit) {
          if (!matched.includes(hit)) matched.push(hit);
          continue;
        }

        // Retired options that v2 asks about through a different question.
        const implied = IMPLIED_BY_VALUE[field.key]?.[raw];
        if (implied && (out[implied.field] === undefined || out[implied.field] === null)) {
          out[implied.field] = implied.value;
        }
        spillover.push(raw);
      }

      // A single-select field that used to accept several answers keeps the
      // first as the selection and the rest as text, rather than dropping them.
      out[field.key] = multi ? matched : (matched[0] ?? "");
      if (!multi) spillover.push(...matched.slice(1));
    } else if (field.kind === "text" || field.kind === "textarea") {
      if (Array.isArray(value)) out[field.key] = (value as unknown[]).map(String).join(", ");
      else if (typeof value !== "string") out[field.key] = String(value);
    } else if (field.kind === "yesno") {
      if (typeof value !== "boolean") {
        const s = String(value).toLowerCase();
        out[field.key] = s === "true" || s === "yes" ? true : s === "false" || s === "no" ? false : null;
      }
    }

    if (spillover.length > 0) {
      out[otherKey] = [existingOther, ...spillover].filter(Boolean).join(", ");
    }
  }

  return out;
}

/** Applies the field moves that lifted answers out of `specifics`. */
export function applyLegacyFieldMoves(
  specifics: Record<string, Record<string, unknown>>,
  topLevel: Record<string, unknown>
): { specifics: Record<string, Record<string, unknown>>; topLevel: Record<string, unknown> } {
  const nextSpecifics: Record<string, Record<string, unknown>> = {};
  const nextTop = { ...topLevel };

  for (const [service, answers] of Object.entries(specifics)) {
    const copy = { ...answers };
    for (const move of LEGACY_FIELD_MOVES) {
      const value = copy[move.from];
      if (typeof value === "string" && value.trim() && !String(nextTop[move.to] ?? "").trim()) {
        nextTop[move.to] = value;
        delete copy[move.from];
      }
    }
    nextSpecifics[service] = copy;
  }

  return { specifics: nextSpecifics, topLevel: nextTop };
}

// ─── Read-back helpers (admin sheet, AI brief) ────────────────────────────────

/** Every field for a service type, flattened, so answers can be labelled. */
export function fieldsFor(serviceType: string): IntakeField[] {
  const sections = SERVICE_SECTIONS[serviceType as ServiceType];
  if (!sections) return [];
  const out: IntakeField[] = [];
  for (const section of sections) {
    for (const field of section.fields) {
      out.push(field);
      if (field.followUp) out.push(field.followUp);
    }
  }
  return out;
}

/** Formats one stored answer for display. Returns null when unanswered. */
export function formatAnswer(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) {
    const items = value.filter((v) => v !== null && v !== undefined && v !== "");
    return items.length ? items.join(", ") : null;
  }
  return String(value);
}

export interface AnswerRow {
  key: string;
  label: string;
  value: string;
  multiline: boolean;
}

export interface AnswerGroup {
  serviceType: string;
  serviceLabel: string;
  rows: AnswerRow[];
}

/**
 * A client asking for one thing is the simple case; asking for a website plus
 * branding plus an assistant is the common one. Answers are therefore stored
 * per service:  { website: {...}, design: {...} }.
 *
 * v1 stored a single flat object instead, because only one service could be
 * chosen. Both shapes are still in the database, so every read goes through
 * this normaliser. Detection is by key: a flat v1 object never has a service
 * type as a top-level key.
 */
export function normaliseSpecifics(
  specifics: Record<string, unknown> | null | undefined,
  fallbackServiceType?: string
): Record<string, Record<string, unknown>> {
  const raw = specifics ?? {};
  const serviceKeys = Object.keys(raw).filter((k) => (SERVICE_TYPES as readonly string[]).includes(k));

  if (serviceKeys.length > 0) {
    const out: Record<string, Record<string, unknown>> = {};
    for (const key of serviceKeys) {
      const value = raw[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = value as Record<string, unknown>;
      }
    }
    return out;
  }

  if (Object.keys(raw).length === 0) return {};
  // Legacy flat object: attribute it to whatever single service was chosen.
  return { [fallbackServiceType ?? "other"]: raw };
}

/**
 * Turns one service's answers into labelled rows, in schema order, so the
 * admin panel and the AI brief read the questionnaire the same way. Answers
 * whose question has since been retired still surface (labelled from
 * LEGACY_FIELD_LABELS where known), so nothing submitted is ever hidden.
 */
export function readAnswers(
  serviceType: string,
  specifics: Record<string, unknown> | null | undefined
): AnswerRow[] {
  const groups = normaliseSpecifics(specifics, serviceType);
  const answers = groups[serviceType] ?? {};
  const fields = fieldsFor(serviceType);
  const rows: AnswerRow[] = [];
  const seen = new Set<string>();

  for (const field of fields) {
    seen.add(field.key);
    // "Other" free-text written alongside a chip group.
    const otherKey = `${field.key}_other`;
    seen.add(otherKey);

    const formatted = formatAnswer(answers[field.key]);
    const other = formatAnswer(answers[otherKey]);
    const combined = [formatted, other].filter(Boolean).join(", ");
    if (!combined) continue;

    rows.push({
      key: field.key,
      label: field.label,
      value: combined,
      multiline: field.kind === "textarea",
    });
  }

  for (const [key, value] of Object.entries(answers)) {
    if (seen.has(key)) continue;
    const formatted = formatAnswer(value);
    if (!formatted) continue;
    rows.push({
      key,
      label: LEGACY_FIELD_LABELS[key] ?? key.replace(/_/g, " "),
      value: formatted,
      multiline: false,
    });
  }

  return rows;
}

/** Every answered service, in the order the client selected them. */
export function readAnswerGroups(
  serviceTypes: string[],
  specifics: Record<string, unknown> | null | undefined
): AnswerGroup[] {
  const primary = serviceTypes[0];
  const groups = normaliseSpecifics(specifics, primary);
  // Any service present in the data but missing from the list (an old record,
  // or a service removed after answering) still gets shown.
  const ordered = [...serviceTypes, ...Object.keys(groups).filter((k) => !serviceTypes.includes(k))];

  return ordered
    .map((serviceType) => ({
      serviceType,
      serviceLabel: SERVICE_LABELS[serviceType] ?? serviceType,
      rows: readAnswers(serviceType, specifics),
    }))
    .filter((group) => group.rows.length > 0);
}

/** Normalises whatever a record holds into the full list of services asked for. */
export function serviceTypesOf(record: {
  service_type?: string | null;
  service_types?: string[] | null;
}): string[] {
  const list = (record.service_types ?? []).filter(Boolean);
  if (list.length > 0) return list;
  return record.service_type ? [record.service_type] : [];
}

// ─── Brief building ───────────────────────────────────────────────────────────

/** The subset of an intake record needed to write a brief. */
export interface IntakeBriefSource {
  service_type?: string | null;
  service_types?: string[] | null;
  project_title?: string | null;
  description?: string | null;
  problem_statement?: string | null;
  success_criteria?: string | null;
  reference_links?: string | null;
  specifics?: Record<string, unknown> | null;
  submitter_company?: string | null;
  industry?: string | null;
  business_summary?: string | null;
  target_audience?: string | null;
  online_presence?: string | null;
  timeline?: string | null;
  hard_deadline?: string | null;
  budget_range?: string | null;
  budget_confidence?: string | null;
  decision_stage?: string | null;
  additional_notes?: string | null;
}

function labelOf(options: { value: string; label: string }[], value?: string | null): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Renders an intake as a labelled brief for the proposal generator and the
 * AI analysis route.
 *
 * Questionnaire answers are written as question-and-answer lines rather than
 * raw JSON: a model handed `{"has_current_system":true,"team_size":"2 to 10"}`
 * has to guess what was asked, and guesses badly on the keys that repeat
 * across service types.
 */
export function buildIntakeBrief(intake: IntakeBriefSource): string {
  const services = serviceTypesOf(intake);
  const groups = readAnswerGroups(services, intake.specifics);

  const lines: (string | false | null | undefined)[] = [
    services.length > 0 && `Services requested: ${services.map((s) => SERVICE_LABELS[s] ?? s).join(", ")}`,
    intake.project_title && `Project title: ${intake.project_title}`,
    intake.submitter_company && `Client business: ${intake.submitter_company}`,
    intake.industry && `Industry: ${intake.industry}`,
    intake.business_summary && `What the business does: ${intake.business_summary}`,
    intake.target_audience && `Their customers: ${intake.target_audience}`,
    intake.online_presence && `Current online presence: ${intake.online_presence}`,
    intake.description && `Description: ${intake.description}`,
    intake.problem_statement && `Problem to solve: ${intake.problem_statement}`,
    intake.success_criteria && `How the client will judge success: ${intake.success_criteria}`,
    intake.reference_links && `References and inspiration: ${intake.reference_links}`,
    intake.timeline && `Desired timeline: ${intake.timeline}`,
    intake.hard_deadline && `Fixed deadline: ${intake.hard_deadline}`,
    intake.budget_range && `Stated budget range: ${intake.budget_range}`,
    intake.budget_confidence && `Budget position: ${labelOf(BUDGET_CONFIDENCE_OPTIONS, intake.budget_confidence)}`,
    intake.decision_stage && `Decision stage: ${labelOf(DECISION_STAGE_OPTIONS, intake.decision_stage)}`,
    intake.additional_notes && `Additional notes: ${intake.additional_notes}`,
  ];

  for (const group of groups) {
    lines.push(`\n${group.serviceLabel} requirements:`);
    for (const row of group.rows) {
      lines.push(`- ${row.label}: ${row.value}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

// ─── Common (non service-specific) option sets ────────────────────────────────

export const INDUSTRY_OPTIONS = [
  "Retail or wholesale", "Food and beverage", "Health and medical", "Education",
  "Real estate and construction", "Professional services", "Logistics and transport",
  "Manufacturing", "Agriculture", "Hospitality and travel", "Finance and insurance",
  "NGO or non-profit", "Technology", "Beauty and wellness", "Events", "Other",
];

export const TIMELINE_OPTIONS = [
  "As soon as possible",
  "Within a month",
  "1 to 3 months",
  "3 to 6 months",
  "More than 6 months",
  "Not fixed yet",
];

/** Non-overlapping bands. The previous set double-counted 100k to 150k. */
export const BUDGET_OPTIONS = [
  "Under KES 50,000",
  "KES 50,000 to 150,000",
  "KES 150,000 to 400,000",
  "KES 400,000 to 1,000,000",
  "Over KES 1,000,000",
  "I would rather discuss it",
];

export const BUDGET_CONFIDENCE_OPTIONS = [
  { value: "approved", label: "Budget is approved and ready" },
  { value: "firm", label: "That is a firm ceiling" },
  { value: "flexible", label: "Flexible for the right solution" },
  { value: "guidance_needed", label: "I need guidance on what this should cost" },
];

export const DECISION_STAGE_OPTIONS = [
  { value: "exploring", label: "Just exploring options for now" },
  { value: "comparing", label: "Comparing a few providers" },
  { value: "ready", label: "Ready to start once we agree terms" },
  { value: "urgent", label: "Need to start immediately" },
];

export const PREFERRED_CONTACT_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "any", label: "Any of these" },
];

export const HEARD_FROM_OPTIONS = [
  "Google search", "Referred by someone", "Social media", "We have worked together before",
  "Saw your work somewhere", "WhatsApp or a group", "Other",
];
