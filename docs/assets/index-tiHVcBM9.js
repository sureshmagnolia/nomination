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
          ${y(`/nominal-roll`,`📜`,`Nominal Roll`,`View the official voter list (Draft/Final).`)}
          ${y(`/final-list`,`🏆`,`Final Candidate List`,`View the final list post-withdrawals.`)}
          ${y(`/results`,`📊`,`Live Results`,`View live vote counting and election results.`)}
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
  </div>`}var b=n.APPS_SCRIPT_URL;async function x(e){let t=new URL(b);Object.entries(e).forEach(([e,n])=>t.searchParams.append(e,n)),t.searchParams.append(`_t`,Date.now());let n=await fetch(t.toString());if(!n.ok)throw Error(`Network error: ${n.status}`);let r=await n.json();if(r.error)throw Error(r.error);return r}async function S(e){let t=await fetch(b,{method:`POST`,headers:{"Content-Type":`text/plain;charset=utf-8`},body:JSON.stringify(e)});if(!t.ok)throw Error(`Network error: ${t.status}`);let n=await t.json();if(n.error)throw Error(n.error);return n}var C={getNominalRoll:()=>x({action:`getNominalRoll`}),getPosts:()=>x({action:`getPosts`}),getNomination:e=>x({action:`getNomination`,id:e}),getValidNominations:()=>x({action:`getValidNominations`}),getFinalNominations:()=>x({action:`getFinalNominations`}),submitNomination:e=>S({action:`submitNomination`,...e}),submitWithdrawal:e=>S({action:`submitWithdrawal`,id:e}),adminLogin:e=>S({action:`adminLogin`,password:e}),adminGetNominations:e=>x({action:`adminGetNominations`,password:e}),adminVerifyNomination:(e,t,n)=>S({action:`adminVerifyNomination`,password:e,id:t,status:n}),adminApproveWithdrawal:(e,t)=>S({action:`adminApproveWithdrawal`,password:e,id:t}),adminPublishValidList:e=>S({action:`adminPublishValidList`,password:e}),adminPublishFinalList:e=>S({action:`adminPublishFinalList`,password:e}),adminGetSettings:e=>x({action:`adminGetSettings`,password:e}),adminGetPosts:e=>x({action:`adminGetPosts`,password:e}),adminAddPost:(e,t)=>S({action:`adminAddPost`,password:e,...t}),adminUpdatePost:(e,t)=>S({action:`adminUpdatePost`,password:e,...t}),adminDeletePost:(e,t)=>S({action:`adminDeletePost`,password:e,postName:t}),adminReorderPosts:(e,t)=>S({action:`adminReorderPosts`,password:e,posts:t}),adminGetBooths:e=>x({action:`adminGetBooths`,password:e}),adminSaveBooths:(e,t)=>S({action:`adminSaveBooths`,password:e,booths:t}),adminGetLocations:e=>x({action:`adminGetLocations`,password:e}),adminSaveLocations:(e,t)=>S({action:`adminSaveLocations`,password:e,locations:t}),getResults:()=>x({action:`getResults`}),adminSaveResults:(e,t)=>S({action:`adminSaveResults`,password:e,results:t}),adminInjectTestData:e=>S({action:`adminInjectTestData`,password:e}),adminWipeData:e=>S({action:`adminWipeData`,password:e}),adminGetCountingMatrix:e=>x({action:`adminGetCountingMatrix`,password:e}),adminSaveCountingMatrix:(e,t)=>S({action:`adminSaveCountingMatrix`,password:e,matrixData:t}),getSettings:()=>x({action:`getSettings`}),adminAddStudent:(e,t)=>S({action:`adminAddStudent`,password:e,...t}),adminDeleteStudent:(e,t)=>S({action:`adminDeleteStudent`,password:e,serial:t}),adminFinalizeRoll:e=>S({action:`adminFinalizeRoll`,password:e})},w=[],T=[],E=``;async function D(e){e.innerHTML=te(`Submit Nomination`,`
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let[t,r]=await Promise.all([C.getNominalRoll(),C.getPosts().catch(()=>null)]);if(w=Array.isArray(t)?t:[],w.length===0)throw Error(`Nominal roll is empty. Please contact the admin.`);T=Array.isArray(r)&&r.length>0?r:n.DEFAULT_POSTS,ee(e)}catch(t){e.querySelector(`#loadingState`).innerHTML=`
      <div class="alert alert-error">${h(t.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`,e.querySelector(`#backBtn`).addEventListener(`click`,()=>o.navigate(`/`))}}function ee(e){let t=l();E=t.answer,e.querySelector(`#loadingState`).classList.add(`hidden`);let n=e.querySelector(`#formArea`);n.classList.remove(`hidden`),n.innerHTML=`
    <div id="warningBox" class="hidden alert alert-warning mb-4"></div>

    <form id="nomForm" class="space-y-8">
      <!-- Post -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-1">Post Applied For</label>
        <select id="postSelect" class="field">${T.map(e=>`<option value="${h(e.post)}">${h(e.post)}</option>`).join(``)}</select>
      </div>

      <!-- Three columns: Candidate / Proposer / Seconder -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${O(`candidate`,`Candidate`,!0)}
        ${O(`proposer`,`Proposer`,!1)}
        ${O(`seconder`,`Seconder`,!1)}
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
  `,d(n.querySelector(`#dob-day`),n.querySelector(`#dob-month`),n.querySelector(`#dob-year`)),[`candidate`,`proposer`,`seconder`].forEach(e=>{n.querySelector(`#serial-${e}`).addEventListener(`change`,()=>k(n,e))}),n.querySelector(`#postSelect`).addEventListener(`change`,()=>A(n)),n.querySelectorAll(`[name="gender"]`).forEach(e=>e.addEventListener(`change`,()=>A(n))),n.querySelectorAll(`.dob-sel`).forEach(e=>e.addEventListener(`change`,()=>A(n))),n.querySelector(`#refreshCaptcha`).addEventListener(`click`,()=>{let e=l();E=e.answer,n.querySelector(`#captchaInput`).value=``,n.querySelector(`#captchaQuestion`).textContent=e.question}),n.querySelector(`#backHomeBtn`).addEventListener(`click`,()=>o.navigate(`/`)),n.querySelector(`#nomForm`).addEventListener(`submit`,e=>j(e,n))}function O(e,t,n){return`
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
  </div>`}function k(e,t){let n=e.querySelector(`#serial-${t}`).value.trim(),r=e.querySelector(`#details-${t}`),i=w.find(e=>String(e[`Nominal Roll Serial Number`])===n);if(!i){r.innerHTML=n?`<span class="text-red-400">⚠ Student not found</span>`:``;return}r.innerHTML=`
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
  </div>`}async function ae(e){e.innerHTML=se(`Valid Nominations List`,`
    <div class="text-center py-20"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Valid Nominations...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let t=await C.getValidNominations();oe(e.querySelector(`main`),t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center py-10 shadow-xl">${h(t.message)}</div>`}}function oe(e,t){if(!t||t.length===0){e.innerHTML=`
      <div class="glass rounded-3xl p-20 text-center border-dashed border-white/10">
        <div class="text-6xl mb-6">📋</div>
        <h2 class="text-2xl font-bold text-white mb-2">List Not Published</h2>
        <p class="text-slate-400 max-w-md mx-auto">The valid nominations list has not been released yet. Please check back later for updates.</p>
      </div>
    `;return}let n={};t.forEach(e=>{n[e.post]||(n[e.post]=[]),n[e.post].push(e)}),e.innerHTML=`
    <div class="page-enter space-y-10">
      <div class="text-center md:text-left border-b border-white/5 pb-8">
        <h2 class="text-3xl font-black text-white tracking-tight">Verified Nominations</h2>
        <p class="text-slate-400 mt-2">Official list of all candidates whose nominations have been verified as valid.</p>
      </div>
      
      <div class="space-y-12">
        ${Object.entries(n).map(([e,t])=>`
          <div class="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div class="px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-indigo-300 text-sm uppercase tracking-widest">${h(e)}</h3>
              <span class="text-[10px] text-slate-500 font-mono">${t.length} Candidate${t.length>1?`s`:``}</span>
            </div>
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="w-16">#</th>
                    <th>Candidate Details</th>
                    <th>Department</th>
                    <th class="text-right">Nomination ID</th>
                  </tr>
                </thead>
                <tbody>
                  ${t.map((e,t)=>`
                    <tr class="hover:bg-white/[0.02] transition-colors">
                      <td class="text-slate-600 font-mono text-xs text-center">${t+1}</td>
                      <td>
                        <div class="font-bold text-white text-base">${h(e.candidateName)}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${h(e.candidateClass)}</div>
                      </td>
                      <td class="text-sm text-slate-400">${h(e.candidateDept)}</td>
                      <td class="text-right font-mono text-indigo-400/70 text-[10px]">${h(e.id)}</td>
                    </tr>
                  `).join(``)}
                </tbody>
              </table>
            </div>
          </div>
        `).join(``)}
      </div>
    </div>`}function se(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
          <span class="text-slate-600">|</span>
          <h1 class="font-bold text-white text-sm tracking-tight">${h(e)}</h1>
        </div>
        <div class="text-[10px] text-slate-500 font-mono hidden sm:block">OFFICIAL ELECTION PORTAL</div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-12">${t}</main>
  </div>`}async function ce(e){e.innerHTML=ue(`Final Candidates List`,`
    <div class="text-center py-20"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Final List...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let t=await C.getFinalNominations();le(e.querySelector(`main`),t.active||[])}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center py-10 shadow-xl">${h(t.message)}</div>`}}function le(e,t){if(!t||t.length===0){e.innerHTML=`
      <div class="glass rounded-3xl p-20 text-center border-dashed border-white/10">
        <div class="text-6xl mb-6">🏁</div>
        <h2 class="text-2xl font-bold text-white mb-2">Final List Pending</h2>
        <p class="text-slate-400 max-w-md mx-auto">The final candidate list will be published after the withdrawal period and scrutiny. Please check back later.</p>
      </div>
    `;return}let n={};t.forEach(e=>{n[e.post]||(n[e.post]=[]),n[e.post].push(e)}),e.innerHTML=`
    <div class="page-enter space-y-10">
      <div class="text-center md:text-left border-b border-white/5 pb-8">
        <h2 class="text-3xl font-black text-white tracking-tight">Final Candidate List</h2>
        <p class="text-slate-400 mt-2">Official approved list of candidates for the College Union Election.</p>
      </div>
      
      <div class="space-y-12">
        ${Object.entries(n).map(([e,t])=>`
          <div class="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div class="px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-indigo-500/5 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-emerald-400 text-sm uppercase tracking-widest">${h(e)}</h3>
              <span class="text-[10px] text-slate-500 font-mono">${t.length} Approved</span>
            </div>
            <div class="overflow-x-auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="w-16">#</th>
                    <th>Candidate Details</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  ${t.map((e,t)=>`
                    <tr class="hover:bg-white/[0.02] transition-colors">
                      <td class="text-slate-600 font-mono text-xs text-center">${t+1}</td>
                      <td>
                        <div class="font-bold text-white text-base">${h(e.candidateName)}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${h(e.candidateClass)}</div>
                      </td>
                      <td class="text-sm text-slate-400">${h(e.candidateDept)}</td>
                    </tr>
                  `).join(``)}
                </tbody>
              </table>
            </div>
          </div>
        `).join(``)}
      </div>
    </div>`}function ue(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
          <span class="text-slate-600">|</span>
          <h1 class="font-bold text-white text-sm tracking-tight">${h(e)}</h1>
        </div>
        <div class="text-[10px] text-slate-500 font-mono hidden sm:block">OFFICIAL ELECTION PORTAL</div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-12">${t}</main>
  </div>`}async function de(e){e.innerHTML=me(`Withdrawal Form`,`
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
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));let t=e.querySelector(`#fetchBtn`);t.addEventListener(`click`,async()=>{let n=e.querySelector(`#withdrawId`).value.trim();if(n.length!==10||!/^\d+$/.test(n)){_(`Please enter a valid 10-digit numeric ID.`,`error`);return}g(t,!0,`Fetch Nomination Details`);try{let t=await C.getNomination(n);fe(e.querySelector(`#nominationDetails`),t,n)}catch(t){e.querySelector(`#nominationDetails`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}finally{g(t,!1,`Fetch Nomination Details`)}})}function fe(e,t,n){if(t.status!==`Valid`){e.innerHTML=`<div class="alert alert-warning">⚠ This nomination has status <strong>${h(t.status)}</strong>. Only <strong>Valid</strong> nominations can be withdrawn.</div>`;return}if(t.withdrawalStatus===`Requested`||t.withdrawalStatus===`Approved`){e.innerHTML=`<div class="alert alert-info">ℹ A withdrawal has already been ${h(t.withdrawalStatus.toLowerCase())} for this nomination.</div>`;return}e.innerHTML=`
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
      </div>
    </div>`,e.querySelector(`#withdrawBtn`).addEventListener(`click`,async()=>{let r=e.querySelector(`#withdrawBtn`);g(r,!0,`Submit Withdrawal Request`);try{await C.submitWithdrawal(n),e.innerHTML=`
        <div class="alert alert-success">✅ Withdrawal request submitted successfully! The Returning Officer will review your request.</div>
        <div class="mt-4 no-print">
          <button id="printWithdrawal" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
        </div>
        <div class="print-zone mt-4">
          ${pe(n,t)}
        </div>`,e.querySelector(`#printWithdrawal`).addEventListener(`click`,m),_(`Withdrawal request submitted!`,`success`)}catch(e){_(`Failed: ${e.message}`,`error`),g(r,!1,`Submit Withdrawal Request`)}})}function pe(e,t){let r=u(),i=t.candidate?.NAME||t.candidateName||`N/A`,a=t.candidate?.CLASS||t.candidateClass||`N/A`,o=t.candidate?.Dept||t.candidateDept||`N/A`;return`
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
  </div>`}function me(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${h(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}function F(e){e.innerHTML=`
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
  </div>`,e.querySelector(`#backHome`).addEventListener(`click`,()=>o.navigate(`/`));let t=e.querySelector(`#loginForm`),n=e.querySelector(`#adminPassword`),r=e.querySelector(`#errorMsg`),i=e.querySelector(`#loginBtn`);t.addEventListener(`submit`,async e=>{e.preventDefault();let t=n.value;if(!t){_(`Please enter the admin password.`,`error`);return}g(i,!0,`Login to Admin Panel →`),r.classList.add(`hidden`);try{await C.adminLogin(t),sessionStorage.setItem(`adminPwd`,t),_(`Logged in successfully!`,`success`),o.navigate(`/admin/dashboard`)}catch(e){r.textContent=`❌ ${e.message}`,r.classList.remove(`hidden`)}finally{g(i,!1,`Login to Admin Panel →`)}})}function I(){return sessionStorage.getItem(`adminPwd`)||(_(`Session expired. Please log in again.`,`warning`),o.navigate(`/admin`),null)}function L(e,t,n){e.innerHTML=`
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
        ${R(`dashboard`,`📊`,`Dashboard`,t)}
        ${R(`verify`,`✅`,`Verify Nominations`,t)}
        ${R(`withdrawals`,`↩️`,`Withdrawals`,t)}
        ${R(`publish`,`📢`,`Publish Lists`,t)}
        ${R(`posts`,`📋`,`Manage Posts`,t)}
        ${R(`nominal-roll`,`📜`,`Nominal Roll`,t)}
        ${R(`booths`,`🏫`,`Polling Booths`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${R(`counting`,`🧮`,`Counting Setup`,t)}
        ${R(`results-entry`,`📥`,`Results Entry`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${R(`public`,`🌐`,`Public Portal`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${R(`testing`,`🧪`,`Testing Tools`,t)}
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
  </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.adminNav;if(t===`public`){o.navigate(`/`);return}o.navigate(`/admin/${t}`)})}),e.querySelector(`#logoutBtn`).addEventListener(`click`,()=>{sessionStorage.removeItem(`adminPwd`),_(`Logged out.`,`info`),o.navigate(`/`)})}function R(e,t,n,r){return`
  <button data-admin-nav="${e}" class="sidebar-item ${r===e?`active`:``}">
    <span>${t}</span> ${n}
  </button>`}var z=`modulepreload`,he=function(e){return`/nomination/`+e},B={},ge=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=he(t,n),t in B)return;B[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:z,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};async function _e(e){let t=I();if(t){L(e,`dashboard`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading dashboard...</p></div>
  `);try{let[n,i]=await Promise.all([C.adminGetNominations(t),C.adminGetSettings(t)]),a=n.length,o=n.filter(e=>e.status===`Pending`).length,s=n.filter(e=>e.status===`Valid`).length,c=n.filter(e=>e.status===`Rejected`).length,l=n.filter(e=>e.withdrawalStatus===`Requested`).length,u=e.querySelector(`#adminMain`);u.innerHTML=`
      <div class="page-enter space-y-8">
        <div class="flex items-end justify-between">
          <div>
            <h3 class="text-2xl font-bold text-white">Admin Dashboard</h3>
            <p class="text-slate-400 text-sm mt-1">Real-time overview of nomination and election status.</p>
          </div>
          <div class="text-right hidden md:block">
            <p class="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Last Updated</p>
            <p class="text-xs text-indigo-400 font-mono">${new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          ${V(`Total Submissions`,a,`from-indigo-500/20 to-indigo-600/5`,`text-indigo-400`)}
          ${V(`Pending Review`,o,`from-amber-500/20 to-amber-600/5`,`text-amber-400`)}
          ${V(`Valid Nominations`,s,`from-emerald-500/20 to-emerald-600/5`,`text-emerald-400`)}
          ${V(`Rejected`,c,`from-rose-500/20 to-rose-600/5`,`text-rose-400`)}
        </div>

        <!-- Secondary Stats & Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 glass rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h4 class="font-bold text-white mb-2">Management Actions</h4>
              <p class="text-slate-400 text-xs mb-6">Process incoming requests and publish official lists to the public portal.</p>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="btn btn-primary" data-admin-nav="verify">
                <span>✅ Review Nominations</span>
                ${o>0?`<span class="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">${o}</span>`:``}
              </button>
              <button class="btn btn-secondary" data-admin-nav="withdrawals">
                <span>↩️ Withdrawals</span>
                ${l>0?`<span class="ml-1 bg-indigo-500/40 px-1.5 py-0.5 rounded text-[10px]">${l}</span>`:``}
              </button>
              <button class="btn btn-secondary" data-admin-nav="publish">📢 Publish Lists</button>
            </div>
          </div>
          
          <div class="glass rounded-2xl p-6 space-y-4">
            <h4 class="font-bold text-white text-sm">Visibility Status</h4>
            <div class="space-y-3">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Valid List</span>
                <span class="badge ${i.validListPublished===`true`?`badge-valid`:`badge-pending`}">${i.validListPublished===`true`?`Published`:`Hidden`}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Final List</span>
                <span class="badge ${i.finalListPublished===`true`?`badge-valid`:`badge-pending`}">${i.finalListPublished===`true`?`Published`:`Hidden`}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div class="glass rounded-2xl overflow-hidden shadow-2xl">
          <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h4 class="font-bold text-white text-sm">Recent Activity</h4>
            <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Top 10 Latest</span>
          </div>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nomination ID</th>
                  <th>Candidate Name</th>
                  <th>Post</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${n.slice(-10).reverse().map(e=>`
                  <tr>
                    <td class="font-mono text-indigo-400 text-xs">${h(e.id)}</td>
                    <td>
                      <div class="font-semibold text-white">${h(e.candidateName)}</div>
                      <div class="text-[10px] text-slate-500">${h(e.candidateClass)}</div>
                    </td>
                    <td class="text-xs text-slate-300 font-medium">${h(e.post)}</td>
                    <td class="text-xs text-slate-400">${h(e.candidateDept)}</td>
                    <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${h(e.status)}</span></td>
                  </tr>
                `).join(``)}
              </tbody>
            </table>
          </div>
          ${a>10?`
          <div class="p-3 text-center border-t border-white/5 bg-white/[0.01]">
            <button class="text-[10px] text-indigo-400 font-bold uppercase tracking-widest hover:text-indigo-300 transition" data-admin-nav="verify">View All Nominations →</button>
          </div>`:``}
        </div>
      </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{ge(async()=>{let{router:e}=await Promise.resolve().then(()=>r);return{router:e}},void 0).then(({router:t})=>t.navigate(`/admin/${e.dataset.adminNav}`))})})}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function V(e,t,n,r){return`
  <div class="glass rounded-2xl p-6 relative overflow-hidden group">
    <div class="absolute inset-0 bg-gradient-to-br ${n} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 relative z-10">${e}</p>
    <p class="text-3xl font-black ${r} relative z-10">${t}</p>
  </div>`}async function ve(e){let t=I();if(t){L(e,`verify`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominations...</p></div>
  `);try{let n=await C.adminGetNominations(t);ye(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function ye(e,t,n){e.innerHTML=`
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 class="text-xl font-bold text-white">Nomination Verification</h3>
          <p class="text-slate-400 text-sm">Review each submission and mark as Valid or Rejected.</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div class="relative flex-1 md:flex-none">
            <input type="text" id="nomSearch" class="field w-full md:w-64 pl-10" placeholder="Search Name, ID, Post...">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          </div>
          <select id="statusFilter" class="field w-full md:w-44">
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Valid">Valid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div class="glass rounded-xl overflow-hidden shadow-2xl">
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
    </div>`;let r=Array.isArray(t)?t:[],i=t=>{let n=e.querySelector(`#nomTableBody`);n.innerHTML=t.length?t.map(e=>`
      <tr id="row-${h(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
        <td class="text-xs max-w-[140px] leading-snug font-medium">${h(e.post)}</td>
        <td class="font-bold text-white">${h(e.candidateName||e.candidate?.NAME||`N/A`)}</td>
        <td class="text-xs text-slate-400">
          <div>${h(e.candidateClass||``)}</div>
          <div class="text-[10px] opacity-60">${h(e.candidateDept||``)}</div>
        </td>
        <td class="text-xs">${h(e.proposerName||e.proposer?.NAME||`N/A`)}</td>
        <td class="text-xs">${h(e.seconderName||e.seconder?.NAME||`N/A`)}</td>
        <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${h(e.status)}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm verify-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${h(e.id)}" data-action="Valid"
              ${e.status===`Valid`?`disabled`:``}>Valid</button>
            <button class="btn btn-secondary btn-sm verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white" data-id="${h(e.id)}" data-action="Rejected"
              ${e.status===`Rejected`?`disabled`:``}>Reject</button>
          </div>
        </td>
      </tr>`).join(``):`<tr><td colspan="8" class="text-center text-slate-500 py-12">No nominations found matching those criteria.</td></tr>`},a=()=>{let t=e.querySelector(`#nomSearch`).value.toLowerCase(),n=e.querySelector(`#statusFilter`).value;i(r.filter(e=>{let r=n===`all`||e.status===n,i=!t||String(e.id).toLowerCase().includes(t)||String(e.candidateName||e.candidate?.NAME||``).toLowerCase().includes(t)||String(e.post).toLowerCase().includes(t);return r&&i}))};e.querySelector(`#nomSearch`).addEventListener(`input`,a),e.querySelector(`#statusFilter`).addEventListener(`change`,a),i(r),e.querySelector(`#nomTableBody`).addEventListener(`click`,async e=>{let t=e.target.closest(`.verify-btn`);if(!t)return;let i=t.dataset.id,o=t.dataset.action;t.disabled=!0;let s=t.textContent;t.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminVerifyNomination(n,i,o);let e=r.find(e=>e.id===i);e&&(e.status=o),_(`Nomination ${i} marked as ${o}.`,`success`),a()}catch(e){_(`Failed: ${e.message}`,`error`),t.disabled=!1,t.textContent=s}})}async function be(e){let t=I();if(t){L(e,`withdrawals`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading withdrawal requests...</p></div>
  `);try{let n=(await C.adminGetNominations(t)).filter(e=>e.withdrawalStatus&&e.withdrawalStatus!==`None`);xe(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function xe(e,t,n){let r=Array.isArray(t)?t:[];e.innerHTML=`
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 class="text-xl font-bold text-white">Withdrawal Requests</h3>
          <p class="text-slate-400 text-sm">Approve or view submitted withdrawal requests.</p>
        </div>
        
        <div class="relative w-full md:w-80">
          <input type="text" id="withSearch" class="field w-full pl-10" placeholder="Search Candidate, ID, or Post...">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        </div>
      </div>

      <div class="glass rounded-xl overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>Nom. ID</th>
              <th>Post</th>
              <th>Candidate</th>
              <th>Class/Dept</th>
              <th>Withdrawal Status</th>
              <th>Action</th>
            </tr></thead>
            <tbody id="withdrawalTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>`;let i=t=>{let n=e.querySelector(`#withdrawalTableBody`);n.innerHTML=t.length?t.map(e=>`
      <tr id="wrow-${h(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${h(e.id)}</td>
        <td class="text-xs font-medium text-slate-300">${h(e.post)}</td>
        <td class="font-bold text-white">${h(e.candidateName||e.candidate?.NAME||`N/A`)}</td>
        <td class="text-xs text-slate-400">${h(e.candidateClass||``)} / ${h(e.candidateDept||``)}</td>
        <td>
          <span class="badge ${e.withdrawalStatus===`Approved`?`badge-valid`:`badge-pending`}">
            ${h(e.withdrawalStatus)}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm approve-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${h(e.id)}"
            ${e.withdrawalStatus===`Approved`?`disabled`:``}>
            ✅ Approve
          </button>
        </td>
      </tr>`).join(``):`<tr><td colspan="6" class="text-center text-slate-500 py-12">No withdrawal requests found matching those criteria.</td></tr>`},a=()=>{let t=e.querySelector(`#withSearch`).value.toLowerCase();i(r.filter(e=>!t||String(e.id).toLowerCase().includes(t)||String(e.candidateName||e.candidate?.NAME||``).toLowerCase().includes(t)||String(e.post).toLowerCase().includes(t)))};e.querySelector(`#withSearch`).addEventListener(`input`,a),i(r),e.addEventListener(`click`,async e=>{let t=e.target.closest(`.approve-btn`);if(!t)return;let i=t.dataset.id;t.disabled=!0;let o=t.innerHTML;t.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminApproveWithdrawal(n,i),_(`Withdrawal for ${i} approved.`,`success`);let e=r.find(e=>e.id===i);e&&(e.withdrawalStatus=`Approved`),a()}catch(e){_(`Failed: ${e.message}`,`error`),t.disabled=!1,t.innerHTML=o}})}async function Se(e){let t=I();if(t){L(e,`publish`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading data...</p></div>
  `);try{let[n,r,i]=await Promise.all([C.adminGetSettings(t),C.adminGetNominations(t),C.getPosts()]);H(e.querySelector(`#adminMain`),n,r,i,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function H(e,t,n,r,i){let a=t.validListPublished===`true`,o=t.finalListPublished===`true`;e.innerHTML=`
    <div class="page-enter space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-xl font-bold text-white">Publish & Print Lists</h3>
          <p class="text-slate-400 text-sm">Control public visibility and generate official printed lists.</p>
        </div>
      </div>

      <!-- Valid list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">📋 Valid Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">List of all verified nominations (Valid status).</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnPrintValid" class="btn btn-secondary btn-sm">🖨️ Print List</button>
            <span class="badge ${a?`badge-valid`:`badge-pending`} text-sm">
              ${a?`✅ Published`:`⏳ Not Published`}
            </span>
          </div>
        </div>
        ${a?`
        <div class="alert alert-success text-sm">✅ This list is currently visible to the public.</div>`:`
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all nominations have been reviewed before publishing.
        </div>
        <button id="publishValidBtn" class="btn btn-primary">📢 Publish Valid Nominations List</button>`}
      </div>

      <!-- Final list publish -->
      <div class="glass rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="font-bold text-white text-base">🏁 Final Nominations List</h4>
            <p class="text-slate-400 text-sm mt-1">Final list of candidates after the withdrawal period.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btnPrintFinal" class="btn btn-secondary btn-sm">🖨️ Print List</button>
            <span class="badge ${o?`badge-valid`:`badge-pending`} text-sm">
              ${o?`✅ Published`:`⏳ Not Published`}
            </span>
          </div>
        </div>
        ${o?`
        <div class="alert alert-success text-sm">✅ The final list is currently visible to the public.</div>`:`
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all withdrawal requests have been processed before publishing.
        </div>
        <button id="publishFinalBtn" class="btn btn-primary" ${a?``:`disabled title="Publish the valid list first"`}>📢 Publish Final Nominations List</button>`}
      </div>
    </div>`;let s=e=>{let t=e===`final`,i=t?n.filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`):n.filter(e=>e.status===`Valid`);if(i.length===0){alert(`No valid nominations found to print.`);return}let a={};i.forEach(e=>{a[e.post]||(a[e.post]=[]),a[e.post].push(e)});let o=r.map(e=>e.post||e.name).filter(e=>a[e]),s=`
      <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #000;padding-bottom:15px">
        <div style="font-size:12px;color:#444">Government Victoria College, Palakkad</div>
        <h1 style="margin:5px 0;font-size:22px;text-transform:uppercase">College Union Election 2026-27</h1>
        <h2 style="margin:0;font-size:18px;color:#000">${t?`FINAL LIST OF ELIGIBLE CANDIDATES`:`LIST OF VALID NOMINATIONS`}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">
        <thead>
          <tr style="background:#f0f0f0">
            <th style="border:1px solid #000;padding:8px;text-align:center;width:40px">#</th>
            <th style="border:1px solid #000;padding:8px;text-align:left">Candidate Name</th>
            <th style="border:1px solid #000;padding:8px;text-align:left">Class</th>
            <th style="border:1px solid #000;padding:8px;text-align:left">Department</th>
          </tr>
        </thead>
        <tbody>
    `;o.forEach(e=>{s+=`
        <tr>
          <td colspan="4" style="border:1px solid #000;padding:10px 8px;background:#eee;font-weight:bold;text-transform:uppercase">
            POST: ${h(e)}
          </td>
        </tr>
      `,a[e].forEach((e,t)=>{s+=`
          <tr>
            <td style="border:1px solid #000;padding:8px;text-align:center">${t+1}</td>
            <td style="border:1px solid #000;padding:8px;font-weight:bold">${h(e.candidateName)}</td>
            <td style="border:1px solid #000;padding:8px">${h(e.candidateClass)}</td>
            <td style="border:1px solid #000;padding:8px">${h(e.candidateDept)}</td>
          </tr>
        `})}),s+=`
        </tbody>
      </table>
      <div style="margin-top:60px;display:flex;justify-content:flex-end">
        <div style="text-align:center">
          <div style="font-weight:bold;margin-bottom:40px">RETURNING OFFICER</div>
          <div style="font-size:11px">Signature & Seal</div>
        </div>
      </div>
    `;let c=window.open(``,`_blank`);c.document.write(`<!DOCTYPE html><html><head><title>Print List</title><style>
      @page{size:A4;margin:20mm}
      body{font-family:Arial,sans-serif;line-height:1.4}
    </style></head><body>${s}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`),c.document.close()};e.querySelector(`#btnPrintValid`).addEventListener(`click`,()=>s(`valid`)),e.querySelector(`#btnPrintFinal`).addEventListener(`click`,()=>s(`final`)),e.querySelector(`#publishValidBtn`)?.addEventListener(`click`,async t=>{let a=t.currentTarget;if(confirm(`Are you sure you want to publish the valid nominations list? This will be visible to all students.`)){g(a,!0,`📢 Publish Valid Nominations List`);try{await C.adminPublishValidList(i),_(`Valid nominations list published successfully!`,`success`),H(e,{validListPublished:`true`,finalListPublished:o?`true`:`false`},n,r,i)}catch(e){_(`Failed: ${e.message}`,`error`),g(a,!1,`📢 Publish Valid Nominations List`)}}}),e.querySelector(`#publishFinalBtn`)?.addEventListener(`click`,async t=>{let a=t.currentTarget;if(confirm(`Are you sure you want to publish the final nominations list?`)){g(a,!0,`📢 Publish Final Nominations List`);try{await C.adminPublishFinalList(i),_(`Final nominations list published successfully!`,`success`),H(e,{validListPublished:`true`,finalListPublished:`true`},n,r,i)}catch(e){_(`Failed: ${e.message}`,`error`),g(a,!1,`📢 Publish Final Nominations List`)}}})}async function Ce(e){let t=I();if(t){L(e,`posts`,`
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading posts...</p>
    </div>
  `);try{let r=await C.adminGetPosts(t).catch(()=>null);(!Array.isArray(r)||r.length===0)&&(r=n.DEFAULT_POSTS),we(e.querySelector(`#adminMain`),r,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function we(e,t,n){e.innerHTML=`
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
    </div>`,U(e,t,n),Te(e,t,n)}function U(e,t,n){let r=e.querySelector(`#postsBody`);r.innerHTML=t.length?t.map((e,t)=>`
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
    </tr>`).join(``):`<tr><td colspan="7" class="text-center text-slate-500 py-8">No posts configured.</td></tr>`,r.querySelectorAll(`.delete-post-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let r=t.dataset.name;if(confirm(`Delete post "${r}"? This cannot be undone.`)){t.disabled=!0;try{await C.adminDeletePost(n,r),_(`Post "${r}" deleted.`,`success`),U(e,await C.adminGetPosts(n),n)}catch(e){_(`Failed: ${e.message}`,`error`),t.disabled=!1}}})});let i=e.querySelector(`#postFormWrap`);r.querySelectorAll(`.edit-post-btn`).forEach(n=>{n.addEventListener(`click`,()=>{let r=t[parseInt(n.dataset.idx)];e.querySelector(`#postFormTitle`).textContent=`Edit Post`,e.querySelector(`#pfPost`).value=r.post,e.querySelector(`#pfYear`).value=r.yearRestriction||``,e.querySelector(`#pfFemale`).checked=!!r.femaleOnly,e.querySelector(`#pfFinalYear`).checked=!!r.finalYearIneligible,e.querySelector(`#pfDept`).checked=!!r.deptRestriction,e.querySelector(`#pfOriginalName`).value=r.post,i.classList.remove(`hidden`),i.scrollIntoView({behavior:`smooth`})})})}function Te(e,t,n){let r=e.querySelector(`#postFormWrap`),i=e.querySelector(`#addPostBtn`),a=e.querySelector(`#cancelPostBtn`),o=e.querySelector(`#savePostBtn`);i.addEventListener(`click`,()=>{e.querySelector(`#postFormTitle`).textContent=`Add New Post`,e.querySelector(`#pfPost`).value=``,e.querySelector(`#pfYear`).value=``,e.querySelector(`#pfFemale`).checked=!1,e.querySelector(`#pfFinalYear`).checked=!1,e.querySelector(`#pfDept`).checked=!1,e.querySelector(`#pfOriginalName`).value=``,r.classList.remove(`hidden`),r.scrollIntoView({behavior:`smooth`})}),a.addEventListener(`click`,()=>r.classList.add(`hidden`)),o.addEventListener(`click`,async()=>{let t=e.querySelector(`#pfPost`).value.trim(),i=e.querySelector(`#pfYear`).value,a=e.querySelector(`#pfFemale`).checked,s=e.querySelector(`#pfFinalYear`).checked,c=e.querySelector(`#pfDept`).checked,l=e.querySelector(`#pfOriginalName`).value;if(!t){_(`Post name is required.`,`error`);return}let u={postName:t,yearRestriction:i,femaleOnly:a,finalYearIneligible:s,deptRestriction:c,originalName:l};g(o,!0,`💾 Save Post`);try{l?(await C.adminUpdatePost(n,u),_(`Post updated successfully!`,`success`)):(await C.adminAddPost(n,u),_(`Post added successfully!`,`success`)),r.classList.add(`hidden`),U(e,await C.adminGetPosts(n),n)}catch(e){_(`Failed: ${e.message}`,`error`)}finally{g(o,!1,`💾 Save Post`)}})}async function Ee(e){let t=I();if(t){L(e,`booths`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);try{let[n,r,i,a]=await Promise.all([C.getNominalRoll(),C.adminGetBooths(t).catch(()=>[]),C.adminGetLocations(t).catch(()=>[]),C.getPosts().catch(()=>[])]);De(e.querySelector(`#adminMain`),t,n,r,i,a)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function De(e,t,r,i,a,o){let s={};r.forEach(e=>{let t=String(e.CLASS||`Unknown`).trim(),n=String(e.Dept||`Unknown`).trim();s[t]||(s[t]={name:t,dept:n,count:0}),s[t].count++});let c=Object.values(s).sort((e,t)=>e.name.localeCompare(t.name)),l=i.length?[...i]:[{boothNumber:1,roomName:``,classes:[]}],u=[...a],d=!0,f=()=>{l.forEach(e=>e.totalStudents=0);let n=[];c.forEach(e=>{let t=l.find(t=>t.classes.includes(e.name));t?t.totalStudents+=e.count:n.push(e)});let i=window.scrollY;e.innerHTML=`
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnClearAll" class="btn btn-secondary border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white">🗑️ Clear All</button>
            <button id="btnPrintRolls" class="btn btn-secondary">🖨️ Print Electoral Rolls</button>
            <button id="btnAutoAllot" class="btn btn-secondary">⚡ Auto Allot</button>
            <button id="btnSaveBooths" class="btn btn-primary">💾 Save Configuration</button>
          </div>
        </div>
        <div id="printArea" class="hidden"></div>

        <!-- Location Management -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-purple-500">
          <h4 class="font-bold text-white mb-3">Manage Locations</h4>
          <div class="flex gap-2 mb-3">
            <input type="text" id="newLocationInput" class="field flex-1" placeholder="Add a new room or location name...">
            <button id="btnAddLocation" class="btn btn-secondary">Add Location</button>
            <button id="btnSaveLocations" class="btn btn-primary">💾 Save Locations</button>
          </div>
          <div class="flex flex-wrap gap-2">
            ${u.length?u.map((e,t)=>`
              <span class="badge badge-valid bg-white/10 text-white border border-white/20 px-3 py-1 flex items-center gap-2">
                ${h(e)}
                <button class="text-red-400 hover:text-red-300 font-bold delete-location" data-idx="${t}">×</button>
              </span>
            `).join(``):`<span class="text-slate-500 text-sm">No locations added yet.</span>`}
          </div>
        </div>

        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-indigo-500">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-bold text-white">Booth Setup</h4>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-slate-300 mb-0">Total Booths:</label>
              <input type="number" id="numBoothsInput" class="field w-20 py-1" min="1" max="20" value="${l.length}">
              <button id="btnUpdateBoothCount" class="btn btn-secondary btn-sm">Update</button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="boothsContainer">
            ${l.map((e,t)=>`
              <div class="border border-white/10 rounded-lg p-3 bg-white/5 shadow-inner">
                <div class="text-[10px] text-slate-500 font-bold uppercase mb-1 flex justify-between">
                  <span>Booth ${t+1}</span>
                  <span class="${e.totalStudents>0?`text-indigo-400`:``}">${e.totalStudents} Students</span>
                </div>
                <select class="field text-sm py-1 mb-2 room-name-select" data-idx="${t}">
                  <option value="">-- Assign Location --</option>
                  ${u.map(n=>`
                    <option value="${h(n)}" 
                      ${e.roomName===n?`selected`:``}
                      ${l.some((e,r)=>r!==t&&e.roomName===n)?`disabled`:``}
                    >${h(n)}</option>
                  `).join(``)}
                </select>
                <div class="text-xs text-slate-500 h-16 overflow-y-auto bg-black/20 rounded p-1">
                  ${e.classes.length?e.classes.map(e=>`<div class="whitespace-nowrap overflow-hidden text-ellipsis">• ${h(e)} (${s[e]?.count||0})</div>`).join(``):`<em class="opacity-30">No classes assigned</em>`}
                </div>
              </div>
            `).join(``)}
          </div>
        </div>

        <!-- Unallocated Warning -->
        ${n.length?`
          <div class="alert alert-warning py-2 text-sm">
            ⚠️ <strong>${n.length} classes</strong> are currently unassigned.
          </div>
        `:``}

        <!-- Class Allocation Table -->
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Department</th>
                <th>Class</th>
                <th>Students</th>
                <th>Assigned Booth</th>
              </tr></thead>
              <tbody>
                ${c.map(e=>{let t=l.find(t=>t.classes.includes(e.name));return`
                    <tr>
                      <td class="text-xs text-slate-400">${h(e.dept)}</td>
                      <td class="font-medium text-sm text-white">${h(e.name)}</td>
                      <td class="font-mono text-indigo-300">${e.count}</td>
                      <td>
                        <select class="field w-full md:w-44 py-1 text-xs class-booth-select" data-class="${h(e.name)}">
                          <option value="">-- Unassigned --</option>
                          ${l.map((e,n)=>`
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
    `,d||window.scrollTo(0,i),d=!1,e.querySelector(`#btnClearAll`).addEventListener(`click`,()=>{confirm(`Clear all class allotments? Room locations will be kept.`)&&(l.forEach(e=>e.classes=[]),f())}),e.querySelector(`#btnPrintRolls`).addEventListener(`click`,()=>{let t=e.querySelector(`#printArea`);t.innerHTML=p(l,r,o,s);let n=window.open(``,`_blank`);n.document.write(`
        <html>
          <head>
            <title>Electoral Rolls - Booth Allotment</title>
            <style>
              body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .facing-sheet { padding: 40px; border: 2px solid #000; height: 92vh; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
              .college-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
              .stats-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              .stats-table th { background: #f5f5f5; font-size: 12px; }
              .roll-page { padding: 30px; }
              .roll-header { display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 15px; font-size: 12px; }
              .roll-table { width: 100%; border-collapse: collapse; }
              .roll-table th, .roll-table td { border: 1.2px solid #000; padding: 6px 10px; text-align: left; font-size: 11px; }
              .roll-table th { background: #eee; font-weight: bold; }
              .footer { display: flex; justify-content: space-around; margin-top: 50px; font-size: 13px; font-weight: bold; }
              @media print {
                .no-print { display: none; }
                .page-break { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            ${t.innerHTML}
          </body>
        </html>
      `),n.document.close(),n.focus(),setTimeout(()=>{n.print()},500)}),e.querySelector(`#btnUpdateBoothCount`).addEventListener(`click`,()=>{let t=parseInt(e.querySelector(`#numBoothsInput`).value,10);if(t>0&&t<=50){if(t>l.length)for(let e=l.length;e<t;e++)l.push({boothNumber:e+1,roomName:``,classes:[]});else t<l.length&&(l=l.slice(0,t));f()}}),e.querySelectorAll(`.room-name-select`).forEach(e=>{e.addEventListener(`change`,e=>{l[e.target.dataset.idx].roomName=e.target.value,f()})}),e.querySelector(`#btnAddLocation`).addEventListener(`click`,()=>{let t=e.querySelector(`#newLocationInput`).value.trim();t&&!u.includes(t)&&(u.push(t),f())}),e.querySelectorAll(`.delete-location`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.target.dataset.idx,n=u[t];u.splice(t,1),l.forEach(e=>{e.roomName===n&&(e.roomName=``)}),f()})}),e.querySelector(`#btnSaveLocations`).addEventListener(`click`,async e=>{let n=e.target;g(n,!0,`💾 Save Locations`);try{await C.adminSaveLocations(t,u),_(`Locations saved successfully!`,`success`)}catch(e){_(`Failed to save: ${e.message}`,`error`)}finally{g(n,!1,`💾 Save Locations`)}}),e.querySelectorAll(`.class-booth-select`).forEach(e=>{e.addEventListener(`change`,e=>{let t=e.target.dataset.class,n=e.target.value;l.forEach(e=>{e.classes=e.classes.filter(e=>e!==t)}),n!==``&&l[parseInt(n,10)].classes.push(t),f()})}),e.querySelector(`#btnSaveBooths`).addEventListener(`click`,async e=>{let n=e.target;g(n,!0,`💾 Save Configuration`);try{await C.adminSaveBooths(t,l),_(`Booth configuration saved successfully!`,`success`)}catch(e){_(`Failed to save: ${e.message}`,`error`)}finally{g(n,!1,`💾 Save Configuration`)}}),e.querySelector(`#btnAutoAllot`).addEventListener(`click`,()=>{m(),f(),_(`Auto allotment complete. Please review and save.`,`info`)})},p=(e,t,r,i)=>{let a=``;return e.forEach(e=>{if(!e.classes||e.classes.length===0)return;let o=e.classes.map(e=>i[e]).filter(Boolean),s=o.reduce((e,t)=>e+t.count,0),c=[...new Set(o.map(e=>e.dept.toUpperCase()))],l=o.reduce((e,t)=>{let n=t.name.toUpperCase();return[`MA`,`MSC`,`MCOM`,`M.SC`,`M.COM`,`M.A`].some(e=>n.includes(e))?e.add(`PG`):(n.includes(`1ST YEAR`)&&e.add(`1`),n.includes(`2ND YEAR`)&&e.add(`2`),n.includes(`3RD YEAR`)&&e.add(`3`)),e},new Set),u=r.filter(e=>!e.deptRestriction&&(!e.yearRestriction||String(e.yearRestriction).trim()===``)),d=r.filter(e=>{if(!e.post.toUpperCase().startsWith(`ASSOCIATION SECRETARY `))return!1;let t=e.post.substring(22).toUpperCase().trim();return c.includes(t)}),f=r.filter(e=>!e.yearRestriction||String(e.yearRestriction).trim()===``?!1:l.has(String(e.yearRestriction)));a+=`
      <div class="page-break">
        <div class="facing-sheet">
          <div class="header">
            <div class="college-name">${h(n.COLLEGE_NAME||`COLLEGE UNION ELECTION`)}</div>
            <div class="title">Electoral Roll — Booth Facing Sheet</div>
          </div>
          <div style="font-size: 20px; margin-bottom: 30px;">
            <p><strong>BOOTH NO:</strong> <span style="font-size: 32px; border: 2px solid #000; padding: 5px 20px; margin-left: 10px;">${e.boothNumber}</span></p>
            <p><strong>LOCATION:</strong> ${h(e.roomName||`UNSPECIFIED`)}</p>
          </div>
          <div style="flex-grow: 1;">
            <h4 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Allocation Statistics</h4>
            <table class="stats-table">
              <thead><tr><th>#</th><th>Department</th><th>Class Name</th><th style="text-align:right">Voters</th></tr></thead>
              <tbody>
                ${o.map((e,t)=>`
                  <tr><td>${t+1}</td><td>${h(e.dept)}</td><td>${h(e.name)}</td><td style="text-align:right">${e.count}</td></tr>
                `).join(``)}
                <tr style="font-weight:bold; background:#f9f9f9"><td colspan="3">GRAND TOTAL VOTERS</td><td style="text-align:right">${s}</td></tr>
              </tbody>
            </table>
            <h4 style="margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Ballots Assigned to this Booth</h4>
            <div style="font-size: 13px; line-height: 1.8;">
              <div>• <strong>General Posts:</strong> ${u.length} Ballots (Chairman, Vice Chairman, UUC, etc.)</div>
              ${d.length?`<div>• <strong>Association:</strong> ${d.map(e=>h(e.post)).join(`, `)}</div>`:``}
              ${f.length?`<div>• <strong>Year Representatives:</strong> ${f.map(e=>h(e.post)).join(`, `)}</div>`:``}
            </div>
          </div>
          <div class="footer">
            <div>Returning Officer Signature</div>
            <div>Presiding Officer Signature</div>
          </div>
        </div>
      </div>`,o.forEach(n=>{let r=t.filter(e=>String(e.CLASS).trim()===n.name);r.sort((e,t)=>String(e.NAME).localeCompare(String(t.NAME))),a+=`
        <div class="page-break">
          <div class="roll-page">
            <div class="roll-header">
              <div><strong>BOOTH ${e.boothNumber}</strong> | ${h(e.roomName||`No Room`)}</div>
              <div style="text-align:center; flex-grow:1; font-weight:bold; font-size:14px;">ELECTORAL ROLL - ${h(n.name)}</div>
              <div>Dept: ${h(n.dept)}</div>
            </div>
            <table class="roll-table">
              <thead><tr>
                <th style="width:40px">Sl.No</th>
                <th style="width:90px">Adm. No</th>
                <th>Student Name</th>
                <th style="width:140px">Class</th>
                <th style="width:100px">Signature</th>
              </tr></thead>
              <tbody>
                ${r.map(e=>`
                  <tr>
                    <td style="text-align:center; font-weight:bold">${h(e[`Nominal Roll Serial Number`]||`–`)}</td>
                    <td style="font-family:monospace">${h(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                    <td style="font-weight:bold">${h(e.NAME)}</td>
                    <td style="font-size:10px">${h(e.CLASS)}</td>
                    <td></td>
                  </tr>
                `).join(``)}
              </tbody>
            </table>
            <div style="margin-top:20px; text-align:right; font-size:10px; color:#999">Total Voters: ${r.length}</div>
          </div>
        </div>`})}),a},m=()=>{l.forEach(e=>{e.classes=[],e.totalStudents=0});let e={};c.forEach(t=>{e[t.dept]||(e[t.dept]={name:t.dept,total:0,classes:[]}),e[t.dept].classes.push(t),e[t.dept].total+=t.count});let t=l.length,n=r.length/t*1.25;Object.values(e).sort((e,t)=>t.total-e.total).forEach(e=>{l.sort((e,t)=>e.totalStudents-t.totalStudents);let t=l[0];if(t.totalStudents+e.total>n&&e.classes.length>1){l.sort((e,t)=>e.totalStudents-t.totalStudents);let t=l[0],n=l.length>1?l[1]:l[0];[...e.classes].sort((e,t)=>t.count-e.count).forEach(e=>{let r=t.totalStudents<=n.totalStudents?t:n;r.classes.push(e.name),r.totalStudents+=e.count})}else e.classes.forEach(e=>t.classes.push(e.name)),t.totalStudents+=e.total}),l.sort((e,t)=>e.boothNumber-t.boothNumber)};f()}async function Oe(e){let t=I();if(t){L(e,`counting`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Counting Setup...</p></div>
  `);try{let[n,r,i,a,o]=await Promise.all([C.adminGetCountingMatrix(t).catch(()=>null),C.getPosts(),C.adminGetNominations(t).catch(()=>[]),C.adminGetBooths(t),C.getNominalRoll()]),s=(Array.isArray(i)?i:[]).filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`);ke(e.querySelector(`#adminMain`),t,n,r,s,a,o)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function ke(e,t,n,r,i,a,o){if(!a.length){e.innerHTML=`<div class="alert alert-error">❌ No booths configured.</div>`;return}if(!r.length){e.innerHTML=`<div class="alert alert-error">❌ No posts configured.</div>`;return}let s=e=>String(e.post||e.name||``),c=t=>{let{matrix:n,formSerials:o,totalRounds:c,roundLabels:u}=t,d=a.length;e.innerHTML=`
      <div class="page-enter space-y-6">
        <div class="flex items-center justify-between no-print">
          <div>
            <h3 class="text-xl font-bold text-white">Counting Matrix Setup</h3>
            <p class="text-slate-400 text-sm">${d} tables · ${c} rounds · ${r.length} posts total</p>
          </div>
          <div class="flex gap-2">
            <button id="btnRegenerate" class="btn btn-secondary bg-white/5 border-white/10 hover:bg-white/10">🔄 Regenerate</button>
            <button id="btnPrintForms" class="btn btn-primary">🖨️ Print All Forms</button>
          </div>
        </div>

        <div class="glass rounded-xl overflow-hidden no-print">
          <div class="overflow-x-auto">
            <table class="data-table text-xs">
              <thead><tr>
                <th>Table</th>
                ${u.map(e=>`<th>${h(e)}</th>`).join(``)}
              </tr></thead>
              <tbody>
                ${a.map((e,t)=>`
                  <tr>
                    <td class="font-bold text-indigo-300 whitespace-nowrap">
                      Table ${e.boothNumber}<br>
                      <span class="text-xs text-slate-500 font-normal">${h(e.roomName||``)}</span>
                    </td>
                    ${n[t].map((e,n)=>`
                      <td class="align-top py-2 min-w-[100px]">
                        ${e?`<div class="text-[10px] text-slate-500 mb-0.5 font-mono">#${o[`${t}-${n}`]}</div>
                             <div class="badge badge-valid block text-left" title="${h(s(e))}">${h(s(e))}</div>`:`<span class="text-slate-600">–</span>`}
                      </td>`).join(``)}
                  </tr>`).join(``)}
              </tbody>
            </table>
          </div>
        </div>
      </div>`,e.querySelector(`#btnRegenerate`).addEventListener(`click`,()=>{confirm(`Are you sure? This will discard the current matrix and generate a new one based on current Booths and Posts. Results entry serial numbers may change!`)&&l()}),e.querySelector(`#btnPrintForms`).addEventListener(`click`,()=>{let e=``,t=0;for(let r=0;r<c;r++)for(let c=0;c<d;c++){let l=n[c][r];if(!l)continue;let u=s(l),d=o[`${c}-${r}`],f=i.filter(e=>e.post===u);e+=Ae(a[c].boothNumber,r+1,u,f,d),t++}if(!t){alert(`No forms generated.`);return}let r=window.open(``,`_blank`);if(!r){alert(`Pop-up blocked.`);return}r.document.write(`<!DOCTYPE html><html><head><title>Counting Forms</title><style>
        @page{size:A4;margin:12mm}*{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#000}
        .pg{page-break-after:always;padding:10px;position:relative}.pg:last-child{page-break-after:avoid}
        .serial-tag{position:absolute;top:10px;right:10px;border:2px solid #000;padding:5px 12px;font-family:monospace;font-size:18px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-bottom:18px}
        th,td{border:1.5px solid #000;padding:8px}th{background:#eee}
      </style></head><body>${e}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`),r.document.close()})},l=async()=>{let n=a.length,i=e=>{let t=s(e);return t.toUpperCase().startsWith(`ASSOCIATION SECRETARY `)?t.substring(22).toUpperCase().trim():null},l={};o.forEach(e=>{let t=String(e.CLASS||``).trim(),n=String(e.Dept||``).trim().toUpperCase();t&&n&&(l[t]=n)});let u=a.map(e=>new Set((e.classes||[]).map(e=>l[e]||``).filter(Boolean))),d=a.map(e=>{let t=new Set;return(e.classes||[]).forEach(e=>{let n=e.toUpperCase();[`MA`,`MSC`,`MCOM`,`M.SC`,`M.COM`,`M.A`].some(e=>n.includes(e))?t.add(`PG`):(n.includes(`1ST YEAR`)&&t.add(`1`),n.includes(`2ND YEAR`)&&t.add(`2`),n.includes(`3RD YEAR`)&&t.add(`3`))}),t}),f=r.filter(e=>{let t=s(e).toUpperCase();return t.includes(`UUC`)||t.includes(`UNIVERSITY UNION COUNCILLOR`)}),p=r.filter(e=>!f.includes(e)&&s(e).toUpperCase().includes(`ASSOCIATION`)),m=r.filter(e=>!f.includes(e)&&!p.includes(e)&&e.yearRestriction&&String(e.yearRestriction).trim()!==``),h=r.filter(e=>!f.includes(e)&&!p.includes(e)&&!m.includes(e)),g=h.length,v=Array.from({length:n},(e,t)=>{let n=[];p.forEach(e=>{let r=i(e);r&&u[t].has(r)&&n.push(e)}),m.forEach(e=>{d[t].has(String(e.yearRestriction))&&n.push(e)});for(let e=0;e<g;e++)n.push(h[(t+e)%g]);return f.forEach(e=>n.push(e)),n}),y=Math.max(...v.map(e=>e.length),0);v.forEach(e=>{for(;e.length<y;)e.push(null)});let b={},x=1;for(let e=0;e<y;e++)for(let t=0;t<n;t++)v[t][e]&&(b[`${t}-${e}`]=x++);let S=[];for(let e=0;e<y;e++)S.push(`Round ${e+1}`);let w={matrix:v,formSerials:b,totalRounds:y,roundLabels:S};try{e.innerHTML=`<div class="text-center py-20"><span class="spinner"></span><p class="mt-4 text-slate-400">Saving Matrix...</p></div>`,await C.adminSaveCountingMatrix(t,w),_(`Counting Matrix saved successfully!`,`success`),c(w)}catch(e){_(`Error saving matrix: `+e.message,`error`),c(w)}};n?c(n):(e.innerHTML=`
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
        <div class="text-5xl mb-4">🧩</div>
        <h3 class="text-xl font-bold text-white mb-2">No Matrix Found</h3>
        <p class="text-slate-400 mb-6">The counting matrix has not been generated and saved yet.</p>
        <button id="btnInitialGenerate" class="btn btn-primary px-10">Generate Matrix Now</button>
      </div>
    `,e.querySelector(`#btnInitialGenerate`).addEventListener(`click`,l))}function Ae(e,t,n,r,i){let a=r.length?r.map((e,t)=>`<tr>
        <td style="text-align:center;padding:18px 8px;font-weight:bold">${t+1}</td>
        <td style="padding:18px 8px;font-size:15px;font-weight:bold">
          ${h(e.candidateName||``)}
          <div style="font-size:11px;font-weight:normal;color:#333;margin-top:2px;">${h(e.candidateClass||``)}</div>
        </td>
        <td style="padding:18px 8px"></td></tr>`).join(``):`<tr><td colspan="3" style="padding:14px;text-align:center;color:#555">No Candidates Found</td></tr>`;return`<div class="pg">
    <div class="serial-tag">FORM #${i}</div>
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px;padding-right:100px;">
      <div style="font-size:11px;color:#555">Government Victoria College, Palakkad — College Union Election</div>
      <h2 style="margin:6px 0 0;font-size:20px;text-transform:uppercase;letter-spacing:2px">Counting Form</h2>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:15px;font-weight:bold">
        <span>TABLE: <u>${e}</u></span><span>ROUND: <u>${t}</u></span>
      </div>
      <h3 style="margin:10px 0 0;font-size:15px;text-decoration:underline;text-transform:uppercase">POST: ${h(n)}</h3>
    </div>
    <table>
      <thead><tr>
        <th style="width:8%;text-align:center">#</th>
        <th style="text-align:left;width:62%">Candidate Name & Class</th>
        <th style="width:30%;text-align:center">Votes</th>
      </tr></thead>
      <tbody>
        ${a}
        <tr><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:bold">NOTA</td><td></td></tr>
        <tr><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:bold;color:#555">INVALID</td><td></td></tr>
        <tr style="background:#eee"><td style="text-align:center;padding:18px 8px">–</td><td style="padding:18px 8px;font-weight:black;font-size:16px">TOTAL</td><td></td></tr>
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:60px;text-align:center">
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Signature of the Agents</div></div>
      <div><div style="border-top:1.5px solid #000;width:200px;margin-bottom:5px"></div><div style="font-size:11px">Counting Supervisor Signature</div></div>
    </div>
  </div>`}async function je(e){let t=I();if(t){L(e,`results-entry`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading data...</p></div>
  `);try{let[n,r,i,a,o]=await Promise.all([C.adminGetBooths(t).catch(()=>[]),C.getPosts(),C.adminGetNominations(t).catch(()=>[]),C.getResults().catch(()=>[]),C.adminGetCountingMatrix(t).catch(()=>null)]),s=(Array.isArray(i)?i:[]).filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`);Me(e.querySelector(`#adminMain`),t,n,r,s,a,o)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function Me(e,t,n,r,i,a,o){let s=e=>String(e.post||e.name||``);if(!o){e.innerHTML=`
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
        <div class="text-5xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-white mb-2">Matrix Not Set</h3>
        <p class="text-slate-400 mb-6">The Counting Matrix must be generated and saved in the "Counting Setup" page before you can enter results.</p>
      </div>
    `;return}let{matrix:c,formSerials:l}=o,u={};Object.entries(l).forEach(([e,t])=>{let[n,r]=e.split(`-`).map(Number),i=c[n][r];u[t]={t:n,r,postName:s(i)}}),e.innerHTML=`
    <div class="page-enter space-y-6 max-w-4xl mx-auto">
      <div>
        <h3 class="text-xl font-bold text-white">Enter Vote Counts</h3>
        <p class="text-slate-400 text-sm">Enter the Form Serial Number from the counting form to load the entry sheet.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="glass rounded-xl p-6">
          <label class="block text-sm text-slate-300 mb-1">Form Serial Number</label>
          <div class="flex gap-2">
            <input type="number" id="txtSerial" class="field" placeholder="e.g. 15" autofocus>
            <button id="btnLoadBySerial" class="btn btn-primary px-6">Load Form</button>
          </div>
        </div>

        <div class="glass rounded-xl p-6 opacity-60">
          <label class="block text-sm text-slate-300 mb-1">Manual Selection (Fallback)</label>
          <div class="flex gap-2">
            <select id="selTable" class="field text-xs">
              <option value="">Table...</option>
              ${n.map(e=>`<option value="${e.boothNumber}">Table ${e.boothNumber}</option>`).join(``)}
            </select>
            <select id="selPost" class="field text-xs">
              <option value="">Post...</option>
              ${r.map(e=>`<option value="${h(e.post||e.name)}">${h(e.post||e.name)}</option>`).join(``)}
            </select>
            <button id="btnLoadForm" class="btn btn-secondary px-4 text-xs">Load</button>
          </div>
        </div>
      </div>

      <div id="entryFormArea"></div>
    </div>
  `;let d=e.querySelector(`#txtSerial`),f=e.querySelector(`#btnLoadBySerial`),p=async()=>{let e=d.value.trim();if(!e)return;let t=u[e];if(!t){_(`Invalid Serial Number: ${e}`,`error`);return}try{g(f,!0,`Loading...`);let r=await C.getResults().catch(()=>[]);a.length=0,a.push(...r),m(n[t.t].boothNumber,t.postName,e,t.r+1)}catch{m(n[t.t].boothNumber,t.postName,e,t.r+1)}finally{g(f,!1,`Load Form`)}};f.addEventListener(`click`,p),d.addEventListener(`keypress`,e=>{e.key===`Enter`&&p()}),e.querySelector(`#btnLoadForm`).addEventListener(`click`,async()=>{let t=e.querySelector(`#selTable`).value,r=e.querySelector(`#selPost`).value;if(!t||!r){_(`Select Table and Post`,`warning`);return}let i=n.findIndex(e=>String(e.boothNumber)===String(t)),o=null,u=null;if(i>=0){for(let e=0;e<c[i].length;e++)if(s(c[i][e])===r){u=e+1,o=l[`${i}-${e}`];break}}try{g(e.querySelector(`#btnLoadForm`),!0,`...`);let n=await C.getResults().catch(()=>[]);a.length=0,a.push(...n),m(t,r,o,u)}catch{m(t,r,o,u)}finally{g(e.querySelector(`#btnLoadForm`),!1,`Load`)}});let m=(n,r,o,s)=>{let c=e.querySelector(`#entryFormArea`),l=i.filter(e=>e.post===r);if(l.length===0){c.innerHTML=`<div class="alert alert-warning">No candidates found for ${h(r)}.</div>`;return}let u=a.filter(e=>String(e.TableNumber)===String(n)&&String(e.Post)===r),f=e=>u.find(t=>t.CandidateId===e)?.Votes||``;c.innerHTML=`
      <div class="glass rounded-xl overflow-hidden page-enter">
        <div class="bg-indigo-500/10 p-4 border-b border-indigo-500/20 flex justify-between items-center">
          <div>
            <h4 class="font-bold text-indigo-300">Table ${n} • Round ${s||`N/A`} • ${h(r)}</h4>
            <p class="text-[10px] text-slate-400 mt-1">Form Serial: #${o||`Manual`}</p>
          </div>
          ${o?`<div class="bg-indigo-500 text-white text-xs px-2 py-1 rounded font-bold">FORM #${o}</div>`:``}
        </div>
        <div class="p-6 space-y-4">
          ${l.map((e,t)=>`
            <div class="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5">
              <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">${t+1}</div>
                <div>
                  <div class="font-bold text-white">${h(e.candidateName)}</div>
                  <div class="text-xs text-slate-400">${h(e.candidateClass)}</div>
                </div>
              </div>
              <div class="w-32">
                <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="${h(e.id)}" data-cname="${h(e.candidateName)}" placeholder="0" value="${f(e.id)}" min="0">
              </div>
            </div>
          `).join(``)}
          
          <div class="border-t border-white/10 my-4"></div>

          <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <div>
              <div class="font-bold text-slate-300">NOTA</div>
            </div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="NOTA" data-cname="NOTA" placeholder="0" value="${f(`NOTA`)}" min="0">
            </div>
          </div>
          
          <div class="flex items-center justify-between bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div>
              <div class="font-bold text-red-400">INVALID</div>
            </div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid" placeholder="0" value="${f(`INVALID`)}" min="0">
            </div>
          </div>
          <div class="flex items-center justify-between bg-indigo-500/20 p-4 rounded-lg border border-indigo-500/40 mt-4">
            <div class="font-black text-indigo-300 text-xl tracking-wider">TOTAL</div>
            <div class="w-32 text-center text-2xl font-black text-white" id="totalVotesDisplay">0</div>
          </div>
        </div>
        <div class="bg-slate-900/50 p-4 border-t border-white/10 flex justify-between items-center">
          <p class="text-xs text-slate-500 italic ml-2">Verify that this total matches the physical ballot count.</p>
          <button id="btnSaveVotes" class="btn btn-success px-12">💾 Save Form Results</button>
        </div>
      </div>
    `;let p=()=>{let e=0;c.querySelectorAll(`.vote-input`).forEach(t=>{e+=parseInt(t.value,10)||0});let t=c.querySelector(`#totalVotesDisplay`);t&&(t.textContent=e)};c.querySelectorAll(`.vote-input`).forEach(e=>{e.addEventListener(`input`,p)}),p(),c.querySelector(`#btnSaveVotes`).addEventListener(`click`,async e=>{let i=e.target,l=c.querySelectorAll(`.vote-input`),u=[];if(l.forEach(e=>{let t=e.value.trim();t!==``&&u.push({TableNumber:n,RoundNumber:s,Post:r,CandidateId:e.dataset.cid,CandidateName:e.dataset.cname,Votes:parseInt(t,10),FormSerial:o||`N/A`})}),u.length===0){_(`Enter votes`,`warning`);return}g(i,!0,`💾 Saving...`);try{await C.adminSaveResults(t,u),u.forEach(e=>{let t=a.findIndex(t=>String(t.TableNumber)===String(n)&&String(t.Post)===r&&t.CandidateId===e.CandidateId);t>=0?(a[t].Votes=e.Votes,a[t].RoundNumber=e.RoundNumber,a[t].FormSerial=e.FormSerial):a.push(e)}),_(`Form results saved!`,`success`),c.innerHTML=``,d.value=``,d.focus()}catch(e){_(`Failed: ${e.message}`,`error`)}finally{g(i,!1,`💾 Save Form Results`)}})}}function Ne(e){let t=I();if(!t)return;L(e,`testing`,`
    <div class="page-enter space-y-8 max-w-3xl mx-auto">

      <!-- Warning Banner -->
      <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-4">
        <div class="text-3xl">⚠️</div>
        <div>
          <h4 class="font-bold text-amber-400 text-lg">Testing Environment Tools</h4>
          <p class="text-amber-200/70 text-sm mt-1">
            These tools are for <strong>testing and debugging only</strong>. 
            Do not inject test data during or after the actual election process begins.
            Wiping data is <strong>irreversible</strong> — always confirm before acting.
          </p>
        </div>
      </div>

      <!-- Inject Test Data -->
      <div class="glass rounded-2xl overflow-hidden border border-indigo-500/20">
        <div class="bg-indigo-500/10 p-5 border-b border-indigo-500/20 flex items-center gap-3">
          <div class="text-2xl">🧪</div>
          <div>
            <h4 class="font-bold text-white text-lg">Inject Test Data</h4>
            <p class="text-slate-400 text-sm">Creates 2 synthetic, pre-approved candidates for every configured post using real students from the Nominal Roll.</p>
          </div>
        </div>
        <div class="p-6 space-y-4">
          <ul class="text-sm text-slate-400 space-y-1 list-disc list-inside">
            <li>Reads all posts from the <strong class="text-white">Posts</strong> sheet.</li>
            <li>Picks real students from <strong class="text-white">NominalRoll</strong> as candidates, proposers, and seconders.</li>
            <li>Sets status to <strong class="text-green-400">Valid</strong> and populates <strong class="text-white">Nominations, ValidList, and FinalList</strong>.</li>
            <li>IDs are prefixed with <code class="text-indigo-300 bg-black/30 px-1 rounded">TEST</code> for easy identification.</li>
          </ul>
          <div class="pt-2">
            <button id="btnInjectData" class="btn btn-primary gap-2">
              🧪 Inject Test Nominations
            </button>
          </div>
          <div id="injectStatus"></div>
        </div>
      </div>

      <!-- Wipe All Data -->
      <div class="glass rounded-2xl overflow-hidden border border-red-500/30">
        <div class="bg-red-500/10 p-5 border-b border-red-500/30 flex items-center gap-3">
          <div class="text-2xl">🗑️</div>
          <div>
            <h4 class="font-bold text-red-400 text-lg">Wipe All Transactional Data</h4>
            <p class="text-slate-400 text-sm">Permanently deletes all nominations, results, and resets the publish flags. Leaves NominalRoll, Posts, and Booth configuration intact.</p>
          </div>
        </div>
        <div class="p-6 space-y-4">
          <div class="rounded-lg bg-red-900/20 border border-red-800/40 p-4 text-sm text-red-300 space-y-1">
            <p>🗑️ <strong>Nominations</strong> sheet — will be cleared</p>
            <p>🗑️ <strong>ValidList</strong> sheet — will be cleared</p>
            <p>🗑️ <strong>FinalList</strong> sheet — will be cleared</p>
            <p>🗑️ <strong>Results</strong> sheet — will be cleared</p>
            <p>🔄 <strong>Publish flags</strong> — will be reset to false</p>
            <p class="text-green-400 mt-2">✅ NominalRoll, Posts, Booths, Settings (locations) — <strong>preserved</strong></p>
          </div>
          
          <!-- Password confirmation -->
          <div class="space-y-2 pt-2">
            <label class="block text-sm text-slate-300 font-medium">Confirm Admin Password</label>
            <input type="password" id="wipePasswordInput" class="field max-w-xs" placeholder="Enter admin password to confirm...">
          </div>
          
          <div>
            <button id="btnWipeData" class="btn bg-red-600 hover:bg-red-500 text-white border-none gap-2 px-6">
              🗑️ Permanently Wipe All Data
            </button>
          </div>
          <div id="wipeStatus"></div>
        </div>
      </div>

    </div>
  `);let n=e.querySelector(`#adminMain`);n.querySelector(`#btnInjectData`).addEventListener(`click`,async e=>{let r=e.target;if(!confirm(`This will inject test nominations for ALL configured posts.

Proceed?`))return;g(r,!0,`🧪 Inject Test Nominations`);let i=n.querySelector(`#injectStatus`);i.innerHTML=``;try{let e=await C.adminInjectTestData(t),n=e.skipped>0?`<br><span class="text-amber-400 text-xs mt-1 block">⚠️ ${e.skipped} post(s) skipped — not enough eligible students in NominalRoll: <em>${e.skippedPosts.join(`, `)}</em></span>`:``;i.innerHTML=`
        <div class="alert mt-3" style="background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #6ee7b7;">
          ✅ Successfully injected <strong>${e.injected}</strong> test nominations across posts. All rules (gender, year, dept) were respected.${n}
        </div>`,_(`Injected ${e.injected} test nominations!`,`success`)}catch(e){i.innerHTML=`<div class="alert alert-error mt-3">❌ ${h(e.message)}</div>`,_(`Failed: ${e.message}`,`error`)}finally{g(r,!1,`🧪 Inject Test Nominations`)}}),n.querySelector(`#btnWipeData`).addEventListener(`click`,async e=>{let t=e.target,r=n.querySelector(`#wipePasswordInput`).value.trim();if(!r){_(`Please enter the admin password to confirm the wipe.`,`warning`),n.querySelector(`#wipePasswordInput`).focus();return}if(!confirm(`⚠️ DANGER ZONE ⚠️

This will PERMANENTLY DELETE:
• All Nominations
• ValidList
• FinalList
• Results

This action CANNOT be undone.

Are you absolutely sure?`))return;g(t,!0,`🗑️ Wiping...`);let i=n.querySelector(`#wipeStatus`);i.innerHTML=``;try{await C.adminWipeData(r),n.querySelector(`#wipePasswordInput`).value=``,i.innerHTML=`
        <div class="alert mt-3" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #fca5a5;">
          ✅ All transactional data has been wiped. Publish flags reset to false.
        </div>`,_(`All data wiped successfully.`,`success`)}catch(e){i.innerHTML=`<div class="alert alert-error mt-3">❌ ${h(e.message)}</div>`,_(`Failed: ${e.message}`,`error`)}finally{g(t,!1,`🗑️ Permanently Wipe All Data`)}})}var W=`election_results_cache`,G=`election_results_last_fetch`,K=300*1e3;async function q(e){e.innerHTML=`
    <div class="page-enter min-h-screen">
      <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
        <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
            <span class="text-slate-600">|</span>
            <h1 class="font-bold text-white text-sm">Live Election Results</h1>
          </div>
          <div class="flex items-center gap-3">
            <span id="cacheTimer" class="text-[10px] text-slate-500 font-mono"></span>
            <button id="btnRefresh" class="btn btn-secondary btn-sm">🔄 Refresh</button>
          </div>
        </div>
      </header>
      <main id="resultsMain" class="max-w-5xl mx-auto px-4 py-8">
        <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Fetching Live Results...</p></div>
      </main>
    </div>
  `;let t=e.querySelector(`#cacheTimer`),n=()=>{let e=localStorage.getItem(G);if(!e){t.textContent=``;return}let n=parseInt(e,10)+K,r=Math.max(0,n-Date.now());r<=0?(t.textContent=`Live Update Available`,t.classList.add(`text-green-400`)):(t.textContent=`Update in ${Math.floor(r/6e4)}:${Math.floor(r%6e4/1e3).toString().padStart(2,`0`)}`,t.classList.remove(`text-green-400`))};setInterval(n,1e3),n(),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`)),e.querySelector(`#btnRefresh`).addEventListener(`click`,()=>J(e.querySelector(`#resultsMain`),!0)),await J(e.querySelector(`#resultsMain`))}async function J(e,t=!1){try{let n=localStorage.getItem(G),r=localStorage.getItem(W),i,a;if(!t&&n&&r&&Date.now()-parseInt(n,10)<K){let e=JSON.parse(r);i=e.posts,a=e.results}else [i,a]=await Promise.all([C.getPosts(),C.getResults().catch(()=>[])]),localStorage.setItem(G,Date.now().toString()),localStorage.setItem(W,JSON.stringify({posts:i,results:a}));if(a.length===0){e.innerHTML=`
        <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <div class="text-5xl mb-4">📊</div>
          <h2 class="text-2xl font-bold text-white mb-2">Counting in Progress</h2>
          <p class="text-slate-400">No results have been published yet. Please check back later.</p>
        </div>
      `;return}let o={};i.forEach(e=>{let t=e.post||e.name;o[t]={}}),a.forEach(e=>{let t=e.Post;o[t]||(o[t]={}),o[t][e.CandidateId]||(o[t][e.CandidateId]={name:e.CandidateName,votes:0}),o[t][e.CandidateId].votes+=Number(e.Votes)||0});let s=`<div class="space-y-12">`;i.forEach(e=>{let t=e.post||e.name,n=o[t];if(!n)return;let r=Object.keys(n);if(r.length===0)return;let i=r.filter(e=>e!==`INVALID`&&e!==`NOTA`).map(e=>n[e]),a=n.INVALID,c=n.NOTA;i.sort((e,t)=>t.votes-e.votes);let l=i.length?i[0].votes:0,u=i.reduce((e,t)=>e+t.votes,0)+(c?c.votes:0);s+=`
        <div class="glass rounded-2xl overflow-hidden border border-white/10 page-enter">
          <div class="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 p-5 border-b border-white/10 flex justify-between items-end">
            <div>
              <h2 class="text-2xl font-bold text-white">${h(t)}</h2>
              <p class="text-sm text-indigo-300 mt-1">${u} Total Valid Votes Counted</p>
            </div>
          </div>
          <div class="p-6 space-y-6">
            ${i.map((e,t)=>{let n=u>0?(e.votes/u*100).toFixed(1):0,r=l>0?e.votes/l*100:0,i=t===0&&e.votes>0;return`
                <div class="relative">
                  <div class="flex justify-between items-end mb-2 relative z-10">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full ${i?`bg-amber-500 text-amber-950`:`bg-white/10 text-white`} flex items-center justify-center font-bold text-sm shadow-lg">
                        ${i?`🏆`:t+1}
                      </div>
                      <span class="font-bold text-white text-lg">${h(e.name)}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-2xl font-black text-white">${e.votes}</span>
                      <span class="text-xs text-slate-400 ml-1">votes (${n}%)</span>
                    </div>
                  </div>
                  <div class="h-4 w-full bg-slate-800 rounded-full overflow-hidden relative">
                    <div class="h-full rounded-full transition-all duration-1000 ease-out ${i?`bg-gradient-to-r from-amber-400 to-amber-600`:`bg-gradient-to-r from-indigo-500 to-purple-600`}" style="width: ${r}%"></div>
                  </div>
                </div>
              `}).join(``)}
            
            ${c&&c.votes>0?`
              <div class="border-t border-white/10 pt-4 mt-6 flex justify-between text-sm text-slate-400">
                <span>NOTA</span>
                <span class="font-bold text-white">${c.votes} <span class="text-xs text-slate-500 font-normal">votes (${(c.votes/u*100).toFixed(1)}%)</span></span>
              </div>
            `:``}

            ${a&&a.votes>0?`
              <div class="${c&&c.votes>0?`border-t border-white/10 pt-4 mt-4`:`border-t border-white/10 pt-4 mt-6`} flex justify-between text-sm text-slate-500">
                <span>INVALID</span>
                <span class="font-bold text-red-400">${a.votes}</span>
              </div>
            `:``}
          </div>
        </div>
      `}),s+=`</div>`,s===`<div class="space-y-12"></div>`?e.innerHTML=`
        <div class="alert alert-info text-center">Results backend is initialized, but no votes have been aggregated for the configured posts yet.</div>
      `:e.innerHTML=s}catch(t){e.innerHTML=`<div class="alert alert-error">❌ Failed to load results: ${h(t.message)}</div>`}}async function Pe(e){e.innerHTML=`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `;try{let[t,n]=await Promise.all([C.getNominalRoll(),C.getSettings()]);Fe(e,t,n)}catch(t){e.innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}function Fe(e,t,n){let r=n.nominalRollFinalized===`true`,i=[...t],a=``,o=()=>{let t=i.filter(e=>[e.NAME,e.CLASS,e[`ADMISION NO`],e[`Nominal Roll Serial Number`]].some(e=>String(e||``).toLowerCase().includes(a.toLowerCase())));e.innerHTML=`
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-2xl font-bold text-white">Nominal Roll</h3>
            <p class="text-slate-400 text-sm">Official list of eligible voters.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <div class="dropdown relative inline-block">
              <button class="btn btn-secondary dropdown-toggle">🖨️ Print Roll ▼</button>
              <div class="dropdown-menu absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl hidden z-50 overflow-hidden border border-white/10">
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintSerial">Sorted by Serial No</button>
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintClass">Sorted by Class</button>
              </div>
            </div>
            ${r?`<span class="badge badge-valid py-2 px-4">FINALIZED LIST</span>`:`<span class="badge badge-pending py-2 px-4">DRAFT LIST</span>`}
          </div>
        </div>

        <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field pl-10" placeholder="Search by name, class, adm. no, or serial..." value="${h(a)}">
          </div>
          <div class="text-slate-400 text-sm">Showing <strong>${t.length}</strong> of ${i.length} students</div>
        </div>

        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Sl. No</th>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
              </tr></thead>
              <tbody>
                ${t.length?t.map(e=>`
                  <tr>
                    <td class="font-bold text-indigo-400">${h(e[`Nominal Roll Serial Number`])}</td>
                    <td class="font-mono text-xs">${h(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                    <td class="text-white font-medium">${h(e.NAME)}</td>
                    <td class="text-slate-300 text-sm">${h(e.CLASS)}</td>
                  </tr>
                `).join(``):`<tr><td colspan="4" class="text-center py-10 text-slate-500">No students found matching your search.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;let n=e.querySelector(`.dropdown-toggle`),s=e.querySelector(`.dropdown-menu`);n&&(n.onclick=e=>{e.stopPropagation(),s.classList.toggle(`hidden`)}),window.onclick=()=>s?.classList.add(`hidden`),e.querySelector(`#searchInput`).oninput=t=>{a=t.target.value,o();let n=e.querySelector(`#searchInput`);n.focus();let r=n.value;n.value=``,n.value=r},e.querySelector(`#btnPrintSerial`).onclick=()=>Y(i,r,`serial`),e.querySelector(`#btnPrintClass`).onclick=()=>Y(i,r,`class`)};o()}function Y(e,t,r){let i=[...e];r===`class`?i.sort((e,t)=>{let n=String(e.CLASS).toUpperCase(),r=String(t.CLASS).toUpperCase();return n===r?String(e.NAME).toUpperCase().localeCompare(String(t.NAME).toUpperCase()):n.localeCompare(r)}):i.sort((e,t)=>Number(e[`Nominal Roll Serial Number`])-Number(t[`Nominal Roll Serial Number`]));let a=n.COLLEGE_NAME||`GOVERNMENT VICTORIA COLLEGE, PALAKKAD`,o=t?`FINAL NOMINAL ROLL`:`DRAFT NOMINAL ROLL`,s=new Date().toLocaleString(),c=window.open(``,`_blank`);c.document.write(`
    <html>
      <head>
        <title>${o}</title>
        <style>
          @page { margin: 15mm; }
          body { font-family: sans-serif; color: #000; line-height: 1.4; font-size: 11px; margin: 0; padding: 0; }
          .watermark { 
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px; color: rgba(0,0,0,0.05); font-weight: bold; pointer-events: none; z-index: -1;
            white-space: nowrap; text-transform: uppercase;
          }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .college { font-size: 18px; font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 5px; }
          .meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 10px; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .sl { width: 40px; text-align: center; font-weight: bold; }
          .adm { width: 80px; font-family: monospace; }
          .cls { width: 180px; font-size: 9px; }

          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="watermark">${o}</div>
        <div class="header">
          <div class="college">${h(a)}</div>
          <div class="title">College Union Election — ${o}</div>
        </div>
        <div class="meta">
          <div>Sorted by: ${r===`class`?`Class`:`Serial Number`}</div>
          <div>Printed on: ${s}</div>
          <div>Total Students: ${i.length}</div>
        </div>
        <table>
          <thead><tr>
            <th class="sl">Sl. No</th>
            <th class="adm">Adm. No</th>
            <th>Name</th>
            <th class="cls">Class</th>
          </tr></thead>
          <tbody>
            ${i.map(e=>`
              <tr>
                <td class="sl">${h(e[`Nominal Roll Serial Number`])}</td>
                <td class="adm">${h(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                <td style="font-weight:bold">${h(e.NAME)}</td>
                <td class="cls">${h(e.CLASS)}</td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
        <div class="footer">
          <div>Returning Officer</div>
          <div>Principal</div>
        </div>
        <script>window.print();<\/script>
      </body>
    </html>
  `),c.document.close()}async function X(e){let t=I();if(t){L(e,`nominalRoll`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `);try{let[n,r]=await Promise.all([C.getNominalRoll(),C.getSettings()]);Ie(e.querySelector(`#adminMain`),t,n,r)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${h(t.message)}</div>`}}}function Ie(e,t,n,r){let i=r.nominalRollFinalized===`true`,a=[...n],o=``,s=[...new Set(n.map(e=>String(e.CLASS).trim()))].sort(),c=[...new Set(n.map(e=>String(e.Dept||`–`).trim()))].sort(),l=()=>{let n=a.filter(e=>[e.NAME,e.CLASS,e[`ADMISION NO`],e[`Nominal Roll Serial Number`]].some(e=>String(e||``).toLowerCase().includes(o.toLowerCase())));e.innerHTML=`
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Nominal Roll Management</h3>
            <p class="text-slate-400 text-sm">Manage student data and finalize the official voter list.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${i?``:`<button id="btnAddNew" class="btn btn-success">➕ Add Student</button>`}
            <div class="dropdown relative inline-block">
              <button class="btn btn-secondary dropdown-toggle">🖨️ Print Roll ▼</button>
              <div class="dropdown-menu absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl hidden z-50 overflow-hidden border border-white/10">
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintSerial">Sorted by Serial No</button>
                <button class="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10" id="btnPrintClass">Sorted by Class</button>
              </div>
            </div>
            ${i?``:`<button id="btnFinalize" class="btn btn-primary">🔒 Finalize & Lock Roll</button>`}
            ${i?`<span class="badge badge-valid py-2 px-4">✅ ROLL FINALIZED</span>`:``}
          </div>
        </div>

        <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field pl-10" placeholder="Search by name, class, adm. no, or serial..." value="${h(o)}">
          </div>
          <div class="text-slate-400 text-sm">Showing <strong>${n.length}</strong> of ${a.length} students</div>
        </div>

        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Sl. No</th>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Department</th>
                ${i?``:`<th>Actions</th>`}
              </tr></thead>
              <tbody>
                ${n.length?n.map(e=>`
                  <tr>
                    <td class="font-bold text-indigo-400">${h(e[`Nominal Roll Serial Number`])}</td>
                    <td class="font-mono text-xs">${h(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                    <td class="text-white font-medium">${h(e.NAME)}</td>
                    <td class="text-slate-300 text-sm">${h(e.CLASS)}</td>
                    <td class="text-slate-400 text-xs">${h(e.Dept||`–`)}</td>
                    ${i?``:`
                      <td>
                        <button class="text-rose-400 hover:text-rose-300 delete-student" data-serial="${e[`Nominal Roll Serial Number`]}">Delete</button>
                      </td>
                    `}
                  </tr>
                `).join(``):`<tr><td colspan="6" class="text-center py-10 text-slate-500">No students found matching your search.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add Student Modal -->
      <div id="addModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden flex items-center justify-center p-4">
        <div class="glass w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10">
          <h4 class="text-xl font-bold text-white mb-4">Add New Student</h4>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Serial Number (Draft)</label>
              <input type="text" id="addSerial" class="field" placeholder="e.g. 1001 or 1001a">
              <p class="text-[10px] text-slate-500 mt-1">Use suffixes like 'a' to insert between numbers.</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input type="text" id="addName" class="field" placeholder="Student Name">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Class Name</label>
              <select id="addClass" class="field">
                <option value="">-- Select Class --</option>
                ${s.map(e=>`<option value="${h(e)}">${h(e)}</option>`).join(``)}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Admission No</label>
              <input type="text" id="addAdm" class="field" placeholder="Adm No">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
              <select id="addDept" class="field">
                <option value="">-- Select Department --</option>
                ${c.map(e=>`<option value="${h(e)}">${h(e)}</option>`).join(``)}
              </select>
            </div>
          </div>
          <div class="flex gap-2 mt-8">
            <button id="btnCancelAdd" class="btn btn-secondary flex-1">Cancel</button>
            <button id="btnConfirmAdd" class="btn btn-primary flex-1">Save Student</button>
          </div>
        </div>
      </div>
    `;let r=e.querySelector(`.dropdown-toggle`),u=e.querySelector(`.dropdown-menu`);r&&(r.onclick=e=>{e.stopPropagation(),u.classList.toggle(`hidden`)}),window.onclick=()=>u?.classList.add(`hidden`),e.querySelector(`#searchInput`).oninput=t=>{o=t.target.value,l(),e.querySelector(`#searchInput`).focus();let n=e.querySelector(`#searchInput`).value;e.querySelector(`#searchInput`).value=``,e.querySelector(`#searchInput`).value=n},i||(e.querySelector(`#btnAddNew`).onclick=()=>e.querySelector(`#addModal`).classList.remove(`hidden`),e.querySelector(`#btnCancelAdd`).onclick=()=>e.querySelector(`#addModal`).classList.add(`hidden`),e.querySelector(`#btnConfirmAdd`).onclick=async n=>{let r={serial:e.querySelector(`#addSerial`).value,name:e.querySelector(`#addName`).value,class:e.querySelector(`#addClass`).value,admission:e.querySelector(`#addAdm`).value,dept:e.querySelector(`#addDept`).value};if(!r.serial||!r.name||!r.class)return _(`Please fill required fields.`,`warning`);g(n.target,!0,`Save Student`);try{await C.adminAddStudent(t,r),_(`Student added to roll.`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){_(e.message,`error`),g(n.target,!1,`Save Student`)}},e.querySelectorAll(`.delete-student`).forEach(n=>{n.onclick=async()=>{if(confirm(`Delete student #${n.dataset.serial}?`))try{await C.adminDeleteStudent(t,n.dataset.serial),_(`Student removed.`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){_(e.message,`error`)}}}),e.querySelector(`#btnFinalize`).onclick=async n=>{if(confirm(`FINALIZATION WARNING:

1. All students will be sorted by Class and Name.
2. NEW Serial Numbers will be generated sequentially (1, 2, 3...).
3. The roll will be LOCKED for all future edits.

Are you absolutely sure?`)){g(n.target,!0,`Finalizing...`);try{await C.adminFinalizeRoll(t),_(`Nominal Roll Finalized Successfully!`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){_(e.message,`error`),g(n.target,!1,`Finalize & Lock Roll`)}}}),e.querySelector(`#btnPrintSerial`).onclick=()=>Z(a,i,`serial`),e.querySelector(`#btnPrintClass`).onclick=()=>Z(a,i,`class`)};l()}function Z(e,t,r){let i=[...e];r===`class`?i.sort((e,t)=>{let n=String(e.CLASS).toUpperCase(),r=String(t.CLASS).toUpperCase();return n===r?String(e.NAME).toUpperCase().localeCompare(String(t.NAME).toUpperCase()):n.localeCompare(r)}):i.sort((e,t)=>Number(e[`Nominal Roll Serial Number`])-Number(t[`Nominal Roll Serial Number`]));let a=n.COLLEGE_NAME||`GOVERNMENT VICTORIA COLLEGE, PALAKKAD`,o=t?`FINAL NOMINAL ROLL`:`DRAFT NOMINAL ROLL`,s=new Date().toLocaleString(),c=window.open(``,`_blank`);c.document.write(`
    <html>
      <head>
        <title>${o}</title>
        <style>
          @page { margin: 15mm; }
          body { font-family: sans-serif; color: #000; line-height: 1.4; font-size: 11px; margin: 0; padding: 0; }
          .watermark { 
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px; color: rgba(0,0,0,0.05); font-weight: bold; pointer-events: none; z-index: -1;
            white-space: nowrap; text-transform: uppercase;
          }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .college { font-size: 18px; font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 5px; }
          .meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 10px; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; }
          th { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .sl { width: 40px; text-align: center; font-weight: bold; }
          .adm { width: 80px; font-family: monospace; }
          .cls { width: 180px; font-size: 9px; }

          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-weight: bold; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        <div class="watermark">${o}</div>
        <div class="header">
          <div class="college">${h(a)}</div>
          <div class="title">College Union Election — ${o}</div>
        </div>
        <div class="meta">
          <div>Sorted by: ${r===`class`?`Class`:`Serial Number`}</div>
          <div>Printed on: ${s}</div>
          <div>Total Students: ${i.length}</div>
        </div>
        <table>
          <thead><tr>
            <th class="sl">Sl. No</th>
            <th class="adm">Adm. No</th>
            <th>Name</th>
            <th class="cls">Class</th>
          </tr></thead>
          <tbody>
            ${i.map(e=>`
              <tr>
                <td class="sl">${h(e[`Nominal Roll Serial Number`])}</td>
                <td class="adm">${h(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                <td style="font-weight:bold">${h(e.NAME)}</td>
                <td class="cls">${h(e.CLASS)}</td>
              </tr>
            `).join(``)}
          </tbody>
        </table>
        <div class="footer">
          <div>Returning Officer</div>
          <div>Principal</div>
        </div>
        <script>window.print();<\/script>
      </body>
    </html>
  `),c.document.close()}var Q=document.getElementById(`app`);document.body.insertAdjacentHTML(`afterbegin`,`
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
  `),document.getElementById(`app`).style.marginTop=`48px`);var $=e=>t=>{Q.innerHTML=``,e(Q,t)};o.on(`/`,$(v)).on(`/submit`,$(D)).on(`/find`,$(ne)).on(`/valid-list`,$(ae)).on(`/final-list`,$(ce)).on(`/withdraw`,$(de)).on(`/results`,$(q)).on(`/nominal-roll`,$(Pe)).on(`/admin`,$(F)).on(`/admin/dashboard`,$(_e)).on(`/admin/verify`,$(ve)).on(`/admin/withdrawals`,$(be)).on(`/admin/publish`,$(Se)).on(`/admin/posts`,$(Ce)).on(`/admin/booths`,$(Ee)).on(`/admin/counting`,$(Oe)).on(`/admin/results-entry`,$(je)).on(`/admin/nominal-roll`,$(X)).on(`/admin/testing`,$(Ne)).setDefault(`/`),document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-nav]`);t&&(e.preventDefault(),o.navigate(t.dataset.nav))}),o.start();