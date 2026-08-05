/**
 * Client-facing acceptance controls.
 *
 * Two different moments, deliberately two different controls:
 *
 *   proposalAcceptBox()  "yes, let us do this"      commercial decision
 *   acceptButton()       "I agree to these terms"   legal act, in ./index.ts
 *
 * A proposal is an offer and an agreement is a contract. Collapsing them into
 * one button means asking a client to sign legal terms in the same breath as
 * expressing interest, which is both worse for them and weaker evidence for us.
 * So accepting a proposal captures who is accepting and which options they
 * chose, and nothing more: no signature, no per-clause confirmation, and no
 * read-to-end gate, because the thing that has to be read in full is the
 * agreement that follows.
 *
 * What acceptance is actually FOR is the two decisions only the client can
 * make: which option they want, and how they want to pay. Capturing them here
 * means the agreement, its milestone table and the invoice tranches are all
 * derived from one recorded choice instead of from a WhatsApp thread.
 */
import { esc } from "./index";
import type { PaymentSchedule } from "./blocks";

/**
 * NOTE ON STYLING: every class used below is defined in DOCUMENT_CSS in
 * ./index.ts, not here. documentShell() emits the document's only <style>
 * block, so a stylesheet exported from this file would never reach the page and
 * the control would ship unstyled without erroring anywhere.
 */

/** Human summary of a schedule, e.g. "60% on signature, then 40% on completion". */
export function describeSchedule(schedule: PaymentSchedule): string {
  const triggerWords: Record<string, string> = {
    on_signature: "on signature",
    on_milestone: "at the agreed milestone",
    on_completion: "on completion",
    on_date: "on the agreed date",
  };
  return schedule.stages
    .map((s) => `${s.percent}% ${triggerWords[s.trigger] ?? s.trigger}`)
    .join(", then ");
}

export interface ProposalAcceptOptions {
  documentId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  /** The schedule stated in the proposal. Shown as a confirmation when no
   * alternatives are offered, so the client sees what they are agreeing to
   * without being handed a choice that was never on the table. */
  schedule?: PaymentSchedule | null;
  /** Alternatives the client may pick between. When present, this replaces the
   * single confirmation with a real choice. */
  scheduleOptions?: PaymentSchedule[] | null;
  /** True when the proposal quotes ranges rather than fixed amounts, so the
   * client is told plainly that a final figure is confirmed before signing
   * rather than discovering it on the agreement. */
  hasRangedPricing?: boolean;
}

