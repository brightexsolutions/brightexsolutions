/**
 * Brightex standard operating procedures.
 *
 * The lifecycle SOP (how a client is handled end to end) is the same for every
 * engagement, but the work inside each stage is not: an ERP build needs data
 * migration and user training, a branding job needs revision limits and file
 * handover, an automation job needs volumes and a human-in-the-loop decision.
 * A single generic SOP could not say anything useful about any of them.
 *
 * These live in code rather than the database on purpose: they are version
 * controlled, reviewable in a diff, and cannot silently drift from the process
 * shown to clients publicly. Only acknowledgements are stored (see migration
 * 034), because that is the part that has to be auditable per person.
 */

import type { SopData } from "@/lib/document-types";
import { DEFAULT_SOP_DATA } from "@/lib/brightex-sop";
import { SERVICE_LABELS, type ServiceType } from "@/lib/intake-schema";

export interface SopEntry {
  /** Stable url key. Never rename: acknowledgements reference it. */
  key: string;
  label: string;
  /** One line shown in the SOP index. */
  summary: string;
  /** Groups the index. */
  category: "Lifecycle" | "Delivery" | "Commercial";
  /** Service types this SOP applies to, for "show me the SOP for this job". */
  serviceTypes?: ServiceType[];
  data: SopData;
}

const EFFECTIVE = "2026-08-01T00:00:00.000Z";

