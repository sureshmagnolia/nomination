var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var n=t({router:()=>a}),r={},i=`/`,a={on(e,t){return r[e]=t,this},setDefault(e){return i=e,this},navigate(e,t={}){window.history.pushState({path:e,params:t},``,`#${e}`),this._resolve(e,t)},start(){window.addEventListener(`popstate`,e=>{let{path:t,params:n}=e.state||{path:i,params:{}};this._resolve(t,n)});let e=window.location.hash.replace(`#`,``)||i;this._resolve(e,{})},_resolve(e,t){let n=r[e]||r[i];n&&n(t)}};function o(e){e.innerHTML=`
  <div class="page-enter min-h-screen flex flex-col">
    <!-- Header -->
    <header class="no-print relative z-10 border-b border-white/10 glass">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">G</div>
          <div>
            <div class="font-bold text-white text-sm leading-tight">Government Victoria College</div>
            <div class="text-xs text-slate-400">Palakkad · College Union Election</div>
          </div>
        </div>
        <button id="adminBtn" class="btn btn-secondary text-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Admin Login
        </button>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 uppercase tracking-widest">
        ✦ 2025 College Union Elections
      </div>
      <h1 class="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
        Election <span class="gradient-text">Portal</span>
      </h1>
      <p class="text-slate-400 text-lg max-w-xl mb-12">
        Submit your nomination, track its status, and participate in the democratic process of your college union.
      </p>

      <!-- Action cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        ${s(`submit`,`📝`,`Submit Nomination`,`Fill and submit your nomination form with proposer and seconder details.`,`btn-primary`)}
        ${s(`find`,`🔍`,`Find My Nomination`,`Retrieve a submitted nomination using your 10-digit unique ID.`,`btn-secondary`)}
        ${s(`valid-list`,`📋`,`Valid Nominations`,`View the officially published list of valid nominations.`,`btn-secondary`)}
        ${s(`withdraw`,`↩️`,`Withdraw Nomination`,`Submit a withdrawal request for a valid nomination.`,`btn-secondary`)}
        ${s(`final-list`,`🏁`,`Final List`,`View the final list of candidates after withdrawals.`,`btn-secondary`)}
      </div>
    </section>

    <footer class="no-print relative z-10 text-center py-4 text-slate-600 text-xs border-t border-white/5">
      Government Victoria College Palakkad · College Union Election Management System
    </footer>
  </div>`,e.querySelectorAll(`[data-nav]`).forEach(e=>{e.addEventListener(`click`,()=>a.navigate(e.dataset.nav))}),e.querySelector(`#adminBtn`).addEventListener(`click`,()=>a.navigate(`/admin`))}function s(e,t,n,r,i){return`
  <div class="glass rounded-2xl p-6 flex flex-col items-start gap-4 hover:border-white/20 transition-all cursor-pointer group" data-nav="/${e}">
    <div class="text-3xl">${t}</div>
    <div>
      <h3 class="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors">${n}</h3>
      <p class="text-slate-400 text-sm mt-1">${r}</p>
    </div>
    <button class="btn ${i} btn-sm mt-auto w-full" data-nav="/${e}">${n} →</button>
  </div>`}var c={APPS_SCRIPT_URL:`https://script.google.com/macros/s/AKfycbw29XuhvNI4cV-tlAWz5IaRrWPY1T9P7ZiQJbu-7za9226PyEqlhuLOrOMTG2QulzzOog/exec`,ELECTION_DATE:`2026-10-12`,COLLEGE_NAME:`Government Victoria College, Palakkad`,DEFAULT_POSTS:[{post:`The Chairman`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Vice Chairman`,femaleOnly:!0,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Secretary`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Joint Secretary`,femaleOnly:!0,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Chief Student Editor`,femaleOnly:!1,finalYearIneligible:!0,yearRestriction:``,deptRestriction:!1},{post:`The Secretary Fine Arts`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The General Captain For Sports And Games`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The University Union Councillor`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`I UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`1`,deptRestriction:!1},{post:`II UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`2`,deptRestriction:!1},{post:`III UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`3`,deptRestriction:!1},{post:`PG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`PG`,deptRestriction:!1},{post:`Association Secretary Botany`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Chemistry`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Commerce`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Computer Science`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Economics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary English`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Hindi`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary History`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Malayalam`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Mathematics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Physics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Psychology`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Sanskrit`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Tamil`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Zoology`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0}]},l=c.APPS_SCRIPT_URL;async function u(e){let t=new URL(l);Object.entries(e).forEach(([e,n])=>t.searchParams.append(e,n));let n=await fetch(t.toString());if(!n.ok)throw Error(`Network error: ${n.status}`);let r=await n.json();if(r.error)throw Error(r.error);return r}async function d(e){let t=await fetch(l,{method:`POST`,headers:{"Content-Type":`text/plain;charset=utf-8`},body:JSON.stringify(e)});if(!t.ok)throw Error(`Network error: ${t.status}`);let n=await t.json();if(n.error)throw Error(n.error);return n}var f={getNominalRoll:()=>u({action:`getNominalRoll`}),getPosts:()=>u({action:`getPosts`}),getNomination:e=>u({action:`getNomination`,id:e}),getValidNominations:()=>u({action:`getValidNominations`}),getFinalNominations:()=>u({action:`getFinalNominations`}),submitNomination:e=>d({action:`submitNomination`,...e}),submitWithdrawal:e=>d({action:`submitWithdrawal`,id:e}),adminLogin:e=>d({action:`adminLogin`,password:e}),adminGetNominations:e=>u({action:`adminGetNominations`,password:e}),adminVerifyNomination:(e,t,n)=>d({action:`adminVerifyNomination`,password:e,id:t,status:n}),adminApproveWithdrawal:(e,t)=>d({action:`adminApproveWithdrawal`,password:e,id:t}),adminPublishValidList:e=>d({action:`adminPublishValidList`,password:e}),adminPublishFinalList:e=>d({action:`adminPublishFinalList`,password:e}),adminGetSettings:e=>u({action:`adminGetSettings`,password:e}),adminGetPosts:e=>u({action:`adminGetPosts`,password:e}),adminAddPost:(e,t)=>d({action:`adminAddPost`,password:e,...t}),adminUpdatePost:(e,t)=>d({action:`adminUpdatePost`,password:e,...t}),adminDeletePost:(e,t)=>d({action:`adminDeletePost`,password:e,postName:t}),adminReorderPosts:(e,t)=>d({action:`adminReorderPosts`,password:e,posts:t})};function ee(e,t=c.ELECTION_DATE){if(!e)return`N/A`;let n=new Date(t),r=new Date(e),i=n.getFullYear()-r.getFullYear(),a=n.getMonth()-r.getMonth(),o=n.getDate()-r.getDate();return o<0&&(a--,o+=new Date(n.getFullYear(),n.getMonth(),0).getDate()),a<0&&(i--,a+=12),`${i} Years, ${a} Months, ${o} Days`}function p(e,t,n,r=null,i=[]){if(!e)return[];let a=[],o=String(e.CLASS||``).toUpperCase(),s=String(e.Dept||``).toUpperCase(),c=i.find(e=>e.post===t)||{};if(c.deptRestriction){let r=`Association Secretary `,i=t.startsWith(r)?t.replace(r,``).toUpperCase():null;i&&s!==i&&a.push(`${n} for "${t}" must be from the ${i} dept (current: ${e.Dept||`N/A`}).`)}let l=String(c.yearRestriction||``);return l===`1`&&!o.includes(`1ST YEAR`)&&a.push(`${n} must be a 1st Year student for this post.`),l===`2`&&!o.includes(`2ND YEAR`)&&a.push(`${n} must be a 2nd Year student for this post.`),l===`3`&&!o.includes(`3RD YEAR`)&&a.push(`${n} must be a 3rd Year student for this post.`),l===`PG`&&(o.includes(`MA`)||o.includes(`MSC`)||o.includes(`MCOM`)||o.includes(`M.SC`)||o.includes(`M.COM`)||o.includes(`M.A`)||a.push(`${n} for PG Representative must be a PG student (MA/MSc/MCom).`)),n===`Candidate`&&r&&(c.femaleOnly&&r===`Male`&&a.push(`The post of "${t}" is reserved for female candidates only.`),c.finalYearIneligible&&(o.includes(`3RD YEAR`)||o.includes(`2ND YEAR M`))&&a.push(`Final year students are not eligible for "${t}".`)),a}function m(){let e=Math.floor(Math.random()*10)+1,t=Math.floor(Math.random()*10)+1;return{question:`${e} + ${t}`,answer:String(e+t)}}function h(){return new Date().toLocaleDateString(`en-GB`)}function g(e,t,n){let r=[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`];for(let t=1;t<=31;t++)e.innerHTML+=`<option value="${t}">${t}</option>`;r.forEach((e,n)=>t.innerHTML+=`<option value="${n+1}">${e}</option>`);for(let e=2015;e>=1950;e--)n.innerHTML+=`<option value="${e}">${e}</option>`}function _(e,t,n){return`${n}-${String(t).padStart(2,`0`)}-${String(e).padStart(2,`0`)}`}function v(e,t,n){return`${String(e).padStart(2,`0`)}/${String(t).padStart(2,`0`)}/${n}`}function y(){window.print()}function b(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function x(e,t,n){t?(e.disabled=!0,e.innerHTML=`<span class="spinner"></span> Please wait...`):(e.disabled=!1,e.innerHTML=n)}function S(e,t=`info`){let n={info:`#6366f1`,success:`#10b981`,error:`#ef4444`,warning:`#f59e0b`},r=document.createElement(`div`);r.style.cssText=`position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:0.75rem 1.25rem;border-radius:0.5rem;color:white;font-size:0.875rem;font-weight:500;background:${n[t]||n.info};box-shadow:0 10px 40px rgba(0,0,0,0.4);max-width:320px;transition:opacity 0.4s;`,r.textContent=e,document.body.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,setTimeout(()=>r.remove(),400)},3500)}var C=[],w=[],T=``;async function E(e){e.innerHTML=re(`Submit Nomination`,`
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>a.navigate(`/`));try{let[t,n]=await Promise.all([f.getNominalRoll(),f.getPosts().catch(()=>null)]);if(C=Array.isArray(t)?t:[],C.length===0)throw Error(`Nominal roll is empty. Please contact the admin.`);w=Array.isArray(n)&&n.length>0?n:c.DEFAULT_POSTS,te(e)}catch(t){e.querySelector(`#loadingState`).innerHTML=`
      <div class="alert alert-error">${b(t.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`,e.querySelector(`#backBtn`).addEventListener(`click`,()=>a.navigate(`/`))}}function te(e){let t=m();T=t.answer,e.querySelector(`#loadingState`).classList.add(`hidden`);let n=e.querySelector(`#formArea`);n.classList.remove(`hidden`),n.innerHTML=`
    <div id="warningBox" class="hidden alert alert-warning mb-4"></div>

    <form id="nomForm" class="space-y-8">
      <!-- Post -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-1">Post Applied For</label>
        <select id="postSelect" class="field">${w.map(e=>`<option value="${b(e.post)}">${b(e.post)}</option>`).join(``)}</select>
      </div>

      <!-- Three columns: Candidate / Proposer / Seconder -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${D(`candidate`,`Candidate`,!0)}
        ${D(`proposer`,`Proposer`,!1)}
        ${D(`seconder`,`Seconder`,!1)}
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
  `,g(n.querySelector(`#dob-day`),n.querySelector(`#dob-month`),n.querySelector(`#dob-year`)),[`candidate`,`proposer`,`seconder`].forEach(e=>{n.querySelector(`#serial-${e}`).addEventListener(`change`,()=>O(n,e))}),n.querySelector(`#postSelect`).addEventListener(`change`,()=>k(n)),n.querySelectorAll(`[name="gender"]`).forEach(e=>e.addEventListener(`change`,()=>k(n))),n.querySelectorAll(`.dob-sel`).forEach(e=>e.addEventListener(`change`,()=>k(n))),n.querySelector(`#refreshCaptcha`).addEventListener(`click`,()=>{let e=m();T=e.answer,n.querySelector(`#captchaInput`).value=``,n.querySelector(`#captchaQuestion`).textContent=e.question}),n.querySelector(`#backHomeBtn`).addEventListener(`click`,()=>a.navigate(`/`)),n.querySelector(`#nomForm`).addEventListener(`submit`,e=>A(e,n))}function D(e,t,n){return`
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
  </div>`}function O(e,t){let n=e.querySelector(`#serial-${t}`).value.trim(),r=e.querySelector(`#details-${t}`),i=C.find(e=>String(e[`Nominal Roll Serial Number`])===n);if(!i){r.innerHTML=n?`<span class="text-red-400">⚠ Student not found</span>`:``;return}r.innerHTML=`
    <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${b(i.NAME)}</strong></p>
    <p><span class="text-slate-500">Class:</span> ${b(i.CLASS)}</p>
    <p><span class="text-slate-500">Dept:</span> ${b(i.Dept||`N/A`)}</p>`,k(e)}function k(e){let t=[],n=e.querySelector(`#postSelect`).value,r=e.querySelector(`[name="gender"]:checked`)?.value||null,i=[`candidate`,`proposer`,`seconder`].map(t=>e.querySelector(`#serial-${t}`).value.trim()),a=i.map(e=>e?C.find(t=>String(t[`Nominal Roll Serial Number`])===e):null),[o,s,c]=i;o&&o===s&&t.push(`Candidate and Proposer cannot be the same person.`),o&&o===c&&t.push(`Candidate and Seconder cannot be the same person.`),s&&s===c&&t.push(`Proposer and Seconder cannot be the same person.`);let l=[`Candidate`,`Proposer`,`Seconder`];a.forEach((e,i)=>{e&&t.push(...p(e,n,l[i],i===0?r:null,w))});let u=e.querySelector(`#warningBox`);return t.length?(u.innerHTML=`<strong class="block mb-1">⚠ Eligibility Warnings</strong>`+t.map(e=>`<p class="text-sm">• ${b(e)}</p>`).join(``),u.classList.remove(`hidden`)):u.classList.add(`hidden`),t}async function A(e,t){if(e.preventDefault(),k(t).length){S(`Please resolve all eligibility warnings first.`,`error`);return}if(t.querySelector(`#captchaInput`).value.trim()!==T){S(`Captcha answer is incorrect.`,`error`);return}let n=t.querySelector(`#postSelect`).value,r=t.querySelector(`[name="gender"]:checked`)?.value,i=t.querySelector(`#dob-day`).value,a=t.querySelector(`#dob-month`).value,o=t.querySelector(`#dob-year`).value;if(!r){S(`Please select a gender for the candidate.`,`error`);return}if(!i||!a||!o){S(`Please enter a complete date of birth.`,`error`);return}let s=[`candidate`,`proposer`,`seconder`].map(e=>t.querySelector(`#serial-${e}`).value.trim()),c=s.map(e=>C.find(t=>String(t[`Nominal Roll Serial Number`])===e));if(c.some(e=>!e)){S(`One or more serial numbers are invalid.`,`error`);return}let l=t.querySelector(`#submitBtn`);x(l,!0,`Generate &amp; Preview Nomination`);try{let e=await f.submitNomination({post:n,gender:r,dob:_(i,a,o),candidateSerial:s[0],proposerSerial:s[1],seconderSerial:s[2]});ne(t,e.id,{post:n,gender:r,day:i,month:a,year:o,students:c}),S(`Nomination submitted! ID: ${e.id}`,`success`)}catch(e){S(`Submission failed: ${e.message}`,`error`)}finally{x(l,!1,`Generate &amp; Preview Nomination`)}}function ne(e,t,{post:n,gender:r,day:i,month:a,year:o,students:s}){let[c,l,u]=s,d=_(i,a,o),f=v(i,a,o),p=ee(d),m=e.querySelector(`#previewSection`);e.querySelector(`#printZone`).innerHTML=j(t,n,r,f,p,c,l,u),m.classList.remove(`hidden`),m.scrollIntoView({behavior:`smooth`}),m.querySelector(`#printBtn`).addEventListener(`click`,y),m.querySelector(`#newNomBtn`).addEventListener(`click`,()=>E(e.closest(`#app`)))}function j(e,t,n,r,i,a,o,s,l=``){let u=h();return`
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4">
    <div class="flex justify-between items-start text-sm">
      <div>
        <p class="font-bold text-white text-base">${c.COLLEGE_NAME}</p>
        <p class="text-slate-400">College Union Election</p>
      </div>
      <div class="text-right">
        <p class="text-slate-400 text-xs">Generated: ${u}</p>
        ${l?`<span class="badge badge-${l.toLowerCase()}">${b(l)}</span>`:``}
      </div>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">NOMINATION PAPER</h2>
    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-center">
      <p class="text-xs text-indigo-300 uppercase tracking-widest mb-1">Your Unique Nomination ID</p>
      <p class="text-3xl font-mono font-bold text-indigo-300 tracking-widest">${b(e)}</p>
      <p class="text-xs text-slate-500 mt-1">Keep this number safe — you will need it for future reference.</p>
    </div>
    <p class="text-sm"><span class="font-semibold text-slate-400 w-40 inline-block">Post Applied For:</span> <strong class="text-white">${b(t)}</strong></p>
    <div class="space-y-3">
      ${M(`Candidate`,a,n,r,i)}
      ${M(`Proposer`,o)}
      ${M(`Seconder`,s)}
    </div>
    <div class="border-t border-white/10 pt-6 text-center space-y-3">
      <h3 class="font-bold text-white">Consent of Candidate</h3>
      <p class="text-sm text-slate-400">I agree, if elected, to serve on the body to which I am proposed as a candidate.</p>
      <div class="flex justify-around mt-6 text-sm text-slate-400">
        <p>Signature: _______________________</p>
        <p>Date: ______ / ______ / ________</p>
      </div>
      <p class="text-xs text-slate-500 italic">(To be signed in front of the Returning Officer)</p>
    </div>
  </div>`}function M(e,t,n=null,r=null,i=null){return t?`
  <div class="glass rounded-lg p-4 text-sm space-y-1">
    <h3 class="font-bold text-white uppercase text-xs tracking-widest mb-2 border-b border-white/10 pb-1">${e} Details</h3>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
      <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${b(t.NAME)}</strong></p>
      <p><span class="text-slate-500">Class:</span> ${b(t.CLASS)}</p>
      <p><span class="text-slate-500">Dept:</span> ${b(t.Dept||`N/A`)}</p>
      <p><span class="text-slate-500">Electoral Roll No:</span> ${b(t[`Nominal Roll Serial Number`])}</p>
      ${n?`<p><span class="text-slate-500">Gender:</span> ${b(n)}</p>`:``}
      ${r?`<p><span class="text-slate-500">Date of Birth:</span> ${b(r)}</p>`:``}
      ${i?`<p class="col-span-2"><span class="text-slate-500">Age as on Election Date:</span> ${b(i)}</p>`:``}
    </div>
    ${e===`Candidate`?``:`
    <div class="flex justify-between mt-4 text-slate-500 text-xs">
      <span>Date: ______ / ______ / ________</span>
      <span>Signature: _______________</span>
    </div>`}
  </div>`:``}function re(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm flex items-center gap-2">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${b(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function ie(e){e.innerHTML=oe(`Find My Nomination`,`
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
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>a.navigate(`/`));let t=e.querySelector(`#searchBtn`);t.addEventListener(`click`,async()=>{let n=e.querySelector(`#searchId`).value.trim();if(n.length!==10||!/^\d+$/.test(n)){S(`Please enter a valid 10-digit numeric ID.`,`error`);return}x(t,!0,`🔍 Find Nomination`);try{let t=await f.getNomination(n);ae(e.querySelector(`#resultArea`),t,n)}catch(t){e.querySelector(`#resultArea`).innerHTML=`<div class="alert alert-error mt-4">❌ ${b(t.message)}</div>`}finally{x(t,!1,`🔍 Find Nomination`)}})}function ae(e,t,n){e.innerHTML=`
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found! Status: <strong>${b(t.status)}</strong></div>
      <div id="printZone" class="print-zone">
        ${j(n,t.post,t.gender,t.dob,t.age,t.candidate,t.proposer,t.seconder,t.status)}
      </div>
      <div class="flex gap-3 no-print">
        <button id="printBtn" class="btn btn-success flex-1">🖨️ Print</button>
      </div>
    </div>`,e.querySelector(`#printBtn`).addEventListener(`click`,y)}function oe(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${b(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function N(e){e.innerHTML=F(`Valid Nominations List`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading list...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>a.navigate(`/`));try{let t=await f.getValidNominations();P(e.querySelector(`main`),t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center">${b(t.message)}</div>`}}function P(e,t){if(!t||t.length===0){e.innerHTML=`<div class="alert alert-info text-center">The valid nominations list has not been published yet. Please check back later.</div>`;return}let n={};t.forEach(e=>{n[e.post]||(n[e.post]=[]),n[e.post].push(e)}),e.innerHTML=`
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">✅ Valid Nominations</h2>
      <p class="text-slate-400 text-sm mt-1">Official list of candidates with valid nominations.</p>
    </div>
    ${Object.entries(n).map(([e,t])=>`
      <div class="glass rounded-xl mb-6 overflow-hidden">
        <div class="px-5 py-3 bg-indigo-500/10 border-b border-white/10">
          <h3 class="font-bold text-indigo-300 text-sm uppercase tracking-wide">${b(e)}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>Nomination ID</th><th>Name</th><th>Class</th><th>Dept</th>
            </tr></thead>
            <tbody>
              ${t.map((e,t)=>`<tr>
                <td class="text-slate-500">${t+1}</td>
                <td class="font-mono text-indigo-300 text-xs">${b(e.id)}</td>
                <td class="font-semibold">${b(e.candidateName)}</td>
                <td>${b(e.candidateClass)}</td>
                <td>${b(e.candidateDept)}</td>
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
        <h1 class="font-bold text-white text-sm">${b(e)}</h1>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function I(e){e.innerHTML=R(`Final Nominations List`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading final list...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>a.navigate(`/`));try{let t=await f.getFinalNominations();L(e.querySelector(`main`),t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center">${b(t.message)}</div>`}}function L(e,{active:t=[],withdrawn:n=[]}={}){if(!t.length&&!n.length){e.innerHTML=`<div class="alert alert-info text-center">The final nominations list has not been published yet. Please check back later.</div>`;return}let r={};t.forEach(e=>{r[e.post]||(r[e.post]=[]),r[e.post].push(e)}),e.innerHTML=`
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">🏁 Final Nominations</h2>
      <p class="text-slate-400 text-sm mt-1">Final list of candidates after processing withdrawals.</p>
    </div>

    <h3 class="text-lg font-bold text-emerald-400 mb-4">Active Candidates</h3>
    ${Object.keys(r).length?Object.entries(r).map(([e,t])=>`
      <div class="glass rounded-xl mb-6 overflow-hidden">
        <div class="px-5 py-3 bg-emerald-500/10 border-b border-white/10">
          <h4 class="font-bold text-emerald-300 text-sm uppercase tracking-wide">${b(e)}</h4>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>#</th><th>Nomination ID</th><th>Name</th><th>Class</th><th>Dept</th></tr></thead>
            <tbody>${t.map((e,t)=>`<tr>
              <td class="text-slate-500">${t+1}</td>
              <td class="font-mono text-indigo-300 text-xs">${b(e.id)}</td>
              <td class="font-semibold">${b(e.candidateName)}</td>
              <td>${b(e.candidateClass)}</td>
              <td>${b(e.candidateDept)}</td>
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
            <td class="font-mono text-slate-500 text-xs">${b(e.id)}</td>
            <td>${b(e.post)}</td>
            <td class="line-through text-slate-500">${b(e.candidateName)}</td>
            <td>${b(e.candidateClass)}</td>
            <td>${b(e.candidateDept)}</td>
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
        <h1 class="font-bold text-white text-sm">${b(e)}</h1>
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
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>a.navigate(`/`));let t=e.querySelector(`#fetchBtn`);t.addEventListener(`click`,async()=>{let n=e.querySelector(`#withdrawId`).value.trim();if(n.length!==10||!/^\d+$/.test(n)){S(`Please enter a valid 10-digit numeric ID.`,`error`);return}x(t,!0,`Fetch Nomination Details`);try{let t=await f.getNomination(n);B(e.querySelector(`#nominationDetails`),t,n)}catch(t){e.querySelector(`#nominationDetails`).innerHTML=`<div class="alert alert-error">❌ ${b(t.message)}</div>`}finally{x(t,!1,`Fetch Nomination Details`)}})}function B(e,t,n){if(t.status!==`Valid`){e.innerHTML=`<div class="alert alert-warning">⚠ This nomination has status <strong>${b(t.status)}</strong>. Only <strong>Valid</strong> nominations can be withdrawn.</div>`;return}if(t.withdrawalStatus===`Requested`||t.withdrawalStatus===`Approved`){e.innerHTML=`<div class="alert alert-info">ℹ A withdrawal has already been ${b(t.withdrawalStatus.toLowerCase())} for this nomination.</div>`;return}e.innerHTML=`
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found. Please review the details below before submitting your withdrawal.</div>
      <div class="glass rounded-xl p-5 text-sm space-y-2">
        <p><span class="text-slate-400 w-36 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300">${b(n)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Post:</span> <strong class="text-white">${b(t.post)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Candidate:</span> ${b(t.candidate?.NAME||t.candidateName||`N/A`)}</p>
        <p><span class="text-slate-400 w-36 inline-block">Class:</span> ${b(t.candidate?.CLASS||t.candidateClass||`N/A`)}</p>
        <p><span class="text-slate-400 w-36 inline-block">Dept:</span> ${b(t.candidate?.Dept||t.candidateDept||`N/A`)}</p>
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
    </div>`,e.querySelector(`#withdrawBtn`).addEventListener(`click`,async()=>{let r=e.querySelector(`#withdrawBtn`);x(r,!0,`Submit Withdrawal Request`);try{await f.submitWithdrawal(n),e.innerHTML=`
        <div class="alert alert-success">✅ Withdrawal request submitted successfully! The Returning Officer will review your request.</div>
        <div class="mt-4 no-print">
          <button id="printWithdrawal" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
        </div>
        <div class="print-zone mt-4">
          ${V(n,t)}
        </div>`,e.querySelector(`#printWithdrawal`).addEventListener(`click`,y),S(`Withdrawal request submitted!`,`success`)}catch(e){S(`Failed: ${e.message}`,`error`),x(r,!1,`Submit Withdrawal Request`)}}),e.querySelector(`#printFormBtn`).addEventListener(`click`,()=>{e.querySelector(`#printZone`).classList.remove(`hidden`),y()})}function V(e,t){let n=h(),r=t.candidate?.NAME||t.candidateName||`N/A`,i=t.candidate?.CLASS||t.candidateClass||`N/A`,a=t.candidate?.Dept||t.candidateDept||`N/A`;return`
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-5">
    <div class="flex justify-between text-sm">
      <div>
        <p class="font-bold text-white text-base">${b(c.COLLEGE_NAME)}</p>
        <p class="text-slate-400">College Union Election — Withdrawal Form</p>
      </div>
      <p class="text-slate-400 text-xs">Date: ${n}</p>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">WITHDRAWAL OF NOMINATION</h2>
    <div class="space-y-2 text-sm">
      <p><span class="text-slate-400 w-40 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300 text-lg">${b(e)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Post:</span> <strong class="text-white">${b(t.post)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Candidate Name:</span> ${b(r)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Class:</span> ${b(i)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Department:</span> ${b(a)}</p>
    </div>
    <p class="text-sm text-slate-300 border border-white/10 rounded-lg p-4">
      I, <strong>${b(r)}</strong>, hereby withdraw my nomination for the post of <strong>${b(t.post)}</strong> in the College Union Election.
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
        <h1 class="font-bold text-white text-sm">${b(e)}</h1>
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
      <div class="space-y-4 text-left">
        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-1">Admin Password</label>
          <input id="adminPassword" type="password" class="field" placeholder="Enter admin password" />
        </div>
        <button id="loginBtn" class="btn btn-primary w-full text-base py-3">Login to Admin Panel →</button>
      </div>
      <button id="backHome" class="text-slate-500 hover:text-slate-300 text-sm transition">← Back to Public Portal</button>
    </div>
  </div>`,e.querySelector(`#backHome`).addEventListener(`click`,()=>a.navigate(`/`));let t=e.querySelector(`#loginBtn`),n=e.querySelector(`#adminPassword`),r=e.querySelector(`#errorMsg`),i=async()=>{let e=n.value;if(!e){S(`Please enter the admin password.`,`error`);return}x(t,!0,`Login to Admin Panel →`),r.classList.add(`hidden`);try{await f.adminLogin(e),sessionStorage.setItem(`adminPwd`,e),S(`Logged in successfully!`,`success`),a.navigate(`/admin/dashboard`)}catch(e){r.textContent=`❌ ${e.message}`,r.classList.remove(`hidden`)}finally{x(t,!1,`Login to Admin Panel →`)}};t.addEventListener(`click`,i),n.addEventListener(`keydown`,e=>{e.key===`Enter`&&i()})}function W(){return sessionStorage.getItem(`adminPwd`)||(S(`Session expired. Please log in again.`,`warning`),a.navigate(`/admin`),null)}function G(e,t,n){e.innerHTML=`
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
  </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.adminNav;if(t===`public`){a.navigate(`/`);return}a.navigate(`/admin/${t}`)})}),e.querySelector(`#logoutBtn`).addEventListener(`click`,()=>{sessionStorage.removeItem(`adminPwd`),S(`Logged out.`,`info`),a.navigate(`/`)})}function K(e,t,n,r){return`
  <button data-admin-nav="${e}" class="sidebar-item ${r===e?`active`:``}">
    <span>${t}</span> ${n}
  </button>`}var se=`modulepreload`,ce=function(e){return`/nomination/`+e},q={},le=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=ce(t,n),t in q)return;q[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:se,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};async function ue(e){let t=W();if(t){G(e,`dashboard`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading dashboard...</p></div>
  `);try{let[r,i]=await Promise.all([f.adminGetNominations(t),f.adminGetSettings(t)]),a=r.length,o=r.filter(e=>e.status===`Pending`).length,s=r.filter(e=>e.status===`Valid`).length,c=r.filter(e=>e.status===`Rejected`).length,l=r.filter(e=>e.withdrawalStatus===`Requested`).length,u=e.querySelector(`#adminMain`);u.innerHTML=`
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
                ${r.slice(-10).reverse().map(e=>`<tr>
                  <td class="font-mono text-indigo-300 text-xs">${b(e.id)}</td>
                  <td class="text-xs">${b(e.post)}</td>
                  <td class="font-medium">${b(e.candidateName)}</td>
                  <td class="text-xs">${b(e.candidateDept)}</td>
                  <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${b(e.status)}</span></td>
                  <td class="text-xs text-slate-500">${b(e.withdrawalStatus||`None`)}</td>
                </tr>`).join(``)}
              </tbody>
            </table>
          </div>
        </div>
      </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{let{router:t}=window._appRouter||{};le(async()=>{let{router:e}=await Promise.resolve().then(()=>n);return{router:e}},void 0).then(({router:t})=>t.navigate(`/admin/${e.dataset.adminNav}`))})})}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${b(t.message)}</div>`}}}function J(e,t,n){return`
  <div class="glass rounded-xl p-5">
    <p class="text-xs text-slate-400 uppercase tracking-wide mb-2">${e}</p>
    <p class="text-3xl font-bold" style="color:${n}">${t}</p>
  </div>`}async function de(e){let t=W();if(t){G(e,`verify`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominations...</p></div>
  `);try{let n=await f.adminGetNominations(t);fe(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${b(t.message)}</div>`}}}function fe(e,t,n){e.innerHTML=`
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
      <tr id="row-${b(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${b(e.id)}</td>
        <td class="text-xs max-w-[140px] leading-snug">${b(e.post)}</td>
        <td class="font-medium">${b(e.candidateName||e.candidate?.NAME||`N/A`)}</td>
        <td class="text-xs text-slate-400">${b(e.candidateClass||``)} / ${b(e.candidateDept||``)}</td>
        <td class="text-xs">${b(e.proposerName||e.proposer?.NAME||`N/A`)}</td>
        <td class="text-xs">${b(e.seconderName||e.seconder?.NAME||`N/A`)}</td>
        <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${b(e.status)}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-success btn-sm verify-btn" data-id="${b(e.id)}" data-action="Valid"
              ${e.status===`Valid`?`disabled`:``}>✅ Valid</button>
            <button class="btn btn-danger btn-sm verify-btn" data-id="${b(e.id)}" data-action="Rejected"
              ${e.status===`Rejected`?`disabled`:``}>❌ Reject</button>
          </div>
        </td>
      </tr>`).join(``):`<tr><td colspan="8" class="text-center text-slate-500 py-8">No nominations match the filter.</td></tr>`};i(r),e.querySelector(`#statusFilter`).addEventListener(`change`,e=>{let t=e.target.value;i(t===`all`?r:r.filter(e=>e.status===t))}),e.querySelector(`#nomTableBody`).addEventListener(`click`,async t=>{let i=t.target.closest(`.verify-btn`);if(!i)return;let a=i.dataset.id,o=i.dataset.action;i.disabled=!0,i.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await f.adminVerifyNomination(n,a,o);let t=r.find(e=>e.id===a);t&&(t.status=o),S(`Nomination ${a} marked as ${o}.`,o===`Valid`?`success`:`error`);let i=e.querySelector(`#row-${a}`);i&&(i.querySelector(`.badge`).className=`badge badge-${o.toLowerCase()}`,i.querySelector(`.badge`).textContent=o,i.querySelectorAll(`.verify-btn`).forEach(e=>e.disabled=e.dataset.action===o))}catch(e){S(`Failed: ${e.message}`,`error`),i.disabled=!1,i.textContent=i.dataset.action===`Valid`?`✅ Valid`:`❌ Reject`}})}async function pe(e){let t=W();if(t){G(e,`withdrawals`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading withdrawal requests...</p></div>
  `);try{let n=(await f.adminGetNominations(t)).filter(e=>e.withdrawalStatus&&e.withdrawalStatus!==`None`);me(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${b(t.message)}</div>`}}}function me(e,t,n){e.innerHTML=`
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
              <tr id="wrow-${b(e.id)}">
                <td class="font-mono text-indigo-300 text-xs">${b(e.id)}</td>
                <td class="text-xs">${b(e.post)}</td>
                <td class="font-medium">${b(e.candidateName||`N/A`)}</td>
                <td class="text-xs text-slate-400">${b(e.candidateClass||``)} / ${b(e.candidateDept||``)}</td>
                <td>
                  <span class="badge ${e.withdrawalStatus===`Approved`?`badge-valid`:`badge-pending`}">
                    ${b(e.withdrawalStatus)}
                  </span>
                </td>
                <td>
                  <button class="btn btn-success btn-sm approve-btn" data-id="${b(e.id)}"
                    ${e.withdrawalStatus===`Approved`?`disabled`:``}>
                    ✅ Approve
                  </button>
                </td>
              </tr>`).join(``)}
            </tbody>
          </table>
        </div>
      </div>`}
    </div>`,e.addEventListener(`click`,async t=>{let r=t.target.closest(`.approve-btn`);if(!r)return;let i=r.dataset.id;r.disabled=!0,r.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await f.adminApproveWithdrawal(n,i),S(`Withdrawal for ${i} approved.`,`success`);let t=e.querySelector(`#wrow-${i}`);if(t){let e=t.querySelector(`.badge`);e.textContent=`Approved`,e.className=`badge badge-valid`,r.textContent=`✅ Approve`,r.disabled=!0}}catch(e){S(`Failed: ${e.message}`,`error`),r.disabled=!1,r.textContent=`✅ Approve`}})}async function he(e){let t=W();if(t){G(e,`publish`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading settings...</p></div>
  `);try{let n=await f.adminGetSettings(t);Y(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${b(t.message)}</div>`}}}function Y(e,t,n){let r=t.validListPublished===`true`,i=t.finalListPublished===`true`;e.innerHTML=`
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
    </div>`,e.querySelector(`#publishValidBtn`)?.addEventListener(`click`,async t=>{let r=t.currentTarget;if(confirm(`Are you sure you want to publish the valid nominations list? This will be visible to all students.`)){x(r,!0,`📢 Publish Valid Nominations List`);try{await f.adminPublishValidList(n),S(`Valid nominations list published successfully!`,`success`),Y(e,{validListPublished:`true`,finalListPublished:i?`true`:`false`},n)}catch(e){S(`Failed: ${e.message}`,`error`),x(r,!1,`📢 Publish Valid Nominations List`)}}}),e.querySelector(`#publishFinalBtn`)?.addEventListener(`click`,async t=>{let r=t.currentTarget;if(confirm(`Are you sure you want to publish the final nominations list?`)){x(r,!0,`📢 Publish Final Nominations List`);try{await f.adminPublishFinalList(n),S(`Final nominations list published successfully!`,`success`),Y(e,{validListPublished:`true`,finalListPublished:`true`},n)}catch(e){S(`Failed: ${e.message}`,`error`),x(r,!1,`📢 Publish Final Nominations List`)}}})}async function ge(e){let t=W();if(t){G(e,`posts`,`
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading posts...</p>
    </div>
  `);try{let n=await f.adminGetPosts(t).catch(()=>null);(!Array.isArray(n)||n.length===0)&&(n=c.DEFAULT_POSTS),X(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${b(t.message)}</div>`}}}function X(e,t,n){e.innerHTML=`
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
      <td class="font-medium text-white">${b(e.post)}</td>
      <td class="text-center">${e.femaleOnly?`✅`:`—`}</td>
      <td class="text-center">${e.finalYearIneligible?`✅`:`—`}</td>
      <td class="text-center">${e.deptRestriction?`✅`:`—`}</td>
      <td class="text-center text-slate-400 text-xs">${e.yearRestriction?e.yearRestriction===`PG`?`PG`:`${e.yearRestriction}rd/nd/st Year`:`—`}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm edit-post-btn" data-idx="${t}">✏️ Edit</button>
          <button class="btn btn-danger btn-sm delete-post-btn" data-idx="${t}" data-name="${b(e.post)}">🗑️</button>
        </div>
      </td>
    </tr>`).join(``):`<tr><td colspan="7" class="text-center text-slate-500 py-8">No posts configured.</td></tr>`,r.querySelectorAll(`.delete-post-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let r=t.dataset.name;if(confirm(`Delete post "${r}"? This cannot be undone.`)){t.disabled=!0;try{await f.adminDeletePost(n,r),S(`Post "${r}" deleted.`,`success`),Z(e,await f.adminGetPosts(n),n)}catch(e){S(`Failed: ${e.message}`,`error`),t.disabled=!1}}})});let i=e.querySelector(`#postFormWrap`);r.querySelectorAll(`.edit-post-btn`).forEach(n=>{n.addEventListener(`click`,()=>{let r=t[parseInt(n.dataset.idx)];e.querySelector(`#postFormTitle`).textContent=`Edit Post`,e.querySelector(`#pfPost`).value=r.post,e.querySelector(`#pfYear`).value=r.yearRestriction||``,e.querySelector(`#pfFemale`).checked=!!r.femaleOnly,e.querySelector(`#pfFinalYear`).checked=!!r.finalYearIneligible,e.querySelector(`#pfDept`).checked=!!r.deptRestriction,e.querySelector(`#pfOriginalName`).value=r.post,i.classList.remove(`hidden`),i.scrollIntoView({behavior:`smooth`})})})}function _e(e,t,n){let r=e.querySelector(`#postFormWrap`),i=e.querySelector(`#addPostBtn`),a=e.querySelector(`#cancelPostBtn`),o=e.querySelector(`#savePostBtn`);i.addEventListener(`click`,()=>{e.querySelector(`#postFormTitle`).textContent=`Add New Post`,e.querySelector(`#pfPost`).value=``,e.querySelector(`#pfYear`).value=``,e.querySelector(`#pfFemale`).checked=!1,e.querySelector(`#pfFinalYear`).checked=!1,e.querySelector(`#pfDept`).checked=!1,e.querySelector(`#pfOriginalName`).value=``,r.classList.remove(`hidden`),r.scrollIntoView({behavior:`smooth`})}),a.addEventListener(`click`,()=>r.classList.add(`hidden`)),o.addEventListener(`click`,async()=>{let t=e.querySelector(`#pfPost`).value.trim(),i=e.querySelector(`#pfYear`).value,a=e.querySelector(`#pfFemale`).checked,s=e.querySelector(`#pfFinalYear`).checked,c=e.querySelector(`#pfDept`).checked,l=e.querySelector(`#pfOriginalName`).value;if(!t){S(`Post name is required.`,`error`);return}let u={postName:t,yearRestriction:i,femaleOnly:a,finalYearIneligible:s,deptRestriction:c,originalName:l};x(o,!0,`💾 Save Post`);try{l?(await f.adminUpdatePost(n,u),S(`Post updated successfully!`,`success`)):(await f.adminAddPost(n,u),S(`Post added successfully!`,`success`)),r.classList.add(`hidden`),Z(e,await f.adminGetPosts(n),n)}catch(e){S(`Failed: ${e.message}`,`error`)}finally{x(o,!1,`💾 Save Post`)}})}var Q=document.getElementById(`app`);document.body.insertAdjacentHTML(`afterbegin`,`
  <div class="bg-blob bg-blob-1"></div>
  <div class="bg-blob bg-blob-2"></div>
  <div class="bg-blob bg-blob-3"></div>
`),CONFIG.APPS_SCRIPT_URL.includes(`YOUR_SCRIPT_ID`)&&(document.body.insertAdjacentHTML(`afterbegin`,`
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
  `),document.getElementById(`app`).style.marginTop=`48px`);var $=e=>t=>{Q.innerHTML=``,e(Q,t)};a.on(`/`,$(o)).on(`/submit`,$(E)).on(`/find`,$(ie)).on(`/valid-list`,$(N)).on(`/final-list`,$(I)).on(`/withdraw`,$(z)).on(`/admin`,$(U)).on(`/admin/dashboard`,$(ue)).on(`/admin/verify`,$(de)).on(`/admin/withdrawals`,$(pe)).on(`/admin/publish`,$(he)).on(`/admin/posts`,$(ge)).setDefault(`/`),document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-nav]`);t&&(e.preventDefault(),a.navigate(t.dataset.nav))}),a.start();