export function proposalAcceptBox(opts: ProposalAcceptOptions): string {
  const options = opts.scheduleOptions ?? [];
  const hasChoice = options.length > 1;

  const scheduleHtml = hasChoice
    ? `<label class="accept-label">How would you like to pay?</label>
       <div class="sched-list">
         ${options.map((s, i) => `<label class="sched-opt${i === 0 ? " on" : ""}" id="schedOpt${i}">
           <input type="radio" name="brxSched" value="${i}" ${i === 0 ? "checked" : ""} onchange="brxSchedPick(${i})">
           <span>
             <span class="sd-name">${esc(s.stages.map((st) => `${st.percent}%`).join(" / "))}</span>
             <span class="sd-detail">${esc(s.stages.map((st) => `${st.label} (${st.percent}%)`).join(". "))}</span>
           </span>
         </label>`).join("")}
       </div>`
    : opts.schedule
      ? `<div class="sched-fixed">
           <div class="sd-name">Payment: ${esc(describeSchedule(opts.schedule))}</div>
           <div class="sd-detail">${esc(opts.schedule.stages.map((st) => `${st.label} (${st.percent}%)`).join(". "))}</div>
         </div>`
      : "";

  return `<div class="accept-box" id="propAcceptBox">
    <h4>Happy to go ahead?</h4>
    <p>Accepting here tells us you are satisfied with the plan and want to proceed. It is not a contract: we will prepare the agreement${opts.hasRangedPricing ? ", confirm the final figure within each range with you," : ""} and send it over for signing.</p>

    ${scheduleHtml}

    <div class="accept-fields">
      <label for="propName">Your full name</label>
      <input type="text" id="propName" autocomplete="name" placeholder="e.g. Jacinta Nduta"
        value="${esc(opts.clientName ?? "")}" oninput="brxPropSync()">

      <div class="field-row">
        <div>
          <label for="propRole">Your role</label>
          <input type="text" id="propRole" autocomplete="organization-title" placeholder="e.g. Director" oninput="brxPropSync()">
        </div>
        <div>
          <label for="propEmail">Your email</label>
          <input type="email" id="propEmail" autocomplete="email" placeholder="you@company.co.ke"
            value="${esc(opts.clientEmail ?? "")}" oninput="brxPropSync()">
        </div>
      </div>

      <label for="propNotes">Anything to adjust before we draw up the agreement? (optional)</label>
      <input type="text" id="propNotes" placeholder="e.g. start after the November intake">
    </div>

    <button class="accept-btn" id="propBtn" disabled onclick="brxAcceptProposal()">Accept this proposal</button>
    <a class="cta-secondary" href="#" onclick="brxToggleChanges(event)" id="propChangesLink">Something needs changing first</a>
    <p class="accept-error" id="propError"></p>
    <p class="accept-legal">We record your name, role, email and the time of acceptance. The agreement follows separately and is where anything is actually signed.</p>

    <div class="changes-panel" id="propChangesPanel">
      <label class="accept-label" for="propChangeMsg">What would you like changed?</label>
      <textarea id="propChangeMsg" rows="4" placeholder="e.g. we would like to start after the November intake, and Phase 3 can wait until the new year" oninput="brxChangeSync()"></textarea>
      <button class="accept-btn secondary" id="propChangeBtn" disabled onclick="brxRequestChanges()">Send this to Brightex</button>
      <p class="accept-legal">We will read it and come back to you to talk it through. Nothing is committed by sending this.</p>
    </div>
  </div>
  <script>
    (function(){
      window.brxSchedPick = function(i){
        var list = document.querySelectorAll('.sched-opt');
        for (var n = 0; n < list.length; n++) list[n].classList.toggle('on', n === i);
      };

      window.brxPropSync = function(){
        var name  = (document.getElementById('propName')  || {}).value || '';
        var email = (document.getElementById('propEmail') || {}).value || '';
        var btn   = document.getElementById('propBtn');
        if (!btn) return;
        btn.disabled = !(name.trim().split(/\\s+/).length >= 2
          && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim()));
      };

      window.brxAcceptProposal = function(){
        var btn = document.getElementById('propBtn');
        var err = document.getElementById('propError');
        var picked = document.querySelector('input[name=brxSched]:checked');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        if (err) err.style.display = 'none';

        fetch('/api/public/documents/${esc(opts.documentId)}/accept-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:  (document.getElementById('propName')  || {}).value || '',
            role:  (document.getElementById('propRole')  || {}).value || '',
            email: (document.getElementById('propEmail') || {}).value || '',
            notes: (document.getElementById('propNotes') || {}).value || '',
            schedule_index: picked ? Number(picked.value) : 0
          })
        }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }); })
          .then(function(res){
            if (!res.ok) throw new Error((res.body && res.body.error) || 'Something went wrong.');
            var box = document.getElementById('propAcceptBox');
            if (box) {
              box.innerHTML = '<h4>Thank you. That is noted.</h4>'
                + '<p>We have your acceptance and will send the agreement for signing shortly.'
                + (res.body && res.body.pending_figures
                    ? ' We will confirm the final figure within each phase range with you first.'
                    : '')
                + ' A confirmation is on its way to your inbox.</p>';
            }
          })
          .catch(function(e){
            if (btn) { btn.disabled = false; btn.textContent = 'Accept this proposal'; }
            if (err) { err.textContent = e.message; err.style.display = 'block'; }
          });
      };

      window.brxToggleChanges = function(e){
        if (e) e.preventDefault();
        var panel = document.getElementById('propChangesPanel');
        var link  = document.getElementById('propChangesLink');
        if (!panel) return;
        var open = panel.classList.toggle('open');
        if (link) link.textContent = open ? 'Never mind, I am happy to proceed' : 'Something needs changing first';
        if (open) { var m = document.getElementById('propChangeMsg'); if (m) m.focus(); }
      };

      window.brxChangeSync = function(){
        var msg = (document.getElementById('propChangeMsg') || {}).value || '';
        var btn = document.getElementById('propChangeBtn');
        if (btn) btn.disabled = msg.trim().length < 10;
      };

      window.brxRequestChanges = function(){
        var btn = document.getElementById('propChangeBtn');
        var err = document.getElementById('propError');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        if (err) err.style.display = 'none';

        fetch('/api/public/documents/${esc(opts.documentId)}/request-changes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:    (document.getElementById('propName')     || {}).value || '',
            email:   (document.getElementById('propEmail')    || {}).value || '',
            message: (document.getElementById('propChangeMsg')|| {}).value || ''
          })
        }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }); })
          .then(function(res){
            if (!res.ok) throw new Error((res.body && res.body.error) || 'Something went wrong.');
            var box = document.getElementById('propAcceptBox');
            if (box) {
              box.innerHTML = '<h4>Thank you. We have it.</h4>'
                + '<p>Your notes are with us and we will be in touch to arrange a call and talk them through.'
                + ' A copy is on its way to your inbox.</p>';
            }
          })
          .catch(function(e){
            if (btn) { btn.disabled = false; btn.textContent = 'Send this to Brightex'; }
            if (err) { err.textContent = e.message; err.style.display = 'block'; }
          });
      };

      brxPropSync();
      brxChangeSync();
    })();
  </script>`;
}

