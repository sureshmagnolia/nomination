var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var n={APPS_SCRIPT_URL:`https://script.google.com/macros/s/AKfycbw29XuhvNI4cV-tlAWz5IaRrWPY1T9P7ZiQJbu-7za9226PyEqlhuLOrOMTG2QulzzOog/exec`,ELECTION_DATE:`2026-10-12`,COLLEGE_NAME:`Government Victoria College, Palakkad`,DEFAULT_POSTS:[{post:`The Chairman`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Vice Chairman`,femaleOnly:!0,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Secretary`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Joint Secretary`,femaleOnly:!0,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Chief Student Editor`,femaleOnly:!1,finalYearIneligible:!0,yearRestriction:``,deptRestriction:!1},{post:`The Secretary Fine Arts`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The General Captain For Sports And Games`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The University Union Councillor`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`I UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`1`,deptRestriction:!1},{post:`II UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`2`,deptRestriction:!1},{post:`III UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`3`,deptRestriction:!1},{post:`PG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`PG`,deptRestriction:!1},{post:`Association Secretary Botany`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Chemistry`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Commerce`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Computer Science`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Economics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary English`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Hindi`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary History`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Malayalam`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Mathematics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Physics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Psychology`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Sanskrit`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Tamil`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Zoology`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0}]},r=t({router:()=>o}),i={},a=`/`,o={on(e,t){return i[e]=t,this},setDefault(e){return a=e,this},navigate(e,t={}){window.history.pushState({path:e,params:t},``,`#${e}`),this._resolve(e,t)},start(){window.addEventListener(`popstate`,e=>{let{path:t,params:n}=e.state||{path:a,params:{}};this._resolve(t,n)});let e=window.location.hash.replace(`#`,``)||a;this._resolve(e,{})},_resolve(e,t){let n=i[e]||i[a];n&&n(t)}};function s(e,t=n.ELECTION_DATE){if(!e)return`N/A`;let r=new Date(t),i=new Date(e),a=r.getFullYear()-i.getFullYear(),o=r.getMonth()-i.getMonth(),s=r.getDate()-i.getDate();return s<0&&(o--,s+=new Date(r.getFullYear(),r.getMonth(),0).getDate()),o<0&&(a--,o+=12),`${a} Years, ${o} Months, ${s} Days`}function c(e,t,n,r=null,i=[]){if(!e)return[];let a=[],o=String(e.CLASS||``).toUpperCase(),s=String(e.Dept||``).toUpperCase(),c=i.find(e=>e.post===t)||{};if(c.deptRestriction){let r=`Association Secretary `,i=t.startsWith(r)?t.replace(r,``).toUpperCase():null;i&&s!==i&&a.push(`${n} for "${t}" must be from the ${i} dept (current: ${e.Dept||`N/A`}).`)}let l=String(c.yearRestriction||``);return l===`1`&&!o.includes(`1ST YEAR`)&&a.push(`${n} must be a 1st Year student for this post.`),l===`2`&&!o.includes(`2ND YEAR`)&&a.push(`${n} must be a 2nd Year student for this post.`),l===`3`&&!o.includes(`3RD YEAR`)&&a.push(`${n} must be a 3rd Year student for this post.`),l===`PG`&&(o.includes(`MA`)||o.includes(`MSC`)||o.includes(`MCOM`)||o.includes(`M.SC`)||o.includes(`M.COM`)||o.includes(`M.A`)||a.push(`${n} for PG Representative must be a PG student (MA/MSc/MCom).`)),n===`Candidate`&&r&&(c.femaleOnly&&r===`Male`&&a.push(`The post of "${t}" is reserved for female candidates only.`),c.finalYearIneligible&&(o.includes(`3RD YEAR`)||o.includes(`2ND YEAR M`))&&a.push(`Final year students are not eligible for "${t}".`)),a}function l(){let e=Math.floor(Math.random()*10)+1,t=Math.floor(Math.random()*10)+1;return{question:`${e} + ${t}`,answer:String(e+t)}}function u(){return new Date().toLocaleDateString(`en-GB`)}function d(e,t,n){let r=[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`];for(let t=1;t<=31;t++)e.innerHTML+=`<option value="${t}">${t}</option>`;r.forEach((e,n)=>t.innerHTML+=`<option value="${n+1}">${e}</option>`);for(let e=2015;e>=1950;e--)n.innerHTML+=`<option value="${e}">${e}</option>`}function f(e,t,n){return`${n}-${String(t).padStart(2,`0`)}-${String(e).padStart(2,`0`)}`}function p(e,t,n){return`${String(e).padStart(2,`0`)}/${String(t).padStart(2,`0`)}/${n}`}function m(e,t=`Nomination Form`){let n=window.open(``,`_blank`);n.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            color: black !important;
            background: white !important;
            font-size: 11pt;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          /* Reset dark theme classes to clean B&W for printing */
          * { color: black !important; background: transparent !important; border-color: #333 !important; }
          .print-paper { width: 100%; margin: 0 auto; padding: 1rem; }
          .border { border: 1px solid #333; }
          .border-b { border-bottom: 1px solid #333; }
          .border-y { border-top: 1px solid #333; border-bottom: 1px solid #333; }
          .border-t { border-top: 1px solid #333; }
          .rounded-lg, .rounded-xl { border-radius: 4px; }
          .p-8 { padding: 2rem; }
          .p-4 { padding: 1rem; }
          .p-3 { padding: 0.75rem; }
          .pt-6 { padding-top: 1.5rem; }
          .pb-1 { padding-bottom: 0.25rem; }
          .pb-2 { padding-bottom: 0.5rem; }
          .pb-3 { padding-bottom: 0.75rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-4 { margin-top: 1rem; }
          .mt-6 { margin-top: 1.5rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .space-y-4 > * + * { margin-top: 1rem; }
          .space-y-3 > * + * { margin-top: 0.75rem; }
          .space-y-1 > * + * { margin-top: 0.25rem; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-around { justify-content: space-around; }
          .items-start { align-items: flex-start; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-xs { font-size: 0.8rem; }
          .text-sm { font-size: 0.9rem; }
          .text-base { font-size: 1rem; }
          .text-lg { font-size: 1.125rem; }
          .text-xl { font-size: 1.25rem; }
          .text-3xl { font-size: 1.875rem; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .font-mono { font-family: monospace; }
          .uppercase { text-transform: uppercase; }
          .tracking-wide { letter-spacing: 0.025em; }
          .tracking-widest { letter-spacing: 0.1em; }
          .w-40 { width: 10rem; }
          .inline-block { display: inline-block; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .col-span-2 { grid-column: span 2; }
          .gap-x-4 { column-gap: 1rem; }
          .gap-y-1 { row-gap: 0.25rem; }
          .italic { font-style: italic; }
          .badge { border: 1px solid #000; padding: 2px 6px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
          h2, h3, p { margin: 0; }
        </style>
      </head>
      <body>
        ${e}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 200);
          };
        <\/script>
      </body>
    </html>
  `),n.document.close()}function h(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function g(e,t,n){t?(e.disabled=!0,e.innerHTML=`<span class="spinner"></span> Please wait...`):(e.disabled=!1,e.innerHTML=n)}function _(e,t=`info`){let n={info:`#6366f1`,success:`#10b981`,error:`#ef4444`,warning:`#f59e0b`},r=document.createElement(`div`);r.style.cssText=`position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:0.75rem 1.25rem;border-radius:0.5rem;color:white;font-size:0.875rem;font-weight:500;background:${n[t]||n.info};box-shadow:0 10px 40px rgba(0,0,0,0.4);max-width:320px;transition:opacity 0.4s;`,r.textContent=e,document.body.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,setTimeout(()=>r.remove(),400)},3500)}function v(e){e.innerHTML=`
    <div class="page-enter min-h-screen flex flex-col">
      <header class="glass sticky top-0 z-50 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
            <h1 class="text-xl font-bold text-white tracking-tight">GVC Election Portal</h1>
          </div>
          <button data-nav="/admin" class="btn btn-secondary btn-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Admin Login
          </button>
        </div>
      </header>

      <main class="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div class="text-center mb-16 space-y-4">
          <h2 class="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            College Union <br/>
            <span class="gradient-text">Election Management</span>
          </h2>
          <p class="text-slate-400 text-lg max-w-2xl mx-auto">
            Welcome to the official election portal of Government Victoria College. 
            Submit your nominations, track status, and view the finalized candidate lists.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${y(`/submit`,`📝`,`Submit Nomination`,`New nomination form with eligibility check.`)}
          ${y(`/find`,`🔍`,`Find My Nomination`,`Retrieve and print your submitted nomination.`)}
          ${y(`/withdraw`,`↩️`,`Withdraw Nomination`,`Request withdrawal of your candidacy.`)}
          ${y(`/valid-list`,`✅`,`Valid Nominations`,`View the list of verified candidates.`)}
          ${y(`/final-list`,`🏆`,`Final Candidate List`,`View the final list post-withdrawals.`)}
        </div>
      </main>

      <footer class="py-12 border-t border-white/5 text-center text-slate-500 text-sm">
        <p>&copy; ${new Date().getFullYear()} Government Victoria College, Palakkad</p>
        <p class="mt-1 font-medium text-slate-400">Developed by Exam Wing GVC</p>
      </footer>
    </div>
  `}function y(e,t,n,r){return`
  <div data-nav="${e}" class="glass p-6 rounded-2xl hover:bg-white/5 transition group cursor-pointer border border-white/5 hover:border-indigo-500/30">
    <div class="text-3xl mb-4 transform group-hover:scale-110 transition duration-300">${t}</div>
    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition">${h(n)}</h3>
    <p class="text-sm text-slate-400 leading-relaxed">${h(r)}</p>
    <div class="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition">
      Continue <span>→</span>
    </div>
  </div>`}var b=n.APPS_SCRIPT_URL;async function x(e){let t=new URL(b);Object.entries(e).forEach(([e,n])=>t.searchParams.append(e,n));let n=await fetch(t.toString());if(!n.ok)throw Error(`Network error: ${n.status}`);let r=await n.json();if(r.error)throw Error(r.error);return r}async function S(e){let t=await fetch(b,{method:`POST`,headers:{"Content-Type":`text/plain;charset=utf-8`},body:JSON.stringify(e)});if(!t.ok)throw Error(`Network error: ${t.status}`);let n=await t.json();if(n.error)throw Error(n.error);return n}var C={getNominalRoll:()=>x({action:`getNominalRoll`}),getPosts:()=>x({action:`getPosts`}),getNomination:e=>x({action:`getNomination`,id:e}),getValidNominations:()=>x({action:`getValidNominations`}),getFinalNominations:()=>x({action:`getFinalNominations`}),submitNomination:e=>S({action:`submitNomination`,...e}),submitWithdrawal:e=>S({action:`submitWithdrawal`,id:e}),adminLogin:e=>S({action:`adminLogin`,password:e}),adminGetNominations:e=>x({action:`adminGetNominations`,password:e}),adminVerifyNomination:(e,t,n)=>S({action:`adminVerifyNomination`,password:e,id:t,status:n}),adminApproveWithdrawal:(e,t)=>S({action:`adminApproveWithdrawal`,password:e,id:t}),adminPublishValidList:e=>S({action:`adminPublishValidList`,password:e}),adminPublishFinalList:e=>S({action:`adminPublishFinalList`,password:e}),adminGetSettings:e=>x({action:`adminGetSettings`,password:e}),adminGetPosts:e=>x({action:`adminGetPosts`,password:e}),adminAddPost:(e,t)=>S({action:`adminAddPost`,password:e,...t}),adminUpdatePost:(e,t)=>S({action:`adminUpdatePost`,password:e,...t}),adminDeletePost:(e,t)=>S({action:`adminDeletePost`,password:e,postName:t}),adminReorderPosts:(e,t)=>S({action:`adminReorderPosts`,password:e,posts:t}),adminGetBooths:e=>x({action:`adminGetBooths`,password:e}),adminSaveBooths:(e,t)=>S({action:`adminSaveBooths`,password:e,booths:t})},w=[],T=[],E=``;async function D(e){e.innerHTML=te(`Submit Nomination`,`
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let[t,r]=await Promise.all([C.getNominalRoll(),C.getPosts().catch(()=>null)]);if(w=Array.isArray(t)?t:[],w.length===0)throw Error(`Nominal roll is empty. Please contact the admin.`);T=Array.isArray(r)&&r.length>0?r:n.DEFAULT_POSTS,O(e)}catch(t){e.querySelector(`#loadingState`).innerHTML=`
      <div class="alert alert-error">${h(t.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`,e.querySelector(`#backBtn`).addEventListener(`click`,()=>o.navigate(`/`))}}function O(e){let t=l();E=t.answer,e.querySelector(`#loadingState`).classList.add(`hidden`);let n=e.querySelector(`#formArea`);n.classList.remove(`hidden`),n.innerHTML=`
    <div id="warningBox" class="hidden alert alert-warning mb-4"></div>

    <form id="nomForm" class="space-y-8">
      <!-- Post -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-1">Post Applied For</label>
        <select id="postSelect" class="field">${T.map(e=>`<option value="${h(e.post)}">${h(e.post)}</option>`).join(``)}</select>
      </div>

      <!-- Three columns: Candidate / Proposer / Seconder -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${k(`candidate`,`Candidate`,!0)}
        ${k(`proposer`,`Proposer`,!1)}
        ${k(`seconder`,`Seconder`,!1)}
      </div>

      <!-- Captcha -->
      <div class="glass rounded-xl p-5">
        <label class="block text-sm font-semibold text-slate-300 mb-2">🤖 Captcha Verification</label>
        <p class="text-slate-400 text-sm mb-3">What is <strong id="captchaQuestion" class="text-white text-base">${t.question}</strong>?</p>
        <div class="flex items-center gap-3">
          <input id="captchaInput" type="number" class="field w-40" placeholder="Your answer" />
          <button type="button" id="refreshCaptcha" class="btn btn-secondary btn-sm">↺ Refresh</button>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3">
        <button type="button" id="backHomeBtn" class="btn btn-secondary">← Back</button>
        <button type="submit" id="submitBtn" class="btn btn-primary flex-1">Generate &amp; Preview Nomination</button>
      </div>
    </form>

    <!-- Print Preview (hidden until submitted) -->
    <div id="previewSection" class="hidden mt-10">
      <div class="flex items-center justify-between mb-4 no-print">
        <h2 class="text-lg font-bold text-white">📄 Nomination Preview</h2>
        <div class="flex gap-3">
          <button id="printBtn" class="btn btn-success">🖨️ Print Form</button>
          <button id="newNomBtn" class="btn btn-secondary">Submit Another</button>
        </div>
      </div>
      <div id="printZone" class="print-zone"></div>
    </div>
  `,d(n.querySelector(`#dob-day`),n.querySelector(`#dob-month`),n.querySelector(`#dob-year`)),[`candidate`,`proposer`,`seconder`].forEach(e=>{n.querySelector(`#serial-${e}`).addEventListener(`change`,()=>ee(n,e))}),n.querySelector(`#postSelect`).addEventListener(`change`,()=>A(n)),n.querySelectorAll(`[name="gender"]`).forEach(e=>e.addEventListener(`change`,()=>A(n))),n.querySelectorAll(`.dob-sel`).forEach(e=>e.addEventListener(`change`,()=>A(n))),n.querySelector(`#refreshCaptcha`).addEventListener(`click`,()=>{let e=l();E=e.answer,n.querySelector(`#captchaInput`).value=``,n.querySelector(`#captchaQuestion`).textContent=e.question}),n.querySelector(`#backHomeBtn`).addEventListener(`click`,()=>o.navigate(`/`)),n.querySelector(`#nomForm`).addEventListener(`submit`,e=>j(e,n))}function k(e,t,n){return`
  <div class="glass rounded-xl p-4 space-y-3">
    <h3 class="font-bold text-white text-sm uppercase tracking-wide border-b border-white/10 pb-2">${t}</h3>
    <div>
      <label class="text-xs text-slate-400">Nominal Roll Serial No.</label>
      <input id="serial-${e}" type="number" class="field mt-1" placeholder="Enter serial number" />
    </div>
    <div id="details-${e}" class="text-xs text-slate-400 space-y-1 min-h-[3rem]"></div>
    ${n?`
    <div>
      <label class="text-xs text-slate-400 block mb-1">Gender</label>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="radio" name="gender" value="Male" class="accent-indigo-500" /> Male
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="radio" name="gender" value="Female" class="accent-indigo-500" /> Female
        </label>
      </div>
    </div>
    <div>
      <label class="text-xs text-slate-400 block mb-1">Date of Birth</label>
      <div class="flex gap-2">
        <select id="dob-day"   class="field dob-sel"><option value="">Day</option></select>
        <select id="dob-month" class="field dob-sel"><option value="">Month</option></select>
        <select id="dob-year"  class="field dob-sel"><option value="">Year</option></select>
      </div>
    </div>`:``}
  </div>`}function ee(e,t){let n=e.querySelector(`#serial-${t}`).value.trim(),r=e.querySelector(`#details-${t}`),i=w.find(e=>String(e[`Nominal Roll Serial Number`])===n);if(!i){r.innerHTML=n?`<span class="text-red-400">⚠ Student not found</span>`:``;return}r.innerHTML=`
    <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${h(i.NAME)}</strong></p>
    <p><span class="text-slate-500">Class:</span> ${h(i.CLASS)}</p>
    <p><span class="text-slate-500">Dept:</span> ${h(i.Dept||`N/A`)}</p>`,A(e)}function A(e){let t=[],n=e.querySelector(`#postSelect`).value,r=e.querySelector(`[name="gender"]:checked`)?.value||null,i=[`candidate`,`proposer`,`seconder`].map(t=>e.querySelector(`#serial-${t}`).value.trim()),a=i.map(e=>e?w.find(t=>String(t[`Nominal Roll Serial Number`])===e):null),[o,s,l]=i;o&&o===s&&t.push(`Candidate and Proposer cannot be the same person.`),o&&o===l&&t.push(`Candidate and Seconder cannot be the same person.`),s&&s===l&&t.push(`Proposer and Seconder cannot be the same person.`);let u=[`Candidate`,`Proposer`,`Seconder`];a.forEach((e,i)=>{e&&t.push(...c(e,n,u[i],i===0?r:null,T))});let d=e.querySelector(`#warningBox`);return t.length?(d.innerHTML=`<strong class="block mb-1">⚠ Eligibility Warnings</strong>`+t.map(e=>`<p class="text-sm">• ${h(e)}</p>`).join(``),d.classList.remove(`hidden`)):d.classList.add(`hidden`),t}async function j(e,t){if(e.preventDefault(),A(t).length){_(`Please resolve all eligibility warnings first.`,`error`);return}if(t.querySelector(`#captchaInput`).value.trim()!==E){_(`Captcha answer is incorrect.`,`error`);return}let n=t.querySelector(`#postSelect`).value,r=t.querySelector(`[name="gender"]:checked`)?.value,i=t.querySelector(`#dob-day`).value,a=t.querySelector(`#dob-month`).value,o=t.querySelector(`#dob-year`).value;if(!r){_(`Please select a gender for the candidate.`,`error`);return}if(!i||!a||!o){_(`Please enter a complete date of birth.`,`error`);return}let s=[`candidate`,`proposer`,`seconder`].map(e=>t.querySelector(`#serial-${e}`).value.trim()),c=s.map(e=>w.find(t=>String(t[`Nominal Roll Serial Number`])===e));if(c.some(e=>!e)){_(`One or more serial numbers are invalid.`,`error`);return}let l=t.querySelector(`#submitBtn`);g(l,!0,`Generate &amp; Preview Nomination`);try{let e=await C.submitNomination({post:n,gender:r,dob:f(i,a,o),candidateSerial:s[0],proposerSerial:s[1],seconderSerial:s[2]});M(t,e.id,{post:n,gender:r,day:i,month:a,year:o,students:c}),_(`Nomination submitted! ID: ${e.id}`,`success`)}catch(e){_(`Submission failed: ${e.message}`,`error`)}finally{g(l,!1,`Generate &amp; Preview Nomination`)}}function M(e,t,{post:n,gender:r,day:i,month:a,year:o,students:c}){let[l,u,d]=c,h=f(i,a,o),g=p(i,a,o),_=s(h),v=e.querySelector(`#previewSection`);e.querySelector(`#printZone`).innerHTML=N(t,n,r,g,_,l,u,d),v.classList.remove(`hidden`),v.scrollIntoView({behavior:`smooth`}),v.querySelector(`#printBtn`).addEventListener(`click`,()=>{m(e.querySelector(`#printZone`).innerHTML)}),v.querySelector(`#newNomBtn`).addEventListener(`click`,()=>D(e.closest(`#app`)))}function N(e,t,r,i,a,o,s,c,l=``){let d=u();return`
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4">
    <div class="flex justify-between items-start text-sm">
      <div>
        <p class="font-bold text-white text-base">${n.COLLEGE_NAME}</p>
        <p class="text-slate-400">College Union Election</p>
      </div>
      <div class="text-right">
        <p class="text-slate-400 text-xs">Generated: ${d}</p>
        ${l?`<span class="badge badge-${l.toLowerCase()}">${h(l)}</span>`:``}
      </div>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">NOMINATION PAPER</h2>
    <p class="text-sm"><span class="font-semibold text-slate-400 w-40 inline-block">Post Applied For:</span> <strong class="text-white">${h(t)}</strong></p>
    <div class="space-y-3">
      ${P(`Candidate`,o,r,i,a)}
      ${P(`Proposer`,s)}
      ${P(`Seconder`,c)}
    </div>
    <div class="border-t border-white/10 pt-6 text-center space-y-3">
      <h3 class="font-bold text-white">Consent of Candidate</h3>
      <p class="text-sm text-slate-400">I agree, if elected, to serve on the body to which I am proposed as a candidate.</p>
      <div class="flex justify-around mt-6 text-sm text-slate-400">
        <p>Signature: _______________________</p>
        <p>Date: ______ / ______ / ________</p>
      </div>
      <p class="text-xs text-slate-500 italic mb-4">(To be signed in front of the Returning Officer)</p>
    </div>
    <div class="border-t border-white/10 pt-2 text-right">
      <p class="text-[10px] text-slate-500 font-mono">Ref ID: ${h(e)}</p>
    </div>
  </div>`}function P(e,t,n=null,r=null,i=null){return t?`
  <div class="glass rounded-lg p-4 text-sm space-y-1">
    <h3 class="font-bold text-white uppercase text-xs tracking-widest mb-2 border-b border-white/10 pb-1">${e} Details</h3>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
      <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${h(t.NAME)}</strong></p>
      <p><span class="text-slate-500">Class:</span> ${h(t.CLASS)}</p>
      <p><span class="text-slate-500">Dept:</span> ${h(t.Dept||`N/A`)}</p>
      <p><span class="text-slate-500">Electoral Roll No:</span> ${h(t[`Nominal Roll Serial Number`])}</p>
      ${n?`<p><span class="text-slate-500">Gender:</span> ${h(n)}</p>`:``}
      ${r?`<p><span class="text-slate-500">Date of Birth:</span> ${h(r)}</p>`:``}
      ${i?`<p class="col-span-2"><span class="text-slate-500">Age as on Election Date:</span> ${h(i)}</p>`:``}
    </div>
    ${e===`Candidate`?``:`
    <div class="flex justify-between mt-4 text-slate-500 text-xs">
      <span>Date: ______ / ______ / ________</span>
      <span>Signature: _______________</span>
    </div>`}
  </div>`:``}function te(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-50 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="btn btn-secondary btn-sm flex items-center gap-2">
            <span class="text-lg">←</span> Home
          </button>
          <div class="h-6 w-px bg-white/10 mx-2"></div>
          <h1 class="font-bold text-white text-lg tracking-tight">${h(e)}</h1>
        </div>
        <div class="text-xs text-slate-500 font-medium hidden md:block uppercase tracking-widest">
          GVC Election Portal
        </div>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function ne(e){e.innerHTML=ie(`Find My Nomination`,`
    <div class="glass rounded-2xl p-8 max-w-lg mx-auto">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">🔍</div>
        <h2 class="text-xl font-bold text-white">Retrieve Nomination</h2>
        <p class="text-slate-400 text-sm mt-2">Enter your 10-digit unique nomination ID to find and print your form.</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Nomination ID (10 digits)</label>
          <input id="searchId" type="text" maxlength="10" class="field text-center text-xl tracking-widest font-mono" placeholder="0000000000" />
        </div>
        <button id="searchBtn" class="btn btn-primary w-full">🔍 Find Nomination</button>
      </div>
      <div id="resultArea" class="mt-8"></div>
    </div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));let t=e.querySelector(`#searchBtn`);t.addEventListener(`click`,async()=>{let n=e.querySelector(`#searchId`).value.trim();if(n.length!==10||!/^\d+$/.test(n)){_(`Please enter a valid 10-digit numeric ID.`,`error`);return}g(t,!0,`🔍 Find Nomination`);try{let t=await C.getNomination(n);re(e.querySelector(`#resultArea`),t,n)}catch(t){e.querySelector(`#resultArea`).innerHTML=`<div class="alert alert-error mt-4">❌ ${h(t.message)}</div>`}finally{g(t,!1,`🔍 Find Nomination`)}})}function re(e,t,n){let r=t.dob||`N/A`,i=new Date(t.dob);isNaN(i.getTime())||(r=`${String(i.getDate()).padStart(2,`0`)}/${String(i.getMonth()+1).padStart(2,`0`)}/${i.getFullYear()}`);let a=s(t.dob);e.innerHTML=`
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found! Status: <strong>${h(t.status)}</strong></div>
      <div id="printZone" class="print-zone">
        ${N(n,t.post,t.gender,r,a,t.candidate,t.proposer,t.seconder,t.status)}
      </div>
      <div class="flex gap-3 no-print">
        <button id="printBtn" class="btn btn-success flex-1">🖨️ Print</button>
      </div>
    </div>`,e.querySelector(`#printBtn`).addEventListener(`click`,()=>{m(e.querySelector(`#printZone`).innerHTML)})}function ie(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${h(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function ae(e){e.innerHTML=F(`Valid Nominations List`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading list...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let t=await C.getValidNominations();oe(e.querySelector(`main`),t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center">${h(t.message)}</div>`}}function oe(e,t){if(!t||t.length===0){e.innerHTML=`<div class="alert alert-info text-center">The valid nominations list has not been published yet. Please check back later.</div>`;return}let n={};t.forEach(e=>{n[e.post]||(n[e.post]=[]),n[e.post].push(e)}),e.innerHTML=`
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">✅ Valid Nominations</h2>
      <p class="text-slate-400 text-sm mt-1">Official list of candidates with valid nominations.</p>
    </div>
    ${Object.entries(n).map(([e,t])=>`
      <div class="glass rounded-xl mb-6 overflow-hidden">
        <div class="px-5 py-3 bg-indigo-500/10 border-b border-white/10">
          <h3 class="font-bold text-indigo-300 text-sm uppercase tracking-wide">${h(e)}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Nomination ID</th><th>Name</th><th>Class</th><th>Dept</th>
            </tr></thead>
            <tbody>
              ${t.map((e,t)=>`<tr>
                <td class="text-slate-500">${t+1}</td>
                <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
                <td class="font-semibold">${h(e.candidateName)}</td>
                <td>${h(e.candidateClass)}</td>
                <td>${h(e.candidateDept)}</td>
              </tr>`).join(``)}
            </tbody>
          </table>
        </div>
      </div>
    `).join(``)}`}function F(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${h(e)}</h1>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function I(e){e.innerHTML=R(`Final Nominations List`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading final list...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let t=await C.getFinalNominations();L(e.querySelector(`main`),t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center">${h(t.message)}</div>`}}function L(e,{active:t=[],withdrawn:n=[]}={}){if(!t.length&&!n.length){e.innerHTML=`<div class="alert alert-info text-center">The final nominations list has not been published yet. Please check back later.</div>`;return}let r={};t.forEach(e=>{r[e.post]||(r[e.post]=[]),r[e.post].push(e)}),e.innerHTML=`
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">🏁 Final Nominations</h2>
      <p class="text-slate-400 text-sm mt-1">Final list of candidates after processing withdrawals.</p>
    </div>

    <h3 class="text-lg font-bold text-emerald-400 mb-4">Active Candidates</h3>
    ${Object.keys(r).length?Object.entries(r).map(([e,t])=>`
      <div class="glass rounded-xl mb-6 overflow-hidden">
        <div class="px-5 py-3 bg-emerald-500/10 border-b border-white/10">
          <h4 class="font-bold text-emerald-300 text-sm uppercase tracking-wide">${h(e)}</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>#</th><th>Nomination ID</th><th>Name</th><th>Class</th><th>Dept</th></tr></thead>
            <tbody>${t.map((e,t)=>`<tr>
              <td class="text-slate-500">${t+1}</td>
              <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
              <td class="font-semibold">${h(e.candidateName)}</td>
              <td>${h(e.candidateClass)}</td>
              <td>${h(e.candidateDept)}</td>
            </tr>`).join(``)}</tbody>
          </table>
        </div>
      </div>
    `).join(``):`<div class="alert alert-info mb-6">No active candidates.</div>`}

    ${n.length?`
    <h3 class="text-lg font-bold text-slate-400 mb-4 mt-8">Withdrawn Nominations</h3>
    <div class="glass rounded-xl overflow-hidden opacity-70">
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Nomination ID</th><th>Post</th><th>Name</th><th>Class</th><th>Dept</th></tr></thead>
          <tbody>${n.map(e=>`<tr>
            <td class="font-mono text-slate-500 text-xs">${h(e.id)}</td>
            <td>${h(e.post)}</td>
            <td class="line-through text-slate-500">${h(e.candidateName)}</td>
            <td>${h(e.candidateClass)}</td>
            <td>${h(e.candidateDept)}</td>
          </tr>`).join(``)}</tbody>
        </table>
      </div>
    </div>`:``}
  `}function R(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${h(e)}</h1>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function z(e){e.innerHTML=H(`Withdrawal Form`,`
    <div class="glass rounded-2xl p-8 max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">↩️</div>
        <h2 class="text-xl font-bold text-white">Submit Withdrawal</h2>
        <p class="text-slate-400 text-sm mt-2">Enter your 10-digit nomination ID to fetch your details and submit a withdrawal request.</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Nomination ID (10 digits)</label>
          <input id="withdrawId" type="text" maxlength="10" class="field text-center text-xl tracking-widest font-mono" placeholder="0000000000" />
        </div>
        <button id="fetchBtn" class="btn btn-primary w-full">Fetch Nomination Details</button>
      </div>
      <div id="nominationDetails" class="mt-8"></div>
    </div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));let t=e.querySelector(`#fetchBtn`);t.addEventListener(`click`,async()=>{let n=e.querySelector(`#withdrawId`).value.trim();if(n.length!==10||!/^\d+$/.test(n)){_(`Please enter a valid 10-digit numeric ID.`,`error`);return}g(t,!0,`Fetch Nomination Details`);try{let t=await C.getNomination(n);B(e.querySelector(`#nominationDetails`),t,n)}catch(t){e.querySelector(`#nominationDetails`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}finally{g(t,!1,`Fetch Nomination Details`)}})}function B(e,t,n){if(t.status!==`Valid`){e.innerHTML=`<div class="alert alert-warning">⚠ This nomination has status <strong>${h(t.status)}</strong>. Only <strong>Valid</strong> nominations can be withdrawn.</div>`;return}if(t.withdrawalStatus===`Requested`||t.withdrawalStatus===`Approved`){e.innerHTML=`<div class="alert alert-info">ℹ A withdrawal has already been ${h(t.withdrawalStatus.toLowerCase())} for this nomination.</div>`;return}e.innerHTML=`
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found. Please review the details below before submitting your withdrawal.</div>
      <div class="glass rounded-xl p-5 text-sm space-y-2">
        <p><span class="text-slate-400 w-36 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300">${h(n)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Post:</span> <strong class="text-white">${h(t.post)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Candidate:</span> ${h(t.candidate?.NAME||t.candidateName||`N/A`)}</p>
        <p><span class="text-slate-400 w-36 inline-block">Class:</span> ${h(t.candidate?.CLASS||t.candidateClass||`N/A`)}</p>
        <p><span class="text-slate-400 w-36 inline-block">Dept:</span> ${h(t.candidate?.Dept||t.candidateDept||`N/A`)}</p>
      </div>
      <div class="alert alert-warning text-sm">
        ⚠ <strong>Warning:</strong> Submitting this withdrawal is irreversible. The request will be sent to the Returning Officer for final approval.
      </div>
      <div class="flex gap-3">
        <button id="withdrawBtn" class="btn btn-danger flex-1">Submit Withdrawal Request</button>
        <button id="printFormBtn" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
      </div>
      <div id="printZone" class="print-zone hidden">
        ${V(n,t)}
      </div>
    </div>`,e.querySelector(`#withdrawBtn`).addEventListener(`click`,async()=>{let r=e.querySelector(`#withdrawBtn`);g(r,!0,`Submit Withdrawal Request`);try{await C.submitWithdrawal(n),e.innerHTML=`
        <div class="alert alert-success">✅ Withdrawal request submitted successfully! The Returning Officer will review your request.</div>
        <div class="mt-4 no-print">
          <button id="printWithdrawal" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
        </div>
        <div class="print-zone mt-4">
          ${V(n,t)}
        </div>`,e.querySelector(`#printWithdrawal`).addEventListener(`click`,m),_(`Withdrawal request submitted!`,`success`)}catch(e){_(`Failed: ${e.message}`,`error`),g(r,!1,`Submit Withdrawal Request`)}}),e.querySelector(`#printFormBtn`).addEventListener(`click`,()=>{e.querySelector(`#printZone`).classList.remove(`hidden`),m()})}function V(e,t){let r=u(),i=t.candidate?.NAME||t.candidateName||`N/A`,a=t.candidate?.CLASS||t.candidateClass||`N/A`,o=t.candidate?.Dept||t.candidateDept||`N/A`;return`
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-5">
    <div class="flex justify-between text-sm">
      <div>
        <p class="font-bold text-white text-base">${h(n.COLLEGE_NAME)}</p>
        <p class="text-slate-400">College Union Election — Withdrawal Form</p>
      </div>
      <p class="text-slate-400 text-xs">Date: ${r}</p>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">WITHDRAWAL OF NOMINATION</h2>
    <div class="space-y-2 text-sm">
      <p><span class="text-slate-400 w-40 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300 text-lg">${h(e)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Post:</span> <strong class="text-white">${h(t.post)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Candidate Name:</span> ${h(i)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Class:</span> ${h(a)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Department:</span> ${h(o)}</p>
    </div>
    <p class="text-sm text-slate-300 border border-white/10 rounded-lg p-4">
      I, <strong>${h(i)}</strong>, hereby withdraw my nomination for the post of <strong>${h(t.post)}</strong> in the College Union Election.
    </p>
    <div class="flex justify-around mt-8 text-sm text-slate-400">
      <div class="text-center">
        <p class="mb-8">___________________________</p>
        <p>Signature of Candidate</p>
      </div>
      <div class="text-center">
        <p class="mb-8">______ / ______ / ________</p>
        <p>Date</p>
      </div>
      <div class="text-center">
        <p class="mb-8">___________________________</p>
        <p>Returning Officer</p>
      </div>
    </div>
  </div>`}function H(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${h(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}function U(e){e.innerHTML=`
  <div class="page-enter min-h-screen flex items-center justify-center p-4">
    <div class="glass rounded-2xl p-10 w-full max-w-md text-center space-y-6">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl mx-auto shadow-lg">🔐</div>
      <div>
        <h1 class="text-2xl font-bold text-white">Admin Login</h1>
        <p class="text-slate-400 text-sm mt-1">Election Management Portal</p>
      </div>
      <div id="errorMsg" class="hidden alert alert-error text-left"></div>
      <form id="loginForm" class="space-y-4 text-left">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Admin Password</label>
          <input id="adminPassword" type="password" class="field" placeholder="Enter admin password" />
        </div>
        <button type="submit" id="loginBtn" class="btn btn-primary w-full text-base py-3">Login to Admin Panel →</button>
      </form>
      <button id="backHome" class="text-slate-500 hover:text-slate-300 text-sm transition">← Back to Public Portal</button>
    </div>
  </div>`,e.querySelector(`#backHome`).addEventListener(`click`,()=>o.navigate(`/`));let t=e.querySelector(`#loginForm`),n=e.querySelector(`#adminPassword`),r=e.querySelector(`#errorMsg`),i=e.querySelector(`#loginBtn`);t.addEventListener(`submit`,async e=>{e.preventDefault();let t=n.value;if(!t){_(`Please enter the admin password.`,`error`);return}g(i,!0,`Login to Admin Panel →`),r.classList.add(`hidden`);try{await C.adminLogin(t),sessionStorage.setItem(`adminPwd`,t),_(`Logged in successfully!`,`success`),o.navigate(`/admin/dashboard`)}catch(e){r.textContent=`❌ ${e.message}`,r.classList.remove(`hidden`)}finally{g(i,!1,`Login to Admin Panel →`)}})}function W(){return sessionStorage.getItem(`adminPwd`)||(_(`Session expired. Please log in again.`,`warning`),o.navigate(`/admin`),null)}function G(e,t,n){e.innerHTML=`
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="no-print w-60 flex-shrink-0 glass border-r border-white/10 flex flex-col">
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">G</div>
          <div>
            <p class="font-bold text-white text-xs">GVC Election</p>
            <p class="text-slate-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        ${K(`dashboard`,`📊`,`Dashboard`,t)}
        ${K(`verify`,`✅`,`Verify Nominations`,t)}
        ${K(`withdrawals`,`↩️`,`Withdrawals`,t)}
        ${K(`publish`,`📢`,`Publish Lists`,t)}
        ${K(`posts`,`📋`,`Manage Posts`,t)}
        ${K(`booths`,`🏫`,`Polling Booths`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${K(`public`,`🌐`,`Public Portal`,t)}
      </nav>
      <div class="p-3 border-t border-white/10">
        <button id="logoutBtn" class="sidebar-item text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-h-screen overflow-auto">
      <header class="no-print border-b border-white/10 glass px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h2 class="font-semibold text-white capitalize">${t.replace(/-/g,` `)}</h2>
        <span class="text-xs text-slate-500">Logged in as Admin</span>
      </header>
      <main id="adminMain" class="flex-1 p-6 overflow-auto">
        ${n}
      </main>
    </div>
  </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.adminNav;if(t===`public`){o.navigate(`/`);return}o.navigate(`/admin/${t}`)})}),e.querySelector(`#logoutBtn`).addEventListener(`click`,()=>{sessionStorage.removeItem(`adminPwd`),_(`Logged out.`,`info`),o.navigate(`/`)})}function K(e,t,n,r){return`
  <button data-admin-nav="${e}" class="sidebar-item ${r===e?`active`:``}">
    <span>${t}</span> ${n}
  </button>`}var se=`modulepreload`,ce=function(e){return`/nomination/`+e},q={},le=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=ce(t,n),t in q)return;q[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:se,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};async function ue(e){let t=W();if(t){G(e,`dashboard`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading dashboard...</p></div>
  `);try{let[n,i]=await Promise.all([C.adminGetNominations(t),C.adminGetSettings(t)]),a=n.length,o=n.filter(e=>e.status===`Pending`).length,s=n.filter(e=>e.status===`Valid`).length,c=n.filter(e=>e.status===`Rejected`).length,l=n.filter(e=>e.withdrawalStatus===`Requested`).length,u=e.querySelector(`#adminMain`);u.innerHTML=`
      <div class="page-enter space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white">Dashboard Overview</h3>
          <p class="text-slate-400 text-sm mt-1">Summary of the current election status.</p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${J(`Total Nominations`,a,`#6366f1`)}
          ${J(`Pending Review`,o,`#f59e0b`)}
          ${J(`Valid`,s,`#10b981`)}
          ${J(`Rejected`,c,`#ef4444`)}
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          ${J(`Withdrawal Requests`,l,`#8b5cf6`)}
          ${J(`Valid List Published`,i.validListPublished===`true`?`✅ Yes`:`❌ No`,`#0ea5e9`)}
          ${J(`Final List Published`,i.finalListPublished===`true`?`✅ Yes`:`❌ No`,`#0ea5e9`)}
        </div>

        <!-- Quick actions -->
        <div class="glass rounded-xl p-5 space-y-3">
          <h4 class="font-semibold text-white">Quick Actions</h4>
          <div class="flex flex-wrap gap-3">
            <button class="btn btn-secondary btn-sm" data-admin-nav="verify">✅ Review Nominations (${o} pending)</button>
            <button class="btn btn-secondary btn-sm" data-admin-nav="withdrawals">↩️ Process Withdrawals (${l} pending)</button>
            <button class="btn btn-secondary btn-sm" data-admin-nav="publish">📢 Publish Lists</button>
          </div>
        </div>

        <!-- Recent nominations -->
        <div class="glass rounded-xl overflow-hidden">
          <div class="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h4 class="font-semibold text-white text-sm">Recent Nominations</h4>
            <span class="text-xs text-slate-500">${a} total</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr><th>Nom. ID</th><th>Post</th><th>Candidate</th><th>Dept</th><th>Status</th><th>Withdrawal</th></tr></thead>
              <tbody>
                ${n.slice(-10).reverse().map(e=>`<tr>
                  <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
                  <td class="text-xs">${h(e.post)}</td>
                  <td class="font-medium">${h(e.candidateName)}</td>
                  <td class="text-xs">${h(e.candidateDept)}</td>
                  <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${h(e.status)}</span></td>
                  <td class="text-xs text-slate-500">${h(e.withdrawalStatus||`None`)}</td>
                </tr>`).join(``)}
              </tbody>
            </table>
          </div>
        </div>
      </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{let{router:t}=window._appRouter||{};le(async()=>{let{router:e}=await Promise.resolve().then(()=>r);return{router:e}},void 0).then(({router:t})=>t.navigate(`/admin/${e.dataset.adminNav}`))})})}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function J(e,t,n){return`
  <div class="glass rounded-xl p-5">
    <p class="text-xs text-slate-400 uppercase tracking-wide mb-2">${e}</p>
    <p class="text-3xl font-bold" style="color:${n}">${t}</p>
  </div>`}async function de(e){let t=W();if(t){G(e,`verify`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominations...</p></div>
  `);try{let n=await C.adminGetNominations(t);fe(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function fe(e,t,n){e.innerHTML=`
    <div class="page-enter space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">Nomination Verification</h3>
          <p class="text-slate-400 text-sm">Review each submission and mark as Valid or Rejected.</p>
        </div>
        <!-- Filter -->
        <select id="statusFilter" class="field w-44">
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Valid">Valid</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div class="glass rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table" id="nomTable">
            <thead><tr>
              <th>Nom. ID</th>
              <th>Post</th>
              <th>Candidate</th>
              <th>Class / Dept</th>
              <th>Proposer</th>
              <th>Seconder</th>
              <th>Status</th>
              <th>Action</th>
            </tr></thead>
            <tbody id="nomTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>`;let r=t,i=t=>{let n=e.querySelector(`#nomTableBody`);n.innerHTML=t.length?t.map(e=>`
      <tr id="row-${h(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
        <td class="text-xs max-w-[140px] leading-snug">${h(e.post)}</td>
        <td class="font-medium">${h(e.candidateName||e.candidate?.NAME||`N/A`)}</td>
        <td class="text-xs text-slate-400">${h(e.candidateClass||``)} / ${h(e.candidateDept||``)}</td>
        <td class="text-xs">${h(e.proposerName||e.proposer?.NAME||`N/A`)}</td>
        <td class="text-xs">${h(e.seconderName||e.seconder?.NAME||`N/A`)}</td>
        <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${h(e.status)}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-success btn-sm verify-btn" data-id="${h(e.id)}" data-action="Valid"
              ${e.status===`Valid`?`disabled`:``}>✅ Valid</button>
            <button class="btn btn-danger btn-sm verify-btn" data-id="${h(e.id)}" data-action="Rejected"
              ${e.status===`Rejected`?`disabled`:``}>❌ Reject</button>
          </div>
        </td>
      </tr>`).join(``):`<tr><td colspan="8" class="text-center text-slate-500 py-8">No nominations match the filter.</td></tr>`};i(r),e.querySelector(`#statusFilter`).addEventListener(`change`,e=>{let t=e.target.value;i(t===`all`?r:r.filter(e=>e.status===t))}),e.querySelector(`#nomTableBody`).addEventListener(`click`,async t=>{let i=t.target.closest(`.verify-btn`);if(!i)return;let a=i.dataset.id,o=i.dataset.action;i.disabled=!0,i.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminVerifyNomination(n,a,o);let t=r.find(e=>e.id===a);t&&(t.status=o),_(`Nomination ${a} marked as ${o}.`,o===`Valid`?`success`:`error`);let i=e.querySelector(`#row-${a}`);i&&(i.querySelector(`.badge`).className=`badge badge-${o.toLowerCase()}`,i.querySelector(`.badge`).textContent=o,i.querySelectorAll(`.verify-btn`).forEach(e=>e.disabled=e.dataset.action===o))}catch(e){_(`Failed: ${e.message}`,`error`),i.disabled=!1,i.textContent=i.dataset.action===`Valid`?`✅ Valid`:`❌ Reject`}})}async function pe(e){let t=W();if(t){G(e,`withdrawals`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading withdrawal requests...</p></div>
  `);try{let n=(await C.adminGetNominations(t)).filter(e=>e.withdrawalStatus&&e.withdrawalStatus!==`None`);me(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function me(e,t,n){e.innerHTML=`
    <div class="page-enter space-y-4">
      <div>
        <h3 class="text-xl font-bold text-white">Withdrawal Requests</h3>
        <p class="text-slate-400 text-sm">Approve or view submitted withdrawal requests.</p>
      </div>
      ${t.length===0?`<div class="alert alert-info">No withdrawal requests found.</div>`:`
      <div class="glass rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>Nom. ID</th><th>Post</th><th>Candidate</th><th>Class/Dept</th>
              <th>Withdrawal Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${t.map(e=>`
              <tr id="wrow-${h(e.id)}">
                <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
                <td class="text-xs">${h(e.post)}</td>
                <td class="font-medium">${h(e.candidateName||`N/A`)}</td>
                <td class="text-xs text-slate-400">${h(e.candidateClass||``)} / ${h(e.candidateDept||``)}</td>
                <td>
                  <span class="badge ${e.withdrawalStatus===`Approved`?`badge-valid`:`badge-pending`}">
                    ${h(e.withdrawalStatus)}
                  </span>
                </td>
                <td>
                  <button class="btn btn-success btn-sm approve-btn" data-id="${h(e.id)}"
                    ${e.withdrawalStatus===`Approved`?`disabled`:``}>
                    ✅ Approve
                  </button>
                </td>
              </tr>`).join(``)}
            </tbody>
          </table>
        </div>
      </div>`}
    </div>`,e.addEventListener(`click`,async t=>{let r=t.target.closest(`.approve-btn`);if(!r)return;let i=r.dataset.id;r.disabled=!0,r.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminApproveWithdrawal(n,i),_(`Withdrawal for ${i} approved.`,`success`);let t=e.querySelector(`#wrow-${i}`);if(t){let e=t.querySelector(`.badge`);e.textContent=`Approved`,e.className=`badge badge-valid`,r.textContent=`✅ Approve`,r.disabled=!0}}catch(e){_(`Failed: ${e.message}`,`error`),r.disabled=!1,r.textContent=`✅ Approve`}})}async function he(e){let t=W();if(t){G(e,`publish`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading settings...</p></div>
  `);try{let n=await C.adminGetSettings(t);Y(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function Y(e,t,n){let r=t.validListPublished===`true`,i=t.finalListPublished===`true`;e.innerHTML=`
    <div class="page-enter space-y-6">
      <div>
        <h3 class="text-xl font-bold text-white">Publish Lists</h3>
        <p class="text-slate-400 text-sm">Control public visibility of nomination lists. Publishing is a one-way action.</p>
      </div>

      <!-- Valid list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">📋 Valid Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">Make the list of verified valid nominations visible to the public.</p>
          </div>
          <span class="badge ${r?`badge-valid`:`badge-pending`} text-sm">
            ${r?`✅ Published`:`⏳ Not Published`}
          </span>
        </div>
        ${r?`
        <div class="alert alert-success text-sm">✅ This list is currently visible to the public.</div>`:`
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all nominations have been reviewed before publishing. This action is irreversible.
        </div>
        <button id="publishValidBtn" class="btn btn-primary">📢 Publish Valid Nominations List</button>`}
      </div>

      <!-- Final list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">🏁 Final Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">Publish the final list showing active and withdrawn candidates.</p>
          </div>
          <span class="badge ${i?`badge-valid`:`badge-pending`} text-sm">
            ${i?`✅ Published`:`⏳ Not Published`}
          </span>
        </div>
        ${i?`
        <div class="alert alert-success text-sm">✅ The final list is currently visible to the public.</div>`:`
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all withdrawal requests have been processed before publishing the final list.
        </div>
        <button id="publishFinalBtn" class="btn btn-primary" ${r?``:`disabled title="Publish the valid list first"`}>📢 Publish Final Nominations List</button>`}
      </div>
    </div>`,e.querySelector(`#publishValidBtn`)?.addEventListener(`click`,async t=>{let r=t.currentTarget;if(confirm(`Are you sure you want to publish the valid nominations list? This will be visible to all students.`)){g(r,!0,`📢 Publish Valid Nominations List`);try{await C.adminPublishValidList(n),_(`Valid nominations list published successfully!`,`success`),Y(e,{validListPublished:`true`,finalListPublished:i?`true`:`false`},n)}catch(e){_(`Failed: ${e.message}`,`error`),g(r,!1,`📢 Publish Valid Nominations List`)}}}),e.querySelector(`#publishFinalBtn`)?.addEventListener(`click`,async t=>{let r=t.currentTarget;if(confirm(`Are you sure you want to publish the final nominations list?`)){g(r,!0,`📢 Publish Final Nominations List`);try{await C.adminPublishFinalList(n),_(`Final nominations list published successfully!`,`success`),Y(e,{validListPublished:`true`,finalListPublished:`true`},n)}catch(e){_(`Failed: ${e.message}`,`error`),g(r,!1,`📢 Publish Final Nominations List`)}}})}async function ge(e){let t=W();if(t){G(e,`posts`,`
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading posts...</p>
    </div>
  `);try{let r=await C.adminGetPosts(t).catch(()=>null);(!Array.isArray(r)||r.length===0)&&(r=n.DEFAULT_POSTS),X(e.querySelector(`#adminMain`),r,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function X(e,t,n){e.innerHTML=`
    <div class="page-enter space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white">Manage Election Posts</h3>
          <p class="text-slate-400 text-sm mt-1">Add, edit, delete, or reorder the posts available for nomination.</p>
        </div>
        <button id="addPostBtn" class="btn btn-primary">+ Add New Post</button>
      </div>

      <!-- Add / Edit form (hidden by default) -->
      <div id="postFormWrap" class="hidden glass rounded-xl p-6 space-y-4 border border-indigo-500/30">
        <h4 id="postFormTitle" class="font-bold text-white">Add New Post</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Post Name <span class="text-red-400">*</span></label>
            <input id="pfPost" type="text" class="field" placeholder="e.g. The Chairman" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Year Restriction</label>
            <select id="pfYear" class="field">
              <option value="">None</option>
              <option value="1">1st Year Only</option>
              <option value="2">2nd Year Only</option>
              <option value="3">3rd Year Only</option>
              <option value="PG">PG Only (MA/MSc/MCom)</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label class="flex items-center gap-3 cursor-pointer glass rounded-lg p-3">
            <input id="pfFemale" type="checkbox" class="accent-indigo-500 w-4 h-4" />
            <div>
              <p class="text-sm font-medium text-white">Female Candidates Only</p>
              <p class="text-xs text-slate-500">Male candidates cannot apply</p>
            </div>
          </label>
          <label class="flex items-center gap-3 cursor-pointer glass rounded-lg p-3">
            <input id="pfFinalYear" type="checkbox" class="accent-indigo-500 w-4 h-4" />
            <div>
              <p class="text-sm font-medium text-white">Final Year Ineligible</p>
              <p class="text-xs text-slate-500">3rd year / 2nd year PG cannot apply</p>
            </div>
          </label>
          <label class="flex items-center gap-3 cursor-pointer glass rounded-lg p-3">
            <input id="pfDept" type="checkbox" class="accent-indigo-500 w-4 h-4" />
            <div>
              <p class="text-sm font-medium text-white">Department Restricted</p>
              <p class="text-xs text-slate-500">Candidate dept must match post dept</p>
            </div>
          </label>
        </div>
        <div class="flex gap-3">
          <button id="savePostBtn" class="btn btn-primary">💾 Save Post</button>
          <button id="cancelPostBtn" class="btn btn-secondary">Cancel</button>
        </div>
        <input type="hidden" id="pfOriginalName" value="" />
      </div>

      <!-- Posts table -->
      <div class="glass rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table" id="postsTable">
            <thead><tr>
              <th class="w-8">#</th>
              <th>Post Name</th>
              <th class="text-center">Female Only</th>
              <th class="text-center">Final Year Ineligible</th>
              <th class="text-center">Dept Restricted</th>
              <th class="text-center">Year Restriction</th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="postsBody"></tbody>
          </table>
        </div>
      </div>
      <p class="text-xs text-slate-500">
        ℹ Changes are saved to the Google Sheet. The nomination form will reflect these immediately after saving.
      </p>
    </div>`,Z(e,t,n),_e(e,t,n)}function Z(e,t,n){let r=e.querySelector(`#postsBody`);r.innerHTML=t.length?t.map((e,t)=>`
    <tr id="post-row-${t}">
      <td class="text-slate-500 text-xs">${t+1}</td>
      <td class="font-medium text-white">${h(e.post)}</td>
      <td class="text-center">${e.femaleOnly?`✅`:`—`}</td>
      <td class="text-center">${e.finalYearIneligible?`✅`:`—`}</td>
      <td class="text-center">${e.deptRestriction?`✅`:`—`}</td>
      <td class="text-center text-slate-400 text-xs">${e.yearRestriction?e.yearRestriction===`PG`?`PG`:`${e.yearRestriction}rd/nd/st Year`:`—`}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm edit-post-btn" data-idx="${t}">✏️ Edit</button>
          <button class="btn btn-danger btn-sm delete-post-btn" data-idx="${t}" data-name="${h(e.post)}">🗑️</button>
        </div>
      </td>
    </tr>`).join(``):`<tr><td colspan="7" class="text-center text-slate-500 py-8">No posts configured.</td></tr>`,r.querySelectorAll(`.delete-post-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let r=t.dataset.name;if(confirm(`Delete post "${r}"? This cannot be undone.`)){t.disabled=!0;try{await C.adminDeletePost(n,r),_(`Post "${r}" deleted.`,`success`),Z(e,await C.adminGetPosts(n),n)}catch(e){_(`Failed: ${e.message}`,`error`),t.disabled=!1}}})});let i=e.querySelector(`#postFormWrap`);r.querySelectorAll(`.edit-post-btn`).forEach(n=>{n.addEventListener(`click`,()=>{let r=t[parseInt(n.dataset.idx)];e.querySelector(`#postFormTitle`).textContent=`Edit Post`,e.querySelector(`#pfPost`).value=r.post,e.querySelector(`#pfYear`).value=r.yearRestriction||``,e.querySelector(`#pfFemale`).checked=!!r.femaleOnly,e.querySelector(`#pfFinalYear`).checked=!!r.finalYearIneligible,e.querySelector(`#pfDept`).checked=!!r.deptRestriction,e.querySelector(`#pfOriginalName`).value=r.post,i.classList.remove(`hidden`),i.scrollIntoView({behavior:`smooth`})})})}function _e(e,t,n){let r=e.querySelector(`#postFormWrap`),i=e.querySelector(`#addPostBtn`),a=e.querySelector(`#cancelPostBtn`),o=e.querySelector(`#savePostBtn`);i.addEventListener(`click`,()=>{e.querySelector(`#postFormTitle`).textContent=`Add New Post`,e.querySelector(`#pfPost`).value=``,e.querySelector(`#pfYear`).value=``,e.querySelector(`#pfFemale`).checked=!1,e.querySelector(`#pfFinalYear`).checked=!1,e.querySelector(`#pfDept`).checked=!1,e.querySelector(`#pfOriginalName`).value=``,r.classList.remove(`hidden`),r.scrollIntoView({behavior:`smooth`})}),a.addEventListener(`click`,()=>r.classList.add(`hidden`)),o.addEventListener(`click`,async()=>{let t=e.querySelector(`#pfPost`).value.trim(),i=e.querySelector(`#pfYear`).value,a=e.querySelector(`#pfFemale`).checked,s=e.querySelector(`#pfFinalYear`).checked,c=e.querySelector(`#pfDept`).checked,l=e.querySelector(`#pfOriginalName`).value;if(!t){_(`Post name is required.`,`error`);return}let u={postName:t,yearRestriction:i,femaleOnly:a,finalYearIneligible:s,deptRestriction:c,originalName:l};g(o,!0,`💾 Save Post`);try{l?(await C.adminUpdatePost(n,u),_(`Post updated successfully!`,`success`)):(await C.adminAddPost(n,u),_(`Post added successfully!`,`success`)),r.classList.add(`hidden`),Z(e,await C.adminGetPosts(n),n)}catch(e){_(`Failed: ${e.message}`,`error`)}finally{g(o,!1,`💾 Save Post`)}})}async function ve(e){let t=W();if(t){G(e,`booths`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);try{let[n,r]=await Promise.all([C.getNominalRoll(),C.adminGetBooths(t).catch(()=>[])]);ye(e.querySelector(`#adminMain`),t,n,r)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function ye(e,t,n,r){let i={};n.forEach(e=>{let t=String(e.CLASS||`Unknown`).trim(),n=String(e.Dept||`Unknown`).trim();i[t]||(i[t]={name:t,dept:n,count:0}),i[t].count++});let a=Object.values(i).sort((e,t)=>e.name.localeCompare(t.name)),o=r.length?[...r]:[{boothNumber:1,roomName:`Room 1`,classes:[]}],s=()=>{o.forEach(e=>e.totalStudents=0);let n=[];a.forEach(e=>{let t=o.find(t=>t.classes.includes(e.name));t?t.totalStudents+=e.count:n.push(e)}),e.innerHTML=`
      <div class="page-enter space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex gap-2">
            <button id="btnAutoAllot" class="btn btn-secondary">⚡ Auto Allot</button>
            <button id="btnSaveBooths" class="btn btn-primary">💾 Save Configuration</button>
          </div>
        </div>

        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-bold text-white">Booth Setup</h4>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-slate-300 mb-0">Total Booths:</label>
              <input type="number" id="numBoothsInput" class="field w-20 py-1" min="1" max="20" value="${o.length}">
              <button id="btnUpdateBoothCount" class="btn btn-secondary btn-sm">Update</button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="boothsContainer">
            ${o.map((e,t)=>`
              <div class="border border-white/10 rounded-lg p-3 bg-white/5">
                <div class="text-xs text-slate-400 font-bold uppercase mb-1 flex justify-between">
                  <span>Booth ${t+1}</span>
                  <span class="${e.totalStudents>0?`text-indigo-400`:``}">${e.totalStudents} Students</span>
                </div>
                <input type="text" class="field text-sm py-1 mb-2 room-name-input" data-idx="${t}" placeholder="Room Name / Number" value="${h(e.roomName)}">
                <div class="text-xs text-slate-500 h-16 overflow-y-auto">
                  ${e.classes.length?e.classes.map(e=>`<div>• ${h(e)} (${i[e]?.count||0})</div>`).join(``):`<em>No classes assigned</em>`}
                </div>
              </div>
            `).join(``)}
          </div>
        </div>

        <!-- Unallocated Warning -->
        ${n.length?`
          <div class="alert alert-warning">
            ⚠️ <strong>${n.length} classes</strong> are not assigned to any booth!
          </div>
        `:``}

        <!-- Class Allocation Table -->
        <div class="glass rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Department</th>
                <th>Class</th>
                <th>Students</th>
                <th>Assigned Booth</th>
              </tr></thead>
              <tbody>
                ${a.map(e=>{let t=o.find(t=>t.classes.includes(e.name));return`
                    <tr>
                      <td class="text-xs text-slate-400">${h(e.dept)}</td>
                      <td class="font-medium text-sm">${h(e.name)}</td>
                      <td>${e.count}</td>
                      <td>
                        <select class="field w-40 py-1 text-sm class-booth-select" data-class="${h(e.name)}">
                          <option value="">-- Unassigned --</option>
                          ${o.map((e,n)=>`
                            <option value="${n}" ${t===e?`selected`:``}>Booth ${n+1}</option>
                          `).join(``)}
                        </select>
                      </td>
                    </tr>
                  `}).join(``)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `,e.querySelector(`#btnUpdateBoothCount`).addEventListener(`click`,()=>{let t=parseInt(e.querySelector(`#numBoothsInput`).value,10);if(t>0&&t<=50){if(t>o.length)for(let e=o.length;e<t;e++)o.push({boothNumber:e+1,roomName:`Room ${e+1}`,classes:[]});else t<o.length&&(o=o.slice(0,t));s()}}),e.querySelectorAll(`.room-name-input`).forEach(e=>{e.addEventListener(`change`,e=>{o[e.target.dataset.idx].roomName=e.target.value.trim()})}),e.querySelectorAll(`.class-booth-select`).forEach(e=>{e.addEventListener(`change`,e=>{let t=e.target.dataset.class,n=e.target.value;o.forEach(e=>{e.classes=e.classes.filter(e=>e!==t)}),n!==``&&o[parseInt(n,10)].classes.push(t),s()})}),e.querySelector(`#btnSaveBooths`).addEventListener(`click`,async e=>{let n=e.target;g(n,!0,`💾 Save Configuration`);try{await C.adminSaveBooths(t,o),_(`Booth configuration saved successfully!`,`success`)}catch(e){_(`Failed to save: ${e.message}`,`error`)}finally{g(n,!1,`💾 Save Configuration`)}}),e.querySelector(`#btnAutoAllot`).addEventListener(`click`,()=>{c(),s(),_(`Auto allotment complete. Please review and save.`,`info`)})},c=()=>{o.forEach(e=>{e.classes=[],e.totalStudents=0});let e={};a.forEach(t=>{e[t.dept]||(e[t.dept]={name:t.dept,total:0,classes:[]}),e[t.dept].classes.push(t),e[t.dept].total+=t.count});let t=o.length,r=n.length/t*1.25;Object.values(e).sort((e,t)=>t.total-e.total).forEach(e=>{o.sort((e,t)=>e.totalStudents-t.totalStudents);let t=o[0];t.totalStudents+e.total>r&&e.classes.length>1?[...e.classes].sort((e,t)=>t.count-e.count).forEach(e=>{o.sort((e,t)=>e.totalStudents-t.totalStudents),o[0].classes.push(e.name),o[0].totalStudents+=e.count}):(e.classes.forEach(e=>t.classes.push(e.name)),t.totalStudents+=e.total)}),o.sort((e,t)=>e.boothNumber-t.boothNumber)};s()}var Q=document.getElementById(`app`);document.body.insertAdjacentHTML(`afterbegin`,`
  <div class="bg-blob bg-blob-1"></div>
  <div class="bg-blob bg-blob-2"></div>
  <div class="bg-blob bg-blob-3"></div>
`),n.APPS_SCRIPT_URL.includes(`YOUR_SCRIPT_ID`)&&(document.body.insertAdjacentHTML(`afterbegin`,`
    <div id="setup-banner" style="
      position:fixed;top:0;left:0;right:0;z-index:9999;
      background:#dc2626;color:white;text-align:center;
      padding:0.75rem 1rem;font-size:0.85rem;font-weight:600;
      font-family:Inter,sans-serif;
    ">
      ⚙️ Setup Required: Open <code style="background:rgba(0,0,0,0.3);padding:0.1rem 0.4rem;border-radius:4px;">src/config.js</code>
      and replace <code style="background:rgba(0,0,0,0.3);padding:0.1rem 0.4rem;border-radius:4px;">YOUR_SCRIPT_ID</code>
      with your Google Apps Script Web App URL, then rebuild &amp; push.
    </div>
  `),document.getElementById(`app`).style.marginTop=`48px`);var $=e=>t=>{Q.innerHTML=``,e(Q,t)};o.on(`/`,$(v)).on(`/submit`,$(D)).on(`/find`,$(ne)).on(`/valid-list`,$(ae)).on(`/final-list`,$(I)).on(`/withdraw`,$(z)).on(`/admin`,$(U)).on(`/admin/dashboard`,$(ue)).on(`/admin/verify`,$(de)).on(`/admin/withdrawals`,$(pe)).on(`/admin/publish`,$(he)).on(`/admin/posts`,$(ge)).on(`/admin/booths`,$(ve)).setDefault(`/`),document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-nav]`);t&&(e.preventDefault(),o.navigate(t.dataset.nav))}),o.start();