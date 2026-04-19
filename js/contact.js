/* =========================================
   BRIGHTEX - CONTACT PAGE JS
   contact.js
   ========================================= */

const PHONE = '+254741980127';
const EMAIL = 'info.brightexsolutions@gmail.com';

const serviceMessages = {
  '': {
    subject: 'General Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I came across your website and would like to learn more about your services.

I'm interested in exploring how you can help my business grow digitally. Could we schedule a quick call or meeting to discuss further?

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

Looking forward to hearing from you.`,
  },
  'web-development': {
    subject: 'Web Development Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in your Web Development services.

Brief description of what I need:
- Type of website: [Business website / E-commerce / Portfolio / Other]
- Preferred platform: [WordPress / Custom / Not sure]
- Timeline: [Urgency or expected launch date]
- Budget range: [Optional]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

I'd love to discuss further. Please get back to me at your earliest convenience.`,
  },
  'ui-ux-design': {
    subject: 'UI/UX Design Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in your UI/UX Design services.

Project details:
- Platform: [Web / Mobile App / Both]
- Scope: [New design / Redesign / UX audit]
- Industry: [Your industry]
- Timeline: [Expected timeline]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

Looking forward to discussing how we can work together.`,
  },
  'seo': {
    subject: 'SEO & Digital Optimization Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in your SEO & Digital Optimization services.

About my current situation:
- Website URL: [Your website if any]
- Current challenges: [Low traffic / Poor rankings / Technical issues / Other]
- Target audience: [Local / National / International]
- Goals: [More traffic / Better rankings / Improved conversions]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

Please reach out to schedule a discussion.`,
  },
  'branding': {
    subject: 'Branding & Digital Identity Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in your Branding & Digital Identity services.

Project overview:
- Need: [New brand / Brand refresh / Logo only / Full brand identity]
- Business type: [Your industry/niche]
- Target audience: [Who your customers are]
- Style preference: [Modern / Classic / Minimal / Bold / Other]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

Looking forward to building something impactful together!`,
  },
  'ai-automation': {
    subject: 'AI & Automation Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in your AI & Automation services.

What I'm looking for:
- Use case: [AI chatbot / Workflow automation / AI-powered features / Training / Other]
- Business challenge: [Briefly describe what you want to solve]
- Current tools: [Tools or platforms you're already using]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

I'd love to explore how AI can streamline my operations. Let's talk!`,
  },
  'erp': {
    subject: 'ERP System Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in an ERP / Business Management System for my business.

About my requirements:
- Business size: [Team size / number of users]
- Modules needed: [Inventory / HR / Finance / CRM / Sales / Other]
- Current system: [Excel / Manual / Existing software]
- Timeline: [Expected go-live date]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

Please get in touch so we can discuss the right solution for my business.`,
  },
  'consultancy': {
    subject: 'Technology Consultancy Inquiry - Brightex Solutions',
    body: `Hi Brightex Solutions Team,

I'm interested in exploring a Technology Consultancy engagement with Brightex.

About what we need:
- Company / Product: [Your company and what you're building]
- Engagement type: [Embedded team partner / Advisory / Project-based / Ongoing retainer]
- Skills needed: [Engineering / UI/UX Design / Product Strategy / Analytics / Other]
- Team size & context: [Brief description of your team and current situation]
- Timeline: [When you'd need us to start]

Name: [Your Name]
Company: [Your Company / Business]
Phone: [Your Number]

Looking forward to discussing how we can embed with your team.`,
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const serviceSelect  = document.getElementById('service');
  const nameInput      = document.getElementById('name');
  const companyInput   = document.getElementById('company');
  const contactInput   = document.getElementById('contact-detail');
  const messagePreview = document.getElementById('message-preview');
  const whatsappBtn    = document.getElementById('send-whatsapp');
  const emailBtn       = document.getElementById('send-email');
  const feedbackEl     = document.getElementById('form-feedback');

  function buildMessage(service, name, company, contactDetail) {
    let data = serviceMessages[service] || serviceMessages[''];
    let body = data.body;

    if (name) body = body.replace('[Your Name]', name);
    if (company) body = body.replace('[Your Company / Business]', company);
    if (contactDetail) body = body.replace('[Your Number]', contactDetail);

    return { subject: data.subject, body };
  }

  function getMessageBody() {
    return messagePreview ? messagePreview.value.trim() : '';
  }

  function buildLinks(subject, body) {
    const waText = encodeURIComponent(body);
    const mailSubject = encodeURIComponent(subject);
    const mailBody = encodeURIComponent(body);

    if (whatsappBtn) whatsappBtn.href = `https://wa.me/${PHONE.replace('+', '')}?text=${waText}`;
    if (emailBtn) emailBtn.href = `mailto:${EMAIL}?subject=${mailSubject}&body=${mailBody}`;
  }

  function updatePreview() {
    const service = serviceSelect ? serviceSelect.value : '';
    const name    = nameInput    ? nameInput.value.trim()    : '';
    const company = companyInput ? companyInput.value.trim() : '';
    const contactDetail = contactInput ? contactInput.value.trim() : '';

    const { subject, body } = buildMessage(service, name, company, contactDetail);

    if (messagePreview && document.activeElement !== messagePreview) {
      messagePreview.value = body;
    }
    if (feedbackEl) feedbackEl.hidden = Boolean(name && contactDetail);
    buildLinks(subject, getMessageBody() || body);
  }

  function validateRequiredFields() {
    const name = nameInput ? nameInput.value.trim() : '';
    const contactDetail = contactInput ? contactInput.value.trim() : '';
    const isValid = Boolean(name && contactDetail);

    if (feedbackEl) feedbackEl.hidden = isValid;
    return isValid;
  }

  // Initial render
  updatePreview();

  // Update on change
  [serviceSelect, nameInput, companyInput, contactInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });
  if (messagePreview) {
    messagePreview.addEventListener('input', () => {
      const service = serviceSelect ? serviceSelect.value : '';
      const { subject } = serviceMessages[service] || serviceMessages[''];
      buildLinks(subject, getMessageBody());
    });
  }

  [whatsappBtn, emailBtn].forEach(button => {
    if (!button) return;
    button.addEventListener('click', (event) => {
      if (!validateRequiredFields()) {
        event.preventDefault();
      }
    });
  });

  // Phone CTA
  const phoneBtn = document.querySelector('.contact-phone-btn');
  if (phoneBtn) {
    phoneBtn.addEventListener('click', () => {
      window.location.href = `tel:${PHONE}`;
    });
  }
});