// ─── Agreement signing ──────────────────────────────────────────────────────

export interface SigningTerm {
  key: string;
  label: string;
}

/**
 * The terms a client confirms individually.
 *
 * One blanket tick proves that a box was ticked. It does not evidence that the
 * person understood they were committing to a non-refundable deposit, or that
 * IP transfers only on final payment. Each material term therefore gets its own
 * checkbox and its own timestamp, so a disputed agreement is answered with a
 * record of what was specifically confirmed rather than a single boolean.
 *
 * The payment term is generated from the schedule the client actually chose, so
 * the thing they tick is the thing they picked, not a generic sentence.
 */
export function signingTerms(schedule: PaymentSchedule | null | undefined): SigningTerm[] {
  const terms: SigningTerm[] = [];

  if (schedule) {
    const first = schedule.stages[0];
    terms.push({
      key: "payment_schedule",
      label:
        `I agree to the payment schedule: ${describeSchedule(schedule)}. ` +
        `I understand work begins once the first payment of ${first.percent}% is received.`,
    });
  }

  terms.push(
    {
      key: "scope",
      label: "I have read the scope of work and understand that anything outside it is quoted and agreed separately before it is done.",
    },
    {
      key: "timeline",
      label: "I understand the timeline runs from the first payment and that delays in our feedback, approvals or materials move the dates accordingly.",
    },
    {
      key: "ip",
      label: "I understand that ownership of the custom work transfers to us on receipt of full payment.",
    },
    {
      key: "cancellation",
      label: "I understand either side may end this agreement with 14 days' written notice, that work completed up to that point is payable, and that the deposit is non-refundable once work has started.",
    },
    {
      key: "authority",
      label: "I have the authority to enter into this agreement on behalf of my organisation.",
    }
  );

  return terms;
}

export interface AgreementSignOptions {
  documentId: string;
  clientName?: string | null;
  clientEmail?: string | null;
  entity?: string | null;
  schedule?: PaymentSchedule | null;
  /** Who has already signed for Brightex, shown so the client can see the
   * agreement is not blank on our side before they commit to it. */
  countersignedBy?: { name: string; title: string } | null;
}