function sop(
  key: string,
  overrides: Omit<SopData, "sop_number" | "effective_date" | "revision"> & Partial<Pick<SopData, "revision">>
): SopData {
  return {
    sop_number: `SOP-${key.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
    effective_date: EFFECTIVE,
    revision: "1.0",
    ...overrides,
  };
}

// ─── Delivery SOPs, one per service type ──────────────────────────────────────

const WEBSITE_SOP = sop("website", {
  title: "Website and Web App Delivery",
  area: "Delivery: Websites & Web Apps",
  purpose:
    "Defines how a website or web application engagement is run from signed agreement to post-launch handover, so that scope, content dependencies and launch readiness are handled the same way on every build regardless of who is delivering it.",
  scope:
    "Applies to marketing sites, redesigns, online stores and web applications. Covers content collection, build, review, launch and handover. Does not cover ongoing retainers or hosting support, which are billed and tracked separately as subscriptions.",
  responsibilities: [
    { role: "Account owner", responsibility: "Confirms the page list, content sources and launch date against the signed agreement before build starts. Owns every client-facing conversation and any scope change." },
    { role: "Delivery lead", responsibility: "Builds against the agreed page list, keeps project tasks current, and raises anything that threatens the launch date as soon as it is known rather than at review." },
    { role: "Account owner", responsibility: "Runs the launch checklist and confirms the client holds their own domain, hosting and analytics access at handover." },
  ],
  procedure_steps: [
    { step: "1. Content and asset collection", description: "Request logo, brand assets, copy, images and product data in one consolidated ask, referencing what the intake form already told us they have. Missing content is the single most common cause of a slipped launch, so it is chased weekly and flagged to the client as a timeline risk in writing." },
    { step: "2. Structure sign-off", description: "Agree the final page list and navigation with the client before design begins. Anything added after this point is a scope change and goes through the change procedure, not a quiet extra." },
    { step: "3. Design review", description: "Share the design for the key templates (home, an inner page, and any commerce or booking flow) and get explicit written approval before build. One consolidated round of feedback, not a drip." },
    { step: "4. Build", description: "Build against tracked tasks under the project record. Every site ships responsive, with analytics installed, basic on-page SEO in place, and forms delivering to a monitored inbox." },
    { step: "5. Pre-launch checks", description: "Test on a real phone as well as desktop. Check every form actually delivers, every payment path completes end to end, all links resolve, and the site does not leak a staging URL. Confirm SSL, favicon, page titles and meta descriptions." },
    { step: "6. Launch", description: "Launch only once the milestone invoice position agreed in the agreement has been met. Move the project status to live, which notifies the client automatically." },
    { step: "7. Handover", description: "Hand over admin access, a short written guide to editing content, and confirmation of where the domain and hosting sit. Confirm in writing what is covered after launch and what is chargeable." },
  ],
  tools_systems: [
    "Brightex Admin: intake, proposal, agreement, project tasks, invoices",
    "Client's own domain and hosting accounts, never held solely by us",
    "Analytics installed at build, not retrofitted",
  ],
  escalation:
    "If content has not arrived after two written requests, the account owner tells the client in writing that the launch date is at risk and restates the revised date. If the client is unresponsive for two weeks, the project is moved to paused and the outstanding milestone is invoiced for work completed to date. Nothing goes live with an unpaid milestone that the agreement said would be settled first.",
});

const MOBILE_SOP = sop("mobile", {
  title: "Mobile App Delivery",
  area: "Delivery: Mobile Apps",
  purpose:
    "Defines how a mobile app engagement is run, with particular attention to the two things that most often derail app projects: store account ownership and unbounded feature scope.",
  scope:
    "Applies to Android and iOS applications, customer-facing or internal. Covers scope definition, build, testing, store submission and handover. Backend and admin dashboards built alongside the app are covered by the same project record.",
  responsibilities: [
    { role: "Account owner", responsibility: "Confirms which platforms are in scope, that the client owns or will open the developer accounts, and that the feature list in the agreement is the complete list." },
    { role: "Delivery lead", responsibility: "Builds and tests on real devices, not only simulators, and manages store submission including the assets and policy documents each store requires." },
    { role: "Account owner", responsibility: "Sets expectations about store review times, which are outside our control and must never be promised as a fixed date." },
  ],
  procedure_steps: [
    { step: "1. Feature freeze", description: "Turn the intake answers into an explicit, numbered feature list and get written agreement that this is version one. Anything else is version two. An app without a feature freeze has no delivery date." },
    { step: "2. Store account ownership", description: "Confirm before build who owns the Google Play and Apple developer accounts. They must end up in the client's name. If we open them, agree in writing that they transfer at handover, and note the annual fees are the client's ongoing cost." },
    { step: "3. Backend and admin", description: "Confirm whether an admin dashboard is in scope. Almost every app needs one, and it is frequently assumed by the client but missing from the quote. Resolve this before build, not at review." },
    { step: "4. Build and internal testing", description: "Build against tracked tasks. Test on at least one low-end Android device, because that is what most Kenyan users actually carry, not just a flagship." },
    { step: "5. Client testing", description: "Release a test build to the client with a written list of what to test. Collect feedback in one consolidated round." },
    { step: "6. Store submission", description: "Prepare store listings, screenshots, privacy policy and data-safety declarations. Submit, then tell the client that review timelines are set by Google and Apple and typically take days, not hours." },
    { step: "7. Handover", description: "Transfer store accounts, hand over source code and admin access, and confirm in writing what post-launch support is included." },
  ],
  tools_systems: [
    "Brightex Admin: project tasks, invoices, client communications",
    "Google Play Console and Apple Developer, in the client's name",
    "Real test devices, including a low-end Android handset",
  ],
  escalation:
    "If the client requests features outside the frozen list, the account owner quotes them as a version two scope rather than absorbing them. If a store rejects the submission, the delivery lead resolves the policy issue and informs the client the same day with a revised expectation, never silently resubmitting while the client assumes it is live.",
});

const ERP_SOP = sop("erp", {
  title: "Business System and ERP Delivery",
  area: "Delivery: Business Systems & ERP",
  purpose:
    "Defines how a custom business system is delivered. These engagements fail on adoption far more often than on code, so this procedure weights data migration, permissions and training as first-class deliverables rather than afterthoughts.",
  scope:
    "Applies to custom operational software: sales, stock, HR, payroll, accounting, bookings, point of sale and similar. Covers process mapping, phased build, data migration, training, go-live and support handover.",
  responsibilities: [
    { role: "Account owner", responsibility: "Maps the client's actual current process before anything is designed, and identifies who inside the client's business owns the rollout. A system with no internal owner does not get adopted." },
    { role: "Delivery lead", responsibility: "Builds in phases against agreed modules, and never ships a module without the permissions model that goes with it." },
    { role: "Account owner", responsibility: "Runs training and confirms the client can operate the system unaided before the final milestone is invoiced." },
  ],
  procedure_steps: [
    { step: "1. Process mapping", description: "Walk the current process end to end with the people who actually do it, not only the owner. Write it down and have it confirmed. The intake answers are the starting point, never the finished picture." },
    { step: "2. Phase the build", description: "Agree which modules are phase one. Trying to replace an entire business's operations in a single release is the most reliable way to lose a client's confidence. Phase one should replace one painful process completely." },
    { step: "3. Roles and permissions", description: "Define who sees and does what before building. Where cash, stock or payroll is involved, an audit trail of who changed what is not optional." },
    { step: "4. Data migration", description: "Agree exactly what historical data moves across and what does not. Migrate into a test environment first, have the client verify a sample against their own records, and only then load production." },
    { step: "5. Parallel run", description: "Wherever the process involves money or stock, run the new system alongside the old one for an agreed period so discrepancies surface while the old records still exist." },
    { step: "6. Training", description: "Train each role separately on what that role actually does. Leave a short written guide. Confirm the client's internal owner can train a new starter without us." },
    { step: "7. Go-live and support", description: "Go live on an agreed date, not a Friday. Agree a written support window and what is chargeable after it." },
  ],
  tools_systems: [
    "Brightex Admin: project record, phased tasks, milestone invoices",
    "Separate test and production environments, always",
    "Written role-based training guides left with the client",
  ],
  escalation:
    "If the client cannot supply clean data for migration, the account owner agrees in writing either a reduced migration scope or a chargeable data cleanup, and never absorbs it silently. If adoption stalls after training, the account owner escalates to the client's decision maker rather than continuing to support a system nobody is using.",
});

const DESIGN_SOP = sop("design", {
  title: "Design and Branding Delivery",
  area: "Delivery: Design & Branding",
  purpose:
    "Defines how design work is scoped, revised and handed over. Design engagements overrun on revisions more than anything else, so revision limits are set commercially at agreement stage and enforced in delivery.",
  scope:
    "Applies to logo and brand identity, print, packaging, social media design and presentation work. Covers brief, concepts, revisions, file handover and usage rights.",
  responsibilities: [
    { role: "Account owner", responsibility: "Captures the brief, agrees the deliverable count and the revision limit in the agreement, and manages any request beyond it as a chargeable extra." },
    { role: "Delivery lead", responsibility: "Presents concepts with reasoning, not just options, and works to the agreed rounds." },
    { role: "Account owner", responsibility: "Handles final file handover and confirms in writing what the client may do with the work." },
  ],
  procedure_steps: [
    { step: "1. Brief confirmation", description: "Restate the brief in writing from the intake answers: what is being designed, how many pieces, where they will be used, and the look the client described. Have the client confirm it before any design work starts." },
    { step: "2. Set the revision limit", description: "The agreement states the number of revision rounds included, typically two. This is set commercially at agreement stage, not negotiated mid-project." },
    { step: "3. Concepts", description: "Present a small number of considered directions with the reasoning behind each. Presenting twenty options is not generosity, it delays a decision and devalues the work." },
    { step: "4. Consolidated feedback", description: "Ask for feedback in one consolidated response per round, from the actual decision maker. Feedback arriving piecemeal from several people counts against the revision allowance." },
    { step: "5. Revisions", description: "Work the agreed rounds. When the allowance is used up, tell the client in writing before doing more work, and quote the additional round." },
    { step: "6. File handover", description: "Deliver in the formats agreed: print-ready, web and social sizes, and source files where the agreement includes them. Source files are released only when they were quoted." },
    { step: "7. Usage rights", description: "Confirm in writing what the client owns and may use, in line with the intellectual property clause of the agreement, and that this follows full payment." },
  ],
  tools_systems: [
    "Brightex Admin: project record, milestone invoices, client communications",
    "Agreed file formats stated in the agreement, not assumed",
  ],
  escalation:
    "If revisions exceed the agreed rounds, work pauses and the account owner quotes the additional round before continuing. If the client cannot reach an internal decision, the account owner asks who the single approver is and routes all feedback through that person.",
});

const CONSULTANCY_SOP = sop("consultancy", {
  title: "Consultancy Engagement Delivery",
  area: "Delivery: Business Consultancy",
  purpose:
    "Defines how advisory work is scoped and delivered so that the engagement produces a decision or a document the client can act on, rather than an open-ended conversation that is difficult to bill and difficult to end.",
  scope:
    "Applies to strategy, digital transformation, process, software selection and advisory engagements, whether one-off or retained.",
  responsibilities: [
    { role: "Account owner", responsibility: "Defines the deliverable and the end point before the engagement starts. An advisory engagement without a defined output has no completion criteria." },
    { role: "Delivery lead", responsibility: "Gathers evidence from the business rather than working from the owner's account alone, and presents findings with recommendations attached." },
    { role: "Account owner", responsibility: "Closes the engagement formally against the agreed deliverable and identifies any implementation work as a separate quote." },
  ],
  procedure_steps: [
    { step: "1. Define the output", description: "Agree in writing what the client will hold at the end: a written strategy, a recommendation, a mapped process, a system selection. This is the completion criterion for the whole engagement." },
    { step: "2. Agree the shape", description: "Confirm whether this is a workshop, a written report, a retained advisory arrangement or hands-on implementation. Each is priced and billed differently and they must not blur." },
    { step: "3. Evidence gathering", description: "Speak to the people doing the work, not just the person who commissioned the engagement. Look at real numbers where they exist. Note what the client has already tried, which the intake form should have captured." },
    { step: "4. Findings and recommendation", description: "Present findings with a clear recommendation and the reasoning. A consultancy engagement that ends in a list of options with no recommendation has not done its job." },
    { step: "5. Deliver the output", description: "Hand over the agreed document or decision. Walk the client through it rather than emailing it cold." },
    { step: "6. Close or extend", description: "Close the engagement formally against the deliverable. If implementation follows, it is quoted separately as its own project, never absorbed into the advisory scope." },
  ],
  tools_systems: [
    "Brightex Admin: engagement record, document generation, milestone invoices",
    "Written deliverable produced through the document system, so it carries the same branding as every other client document",
  ],
  escalation:
    "If the scope broadens during the engagement, the account owner restates the agreed deliverable and quotes the additional work separately. For retained arrangements, if the client stops engaging while the retainer bills, the account owner raises it directly rather than letting a dormant retainer run.",
});

const AI_SOP = sop("ai-automation", {
  title: "AI and Automation Delivery",
  area: "Delivery: AI & Automation",
  purpose:
    "Defines how automation and AI engagements are delivered. These are judged on whether the work actually stopped happening manually, so this procedure requires a measured baseline and a human-in-the-loop decision before anything goes live.",
  scope:
    "Applies to AI assistants, automated replies, workflow automation, scheduled reporting, document generation and system integrations.",
  responsibilities: [
    { role: "Account owner", responsibility: "Establishes the current baseline (volume and time spent) so the result can be measured, and agrees what happens when the automation is unsure." },
    { role: "Delivery lead", responsibility: "Builds with a review step by default, monitors accuracy through the first live period, and never connects a client's system without confirming what data leaves it." },
    { role: "Account owner", responsibility: "Confirms running costs with the client before go-live, because AI and messaging services bill per use and the client must not be surprised." },
  ],
  procedure_steps: [
    { step: "1. Baseline the current process", description: "Record how the task is done today, how often, and how long it takes. Without this there is no way to show the automation worked, and no basis for the next engagement." },
    { step: "2. Confirm the data path", description: "Identify what data the automation touches and where it goes. Where customer personal or financial data is involved, confirm with the client in writing what is acceptable to them." },
    { step: "3. Decide the human-in-the-loop rule", description: "Agree explicitly what runs unattended and what a person approves first. Default to review-first for anything customer-facing or financial, and relax it only once accuracy is proven." },
    { step: "4. Build and dry run", description: "Build the automation and run it in shadow mode against real inputs without sending anything, so accuracy can be judged before a customer ever sees the output." },
    { step: "5. Confirm running costs", description: "Tell the client in writing what the ongoing per-use costs are and who holds the accounts. An automation that surprises a client with a monthly bill is a failed engagement regardless of how well it works." },
    { step: "6. Go live with monitoring", description: "Go live with the agreed review rule in place. Watch the first period closely and correct the behaviour rather than waiting for the client to complain." },
    { step: "7. Report the result", description: "Report back against the baseline from step one: volume handled, time saved, accuracy. This is what justifies the fee and what earns the next piece of work." },
  ],
  tools_systems: [
    "Brightex Admin: project record, AI usage dashboard for cost monitoring",
    "Provider accounts in the client's name wherever they carry usage billing",
    "Shadow-mode dry run before any customer-facing send",
  ],
  escalation:
    "If accuracy in the dry run is not good enough to release, the delivery lead says so rather than shipping it behind a review step indefinitely. If a live automation produces a wrong customer-facing output, it is switched to review-only the same day and the client is told before they find out themselves.",
});

// ─── Commercial SOPs ──────────────────────────────────────────────────────────

const PROPOSAL_SOP = sop("proposal-policy", {
  title: "When to Send a Proposal",
  area: "Commercial: Proposals & Quoting",
  purpose:
    "Defines when a proposal is warranted and when it is not. Writing full proposals for enquiries that were never going to convert is the largest avoidable cost in a small agency, and sending one too early gives away thinking for free.",
  scope:
    "Applies to every inbound enquiry and intake submission before any proposal is drafted, whether AI-generated or written by hand.",
  responsibilities: [
    { role: "Account owner", responsibility: "Decides whether an enquiry qualifies for a proposal, using the tests below, and records the decision on the client record." },
    { role: "Account owner", responsibility: "Holds a discovery conversation before proposing on anything that is not a small, well-defined piece of work." },
  ],
  procedure_steps: [
    { step: "Send a proposal when all four hold", description: "The scope is understood well enough to price it. The client has given a budget range or accepted guidance on one. There is a named decision maker who can say yes. There is a reason to act now, such as a date, a launch or an approved budget." },
    { step: "Do not send a proposal yet when", description: "The enquiry is a one-line description with no detail. The client is explicitly just exploring. There is no budget signal at all and no willingness to discuss one. We are one of several quotes being gathered to benchmark a price rather than to choose a partner. The person enquiring cannot approve the spend." },
    { step: "Instead of proposing too early", description: "Hold a short discovery call, or send a scoping note that restates the requirement and asks the two or three questions that block pricing. This is faster, costs almost nothing, and either qualifies the enquiry or ends it cleanly." },
    { step: "Use the intake signals", description: "The intake form captures decision stage and budget position for exactly this decision. Exploring plus no budget position means qualify further. Ready to start plus an approved budget means propose now." },
    { step: "Choose AI draft or manual", description: "Use AI generation when the engagement fits the standard shape and the intake is detailed enough to ground it. Write or upload a manual proposal when the engagement is bespoke, unusually large, or the client relationship warrants a hand-crafted document. An uploaded proposal is a first-class option, not a fallback." },
    { step: "Always review before sending", description: "No AI-generated proposal is sent without being read end to end and corrected. The pricing in particular is a commercial decision, never a generated one." },
    { step: "Gate the detail if needed", description: "Where the proposal contains full pricing breakdowns and the walkthrough call has not happened yet, use the gated public link so the client sees the summary and headline price, and the full detail is released after the conversation." },
  ],
  tools_systems: [
    "Brightex Admin: intake analysis, document generation, proposal upload, gated public links",
    "Client record: the decision to propose or qualify further is noted there",
  ],
  escalation:
    "If a client asks for a proposal before there is enough to price, the account owner says plainly that a short call first will produce a better and faster answer. If a proposal has been sent and read but not answered after two follow-ups, it is marked as such and the client moves to the ghost segment rather than being chased indefinitely.",
});

const AGREEMENT_SOP = sop("agreement-signing", {
  title: "Working Agreement and Sign-off",
  area: "Commercial: Agreements",
  purpose:
    "Defines the agreement that must be in place before delivery work begins, how it is reviewed and edited, and how it is signed. No work starts on an unsigned agreement.",
  scope:
    "Applies to every project-based engagement. Retainers and subscriptions use the same agreement with the recurring terms stated in it.",
  responsibilities: [
    { role: "Account owner", responsibility: "Generates the agreement from the accepted proposal, edits it to match what was actually agreed, and sends it for signature." },
    { role: "Account owner", responsibility: "Confirms the agreement is signed before any delivery work is scheduled or any team member is assigned." },
  ],
  procedure_steps: [
    { step: "1. Generate from the accepted proposal", description: "The agreement carries the scope, fees, payment milestones and timeline from the proposal the client accepted. It is not a fresh negotiation." },
    { step: "2. Edit before sending", description: "Read it end to end and correct anything that does not match what was actually agreed on the call. Special terms, unusual payment arrangements and anything the client explicitly asked for go in now, not in a side email that nobody will find later." },
    { step: "3. Send for signature", description: "Send the public link. The client reads the full agreement in the browser, and the signing button unlocks only once they have read to the end, confirmed they have read it, and typed their full name." },
    { step: "4. Signature is recorded", description: "Name, email, timestamp and device details are recorded against the document. The client receives a signed copy by email automatically, and the PDF download unlocks for them at that point and not before." },
    { step: "5. Work starts", description: "Only once the agreement shows as signed on the client record. If a deposit milestone is stated, it is collected before work is scheduled." },
    { step: "6. Changes after signing", description: "Any change to scope, fee or timeline after signing is agreed in writing and, where material, captured as a revised agreement rather than an email thread." },
  ],
  tools_systems: [
    "Brightex Admin: document generation, editing, public signing link, signature record on the client pane",
    "Signed copy emailed to the client and copied to their configured document contacts",
  ],
  escalation:
    "If a client asks to start before signing, the account owner declines and offers to turn the agreement around the same day instead. If a client disputes a term, it is resolved and a revised agreement issued, never verbally waived.",
});

const PAYMENTS_SOP = sop("payments-collections", {
  title: "Invoicing and Collections",
  area: "Commercial: Payments",
  purpose:
    "Defines when invoices are raised, how payment is chased, and at what point work stops. Consistent collection is what makes milestone pricing viable.",
  scope:
    "Applies to all project invoices, retainer billing and subscription renewals.",
  responsibilities: [
    { role: "Account owner", responsibility: "Raises invoices against the milestones stated in the signed agreement, not ad hoc, and ensures finance contacts are copied." },
    { role: "Account owner", responsibility: "Decides when to pause work on an overdue account, and communicates it before it happens rather than after." },
  ],
  procedure_steps: [
    { step: "1. Invoice against agreed milestones", description: "Raise each invoice at the milestone the signed agreement states. A deposit is collected before delivery work is scheduled." },
    { step: "2. Copy the right people", description: "Invoices go to the client's primary contact and are copied automatically to anyone set up on their record to receive invoices, so finance is not waiting on the contact to forward it." },
    { step: "3. Automated reminders", description: "Overdue invoices are chased automatically on a cooldown, so the same client is never reminded repeatedly in a week. Partial payments are acknowledged and only the remaining balance is chased." },
    { step: "4. Personal follow-up", description: "After the second automated reminder, the account owner follows up personally. A relationship is not repaired by a cron job." },
    { step: "5. Pause point", description: "If an invoice passes the agreed terms materially and there has been no response, work pauses. The client is told in writing before it happens, with what is needed to resume." },
    { step: "6. Handover is gated", description: "Final handover of access, credentials, source files and store accounts follows final payment, as stated in the agreement." },
  ],
  tools_systems: [
    "Brightex Admin: invoices, payment records, automated reminders, finance CC routing",
    "Receipt sent automatically on payment, copied to the client's payment contacts",
  ],
  escalation:
    "If an account reaches the pause point twice on the same engagement, the account owner renegotiates the payment structure or ends the engagement rather than continuing to carry it. Anything genuinely uncollectible is written off deliberately and recorded, not left open indefinitely.",
});

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SOP_LIBRARY: SopEntry[] = [
  {
    key: "client-lifecycle",
    label: "Client Engagement Lifecycle",
    summary: "The four-stage process every engagement follows, from first enquiry to post-launch relationship.",
    category: "Lifecycle",
    data: DEFAULT_SOP_DATA,
  },
  {
    key: "proposal-policy",
    label: "When to Send a Proposal",
    summary: "The qualification tests that decide whether an enquiry earns a proposal, and whether to generate or upload it.",
    category: "Commercial",
    data: PROPOSAL_SOP,
  },
  {
    key: "agreement-signing",
    label: "Working Agreement and Sign-off",
    summary: "What must be signed before delivery starts, how to edit it, and how digital signing works.",
    category: "Commercial",
    data: AGREEMENT_SOP,
  },
  {
    key: "payments-collections",
    label: "Invoicing and Collections",
    summary: "Milestone invoicing, reminder cadence, and the point at which work pauses.",
    category: "Commercial",
    data: PAYMENTS_SOP,
  },
  {
    key: "website",
    label: `Delivery: ${SERVICE_LABELS.website}`,
    summary: "Content collection, structure sign-off, launch checks and handover for site builds.",
    category: "Delivery",
    serviceTypes: ["website"],
    data: WEBSITE_SOP,
  },
  {
    key: "mobile",
    label: `Delivery: ${SERVICE_LABELS.mobile}`,
    summary: "Feature freeze, store account ownership, testing and submission for app builds.",
    category: "Delivery",
    serviceTypes: ["mobile"],
    data: MOBILE_SOP,
  },
  {
    key: "erp",
    label: `Delivery: ${SERVICE_LABELS.erp}`,
    summary: "Process mapping, phased build, data migration, training and go-live for business systems.",
    category: "Delivery",
    serviceTypes: ["erp"],
    data: ERP_SOP,
  },
  {
    key: "design",
    label: `Delivery: ${SERVICE_LABELS.design}`,
    summary: "Brief, revision limits, file handover and usage rights for design and branding work.",
    category: "Delivery",
    serviceTypes: ["design"],
    data: DESIGN_SOP,
  },
  {
    key: "consultancy",
    label: `Delivery: ${SERVICE_LABELS.consultancy}`,
    summary: "Defining the output, gathering evidence, and closing an advisory engagement cleanly.",
    category: "Delivery",
    serviceTypes: ["consultancy"],
    data: CONSULTANCY_SOP,
  },
  {
    key: "ai-automation",
    label: `Delivery: ${SERVICE_LABELS.ai_automation}`,
    summary: "Baselining, data paths, human-in-the-loop rules and running costs for automation work.",
    category: "Delivery",
    serviceTypes: ["ai_automation"],
    data: AI_SOP,
  },
];

export function getSop(key: string): SopEntry | undefined {
  return SOP_LIBRARY.find((s) => s.key === key);
}

/** The delivery SOPs that apply to a given set of services, plus the lifecycle. */
export function sopsForServices(serviceTypes: string[]): SopEntry[] {
  const delivery = SOP_LIBRARY.filter(
    (s) => s.serviceTypes?.some((t) => serviceTypes.includes(t))
  );
  const lifecycle = SOP_LIBRARY.filter((s) => s.key === "client-lifecycle");
  return [...lifecycle, ...delivery];
}

export const SOP_CATEGORIES = ["Lifecycle", "Commercial", "Delivery"] as const;