export function agreementSignBox(opts: AgreementSignOptions): string {
  const terms = signingTerms(opts.schedule);

  return `<div class="accept-box" id="signBox">
    <h4>Sign this agreement</h4>
    <p>Signing below completes this agreement and starts the engagement. Please read it in full first.</p>

    ${opts.countersignedBy ? `<div class="sched-fixed">
      <div class="sd-name">Already signed by ${esc(opts.countersignedBy.name)}</div>
      <div class="sd-detail">${esc(opts.countersignedBy.title)}, for and on behalf of Brightex Solutions. Your signature completes it.</div>
    </div>` : ""}

    <div class="accept-progress"><span id="signProgressBar"></span></div>
    <p class="accept-gate" id="signGate">Please read to the end of the agreement to enable signing.</p>

    <div class="accept-fields">
      <label for="signName">Your full legal name</label>
      <input type="text" id="signName" autocomplete="name" placeholder="e.g. Jacinta Nduta Kamau"
        value="${esc(opts.clientName ?? "")}" oninput="brxSignSync()">

      <div class="field-row">
        <div>
          <label for="signTitle">Your title</label>
          <input type="text" id="signTitle" autocomplete="organization-title" placeholder="e.g. Director" oninput="brxSignSync()">
        </div>
        <div>
          <label for="signEmail">Your email</label>
          <input type="email" id="signEmail" autocomplete="email" placeholder="you@company.co.ke"
            value="${esc(opts.clientEmail ?? "")}" oninput="brxSignSync()">
        </div>
      </div>

      <label for="signEntity">Signing on behalf of</label>
      <input type="text" id="signEntity" autocomplete="organization" placeholder="Your organisation's registered name"
        value="${esc(opts.entity ?? "")}" oninput="brxSignSync()">
    </div>

    <label class="accept-label">Your signature</label>
    <div class="sig-tabs">
      <button type="button" class="sig-tab on" id="sigTabDraw" onclick="brxSigMode('draw')">Draw it</button>
      <button type="button" class="sig-tab" id="sigTabUpload" onclick="brxSigMode('upload')">Upload a photo</button>
    </div>

    <div class="sig-pane" id="sigPaneDraw">
      <canvas id="sigCanvas" class="sig-canvas" width="1000" height="320"></canvas>
      <div class="sig-actions">
        <span class="sig-hint">Sign with your finger or mouse</span>
        <button type="button" class="sig-clear" onclick="brxSigClear()">Clear</button>
      </div>
    </div>

    <div class="sig-pane" id="sigPaneUpload" hidden>
      <p class="sig-hint">Sign on plain white paper, photograph it in good light, and upload it. We remove the paper background automatically and show you the result before you sign.</p>
      <input type="file" id="sigFile" accept="image/png,image/jpeg,image/webp" onchange="brxSigUpload(event)">
      <div class="sig-preview" id="sigPreview" hidden>
        <img id="sigPreviewImg" alt="Your signature with the background removed">
        <p class="sig-hint" id="sigPreviewNote">This is how your signature will appear. Upload a different photo if it does not look right.</p>
      </div>
    </div>

    <label class="accept-label" style="margin-top:20px">Please confirm each of these</label>
    <div class="accept-fields">
      ${terms.map((t) => `<label class="accept-check">
        <input type="checkbox" data-term="${esc(t.key)}" onchange="brxSignSync()">
        <span>${esc(t.label)}</span>
      </label>`).join("")}
    </div>

    <button class="accept-btn" id="signBtn" disabled onclick="brxSignAgreement()">Sign this agreement</button>
    <p class="accept-error" id="signError"></p>
    <p class="accept-legal">Your name, title, organisation, email, signature image, the time of signing and your device details are recorded as evidence. A signed copy is emailed to you automatically.</p>
  </div>
  <script>
    (function(){
      var readToEnd = false, mode = 'draw', uploadedPng = null, drawn = false;
      var canvas = document.getElementById('sigCanvas');
      var ctx = canvas ? canvas.getContext('2d') : null;

      // Backing store is fixed at 1000x320 while the element is fluid, so the
      // stored signature is the same resolution whatever the device drew it on.
      if (ctx) {
        ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0d1f4e';
      }

      function pos(e){
        var r = canvas.getBoundingClientRect();
        var p = e.touches ? e.touches[0] : e;
        return { x: (p.clientX - r.left) * (canvas.width / r.width),
                 y: (p.clientY - r.top)  * (canvas.height / r.height) };
      }
      var drawing = false;
      function start(e){ e.preventDefault(); drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
      function move(e){ if (!drawing) return; e.preventDefault(); var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); drawn = true; brxSignSync(); }
      function end(){ drawing = false; }
      if (canvas) {
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);
      }

      window.brxSigClear = function(){
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawn = false; brxSignSync();
      };

      window.brxSigMode = function(m){
        mode = m;
        document.getElementById('sigTabDraw').classList.toggle('on', m === 'draw');
        document.getElementById('sigTabUpload').classList.toggle('on', m === 'upload');
        document.getElementById('sigPaneDraw').hidden = m !== 'draw';
        document.getElementById('sigPaneUpload').hidden = m !== 'upload';
        brxSignSync();
      };

      window.brxSigUpload = function(e){
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var err = document.getElementById('signError');
        var note = document.getElementById('sigPreviewNote');
        if (note) note.textContent = 'Removing the background...';
        document.getElementById('sigPreview').hidden = false;

        var reader = new FileReader();
        reader.onload = function(){
          fetch('/api/public/documents/${esc(opts.documentId)}/signature-preview', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: reader.result })
          }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }); })
            .then(function(res){
              if (!res.ok) throw new Error(res.body.error || 'That image could not be processed.');
              uploadedPng = res.body.image;
              document.getElementById('sigPreviewImg').src = uploadedPng;
              if (note) note.textContent = 'This is how your signature will appear. Upload a different photo if it does not look right.';
              if (err) err.style.display = 'none';
              brxSignSync();
            })
            .catch(function(ex){
              uploadedPng = null;
              document.getElementById('sigPreview').hidden = true;
              if (err) { err.textContent = ex.message; err.style.display = 'block'; }
              brxSignSync();
            });
        };
        reader.readAsDataURL(file);
      };

      function updateProgress(){
        var box = document.getElementById('signBox');
        if (!box) return;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 100;
        var bar = document.getElementById('signProgressBar');
        if (bar) bar.style.width = pct + '%';
        if (!readToEnd && box.getBoundingClientRect().top < window.innerHeight) {
          readToEnd = true;
          var g = document.getElementById('signGate');
          if (g) g.textContent = 'Thank you for reading it through. Complete the details below to sign.';
          brxSignSync();
        }
      }
      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
      updateProgress();

      function allTermsTicked(){
        var boxes = document.querySelectorAll('#signBox input[data-term]');
        for (var i = 0; i < boxes.length; i++) if (!boxes[i].checked) return false;
        return boxes.length > 0;
      }
      function hasSignature(){ return mode === 'draw' ? drawn : !!uploadedPng; }

      window.brxSignSync = function(){
        var v = function(id){ return (document.getElementById(id) || {}).value || ''; };
        var btn = document.getElementById('signBtn');
        if (!btn) return;
        btn.disabled = !(readToEnd && allTermsTicked() && hasSignature()
          && v('signName').trim().split(/\\s+/).length >= 2
          && v('signEntity').trim().length >= 2
          && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v('signEmail').trim()));
      };

      window.brxSignAgreement = function(){
        var btn = document.getElementById('signBtn');
        var err = document.getElementById('signError');
        if (btn) { btn.disabled = true; btn.textContent = 'Signing...'; }
        if (err) err.style.display = 'none';

        var terms = [];
        var boxes = document.querySelectorAll('#signBox input[data-term]');
        for (var i = 0; i < boxes.length; i++) {
          terms.push({ key: boxes[i].getAttribute('data-term'),
                       label: (boxes[i].parentNode.querySelector('span') || {}).textContent || '' });
        }

        var v = function(id){ return (document.getElementById(id) || {}).value || ''; };
        fetch('/api/public/documents/${esc(opts.documentId)}/sign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: v('signName'), title: v('signTitle'), email: v('signEmail'), entity: v('signEntity'),
            method: mode === 'draw' ? 'drawn' : 'upload',
            image: mode === 'draw' ? canvas.toDataURL('image/png') : uploadedPng,
            terms: terms
          })
        }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }); })
          .then(function(res){
            if (!res.ok) throw new Error(res.body.error || 'Something went wrong.');
            var box = document.getElementById('signBox');
            if (box) {
              box.innerHTML = '<h4>Signed. Thank you.</h4>'
                + '<p>This agreement is now complete and countersigned. A signed copy is on its way to your inbox,'
                + ' and we will be in touch to schedule the kick-off.</p>';
            }
            setTimeout(function(){ location.reload(); }, 4000);
          })
          .catch(function(ex){
            if (btn) { btn.disabled = false; btn.textContent = 'Sign this agreement'; }
            if (err) { err.textContent = ex.message; err.style.display = 'block'; }
          });
      };

      brxSignSync();
    })();
  </script>`;
}

/** Shown in place of the accept box once a proposal has been accepted. */
export function proposalAcceptedBox(name: string, acceptedAt: string): string {
  const when = new Date(acceptedAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  return `<div class="accepted-box">
    <div class="ic">✓</div>
    <div>
      <h4>Accepted by ${esc(name)}</h4>
      <p>On ${esc(when)}. The agreement follows separately for signing.</p>
    </div>
  </div>`;
}
