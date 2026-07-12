var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var n={APPS_SCRIPT_URL:`https://script.google.com/macros/s/AKfycbw29XuhvNI4cV-tlAWz5IaRrWPY1T9P7ZiQJbu-7za9226PyEqlhuLOrOMTG2QulzzOog/exec`,ELECTION_DATE:`2026-10-12`,COLLEGE_NAME:`Government Victoria College, Palakkad`,COLLEGE_SHORT_NAME:`GVC`,DEFAULT_POSTS:[{post:`The Chairman`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Vice Chairman`,femaleOnly:!0,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Secretary`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Joint Secretary`,femaleOnly:!0,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The Chief Student Editor`,femaleOnly:!1,finalYearIneligible:!0,yearRestriction:``,deptRestriction:!1},{post:`The Secretary Fine Arts`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The General Captain For Sports And Games`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`The University Union Councillor`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!1},{post:`I UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`1`,deptRestriction:!1},{post:`II UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`2`,deptRestriction:!1},{post:`III UG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`3`,deptRestriction:!1},{post:`PG Representative`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:`PG`,deptRestriction:!1},{post:`Association Secretary Botany`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Chemistry`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Commerce`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Computer Science`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Economics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary English`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Hindi`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary History`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Malayalam`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Mathematics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Physics`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Psychology`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Sanskrit`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Tamil`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0},{post:`Association Secretary Zoology`,femaleOnly:!1,finalYearIneligible:!1,yearRestriction:``,deptRestriction:!0}]},r=t({router:()=>o}),i={},a=`/`,o={on(e,t){return i[e]=t,this},setDefault(e){return a=e,this},navigate(e,t={}){window.history.pushState({path:e,params:t},``,`#${e}`),this._resolve(e,t)},start(){window.addEventListener(`popstate`,e=>{let{path:t,params:n}=e.state||{path:a,params:{}};this._resolve(t,n)});let e=window.location.hash.replace(`#`,``)||a;this._resolve(e,{})},_resolve(e,t){let n=i[e]||i[a];n&&n(t)}},s=n.APPS_SCRIPT_URL,c={},l=[],u=!1,d=null;function f(){return sessionStorage.getItem(`adminSessionToken`)||localStorage.getItem(`adminSessionToken`)}function p(){localStorage.removeItem(`adminPwd`),localStorage.removeItem(`adminLoginDate`),localStorage.removeItem(`adminSessionToken`),sessionStorage.removeItem(`adminSessionToken`),c={},alert(`⚠️ Another admin has logged in from a different device. You have been logged out.`),window.location.hash=`/admin`}function m(e){d=e}function h(e){d&&d(e)}function g(){window._unloadGuardAdded||(window._unloadGuardAdded=!0,window.addEventListener(`beforeunload`,e=>{if(l.length>0||u)return e.returnValue=`Changes are still saving. Are you sure you want to leave?`,e.returnValue}))}async function _(){if(!(u||l.length===0)){for(u=!0,g(),h(`saving`);l.length>0;){let e=l[0];try{let t=await fetch(s,{method:`POST`,headers:{"Content-Type":`text/plain;charset=utf-8`},body:JSON.stringify(e.body)});if(!t.ok)throw Error(`Network error: ${t.status}`);let n=await t.json();if(n.error===`SESSION_EXPIRED`){p(),l.length=0;break}if(n.error)throw Error(n.error);e.resolve&&e.resolve(n)}catch(t){console.error(`Background sync failed for`,e.body.action,t),e.reject&&e.reject(t)}l.shift()}u=!1,h(`saved`),setTimeout(()=>{!u&&l.length===0&&h(`idle`)},3e3)}}async function v(e){let t=f();t&&e.password&&(e={...e,sessionToken:t});let n=JSON.stringify(e);if(c[n]!==void 0)return c[n];let r=new URL(s);Object.entries(e).forEach(([e,t])=>r.searchParams.append(e,t)),r.searchParams.append(`_t`,Date.now());let i=await fetch(r.toString());if(!i.ok)throw Error(`Network error: ${i.status}`);let a=await i.json();if(a.error===`SESSION_EXPIRED`)throw p(),Error(`SESSION_EXPIRED`);if(a.error)throw Error(a.error);return c[n]=a,a}async function y(e){let t=f();t&&e.password&&(e={...e,sessionToken:t});let n=await fetch(s,{method:`POST`,headers:{"Content-Type":`text/plain;charset=utf-8`},body:JSON.stringify(e)});if(!n.ok)throw Error(`Network error: ${n.status}`);let r=await n.json();if(r.error===`SESSION_EXPIRED`)throw p(),Error(`SESSION_EXPIRED`);if(r.error)throw Error(r.error);return r}function b(e){let t=f();return t&&e.password&&(e={...e,sessionToken:t}),new Promise((t,n)=>{l.push({body:e,resolve:t,reject:n}),_()})}function x(e,t){let n=JSON.stringify(e);typeof t==`function`?c[n]!==void 0&&(c[n]=t(c[n])):c[n]=t}function S(e){Object.keys(c).forEach(t=>{t.includes(e)&&delete c[t]})}var C={invalidateCache:S,initPublicData:async()=>{let e=[C.getPublicSchedule().catch(()=>null),C.getSettings().catch(()=>null),C.getPosts().catch(()=>null),C.getResults().catch(()=>null),C.getNominalRoll().catch(()=>null),C.getPublicNominations().catch(()=>null),C.getValidNominations().catch(()=>null),C.getFinalNominations().catch(()=>null)];await Promise.all(e)},initAdminData:async e=>{let t=[C.adminGetNominations(e).catch(()=>null),C.adminGetSettings(e).catch(()=>null),C.adminGetPosts(e).catch(()=>null),C.adminGetBooths(e).catch(()=>null),C.adminGetLocations(e).catch(()=>null),C.adminGetBallotPlan(e).catch(()=>null),C.adminGetCountingMatrix(e).catch(()=>null)];await Promise.all(t)},getNominalRoll:()=>v({action:`getNominalRoll`}),getPosts:()=>v({action:`getPosts`}),getPublicNominations:()=>v({action:`getPublicNominations`}),getNomination:e=>v({action:`getNomination`,id:e}),getValidNominations:()=>v({action:`getValidNominations`}),getFinalNominations:()=>v({action:`getFinalNominations`}),submitNomination:e=>y({action:`submitNomination`,...e}),submitWithdrawal:e=>y({action:`submitWithdrawal`,id:e}),adminLogin:async e=>{let t=await fetch(s,{method:`POST`,headers:{"Content-Type":`text/plain;charset=utf-8`},body:JSON.stringify({action:`adminLogin`,password:e})});if(!t.ok)throw Error(`Network error: ${t.status}`);let n=await t.json();if(n.error)throw Error(n.error);return n.sessionToken&&sessionStorage.setItem(`adminSessionToken`,n.sessionToken),n},adminSendOTP:e=>y({action:`adminSendOTP`,password:e}),adminVerifyOTP:(e,t)=>y({action:`adminVerifyOTP`,password:e,otp:t}),adminGetNominations:e=>v({action:`adminGetNominations`,password:e}),adminVerifyNomination:(e,t,n)=>(x({action:`adminGetNominations`,password:e},e=>{let r=e.find(e=>e.id===t);return r&&(r.status=n),e}),b({action:`adminVerifyNomination`,password:e,id:t,status:n}),Promise.resolve({ok:!0})),adminApproveWithdrawal:(e,t)=>(x({action:`adminGetNominations`,password:e},e=>{let n=e.find(e=>e.id===t);return n&&(n.withdrawalStatus=`Approved`),e}),b({action:`adminApproveWithdrawal`,password:e,id:t}),Promise.resolve({ok:!0})),adminDirectWithdrawal:(e,t)=>(x({action:`adminGetNominations`,password:e},e=>{let n=e.find(e=>e.id===t);return n&&(n.withdrawalStatus=`Approved`),e}),b({action:`adminDirectWithdrawal`,password:e,id:t}),Promise.resolve({ok:!0})),adminPublishValidList:e=>(x({action:`adminGetSettings`,password:e},e=>({...e,validListPublished:`true`})),b({action:`adminPublishValidList`,password:e}),S(`getValidNominations`),Promise.resolve({ok:!0})),adminPublishFinalList:e=>(x({action:`adminGetSettings`,password:e},e=>({...e,finalListPublished:`true`})),b({action:`adminPublishFinalList`,password:e}),S(`getFinalNominations`),Promise.resolve({ok:!0})),adminUnpublishValidList:async e=>(x({action:`adminGetSettings`,password:e},e=>({...e,validListPublished:`false`,finalListPublished:`false`})),await b({action:`adminUnpublishValidList`,password:e}),S(`getValidNominations`),S(`getFinalNominations`),{ok:!0}),adminUnpublishFinalList:async e=>(x({action:`adminGetSettings`,password:e},e=>({...e,finalListPublished:`false`})),await b({action:`adminUnpublishFinalList`,password:e}),S(`getFinalNominations`),{ok:!0}),adminGetSettings:e=>v({action:`adminGetSettings`,password:e}),adminUpdateSettings:(e,t)=>(x({action:`adminGetSettings`,password:e},e=>({...e,...t})),b({action:`adminUpdateSettings`,password:e,...t}),Promise.resolve({ok:!0})),getPublicSettings:()=>v({action:`adminGetSettings`,password:`NONE`}),adminGetPosts:e=>v({action:`adminGetPosts`,password:e}),adminAddPost:async(e,t)=>(x({action:`adminGetPosts`,password:e},e=>[...e,t]),await b({action:`adminAddPost`,password:e,...t}),S(`getPosts`),{ok:!0}),adminUpdatePost:async(e,t)=>(x({action:`adminGetPosts`,password:e},e=>{let n=e.findIndex(e=>e.post===t.post);return n!==-1&&(e[n]=t),e}),await b({action:`adminUpdatePost`,password:e,...t}),S(`getPosts`),{ok:!0}),adminDeletePost:async(e,t)=>(x({action:`adminGetPosts`,password:e},e=>e.filter(e=>e.post!==t)),await b({action:`adminDeletePost`,password:e,postName:t}),S(`getPosts`),{ok:!0}),adminReorderPosts:async(e,t)=>(x({action:`adminGetPosts`,password:e},e=>{let n={};return e.forEach(e=>n[e.post]=e),t.map(e=>n[e]).filter(Boolean)}),await b({action:`adminReorderPosts`,password:e,posts:t}),S(`getPosts`),{ok:!0}),adminGetBooths:e=>v({action:`adminGetBooths`,password:e}),adminSaveBooths:(e,t)=>(x({action:`adminGetBooths`,password:e},t),b({action:`adminSaveBooths`,password:e,booths:t}),Promise.resolve({ok:!0})),adminGetLocations:e=>v({action:`adminGetLocations`,password:e}),adminSaveLocations:(e,t)=>(x({action:`adminGetLocations`,password:e},t),b({action:`adminSaveLocations`,password:e,locations:t}),Promise.resolve({ok:!0})),getResults:()=>v({action:`getResults`}),adminSaveResults:(e,t)=>(b({action:`adminSaveResults`,password:e,results:t}).then(()=>S(`getResults`)),Promise.resolve({ok:!0})),adminInjectTestData:e=>y({action:`adminInjectTestData`,password:e}),adminWipeData:e=>(c={},y({action:`adminWipeData`,password:e})),adminGetCountingMatrix:e=>v({action:`adminGetCountingMatrix`,password:e}),adminSaveCountingMatrix:(e,t)=>(x({action:`adminGetCountingMatrix`,password:e},t),b({action:`adminSaveCountingMatrix`,password:e,matrixData:t}),Promise.resolve({ok:!0})),adminGenerateBallotPlan:async e=>{let t=await b({action:`adminGenerateBallotPlan`,password:e});return x({action:`adminGetBallotPlan`,password:e},t.plan),t},adminGetBallotPlan:e=>v({action:`adminGetBallotPlan`,password:e}),adminRunAudit:e=>y({action:`adminRunAudit`,password:e}),getSettings:()=>v({action:`getSettings`}),adminAddStudent:async(e,t)=>(await b({action:`adminAddStudent`,password:e,...t}),S(`getNominalRoll`),{ok:!0}),adminDeleteStudent:async(e,t)=>(await b({action:`adminDeleteStudent`,password:e,serial:t}),S(`getNominalRoll`),{ok:!0}),adminFinalizeRoll:async e=>(await b({action:`adminFinalizeRoll`,password:e}),S(`getNominalRoll`),{ok:!0}),adminGetNominalRollTemplate:e=>v({action:`adminGetNominalRollTemplate`,password:e}),adminUploadNominalRoll:async(e,t)=>{let n=await y({action:`adminUploadNominalRoll`,password:e,...t});return S(`getNominalRoll`),S(`adminGetNominations`),S(`getSettings`),S(`adminGetSettings`),S(`getValidNominations`),S(`getFinalNominations`),S(`getPublicNominations`),n},getPublicSchedule:()=>v({action:`getPublicSchedule`}),adminSaveSchedule:(e,t)=>(x({action:`getPublicSchedule`},t),b({action:`adminSaveSchedule`,password:e,...t}),Promise.resolve({ok:!0}))};function ee(e,t=n.ELECTION_DATE){if(!e)return`N/A`;let r=new Date(t),i=new Date(e),a=r.getFullYear()-i.getFullYear(),o=r.getMonth()-i.getMonth(),s=r.getDate()-i.getDate();return s<0&&(o--,s+=new Date(r.getFullYear(),r.getMonth(),0).getDate()),o<0&&(a--,o+=12),`${a} Years, ${o} Months, ${s} Days`}function te(e,t,n,r=null,i=[],a=[]){if(!e)return[];let o=[],s=String(e.CLASS||``).toUpperCase(),c=String(e.Dept||``).toUpperCase(),l=String(e[`Nominal Roll Serial Number`]),u=i.find(e=>e.post===t)||{};if((n===`Proposer`||n===`Seconder`)&&a.some(e=>e.post===t&&e.status!==`Rejected`&&(String(e.proposerSerial)===l||String(e.seconderSerial)===l))&&o.push(`Student #${l} has already proposed or seconded a candidate for "${t}". They cannot endorse multiple candidates for the same post.`),u.deptRestriction){let r=`Association Secretary `,i=t.startsWith(r)?t.replace(r,``).toUpperCase():null;i&&c!==i&&o.push(`${n} for "${t}" must be from the ${i} dept (current: ${e.Dept||`N/A`}).`)}let d=String(u.yearRestriction||``);return d===`1`&&!s.includes(`1ST YEAR`)&&o.push(`${n} must be a 1st Year student for this post.`),d===`2`&&!s.includes(`2ND YEAR`)&&o.push(`${n} must be a 2nd Year student for this post.`),d===`3`&&!s.includes(`3RD YEAR`)&&o.push(`${n} must be a 3rd Year student for this post.`),d===`PG`&&(s.includes(`MA`)||s.includes(`MSC`)||s.includes(`MCOM`)||s.includes(`M.SC`)||s.includes(`M.COM`)||s.includes(`M.A`)||o.push(`${n} for PG Representative must be a PG student (MA/MSc/MCom).`)),n===`Candidate`&&r&&(u.femaleOnly&&r===`Male`&&o.push(`The post of "${t}" is reserved for female candidates only.`),u.finalYearIneligible&&(s.includes(`3RD YEAR`)||s.includes(`2ND YEAR M`))&&o.push(`Final year students are not eligible for "${t}".`)),o}function ne(){let e=Math.floor(Math.random()*10)+1,t=Math.floor(Math.random()*10)+1;return{question:`${e} + ${t}`,answer:String(e+t)}}function re(){return new Date().toLocaleDateString(`en-GB`)}function ie(e,t,n){let r=[`January`,`February`,`March`,`April`,`May`,`June`,`July`,`August`,`September`,`October`,`November`,`December`];for(let t=1;t<=31;t++)e.innerHTML+=`<option value="${t}">${t}</option>`;r.forEach((e,n)=>t.innerHTML+=`<option value="${n+1}">${e}</option>`);for(let e=2015;e>=1950;e--)n.innerHTML+=`<option value="${e}">${e}</option>`}function ae(e,t,n){return`${n}-${String(t).padStart(2,`0`)}-${String(e).padStart(2,`0`)}`}function oe(e,t,n){return`${String(e).padStart(2,`0`)}/${String(t).padStart(2,`0`)}/${n}`}function w(e,t=`Nomination Form`){let n=window.open(``,`_blank`);n.document.write(`
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
  `),n.document.close()}function T(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function E(e,t,n){t?(e.disabled=!0,e.innerHTML=`<span class="spinner"></span> Please wait...`):(e.disabled=!1,e.innerHTML=n)}function D(e,t=`info`){let n={info:`#6366f1`,success:`#10b981`,error:`#ef4444`,warning:`#f59e0b`},r=document.createElement(`div`);r.style.cssText=`position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;padding:0.75rem 1.25rem;border-radius:0.5rem;color:white;font-size:0.875rem;font-weight:500;background:${n[t]||n.info};box-shadow:0 10px 40px rgba(0,0,0,0.4);max-width:320px;transition:opacity 0.4s;`,r.textContent=e,document.body.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,setTimeout(()=>r.remove(),400)},3500)}async function se(e){e.innerHTML=`<div class="min-h-screen flex items-center justify-center"><span class="spinner"></span></div>`;let t=new Date().getFullYear(),n=`Government Victoria College, Palakkad`,r=`GVC`;try{let[e,i]=await Promise.all([C.getPublicSchedule(),C.getPublicSettings().catch(()=>({}))]);e.electionYear&&(t=e.electionYear),i.collegeName&&(n=i.collegeName),i.collegeShortName&&(r=i.collegeShortName)}catch{}e.innerHTML=`
    <div class="page-enter min-h-screen flex flex-col">
      <header class="glass sticky top-0 z-50 border-b border-white/10">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">${r.charAt(0)}</div>
            <h1 class="text-xl font-bold text-white tracking-tight">${T(r)} Election Portal ${t}</h1>
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
            <span class="gradient-text">Election Management ${t}</span>
          </h2>
          <p class="text-slate-400 text-lg max-w-2xl mx-auto">
            Welcome to the official election portal of ${T(n)}. 
            Submit your nominations, track status, and view the finalized candidate lists for the year ${t}.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${O(`/nominal-roll`,`📜`,`Nominal Roll`,`View the official voter list (Draft/Final).`)}
          ${O(`/submit`,`📝`,`Submit Nomination`,`New nomination form with eligibility check.`)}
          ${O(`/find`,`🔍`,`Find My Nomination`,`Retrieve and print your submitted nomination.`)}
          ${O(`/withdraw`,`↩️`,`Withdraw Nomination`,`Request withdrawal of your candidacy.`)}
          ${O(`/valid-list`,`✅`,`Valid Nominations`,`View the list of verified candidates.`)}
          ${O(`/final-list`,`🏆`,`Final Candidate List`,`View the final list post-withdrawals.`)}
          ${O(`/results`,`📊`,`Live Results`,`View live vote counting and election results.`)}
        </div>
      </main>

      <footer class="py-12 border-t border-white/5 text-center text-slate-500 text-sm">
        <p>&copy; Magnolia 🌸</p>
      </footer>
    </div>
  `}function O(e,t,n,r){return`
  <div data-nav="${e}" class="glass p-6 rounded-2xl hover:bg-white/5 transition group cursor-pointer border border-white/5 hover:border-indigo-500/30">
    <div class="text-3xl mb-4 transform group-hover:scale-110 transition duration-300">${t}</div>
    <h3 class="text-lg font-bold text-white mb-2 group-hover:text-indigo-300 transition">${T(n)}</h3>
    <p class="text-sm text-slate-400 leading-relaxed">${T(r)}</p>
    <div class="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition">
      Continue <span>→</span>
    </div>
  </div>`}var k=[],A=[],ce=[],j={},M=``;async function N(e){let t=new Date().getFullYear();try{let e=await C.getPublicSchedule();e.electionYear&&(t=e.electionYear)}catch{}e.innerHTML=me(`Submit Nomination`,`
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Loading data...</p>
    </div>
    <div id="formArea" class="hidden"></div>
  `,t),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let[r,i,a,o]=await Promise.all([C.getNominalRoll(),C.getPosts().catch(()=>null),C.getPublicNominations().catch(()=>[]),C.getPublicSchedule().catch(()=>({}))]);if(k=Array.isArray(r)?r:[],ce=Array.isArray(a)?a:[],j=o||{},k.length===0)throw Error(`Nominal roll is empty. Please contact the admin.`);A=Array.isArray(i)&&i.length>0?i:n.DEFAULT_POSTS,le(e,t)}catch(t){e.querySelector(`#loadingState`).innerHTML=`
      <div class="alert alert-error">${T(t.message)}</div>
      <button class="btn btn-secondary mt-4" id="backBtn">← Back to Home</button>`,e.querySelector(`#backBtn`).addEventListener(`click`,()=>o.navigate(`/`))}}function le(e,t){let n=ne();M=n.answer,e.querySelector(`#loadingState`).classList.add(`hidden`);let r=e.querySelector(`#formArea`);r.classList.remove(`hidden`);let i=new Date,a=j.nominationDeadline?new Date(j.nominationDeadline):null;if(!window.ADMIN_BYPASS_PWD&&a&&i>a){r.innerHTML=`
      <div class="glass p-12 text-center rounded-2xl border border-rose-500/20 max-w-2xl mx-auto page-enter">
        <div class="text-6xl mb-6">⏳</div>
        <h3 class="text-2xl font-bold text-white mb-3">Nomination Filing Ended</h3>
        <p class="text-slate-400 mb-6">The official deadline for filing nominations was <strong>${new Date(a).toLocaleString()}</strong>.</p>
        <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
      </div>
    `,r.querySelector(`#expiredBackBtn`).onclick=()=>o.navigate(`/`);return}r.innerHTML=`
    <div id="warningBox" class="hidden alert alert-warning mb-4"></div>

    <form id="nomForm" class="space-y-8">
      <!-- Post -->
      <div>
        <label class="block text-sm font-semibold text-slate-300 mb-1">Post Applied For</label>
        <select id="postSelect" class="field">${A.map(e=>`<option value="${T(e.post)}">${T(e.post)}</option>`).join(``)}</select>
      </div>

      <!-- Three columns: Candidate / Proposer / Seconder -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${P(`candidate`,`Candidate`,!0)}
        ${P(`proposer`,`Proposer`,!1)}
        ${P(`seconder`,`Seconder`,!1)}
      </div>

      <!-- Captcha -->
      <div class="glass rounded-xl p-5">
        <label class="block text-sm font-semibold text-slate-300 mb-2">🤖 Captcha Verification</label>
        <p class="text-slate-400 text-sm mb-3">What is <strong id="captchaQuestion" class="text-white text-base">${n.question}</strong>?</p>
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
  `,ie(r.querySelector(`#dob-day`),r.querySelector(`#dob-month`),r.querySelector(`#dob-year`)),[`candidate`,`proposer`,`seconder`].forEach(e=>{r.querySelector(`#serial-${e}`).addEventListener(`change`,()=>ue(r,e))}),r.querySelector(`#postSelect`).addEventListener(`change`,()=>F(r)),r.querySelectorAll(`[name="gender"]`).forEach(e=>e.addEventListener(`change`,()=>F(r))),r.querySelectorAll(`.dob-sel`).forEach(e=>e.addEventListener(`change`,()=>F(r))),r.querySelector(`#refreshCaptcha`).addEventListener(`click`,()=>{let e=ne();M=e.answer,r.querySelector(`#captchaInput`).value=``,r.querySelector(`#captchaQuestion`).textContent=e.question}),r.querySelector(`#backHomeBtn`).addEventListener(`click`,()=>o.navigate(`/`)),r.querySelector(`#nomForm`).addEventListener(`submit`,e=>de(e,r,t))}function P(e,t,n){return`
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
  </div>`}function ue(e,t){let n=e.querySelector(`#serial-${t}`).value.trim(),r=e.querySelector(`#details-${t}`),i=k.find(e=>String(e[`Nominal Roll Serial Number`])===n);if(!i){r.innerHTML=n?`<span class="text-red-400">⚠ Student not found</span>`:``;return}r.innerHTML=`
    <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${T(i.NAME)}</strong></p>
    <p><span class="text-slate-500">Class:</span> ${T(i.CLASS)}</p>
    <p><span class="text-slate-500">Dept:</span> ${T(i.Dept||`N/A`)}</p>`,F(e)}function F(e){let t=[],n=e.querySelector(`#postSelect`).value,r=e.querySelector(`[name="gender"]:checked`)?.value||null,i=[`candidate`,`proposer`,`seconder`].map(t=>e.querySelector(`#serial-${t}`).value.trim()),a=i.map(e=>e?k.find(t=>String(t[`Nominal Roll Serial Number`])===e):null),[o,s,c]=i;o&&o===s&&t.push(`Candidate and Proposer cannot be the same person.`),o&&o===c&&t.push(`Candidate and Seconder cannot be the same person.`),s&&s===c&&t.push(`Proposer and Seconder cannot be the same person.`);let l=[`Candidate`,`Proposer`,`Seconder`];a.forEach((e,i)=>{e&&t.push(...te(e,n,l[i],i===0?r:null,A,ce))});let u=e.querySelector(`#warningBox`);return t.length?(u.innerHTML=`<strong class="block mb-1">⚠ Eligibility Warnings</strong>`+t.map(e=>`<p class="text-sm">• ${T(e)}</p>`).join(``),u.classList.remove(`hidden`)):u.classList.add(`hidden`),t}async function de(e,t,n){if(e.preventDefault(),F(t).length){D(`Please resolve all eligibility warnings first.`,`error`);return}if(t.querySelector(`#captchaInput`).value.trim()!==M){D(`Captcha answer is incorrect.`,`error`);return}let r=t.querySelector(`#postSelect`).value,i=t.querySelector(`[name="gender"]:checked`)?.value,a=t.querySelector(`#dob-day`).value,o=t.querySelector(`#dob-month`).value,s=t.querySelector(`#dob-year`).value;if(!i){D(`Please select a gender for the candidate.`,`error`);return}if(!a||!o||!s){D(`Please enter a complete date of birth.`,`error`);return}let c=[`candidate`,`proposer`,`seconder`].map(e=>t.querySelector(`#serial-${e}`).value.trim()),l=c.map(e=>k.find(t=>String(t[`Nominal Roll Serial Number`])===e));if(l.some(e=>!e)){D(`One or more serial numbers are invalid.`,`error`);return}let u=t.querySelector(`#submitBtn`);E(u,!0,`Generate &amp; Preview Nomination`);try{let e={post:r,gender:i,dob:ae(a,o,s),candidateSerial:c[0],proposerSerial:c[1],seconderSerial:c[2]};window.ADMIN_BYPASS_PWD&&(e.password=window.ADMIN_BYPASS_PWD);let u=await C.submitNomination(e);fe(t,u.id,{post:r,gender:i,day:a,month:o,year:s,students:l},n),D(`Nomination submitted! ID: ${u.id}`,`success`)}catch(e){D(`Submission failed: ${e.message}`,`error`)}finally{E(u,!1,`Generate &amp; Preview Nomination`)}}function fe(e,t,{post:n,gender:r,day:i,month:a,year:o,students:s},c){let[l,u,d]=s,f=ae(i,a,o),p=oe(i,a,o),m=ee(f),h=e.querySelector(`#previewSection`);e.querySelector(`#printZone`).innerHTML=pe(t,n,r,p,m,l,u,d,``,c),h.classList.remove(`hidden`),h.scrollIntoView({behavior:`smooth`}),h.querySelector(`#printBtn`).addEventListener(`click`,()=>{w(e.querySelector(`#printZone`).innerHTML)}),h.querySelector(`#newNomBtn`).addEventListener(`click`,()=>N(e.closest(`#app`)))}function pe(e,t,r,i,a,o,s,c,l=``,u=`2026`){let d=re();return`
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-4">
    <div class="flex justify-between items-start text-sm">
      <div>
        <p class="font-bold text-white text-base">${n.COLLEGE_NAME}</p>
        <p class="text-slate-400">College Union Election ${u}</p>
      </div>
      <div class="text-right">
        <p class="text-slate-400 text-xs">Generated: ${d}</p>
        ${l?`<span class="badge badge-${l.toLowerCase()}">${T(l)}</span>`:``}
      </div>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">NOMINATION PAPER</h2>
    <p class="text-sm"><span class="font-semibold text-slate-400 w-40 inline-block">Post Applied For:</span> <strong class="text-white">${T(t)}</strong></p>
    <div class="space-y-3">
      ${I(`Candidate`,o,r,i,a)}
      ${I(`Proposer`,s)}
      ${I(`Seconder`,c)}
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
      <p class="text-[10px] text-slate-500 font-mono">Ref ID: ${T(e)}</p>
    </div>
  </div>`}function I(e,t,n=null,r=null,i=null){return t?`
  <div class="glass rounded-lg p-4 text-sm space-y-1">
    <h3 class="font-bold text-white uppercase text-xs tracking-widest mb-2 border-b border-white/10 pb-1">${e} Details</h3>
    <div class="grid grid-cols-2 gap-x-4 gap-y-1">
      <p><span class="text-slate-500">Name:</span> <strong class="text-slate-200">${T(t.NAME)}</strong></p>
      <p><span class="text-slate-500">Class:</span> ${T(t.CLASS)}</p>
      <p><span class="text-slate-500">Dept:</span> ${T(t.Dept||`N/A`)}</p>
      <p><span class="text-slate-500">Electoral Roll No:</span> ${T(t[`Nominal Roll Serial Number`])}</p>
      ${n?`<p><span class="text-slate-500">Gender:</span> ${T(n)}</p>`:``}
      ${r?`<p><span class="text-slate-500">Date of Birth:</span> ${T(r)}</p>`:``}
      ${i?`<p class="col-span-2"><span class="text-slate-500">Age as on Notification Date:</span> ${T(i)}</p>`:``}
    </div>
    ${e===`Candidate`?``:`
    <div class="flex justify-between mt-4 text-slate-500 text-xs">
      <span>Date: ______ / ______ / ________</span>
      <span>Signature: _______________</span>
    </div>`}
  </div>`:``}function me(e,t,r=`2026`){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-50 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="btn btn-secondary btn-sm flex items-center gap-2">
            <span class="text-lg">←</span> Home
          </button>
          <div class="h-6 w-px bg-white/10 mx-2"></div>
          <h1 class="font-bold text-white text-lg tracking-tight">${T(e)}</h1>
        </div>
        <div class="text-xs text-slate-500 font-medium hidden md:block uppercase tracking-widest">
          ${n.COLLEGE_SHORT_NAME} Election Portal ${r}
        </div>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function he(e){e.innerHTML=_e(`Find My Nomination`,`
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
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));let t=e.querySelector(`#searchBtn`);t.addEventListener(`click`,async()=>{let n=e.querySelector(`#searchId`).value.trim();if(n.length!==10||!/^\d+$/.test(n)){D(`Please enter a valid 10-digit numeric ID.`,`error`);return}E(t,!0,`🔍 Find Nomination`);try{let t=await C.getNomination(n);ge(e.querySelector(`#resultArea`),t,n)}catch(t){e.querySelector(`#resultArea`).innerHTML=`<div class="alert alert-error mt-4">❌ ${T(t.message)}</div>`}finally{E(t,!1,`🔍 Find Nomination`)}})}function ge(e,t,n){let r=t.dob||`N/A`,i=new Date(t.dob);isNaN(i.getTime())||(r=`${String(i.getDate()).padStart(2,`0`)}/${String(i.getMonth()+1).padStart(2,`0`)}/${i.getFullYear()}`);let a=ee(t.dob);e.innerHTML=`
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found! Status: <strong>${T(t.status)}</strong></div>
      <div id="printZone" class="print-zone">
        ${pe(n,t.post,t.gender,r,a,t.candidate,t.proposer,t.seconder,t.status)}
      </div>
      <div class="flex gap-3 no-print">
        <button id="printBtn" class="btn btn-success flex-1">🖨️ Print</button>
      </div>
    </div>`,e.querySelector(`#printBtn`).addEventListener(`click`,()=>{w(e.querySelector(`#printZone`).innerHTML)})}function _e(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${T(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}async function ve(e){e.innerHTML=be(`Valid Nominations List`,`
    <div class="text-center py-20"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Valid Nominations...</p></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let t=await C.getValidNominations();ye(e.querySelector(`main`),t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center py-10 shadow-xl">${T(t.message)}</div>`}}function ye(e,t){if(!t||t.length===0){e.innerHTML=`
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
              <h3 class="font-bold text-indigo-300 text-sm uppercase tracking-widest">${T(e)}</h3>
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
                        <div class="font-bold text-white text-base">${T(e.candidateName)}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${T(e.candidateClass)}</div>
                      </td>
                      <td class="text-sm text-slate-400">${T(e.candidateDept)}</td>
                      <td class="text-right font-mono text-indigo-400/70 text-[10px]">${T(e.id)}</td>
                    </tr>
                  `).join(``)}
                </tbody>
              </table>
            </div>
          </div>
        `).join(``)}
      </div>
    </div>`}function be(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
          <span class="text-slate-600">|</span>
          <h1 class="font-bold text-white text-sm tracking-tight">${T(e)}</h1>
        </div>
        <div class="text-[10px] text-slate-500 font-mono hidden sm:block">OFFICIAL ELECTION PORTAL</div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-12">${t}</main>
  </div>`}async function xe(e){let t=new Date().getFullYear();try{let e=await C.getPublicSchedule();e.electionYear&&(t=e.electionYear)}catch{}e.innerHTML=Ce(`Final Candidates List`,`
    <div class="text-center py-20"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Final List...</p></div>
  `,t,shortName),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let n=await C.getFinalNominations();Se(e.querySelector(`main`),n.active||[],t)}catch(t){e.querySelector(`main`).innerHTML=`<div class="alert alert-warning text-center py-10 shadow-xl">${T(t.message)}</div>`}}function Se(e,t,n){if(!t||t.length===0){e.innerHTML=`
      <div class="glass rounded-3xl p-20 text-center border-dashed border-white/10">
        <div class="text-6xl mb-6">🏁</div>
        <h2 class="text-2xl font-bold text-white mb-2">Final List Pending</h2>
        <p class="text-slate-400 max-w-md mx-auto">The final candidate list will be published after the withdrawal period and scrutiny. Please check back later.</p>
      </div>
    `;return}let r={};t.forEach(e=>{r[e.post]||(r[e.post]=[]),r[e.post].push(e)}),e.innerHTML=`
    <div class="page-enter space-y-10">
      <div class="text-center md:text-left border-b border-white/5 pb-8">
        <h2 class="text-3xl font-black text-white tracking-tight">Final Candidate List ${n}</h2>
        <p class="text-slate-400 mt-2">Official approved list of candidates for the College Union Election ${n}.</p>
      </div>
      
      <div class="space-y-12">
        ${Object.entries(r).map(([e,t])=>`
          <div class="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
            <div class="px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-indigo-500/5 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-emerald-400 text-sm uppercase tracking-widest">${T(e)}</h3>
              <div class="flex items-center gap-3">
                ${t.length===1?`
                  <span class="badge badge-valid bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-[10px] animate-pulse">
                    🏆 ELECTED UNANIMOUSLY
                  </span>
                `:``}
                <span class="text-[10px] text-slate-500 font-mono">${t.length} Approved</span>
              </div>
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
                        <div class="font-bold text-white text-base">${T(e.candidateName)}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${T(e.candidateClass)}</div>
                      </td>
                      <td class="text-sm text-slate-400">${T(e.candidateDept)}</td>
                    </tr>
                  `).join(``)}
                </tbody>
              </table>
            </div>
          </div>
        `).join(``)}
      </div>
    </div>`}function Ce(e,t,n=`2026`,r=`GVC`){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
          <span class="text-slate-600">|</span>
          <h1 class="font-bold text-white text-sm tracking-tight">${T(e)}</h1>
        </div>
        <div class="text-[10px] text-slate-500 font-mono hidden sm:block">${T(r||`GVC`).toUpperCase()} ELECTION PORTAL ${n}</div>
      </div>
    </header>
    <main class="max-w-5xl mx-auto px-4 py-12">${t}</main>
  </div>`}async function we(e){e.innerHTML=De(`Withdrawal Form`,`
    <div id="loadingState" class="flex flex-col items-center justify-center py-24 gap-4">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 text-sm">Checking schedule...</p>
    </div>
    <div id="withdrawArea" class="hidden"></div>
  `),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`));try{let t=await C.getPublicSchedule().catch(()=>({})),n=new Date,r=t.withdrawalStart?new Date(t.withdrawalStart):null,i=t.withdrawalEnd?new Date(t.withdrawalEnd):null,a=e.querySelector(`#withdrawArea`);if(e.querySelector(`#loadingState`).classList.add(`hidden`),a.classList.remove(`hidden`),r&&n<r){a.innerHTML=`
        <div class="glass p-12 text-center rounded-2xl border border-amber-500/20 max-w-2xl mx-auto page-enter">
          <div class="text-6xl mb-6">📅</div>
          <h3 class="text-2xl font-bold text-white mb-3">Withdrawal Window Pending</h3>
          <p class="text-slate-400 mb-6">The withdrawal window is scheduled to open on <strong>${new Date(r).toLocaleString()}</strong>.</p>
          <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
        </div>
      `,a.querySelector(`#expiredBackBtn`).onclick=()=>o.navigate(`/`);return}if(i&&n>i){a.innerHTML=`
        <div class="glass p-12 text-center rounded-2xl border border-rose-500/20 max-w-2xl mx-auto page-enter">
          <div class="text-6xl mb-6">⏳</div>
          <h3 class="text-2xl font-bold text-white mb-3">Withdrawal Window Closed</h3>
          <p class="text-slate-400 mb-6">The official deadline for withdrawal requests was <strong>${new Date(i).toLocaleString()}</strong>.</p>
          <button id="expiredBackBtn" class="btn btn-secondary">← Back to Home</button>
        </div>
      `,a.querySelector(`#expiredBackBtn`).onclick=()=>o.navigate(`/`);return}a.innerHTML=`
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
    `;let s=a.querySelector(`#fetchBtn`);s.addEventListener(`click`,async()=>{let e=a.querySelector(`#withdrawId`).value.trim();if(e.length!==10||!/^\d+$/.test(e)){D(`Please enter a valid 10-digit numeric ID.`,`error`);return}E(s,!0,`Fetch Nomination Details`);try{let t=await C.getNomination(e);Te(a.querySelector(`#nominationDetails`),t,e)}catch(e){a.querySelector(`#nominationDetails`).innerHTML=`<div class="alert alert-error">❌ ${T(e.message)}</div>`}finally{E(s,!1,`Fetch Nomination Details`)}})}catch(t){e.querySelector(`#loadingState`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}function Te(e,t,n){if(t.status!==`Valid`){e.innerHTML=`<div class="alert alert-warning">⚠ This nomination has status <strong>${T(t.status)}</strong>. Only <strong>Valid</strong> nominations can be withdrawn.</div>`;return}if(t.withdrawalStatus===`Requested`||t.withdrawalStatus===`Approved`){e.innerHTML=`<div class="alert alert-info">ℹ A withdrawal has already been ${T(t.withdrawalStatus.toLowerCase())} for this nomination.</div>`;return}e.innerHTML=`
    <div class="space-y-4">
      <div class="alert alert-success">✅ Nomination found. Please review the details below before submitting your withdrawal.</div>
      <div class="glass rounded-xl p-5 text-sm space-y-2">
        <p><span class="text-slate-400 w-36 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300">${T(n)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Post:</span> <strong class="text-white">${T(t.post)}</strong></p>
        <p><span class="text-slate-400 w-36 inline-block">Candidate:</span> ${T(t.candidate?.NAME||t.candidateName||`N/A`)}</p>
        <p><span class="text-slate-400 w-36 inline-block">Class:</span> ${T(t.candidate?.CLASS||t.candidateClass||`N/A`)}</p>
        <p><span class="text-slate-400 w-36 inline-block">Dept:</span> ${T(t.candidate?.Dept||t.candidateDept||`N/A`)}</p>
      </div>
      <div class="alert alert-warning text-sm">
        ⚠ <strong>Warning:</strong> Submitting this withdrawal is irreversible. The request will be sent to the Returning Officer for final approval.
      </div>
      <div class="flex gap-3">
        <button id="withdrawBtn" class="btn btn-danger flex-1">Submit Withdrawal Request</button>
      </div>
    </div>`,e.querySelector(`#withdrawBtn`).addEventListener(`click`,async()=>{let r=e.querySelector(`#withdrawBtn`);E(r,!0,`Submit Withdrawal Request`);try{await C.submitWithdrawal(n),e.innerHTML=`
        <div class="alert alert-success">✅ Withdrawal request submitted successfully! The Returning Officer will review your request.</div>
        <div class="mt-4 no-print">
          <button id="printWithdrawal" class="btn btn-secondary">🖨️ Print Withdrawal Form</button>
        </div>
        <div class="print-zone mt-4">
          ${Ee(n,t)}
        </div>`,e.querySelector(`#printWithdrawal`).addEventListener(`click`,w),D(`Withdrawal request submitted!`,`success`)}catch(e){D(`Failed: ${e.message}`,`error`),E(r,!1,`Submit Withdrawal Request`)}})}function Ee(e,t){let r=re(),i=t.candidate?.NAME||t.candidateName||`N/A`,a=t.candidate?.CLASS||t.candidateClass||`N/A`,o=t.candidate?.Dept||t.candidateDept||`N/A`;return`
  <div class="print-paper border border-slate-700 rounded-xl p-8 bg-slate-900 text-slate-200 space-y-5">
    <div class="flex justify-between text-sm">
      <div>
        <p class="font-bold text-white text-base">${T(n.COLLEGE_NAME)}</p>
        <p class="text-slate-400">College Union Election — Withdrawal Form</p>
      </div>
      <p class="text-slate-400 text-xs">Date: ${r}</p>
    </div>
    <h2 class="text-center font-bold text-xl text-white border-y border-white/10 py-3">WITHDRAWAL OF NOMINATION</h2>
    <div class="space-y-2 text-sm">
      <p><span class="text-slate-400 w-40 inline-block">Nomination ID:</span> <strong class="font-mono text-indigo-300 text-lg">${T(e)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Post:</span> <strong class="text-white">${T(t.post)}</strong></p>
      <p><span class="text-slate-400 w-40 inline-block">Candidate Name:</span> ${T(i)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Class:</span> ${T(a)}</p>
      <p><span class="text-slate-400 w-40 inline-block">Department:</span> ${T(o)}</p>
    </div>
    <p class="text-sm text-slate-300 border border-white/10 rounded-lg p-4">
      I, <strong>${T(i)}</strong>, hereby withdraw my nomination for the post of <strong>${T(t.post)}</strong> in the College Union Election.
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
  </div>`}function De(e,t){return`
  <div class="page-enter min-h-screen">
    <header class="no-print sticky top-0 z-10 border-b border-white/10 glass">
      <div class="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        <button id="backToHome" class="text-slate-400 hover:text-white transition text-sm">← Home</button>
        <span class="text-slate-600">|</span>
        <h1 class="font-bold text-white text-sm">${T(e)}</h1>
      </div>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-8">${t}</main>
  </div>`}var Oe=`modulepreload`,ke=function(e){return`/nomination/`+e},Ae={},je=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=ke(t,n),t in Ae)return;Ae[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:Oe,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};function Me(e){e.innerHTML=`
    <div class="glass max-w-md w-full mx-auto p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden page-enter">
      <!-- Background Glow -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl"></div>

      <button data-nav="/" class="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-1 text-sm z-20 transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Home
      </button>

      <div class="text-center mb-8 relative z-10 mt-4">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-xl">G</div>
        <h2 class="text-3xl font-black text-white tracking-tight">Admin Access</h2>
        <p class="text-slate-400 text-sm mt-2">Secure Gateway for Election Management</p>
      </div>

      <div id="errorMsg" class="hidden alert alert-error text-left mb-6"></div>
      
      <form id="loginForm" class="space-y-6 text-left relative z-10">
        <input type="text" name="username" value="admin" style="display:none;" autocomplete="username" />
        
        <!-- Step 1: Password -->
        <div id="passwordStep">
          <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Password</label>
          <input id="adminPassword" type="password" class="field text-lg" placeholder="Enter password" autocomplete="current-password" />
          <button type="submit" id="btnRequestOTP" class="btn btn-primary w-full text-base py-4 mt-6 group">
            <span>Request Secure OTP</span>
            <span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        <!-- Step 2: OTP (Hidden initially) -->
        <div id="otpStep" class="hidden space-y-6">
          <div class="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
            <p class="text-xs text-indigo-300 leading-relaxed">
              🔐 <strong>Check your Email</strong><br/>
              A 6-digit verification code has been sent to your registered email address.
            </p>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Enter 6-Digit OTP</label>
            <input id="adminOTP" type="number" class="field text-center text-2xl tracking-[0.5em] font-black" placeholder="000000" maxlength="6" />
          </div>
          <button type="button" id="btnVerifyLogin" class="btn btn-success w-full text-base py-4 shadow-lg shadow-emerald-500/20">
            <span>Verify & Login</span>
          </button>
          <button type="button" id="btnBackToPassword" class="w-full text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold transition">
            ← Use a different password
          </button>
        </div>
      </form>
    </div>
  `;let t=e.querySelector(`#loginForm`),n=e.querySelector(`#errorMsg`),i=e.querySelector(`#passwordStep`),a=e.querySelector(`#otpStep`),o=e.querySelector(`#adminPassword`),s=e.querySelector(`#adminOTP`),c=e=>{n.textContent=e,n.classList.remove(`hidden`),n.classList.add(`shake`),setTimeout(()=>n.classList.remove(`shake`),500)};t.onsubmit=async t=>{t.preventDefault();let r=o.value.trim();if(!r)return c(`Please enter the admin password.`);let l=e.querySelector(`#btnRequestOTP`);E(l,!0,`Verifying...`),n.classList.add(`hidden`);try{await C.adminSendOTP(r),i.classList.add(`hidden`),a.classList.remove(`hidden`),a.classList.add(`page-enter`),s.focus(),D(`OTP sent successfully!`,`success`)}catch(e){c(e.message===`Unauthorized`?`Incorrect admin password.`:e.message)}finally{E(l,!1,`Request Secure OTP`)}},e.querySelector(`#btnVerifyLogin`).onclick=async e=>{let t=o.value.trim(),i=s.value.trim();if(!i||i.length!==6)return c(`Please enter a valid 6-digit OTP.`);E(e.target,!0,`Verifying OTP...`),n.classList.add(`hidden`);try{await C.adminVerifyOTP(t,i);let e=await C.adminLogin(t),n=new Date().toISOString().split(`T`)[0];localStorage.setItem(`adminPwd`,t),localStorage.setItem(`adminLoginDate`,n),e.sessionToken&&localStorage.setItem(`adminSessionToken`,e.sessionToken),D(`Authentication successful!`,`success`),je(async()=>{let{router:e}=await Promise.resolve().then(()=>r);return{router:e}},void 0).then(({router:e})=>e.navigate(`/admin/dashboard`))}catch(e){c(e.message)}finally{E(e.target,!1,`Verify & Login`)}},e.querySelector(`#btnBackToPassword`).onclick=()=>{a.classList.add(`hidden`),i.classList.remove(`hidden`),i.classList.add(`page-enter`),n.classList.add(`hidden`)}}function L(){let e=localStorage.getItem(`adminPwd`),t=localStorage.getItem(`adminLoginDate`),n=new Date().toISOString().split(`T`)[0];if(!e||t!==n)return e&&(localStorage.removeItem(`adminPwd`),localStorage.removeItem(`adminLoginDate`),localStorage.removeItem(`adminSessionToken`),sessionStorage.removeItem(`adminSessionToken`),D(`Daily session expired. Please log in again.`,`warning`)),o.navigate(`/admin`),null;let r=localStorage.getItem(`adminSessionToken`);return r&&sessionStorage.setItem(`adminSessionToken`,r),e}function R(e,t,r){let i=L();i&&C.initAdminData(i),e.innerHTML=`
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="no-print w-60 flex-shrink-0 glass border-r border-white/10 flex flex-col">
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">${n.COLLEGE_SHORT_NAME.charAt(0)}</div>
          <div>
            <p class="font-bold text-white text-xs">${n.COLLEGE_SHORT_NAME} Election</p>
            <p class="text-slate-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        ${z(`dashboard`,`📊`,`Dashboard`,t)}
        ${z(`schedule`,`📅`,`Election Schedule`,t)}
        ${z(`nominal-roll`,`📜`,`Nominal Roll`,t)}
        ${z(`posts`,`📋`,`Manage Posts`,t)}
        ${z(`direct-nomination`,`📝`,`Direct Entry`,t)}
        ${z(`verify`,`✅`,`Verify Nominations`,t)}
        ${z(`withdrawals`,`↩️`,`Withdrawals`,t)}
        ${z(`publish`,`📢`,`Publish Lists`,t)}
        ${z(`booths`,`🏫`,`Polling Booths`,t)}
        ${z(`ballots`,`🗳️`,`Ballot Printing`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${z(`counting`,`🧮`,`Counting Setup`,t)}
        ${z(`results-entry`,`📥`,`Results Entry`,t)}
        ${z(`results`,`🏆`,`Election Results`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${z(`public`,`🌐`,`Public Portal`,t)}
        <div class="border-t border-white/10 my-2"></div>
        ${z(`testing`,`🧪`,`Testing Tools`,t)}
        ${z(`audit`,`🛡️`,`Internal Audit`,t)}
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
        ${r}
      </main>
    </div>
  </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.adminNav;if(t===`public`){o.navigate(`/`);return}o.navigate(`/admin/${t}`)})}),e.querySelector(`#logoutBtn`).addEventListener(`click`,()=>{localStorage.removeItem(`adminPwd`),localStorage.removeItem(`adminLoginDate`),localStorage.removeItem(`adminSessionToken`),sessionStorage.removeItem(`adminSessionToken`),D(`Logged out.`,`info`),o.navigate(`/`)})}function z(e,t,n,r){return`
  <button data-admin-nav="${e}" class="sidebar-item ${r===e?`active`:``}">
    <span>${t}</span> ${n}
  </button>`}async function Ne(e){let t=L();if(t){R(e,`dashboard`,`
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
          ${B(`Total Submissions`,a,`from-indigo-500/20 to-indigo-600/5`,`text-indigo-400`)}
          ${B(`Pending Review`,o,`from-amber-500/20 to-amber-600/5`,`text-amber-400`)}
          ${B(`Valid Nominations`,s,`from-emerald-500/20 to-emerald-600/5`,`text-emerald-400`)}
          ${B(`Rejected`,c,`from-rose-500/20 to-rose-600/5`,`text-rose-400`)}
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
            <h4 class="font-bold text-white text-sm">College Information</h4>
            <div class="space-y-4">
              <div>
                <label class="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Full College Name</label>
                <input type="text" id="inputCollegeName" class="field text-xs py-1.5" value="${T(i.collegeName)}">
              </div>
              <div>
                <label class="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Short Form (Abbreviation)</label>
                <input type="text" id="inputCollegeShort" class="field text-xs py-1.5" value="${T(i.collegeShortName)}">
              </div>
              <button id="btnUpdateBranding" class="btn btn-primary w-full text-xs py-2">Update Branding</button>
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
                    <td class="font-mono text-indigo-400 text-xs">${T(e.id)}</td>
                    <td>
                      <div class="font-semibold text-white">${T(e.candidateName)}</div>
                      <div class="text-[10px] text-slate-500">${T(e.candidateClass)}</div>
                    </td>
                    <td class="text-xs text-slate-300 font-medium">${T(e.post)}</td>
                    <td class="text-xs text-slate-400">${T(e.candidateDept)}</td>
                    <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${T(e.status)}</span></td>
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
      </div>`,e.querySelectorAll(`[data-admin-nav]`).forEach(e=>{e.addEventListener(`click`,()=>{je(async()=>{let{router:e}=await Promise.resolve().then(()=>r);return{router:e}},void 0).then(({router:t})=>t.navigate(`/admin/${e.dataset.adminNav}`))})}),e.querySelector(`#btnUpdateBranding`).addEventListener(`click`,async()=>{let n=e.querySelector(`#inputCollegeName`).value.trim(),r=e.querySelector(`#inputCollegeShort`).value.trim();if(!n||!r)return D(`Please fill all branding fields.`,`error`);try{await C.adminUpdateSettings(t,{collegeName:n,collegeShortName:r}),D(`College branding updated successfully! Refresh to see changes system-wide.`,`success`)}catch(e){D(e.message,`error`)}})}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function B(e,t,n,r){return`
  <div class="glass rounded-2xl p-6 relative overflow-hidden group">
    <div class="absolute inset-0 bg-gradient-to-br ${n} opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 relative z-10">${e}</p>
    <p class="text-3xl font-black ${r} relative z-10">${t}</p>
  </div>`}async function Pe(e){let t=L();if(t){R(e,`verify`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominations...</p></div>
  `);try{let n=await C.adminGetNominations(t);Fe(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function Fe(e,t,n){e.innerHTML=`
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white">Nomination Verification</h3>
          <p class="text-slate-400 text-sm">Review each submission and mark as Valid or Rejected.</p>
        </div>
      </div>

      <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center w-full shadow-lg">
        <div class="relative flex-1 w-full">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input type="text" id="nomSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search by Candidate Name, ID, or Post...">
        </div>
        <div class="w-full md:w-56 shrink-0">
          <select id="statusFilter" class="field w-full bg-black/20 focus:bg-black/40 transition-colors">
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
      <tr id="row-${T(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${T(e.id)}</td>
        <td class="text-xs max-w-[140px] leading-snug font-medium">${T(e.post)}</td>
        <td class="font-bold text-white">${T(e.candidateName||e.candidate?.NAME||`N/A`)}</td>
        <td class="text-xs text-slate-400">
          <div>${T(e.candidateClass||``)}</div>
          <div class="text-[10px] opacity-60">${T(e.candidateDept||``)}</div>
        </td>
        <td class="text-xs">${T(e.proposerName||e.proposer?.NAME||`N/A`)}</td>
        <td class="text-xs">${T(e.seconderName||e.seconder?.NAME||`N/A`)}</td>
        <td><span class="badge badge-${(e.status||`pending`).toLowerCase()}">${T(e.status)}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm verify-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${T(e.id)}" data-action="Valid"
              ${e.status===`Valid`?`disabled`:``}>Valid</button>
            <button class="btn btn-secondary btn-sm verify-btn bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white" data-id="${T(e.id)}" data-action="Rejected"
              ${e.status===`Rejected`?`disabled`:``}>Reject</button>
          </div>
        </td>
      </tr>`).join(``):`<tr><td colspan="8" class="text-center text-slate-500 py-12">No nominations found matching those criteria.</td></tr>`},a=()=>{let t=e.querySelector(`#nomSearch`).value.toLowerCase(),n=e.querySelector(`#statusFilter`).value,a=r.filter(e=>{let r=n===`all`||e.status===n,i=!t||String(e.id).toLowerCase().includes(t)||String(e.candidateName||e.candidate?.NAME||``).toLowerCase().includes(t)||String(e.post).toLowerCase().includes(t);return r&&i});a.sort((e,t)=>{let n={Pending:1,Valid:2,Rejected:3},r=n[e.status]||99,i=n[t.status]||99;return r===i?String(t.id).localeCompare(String(e.id)):r-i}),i(a)};e.querySelector(`#nomSearch`).addEventListener(`input`,a),e.querySelector(`#statusFilter`).addEventListener(`change`,a),a(),e.querySelector(`#nomTableBody`).addEventListener(`click`,async e=>{let t=e.target.closest(`.verify-btn`);if(!t)return;let i=t.dataset.id,o=t.dataset.action;t.disabled=!0;let s=t.textContent;t.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminVerifyNomination(n,i,o);let e=r.find(e=>e.id===i);e&&(e.status=o),D(`Nomination ${i} marked as ${o}.`,`success`),a()}catch(e){D(`Failed: ${e.message}`,`error`),t.disabled=!1,t.textContent=s}})}async function Ie(e){let t=L();if(t){R(e,`withdrawals`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading withdrawals...</p></div>
  `);try{let n=await C.adminGetNominations(t);Le(e.querySelector(`#adminMain`),n,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function Le(e,t,n){let r=Array.isArray(t)?t:[],i=r.filter(e=>e.withdrawalStatus&&e.withdrawalStatus!==`None`),a=r.filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`);e.innerHTML=`
    <div class="page-enter space-y-4">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
        <div>
          <h3 class="text-xl font-bold text-white">Withdrawals</h3>
          <p class="text-slate-400 text-sm">Approve student requests or directly withdraw any valid nomination.</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 border-b border-white/10 pb-0 mb-4">
        <button id="tabRequests" class="tab-btn px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 border-indigo-400 text-white bg-white/5">
          📥 Student Requests <span class="ml-1 badge badge-pending text-xs">${i.length}</span>
        </button>
        <button id="tabDirect" class="tab-btn px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 border-transparent text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
          ⚡ Admin Direct Withdrawal
        </button>
      </div>

      <!-- Tab: Student Requests -->
      <div id="panelRequests">
        <div class="glass rounded-xl p-4 flex items-center w-full shadow-lg mb-3">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="withSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search by Candidate Name, ID, or Post...">
          </div>
        </div>
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Nom. ID</th>
                <th>Post</th>
                <th>Candidate</th>
                <th>Class / Dept</th>
                <th>Withdrawal Status</th>
                <th>Action</th>
              </tr></thead>
              <tbody id="withdrawalTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab: Direct Withdrawal -->
      <div id="panelDirect" class="hidden">
        <div class="alert mb-4" style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius:0.75rem; padding:0.75rem 1rem; color:#fbbf24; font-size:0.85rem;">
          🛡️ <strong>Admin Direct Withdrawal:</strong> You can immediately withdraw any Valid nomination without needing the candidate to submit a request. This is irreversible.
        </div>
        <div class="glass rounded-xl p-4 flex items-center w-full shadow-lg mb-3">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="directSearch" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search Valid nominations by name, ID, or post...">
          </div>
        </div>
        <div class="glass rounded-xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr>
                <th>Nom. ID</th>
                <th>Post</th>
                <th>Candidate</th>
                <th>Class / Dept</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr></thead>
              <tbody id="directTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;let o=e.querySelector(`#tabRequests`),s=e.querySelector(`#tabDirect`),c=e.querySelector(`#panelRequests`),l=e.querySelector(`#panelDirect`),u=e=>{[o,s].forEach(e=>{e.classList.remove(`border-indigo-400`,`text-white`,`bg-white/5`),e.classList.add(`border-transparent`,`text-slate-400`)}),e.classList.add(`border-indigo-400`,`text-white`,`bg-white/5`),e.classList.remove(`border-transparent`,`text-slate-400`),c.classList.toggle(`hidden`,e!==o),l.classList.toggle(`hidden`,e!==s)};o.onclick=()=>u(o),s.onclick=()=>u(s);let d=t=>{let n=e.querySelector(`#withdrawalTableBody`);n.innerHTML=t.length?t.map(e=>`
      <tr id="wrow-${T(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${T(e.id)}</td>
        <td class="text-xs font-medium text-slate-300">${T(e.post)}</td>
        <td class="font-bold text-white">${T(e.candidateName||`N/A`)}</td>
        <td class="text-xs text-slate-400">${T(e.candidateClass||``)} / ${T(e.candidateDept||``)}</td>
        <td>
          <span class="badge ${e.withdrawalStatus===`Approved`?`badge-valid`:`badge-pending`}">
            ${T(e.withdrawalStatus)}
          </span>
        </td>
        <td>
          <button class="btn btn-primary btn-sm approve-btn bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white" data-id="${T(e.id)}"
            ${e.withdrawalStatus===`Approved`?`disabled`:``}>
            ✅ Approve
          </button>
        </td>
      </tr>`).join(``):`<tr><td colspan="6" class="text-center text-slate-500 py-12">No withdrawal requests found.</td></tr>`},f=()=>{let t=e.querySelector(`#withSearch`).value.toLowerCase();d(i.filter(e=>!t||String(e.id).toLowerCase().includes(t)||String(e.candidateName||``).toLowerCase().includes(t)||String(e.post).toLowerCase().includes(t)))};e.querySelector(`#withSearch`).addEventListener(`input`,f),d(i),e.querySelector(`#panelRequests`).addEventListener(`click`,async e=>{let t=e.target.closest(`.approve-btn`);if(!t)return;let r=t.dataset.id;t.disabled=!0,t.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminApproveWithdrawal(n,r),D(`Withdrawal approved.`,`success`);let e=i.find(e=>e.id===r);e&&(e.withdrawalStatus=`Approved`),f()}catch(e){D(`Failed: ${e.message}`,`error`),t.disabled=!1,t.innerHTML=`✅ Approve`}});let p=[...a],m=t=>{let n=e.querySelector(`#directTableBody`);n.innerHTML=t.length?t.map(e=>`
      <tr id="drow-${T(e.id)}">
        <td class="font-mono text-indigo-300 text-xs">${T(e.id)}</td>
        <td class="text-xs font-medium text-slate-300">${T(e.post)}</td>
        <td class="font-bold text-white">${T(e.candidateName||`N/A`)}</td>
        <td class="text-xs text-slate-400">${T(e.candidateClass||``)} / ${T(e.candidateDept||``)}</td>
        <td>
          <span class="badge badge-valid">${T(e.status)}</span>
          ${e.withdrawalStatus&&e.withdrawalStatus!==`None`?`<span class="badge badge-pending ml-1">${T(e.withdrawalStatus)}</span>`:``}
        </td>
        <td>
          <button class="btn btn-sm direct-withdraw-btn" data-id="${T(e.id)}"
            style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);"
            onmouseover="this.style.background='rgba(239,68,68,0.8)';this.style.color='white';"
            onmouseout="this.style.background='rgba(239,68,68,0.15)';this.style.color='#f87171';">
            ⚡ Withdraw Now
          </button>
        </td>
      </tr>`).join(``):`<tr><td colspan="6" class="text-center text-slate-500 py-12">No valid nominations available for withdrawal.</td></tr>`},h=()=>{let t=e.querySelector(`#directSearch`).value.toLowerCase();m(p.filter(e=>!t||String(e.id).toLowerCase().includes(t)||String(e.candidateName||``).toLowerCase().includes(t)||String(e.post).toLowerCase().includes(t)))};e.querySelector(`#directSearch`).addEventListener(`input`,h),m(p),e.querySelector(`#panelDirect`).addEventListener(`click`,async e=>{let t=e.target.closest(`.direct-withdraw-btn`);if(!t)return;let r=t.dataset.id,i=p.find(e=>e.id===r);if(confirm(`CONFIRM DIRECT WITHDRAWAL\n\nCandidate: ${i?.candidateName||r}\nPost: ${i?.post||``}\n\nThis will immediately mark this nomination as Withdrawn. This cannot be undone. Proceed?`)){t.disabled=!0,t.innerHTML=`<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span>`;try{await C.adminDirectWithdrawal(n,r),D(`Nomination ${r} directly withdrawn.`,`success`),p=p.filter(e=>e.id!==r),h()}catch(e){D(`Failed: ${e.message}`,`error`),t.disabled=!1,t.innerHTML=`⚡ Withdraw Now`}}})}async function Re(e){let t=L();if(t){R(e,`publish`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading data...</p></div>
  `);try{let[n,r,i]=await Promise.all([C.adminGetSettings(t),C.adminGetNominations(t),C.getPosts()]);V(e.querySelector(`#adminMain`),n,r,i,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function V(e,t,r,i,a){let o=t.validListPublished===`true`,s=t.finalListPublished===`true`;e.innerHTML=`
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
            <span class="badge ${o?`badge-valid`:`badge-pending`} text-sm">
              ${o?`✅ Published`:`⏳ Not Published`}
            </span>
          </div>
        </div>
        ${o?`
        <div class="alert alert-success text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>✅ This list is currently visible to the public.</span>
          <button id="unpublishValidBtn" class="btn btn-sm" style="background:#dc2626;color:white;border:none;">🚫 Unpublish</button>
        </div>`:`
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
            <span class="badge ${s?`badge-valid`:`badge-pending`} text-sm">
              ${s?`✅ Published`:`⏳ Not Published`}
            </span>
          </div>
        </div>
        ${s?`
        <div class="alert alert-success text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span>✅ The final list is currently visible to the public.</span>
          <button id="unpublishFinalBtn" class="btn btn-sm" style="background:#dc2626;color:white;border:none;">🚫 Unpublish</button>
        </div>`:`
        <div class="alert alert-warning text-sm">
          ⚠ Ensure all withdrawal requests have been processed before publishing.
        </div>
        <button id="publishFinalBtn" class="btn btn-primary" ${o?``:`disabled title="Publish the valid list first"`}>📢 Publish Final Nominations List</button>`}
      </div>
    </div>`;let c=e=>{let t=e===`final`,a=t?r.filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`):r.filter(e=>e.status===`Valid`);if(a.length===0){alert(`No valid nominations found to print.`);return}let o={};a.forEach(e=>{o[e.post]||(o[e.post]=[]),o[e.post].push(e)});let s=i.map(e=>e.post||e.name).filter(e=>o[e]),c=`
      <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #000;padding-bottom:15px">
        <div style="font-size:12px;color:#444">${n.COLLEGE_NAME}</div>
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
    `;s.forEach(e=>{c+=`
        <tr>
          <td colspan="4" style="border:1px solid #000;padding:10px 8px;background:#eee;font-weight:bold;text-transform:uppercase">
            POST: ${T(e)}
          </td>
        </tr>
      `,o[e].forEach((e,t)=>{c+=`
          <tr>
            <td style="border:1px solid #000;padding:8px;text-align:center">${t+1}</td>
            <td style="border:1px solid #000;padding:8px;font-weight:bold">${T(e.candidateName)}</td>
            <td style="border:1px solid #000;padding:8px">${T(e.candidateClass)}</td>
            <td style="border:1px solid #000;padding:8px">${T(e.candidateDept)}</td>
          </tr>
        `})}),c+=`
        </tbody>
      </table>
      <div style="margin-top:60px;display:flex;justify-content:flex-end">
        <div style="text-align:center">
          <div style="font-weight:bold;margin-bottom:40px">RETURNING OFFICER</div>
          <div style="font-size:11px">Signature & Seal</div>
        </div>
      </div>
    `;let l=window.open(``,`_blank`);l.document.write(`<!DOCTYPE html><html><head><title>Print List</title><style>
      @page{size:A4;margin:20mm}
      body{font-family:Arial,sans-serif;line-height:1.4}
    </style></head><body>${c}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`),l.document.close()};e.querySelector(`#btnPrintValid`).addEventListener(`click`,()=>c(`valid`)),e.querySelector(`#btnPrintFinal`).addEventListener(`click`,()=>c(`final`)),e.querySelector(`#publishValidBtn`)?.addEventListener(`click`,async t=>{let n=t.currentTarget;if(confirm(`Are you sure you want to publish the valid nominations list? This will be visible to all students.`)){E(n,!0,`📢 Publish Valid Nominations List`);try{await C.adminPublishValidList(a),D(`Valid nominations list published successfully!`,`success`),V(e,{validListPublished:`true`,finalListPublished:s?`true`:`false`},r,i,a)}catch(e){D(`Failed: ${e.message}`,`error`),E(n,!1,`📢 Publish Valid Nominations List`)}}}),e.querySelector(`#publishFinalBtn`)?.addEventListener(`click`,async t=>{let n=t.currentTarget;if(confirm(`Are you sure you want to publish the final nominations list?`)){E(n,!0,`📢 Publish Final Nominations List`);try{await C.adminPublishFinalList(a),D(`Final nominations list published successfully!`,`success`),V(e,{validListPublished:`true`,finalListPublished:`true`},r,i,a)}catch(e){D(`Failed: ${e.message}`,`error`),E(n,!1,`📢 Publish Final Nominations List`)}}}),e.querySelector(`#unpublishValidBtn`)?.addEventListener(`click`,async t=>{let n=t.currentTarget;if(confirm(`Unpublish Valid List?

This will remove it from public view. The Final List will also be unpublished.`)){E(n,!0,`🚫 Unpublish`);try{await C.adminUnpublishValidList(a),D(`Valid list unpublished.`,`success`),V(e,{validListPublished:`false`,finalListPublished:`false`},r,i,a)}catch(e){D(`Failed: ${e.message}`,`error`),E(n,!1,`🚫 Unpublish`)}}}),e.querySelector(`#unpublishFinalBtn`)?.addEventListener(`click`,async t=>{let n=t.currentTarget;if(confirm(`Unpublish Final List?

This will remove the final candidate list from public view.`)){E(n,!0,`🚫 Unpublish`);try{await C.adminUnpublishFinalList(a),D(`Final list unpublished.`,`success`),V(e,{validListPublished:`true`,finalListPublished:`false`},r,i,a)}catch(e){D(`Failed: ${e.message}`,`error`),E(n,!1,`🚫 Unpublish`)}}})}async function ze(e){let t=L();if(t){R(e,`posts`,`
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Loading posts...</p>
    </div>
  `);try{let r=await C.adminGetPosts(t).catch(()=>null);(!Array.isArray(r)||r.length===0)&&(r=n.DEFAULT_POSTS),Be(e.querySelector(`#adminMain`),r,t)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function Be(e,t,n){e.innerHTML=`
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
    </div>`,H(e,t,n),Ve(e,t,n)}function H(e,t,n){let r=e.querySelector(`#postsBody`);r.innerHTML=t.length?t.map((e,t)=>`
    <tr id="post-row-${t}">
      <td class="text-slate-500 text-xs">${t+1}</td>
      <td class="font-medium text-white">${T(e.post)}</td>
      <td class="text-center">${e.femaleOnly?`✅`:`—`}</td>
      <td class="text-center">${e.finalYearIneligible?`✅`:`—`}</td>
      <td class="text-center">${e.deptRestriction?`✅`:`—`}</td>
      <td class="text-center text-slate-400 text-xs">${e.yearRestriction?e.yearRestriction===`PG`?`PG`:`${e.yearRestriction}rd/nd/st Year`:`—`}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm edit-post-btn" data-idx="${t}">✏️ Edit</button>
          <button class="btn btn-danger btn-sm delete-post-btn" data-idx="${t}" data-name="${T(e.post)}">🗑️</button>
        </div>
      </td>
    </tr>`).join(``):`<tr><td colspan="7" class="text-center text-slate-500 py-8">No posts configured.</td></tr>`,r.querySelectorAll(`.delete-post-btn`).forEach(t=>{t.addEventListener(`click`,async()=>{let r=t.dataset.name;if(confirm(`Delete post "${r}"? This cannot be undone.`)){t.disabled=!0;try{await C.adminDeletePost(n,r),D(`Post "${r}" deleted.`,`success`),H(e,await C.adminGetPosts(n),n)}catch(e){D(`Failed: ${e.message}`,`error`),t.disabled=!1}}})});let i=e.querySelector(`#postFormWrap`);r.querySelectorAll(`.edit-post-btn`).forEach(n=>{n.addEventListener(`click`,()=>{let r=t[parseInt(n.dataset.idx)];e.querySelector(`#postFormTitle`).textContent=`Edit Post`,e.querySelector(`#pfPost`).value=r.post,e.querySelector(`#pfYear`).value=r.yearRestriction||``,e.querySelector(`#pfFemale`).checked=!!r.femaleOnly,e.querySelector(`#pfFinalYear`).checked=!!r.finalYearIneligible,e.querySelector(`#pfDept`).checked=!!r.deptRestriction,e.querySelector(`#pfOriginalName`).value=r.post,i.classList.remove(`hidden`),i.scrollIntoView({behavior:`smooth`})})})}function Ve(e,t,n){let r=e.querySelector(`#postFormWrap`),i=e.querySelector(`#addPostBtn`),a=e.querySelector(`#cancelPostBtn`),o=e.querySelector(`#savePostBtn`);i.addEventListener(`click`,()=>{e.querySelector(`#postFormTitle`).textContent=`Add New Post`,e.querySelector(`#pfPost`).value=``,e.querySelector(`#pfYear`).value=``,e.querySelector(`#pfFemale`).checked=!1,e.querySelector(`#pfFinalYear`).checked=!1,e.querySelector(`#pfDept`).checked=!1,e.querySelector(`#pfOriginalName`).value=``,r.classList.remove(`hidden`),r.scrollIntoView({behavior:`smooth`})}),a.addEventListener(`click`,()=>r.classList.add(`hidden`)),o.addEventListener(`click`,async()=>{let t=e.querySelector(`#pfPost`).value.trim(),i=e.querySelector(`#pfYear`).value,a=e.querySelector(`#pfFemale`).checked,s=e.querySelector(`#pfFinalYear`).checked,c=e.querySelector(`#pfDept`).checked,l=e.querySelector(`#pfOriginalName`).value;if(!t){D(`Post name is required.`,`error`);return}let u={postName:t,yearRestriction:i,femaleOnly:a,finalYearIneligible:s,deptRestriction:c,originalName:l};E(o,!0,`💾 Save Post`);try{l?(await C.adminUpdatePost(n,u),D(`Post updated successfully!`,`success`)):(await C.adminAddPost(n,u),D(`Post added successfully!`,`success`)),r.classList.add(`hidden`),H(e,await C.adminGetPosts(n),n)}catch(e){D(`Failed: ${e.message}`,`error`)}finally{E(o,!1,`💾 Save Post`)}})}async function He(e){let t=L();if(t){R(e,`booths`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);try{let[n,r,i,a,o,s]=await Promise.all([C.getNominalRoll(),C.adminGetBooths(t).catch(()=>[]),C.adminGetLocations(t).catch(()=>[]),C.adminGetPosts(t).catch(()=>[]),C.getFinalNominations().catch(()=>({active:[]})),C.adminGetBallotPlan(t).catch(()=>null)]);Ue(e.querySelector(`#adminMain`),t,n,r,i,a,o,s)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function Ue(e,t,r,i,a,o,s,c){let l={};r.forEach(e=>{let t=String(e.CLASS||`Unknown`).trim(),n=String(e.Dept||`Unknown`).trim();l[t]||(l[t]={name:t,dept:n,count:0}),l[t].count++});let u=Object.values(l).sort((e,t)=>e.name.localeCompare(t.name)),d=i.length?[...i]:[{boothNumber:1,roomName:``,classes:[]}],f=[...a],p=!0,m=()=>{d.forEach(e=>e.totalStudents=0);let n=[];u.forEach(e=>{let t=d.find(t=>t.classes.includes(e.name));t?t.totalStudents+=e.count:n.push(e)});let i=window.scrollY;e.innerHTML=`
        <!-- Locations Modal -->
        <div id="locationsModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-900/80" id="locationsModalOverlay"></div>
          <div class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg p-6 z-10">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-bold text-white text-lg">📍 Manage Locations</h4>
              <button id="btnCloseLocationsModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div class="flex gap-2 mb-4">
              <input type="text" id="newLocationInput" class="field flex-1" placeholder="Add a new room or location name...">
              <button id="btnAddLocation" class="btn btn-secondary">Add</button>
            </div>
            <div id="locationsList" class="flex flex-wrap gap-2 mb-6 min-h-[40px]">
              ${f.length?f.map((e,t)=>`
                <span class="badge badge-valid bg-white/10 text-white border border-white/20 px-3 py-1 flex items-center gap-2">
                  ${T(e)}
                  <button class="text-red-400 hover:text-red-300 font-bold delete-location" data-idx="${t}">&times;</button>
                </span>
              `).join(``):`<span class="text-slate-500 text-sm">No locations added yet.</span>`}
            </div>
            <div class="flex justify-end gap-2">
              <button id="btnCloseLocationsModal2" class="btn btn-secondary">Close</button>
              <button id="btnSaveLocations" class="btn btn-primary">💾 Save Locations</button>
            </div>
          </div>
        </div>

      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-xl font-bold text-white">Polling Booth Allotment</h3>
            <p class="text-slate-400 text-sm">Designate rooms and allot classes to polling booths.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button id="btnClearAll" class="btn btn-secondary border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white">🗑️ Clear All</button>
            <button id="btnAutoAllot" class="btn btn-secondary">⚡ Auto Allot</button>
            <button id="btnManageLocations" class="btn btn-secondary border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">📍 Manage Locations</button>
            <button id="btnSaveBooths" class="btn btn-primary">💾 Save Configuration</button>
            <button id="btnRegenPlan" class="btn btn-primary border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 px-4">🔄 Finalize Master Plan</button>
            <button id="btnPrintRolls" class="btn btn-secondary">🖨️ Print Electoral Rolls</button>
            <button id="btnPrintBallotAccounts" class="btn btn-secondary border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white">📑 Print Ballot Accounts</button>
          </div>
        </div>
        <div id="printArea" class="hidden"></div>




        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-indigo-500">
          <div class="flex justify-between items-center mb-4">
            <h4 class="font-bold text-white">Booth Setup</h4>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-slate-300 mb-0">Total Booths:</label>
              <input type="number" id="numBoothsInput" class="field w-20 py-1" min="1" max="20" value="${d.length}">
              <button id="btnUpdateBoothCount" class="btn btn-secondary btn-sm">Update</button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="boothsContainer">
            ${d.map((e,t)=>`
              <div class="border border-white/10 rounded-lg p-3 bg-white/5 shadow-inner">
                <div class="text-[10px] text-slate-500 font-bold uppercase mb-1 flex justify-between">
                  <span>Booth ${t+1}</span>
                  <span class="${e.totalStudents>0?`text-indigo-400`:``}">${e.totalStudents} Students</span>
                </div>
                <select class="field text-sm py-1 mb-2 room-name-select" data-idx="${t}">
                  <option value="">-- Assign Location --</option>
                  ${f.map(n=>`
                    <option value="${T(n)}" 
                      ${e.roomName===n?`selected`:``}
                      ${d.some((e,r)=>r!==t&&e.roomName===n)?`disabled`:``}
                    >${T(n)}</option>
                  `).join(``)}
                </select>
                <div class="text-xs text-slate-500 h-16 overflow-y-auto bg-black/20 rounded p-1">
                  ${e.classes.length?e.classes.map(e=>`<div class="whitespace-nowrap overflow-hidden text-ellipsis">• ${T(e)} (${l[e]?.count||0})</div>`).join(``):`<em class="opacity-30">No classes assigned</em>`}
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
                ${u.map(e=>{let t=d.find(t=>t.classes.includes(e.name));return`
                    <tr>
                      <td class="text-xs text-slate-400">${T(e.dept)}</td>
                      <td class="font-medium text-sm text-white">${T(e.name)}</td>
                      <td class="font-mono text-indigo-300">${e.count}</td>
                      <td>
                        <select class="field w-full md:w-44 py-1 text-xs class-booth-select" data-class="${T(e.name)}">
                          <option value="">-- Unassigned --</option>
                          ${d.map((e,n)=>`
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
    `,p||window.scrollTo(0,i),p=!1,e.querySelector(`#btnClearAll`).addEventListener(`click`,()=>{confirm(`Clear all class allotments? Room locations will be kept.`)&&(d.forEach(e=>e.classes=[]),m())}),e.querySelector(`#btnPrintRolls`).addEventListener(`click`,()=>{let t=e.querySelector(`#printArea`);t.innerHTML=h(d,r,o,l,s,c);let n=window.open(``,`_blank`);n.document.write(`
        <html>
          <head>
            <title>Electoral Rolls - Booth Allotment</title>
            <style>
              @page { size: A4 portrait; margin: 10mm 12mm; }
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; font-size: 11px; }
              .facing-sheet { padding: 0; page-break-before: always; break-before: page; page-break-after: always; break-after: page; display: flex; flex-direction: column; min-height: 275mm; }
              .facing-sheet:first-of-type { page-break-before: avoid; break-before: avoid; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
              .college-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
              .title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
              .stats-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555; }
              .stats-table th, .stats-table td { border: 1px solid #555; padding: 4px 6px; text-align: left; }
              .stats-table th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; font-weight: bold; }
              .footer { display: flex; justify-content: space-between; margin-top: 20px; padding: 0 30px; }
              .sig-line { border-top: 1.5px solid #000; padding-top: 5px; width: 160px; text-align: center; font-size: 11px; font-weight: bold; }
              .roll-page { page-break-before: always; break-before: page; }
              .roll-page:first-of-type { page-break-before: avoid; break-before: avoid; }
              .roll-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 4px; font-size: 11px; }
              .roll-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #555; table-layout: fixed; }
              .roll-table thead { display: table-header-group; }
              .roll-table tbody { orphans: 4; widows: 4; }
              .roll-table th { background: #e8e8e8; font-weight: bold; text-transform: uppercase; font-size: 9px; border: 1px solid #555; padding: 4px 4px; }
              .roll-table td { border: 1px solid #555; padding: 2px 4px; font-size: 10px; }
              .roll-table tr { page-break-inside: avoid; break-inside: avoid; height: 20px; }
              @media print {
                .no-print { display: none; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${t.innerHTML}
          </body>
        </html>
      `),n.document.close(),n.focus(),setTimeout(()=>{n.print()},500)}),e.querySelector(`#btnPrintBallotAccounts`).addEventListener(`click`,()=>{let t=e.querySelector(`#printArea`);t.innerHTML=g(d,r,o,l,s,c);let n=window.open(``,`_blank`);n.document.write(`
        <html>
          <head>
            <title>Ballot Accounts - Booth Wise</title>
            <style>
              body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .account-page { padding: 25px; display: flex; flex-direction: column; box-sizing: border-box; border: 1px solid #ccc; margin: 10px; min-height: 275mm; position: relative; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .college-name { font-size: 20px; font-weight: bold; margin-bottom: 3px; }
              .title { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .stats-table { width: 99.5%; margin: 0 auto; border-collapse: collapse; border: 1.5px solid #000; }
              .stats-table th, .stats-table td { border: 1px solid #000; padding: 6px 10px; text-align: left; font-size: 11px; }
              .stats-table th { background: #f2f2f2; font-size: 11px; text-transform: uppercase; font-weight: bold; }
              .footer { display: flex; justify-content: flex-end; margin-top: 30px; padding-right: 30px; }
              .sig-line { border-top: 1.5px solid #000; padding-top: 8px; width: 220px; text-align: center; font-size: 13px; font-weight: bold; }
              @media print { .no-print { display: none; } .page-break { page-break-after: always; } }
            </style>
          </head>
          <body>${t.innerHTML}</body>
        </html>
      `),n.document.close(),n.focus(),setTimeout(()=>{n.print()},500)}),e.querySelector(`#btnUpdateBoothCount`).addEventListener(`click`,()=>{let t=parseInt(e.querySelector(`#numBoothsInput`).value,10);if(t>0&&t<=50){if(t>d.length)for(let e=d.length;e<t;e++)d.push({boothNumber:e+1,roomName:``,classes:[]});else t<d.length&&(d=d.slice(0,t));m()}}),e.querySelectorAll(`.room-name-select`).forEach(e=>{e.addEventListener(`change`,e=>{d[e.target.dataset.idx].roomName=e.target.value,m()})});let a=e.querySelector(`#locationsModal`),v=()=>a.classList.add(`hidden`),y=()=>a.classList.remove(`hidden`),b=()=>{let e=a.querySelector(`#locationsList`);e.innerHTML=f.length?f.map((e,t)=>`
        <span class="badge badge-valid bg-white/10 text-white border border-white/20 px-3 py-1 flex items-center gap-2">
          ${T(e)}
          <button class="text-red-400 hover:text-red-300 font-bold delete-location" data-idx="${t}">&times;</button>
        </span>
      `).join(``):`<span class="text-slate-500 text-sm">No locations added yet.</span>`,e.querySelectorAll(`.delete-location`).forEach(e=>{e.addEventListener(`click`,e=>{let t=parseInt(e.target.dataset.idx),n=f[t];f.splice(t,1),d.forEach(e=>{e.roomName===n&&(e.roomName=``)}),b()})})};e.querySelector(`#btnManageLocations`).addEventListener(`click`,y),e.querySelector(`#btnCloseLocationsModal`).addEventListener(`click`,v),e.querySelector(`#btnCloseLocationsModal2`).addEventListener(`click`,v),e.querySelector(`#locationsModalOverlay`).addEventListener(`click`,v),e.querySelector(`#btnAddLocation`).addEventListener(`click`,()=>{let t=e.querySelector(`#newLocationInput`).value.trim();t&&!f.includes(t)&&(f.push(t),e.querySelector(`#newLocationInput`).value=``,b())}),e.querySelector(`#newLocationInput`).addEventListener(`keydown`,t=>{t.key===`Enter`&&e.querySelector(`#btnAddLocation`).click()}),b(),e.querySelector(`#btnSaveLocations`).addEventListener(`click`,async e=>{let n=e.target;E(n,!0,`💾 Save Locations`);try{await C.adminSaveLocations(t,f),D(`Locations saved! Refresh booths to see updated room list.`,`success`),v(),m()}catch(e){D(`Failed to save: ${e.message}`,`error`)}finally{E(n,!1,`💾 Save Locations`)}}),e.querySelectorAll(`.class-booth-select`).forEach(e=>{e.addEventListener(`change`,e=>{let t=e.target.dataset.class,n=e.target.value;d.forEach(e=>{e.classes=e.classes.filter(e=>e!==t)}),n!==``&&d[parseInt(n,10)].classes.push(t),m()})}),e.querySelector(`#btnSaveBooths`).addEventListener(`click`,async e=>{let n=e.target;E(n,!0,`💾 Save Configuration`);try{await C.adminSaveBooths(t,d),D(`Booth configuration saved successfully!`,`success`)}catch(e){D(`Failed to save: ${e.message}`,`error`)}finally{E(n,!1,`💾 Save Configuration`)}}),e.querySelector(`#btnRegenPlan`).addEventListener(`click`,async e=>{let n=e.target,r=`🔄 Finalize Master Plan`;try{E(n,!0,r),D(`Calculating and saving Master Plan on server...`,`info`),await C.adminGenerateBallotPlan(t),D(`Master Plan finalized successfully! You can now print documents.`,`success`),c=await C.adminGetBallotPlan(t).catch(()=>null)}catch(e){D(e.message,`error`)}finally{E(n,!1,r)}}),e.querySelector(`#btnAutoAllot`).addEventListener(`click`,()=>{_(),m(),D(`Auto allotment complete. Please review and save.`,`info`)})},h=(e,t,r,i,a,o)=>{let s=``;return o?([...e].sort((e,t)=>e.boothNumber-t.boothNumber).forEach(e=>{if(!e.classes||e.classes.length===0)return;let r=t.filter(t=>e.classes.includes(String(t.CLASS).trim())).length,a=e.classes.map(e=>i[e]).filter(Boolean),c=o.boothAssignments[e.boothNumber]||{general:null,reps:[],assocs:[]};s+=`
      <div class="facing-sheet">
          <div class="header">
            <div class="college-name">${T(n.COLLEGE_NAME||`COLLEGE UNION ELECTION`)}</div>
            <div class="title">Electoral Roll — Booth Facing Sheet</div>
          </div>
          
          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 8px;">
            <div>
              <strong>BOOTH:</strong> <span style="font-size: 20px; border: 2px solid #000; padding: 2px 12px; margin-left: 5px;">${e.boothNumber}</span>
              <span style="margin-left: 20px;"><strong>LOCATION:</strong> ${T(e.roomName||`UNSPECIFIED`)}</span>
            </div>
            <div style="text-align: right; font-size: 10px; color: #666;">
              Ref: ${new Date().getFullYear()} Election
            </div>
          </div>

          <div style="flex: 1; display: flex; flex-direction: column; margin-bottom: 20px;">
            <h4 style="border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase;">1. Allocation Statistics</h4>
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="width:25%; font-size:11px;">Department</th>
                  <th style="font-size:11px;">Class Name</th>
                  <th style="text-align:right; width:15%; font-size:11px;">Voters</th>
                </tr>
              </thead>
              <tbody>
                ${a.map(e=>`
                  <tr><td style="font-size:13px; font-weight:bold;">${T(e.dept)}</td><td style="font-size:13px;">${T(e.name)}</td><td style="text-align:right; font-size:13px; font-weight:bold;">${e.count}</td></tr>
                `).join(``)}
                <tr style="font-weight:bold; background:#eee">
                  <td colspan="2" style="font-size:12px;">TOTAL VOTERS ALLOTTED TO THIS BOOTH</td>
                  <td style="text-align:right; font-size:14px;">${r}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="flex: 1.5; display: flex; flex-direction: column; margin-bottom: 20px;">
            <h4 style="border-bottom: 2px solid #000; padding-bottom: 3px; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase;">2. Ballots &amp; Books Account (To be filled by PO)</h4>
            <table class="stats-table" style="flex: 1; font-size: 12px;">
              <thead>
                <tr>
                  <th style="width:20%; font-size:11px;">Ballot Category</th>
                  <th style="width:15%; font-size:11px;">Serial Range</th>
                  <th style="width:10%; text-align:center; font-size:11px;">Total Qty</th>
                  <th style="width:18%; font-size:11px;">Book IDs</th>
                  <th style="width:10%; text-align:center; font-size:11px;">Ballots Used</th>
                  <th style="width:10%; text-align:center; font-size:11px;">Ballots Returned</th>
                  <th style="font-size:11px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${c.general?`
                  <tr style="font-weight:bold">
                    <td style="font-size:12px;">General Union Posts</td>
                    <td style="font-size:12px;">G${c.general.start} - G${c.general.end}</td>
                    <td style="text-align:center; font-size:13px;">${c.general.count}</td>
                    <td style="font-size:11px;">${c.general.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `:``}
                ${c.reps.map(e=>`
                  <tr>
                    <td style="font-size:12px; font-weight:bold;">${T(e.post)}</td>
                    <td style="font-size:12px;">R${e.start} - R${e.end}</td>
                    <td style="text-align:center; font-size:13px;">${e.count}</td>
                    <td style="font-size:11px;">${e.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join(``)}
                ${c.assocs.map(e=>`
                  <tr>
                    <td style="font-size:12px; font-weight:bold;">${T(e.post)}</td>
                    <td style="font-size:12px;">A${e.start} - A${e.end}</td>
                    <td style="text-align:center; font-size:13px;">${e.count}</td>
                    <td style="font-size:11px;">${e.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join(``)}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <div class="sig-line">Returning Officer</div>
            <div class="sig-line">Presiding Officer</div>
          </div>
        </div>`,a.forEach(n=>{let r=t.filter(e=>String(e.CLASS).trim()===n.name);r.sort((e,t)=>String(e.NAME).localeCompare(String(t.NAME))),s+=`
        <div class="roll-page">
          <div class="roll-header">
            <div><strong>BOOTH ${e.boothNumber}</strong> | ${T(e.roomName||`No Room`)}</div>
            <div style="text-align:center; flex-grow:1; font-weight:bold; font-size:13px;">ELECTORAL ROLL — ${T(n.name)}</div>
            <div>Dept: ${T(n.dept)}</div>
          </div>
          <table class="roll-table">
            <thead>
              <tr>
                <th style="width:38px">Sl.No</th>
                <th style="width:70px">Adm. No</th>
                <th>Student Name</th>
                <th style="width:180px">Class</th>
                <th style="width:80px">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${r.map(e=>`
                <tr>
                  <td style="text-align:center; font-weight:bold;">${T(String(e[`Nominal Roll Serial Number`]||`–`))}</td>
                  <td style="font-family:monospace; font-size:9px; white-space:nowrap;">${T(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                  <td style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${T(e.NAME)}</td>
                  <td style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${T(e.CLASS)}</td>
                  <td></td>
                </tr>
              `).join(``)}
            </tbody>
          </table>
        </div>`})}),s):`<div class="alert alert-error">❌ Master Ballot Plan not generated. Please generate it from the Ballot Printing page first.</div>`},g=(e,t,r,i,a,o)=>{let s=``;return o?([...e].sort((e,t)=>e.boothNumber-t.boothNumber).forEach(e=>{if(!e.classes||e.classes.length===0)return;let t=o.boothAssignments[e.boothNumber]||{general:null,reps:[],assocs:[]},r=t.general?[{name:`General Union Posts`,count:t.general.count}]:[],i=t.reps.map(e=>({name:e.post,count:e.count})),a=t.assocs.map(e=>({name:e.post,count:e.count})),c=[...r,...i,...a];s+=`
      <div class="page-break">
        <div class="account-page">
          <div>
            <div class="header">
              <div class="college-name">${T(n.COLLEGE_NAME||`COLLEGE UNION ELECTION`)}</div>
              <div class="title">Ballots & Books Account (To be filled by PO)</div>
            </div>
            
            <div style="font-size: 16px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 10px; border: 1px solid #ddd;">
              <div><strong>BOOTH NUMBER:</strong> <span style="font-size: 22px; font-weight: bold; margin-left: 10px;">${e.boothNumber}</span></div>
              <div style="text-align: right;"><strong>LOCATION:</strong> ${T(e.roomName||`UNSPECIFIED`)}</div>
            </div>

          <div style="flex: 1; display: flex; flex-direction: column; margin-top: 10px; margin-bottom: 20px;">
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr>
                  <th style="width:25%; font-size:12px;">Ballot Category</th>
                  <th style="width:20%; font-size:12px;">Serial Range</th>
                  <th style="width:10%; text-align:center; font-size:12px;">Total Qty</th>
                  <th style="width:15%; text-align:center; font-size:12px;">No. Used</th>
                  <th style="width:15%; text-align:center; font-size:12px;">No. Returned</th>
                  <th style="font-size:12px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${t.general?`
                  <tr style="font-weight:bold;">
                    <td style="font-size:13px;">General Union Posts</td>
                    <td style="font-size:13px;">G${t.general.start} - G${t.general.end}</td>
                    <td style="text-align:center; font-size:14px;">${t.general.count}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `:``}
                ${t.reps.map(e=>`
                  <tr>
                    <td style="font-size:13px; font-weight:bold;">${T(e.post)}</td>
                    <td style="font-size:13px;">R${e.start} - R${e.end}</td>
                    <td style="text-align:center; font-size:14px;">${e.count}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join(``)}
                ${t.assocs.map(e=>`
                  <tr>
                    <td style="font-size:13px; font-weight:bold;">${T(e.post)}</td>
                    <td style="font-size:13px;">A${e.start} - A${e.end}</td>
                    <td style="text-align:center; font-size:14px;">${e.count}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join(``)}
              </tbody>
            </table>
            
            <div style="margin-top: 15px; font-size: 12px; color: #555; background: #fffde7; padding: 10px; border: 1px dashed #fbc02d;">
              <strong>Note:</strong> Total Qty should be equal to (Number of Ballots Used + Number of Ballots Returned). Please record any discrepancies in the Remarks column.
            </div>
          </div>

          <div style="flex: 1.2; display: flex; flex-direction: column; margin-bottom: 10px;">
            <h4 style="margin: 0 0 8px 0; font-size: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 2px;">3. Account of Votes (To be filled by PO)</h4>
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr>
                  <th style="width:35%; font-size:12px;">Name of Post</th>
                  <th style="width:15%; text-align:center; font-size:12px;">Total Voters Assigned</th>
                  <th style="width:20%; text-align:center; font-size:12px;">No. of Votes Recorded</th>
                  <th style="width:30%; font-size:12px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${c.map(e=>`
                  <tr>
                    <td style="font-size: 13px; font-weight: bold;">${T(e.name)}</td>
                    <td style="text-align:center; font-weight:bold; font-size:14px;">${e.count}</td>
                    <td></td>
                    <td></td>
                  </tr>
                `).join(``)}
              </tbody>
            </table>
          </div>
          </div>

          <div class="footer">
            <div class="sig-line">Presiding Officer</div>
          </div>
        </div>
      </div>`}),s):`<div class="alert alert-error">❌ Master Ballot Plan not generated.</div>`},_=()=>{d.forEach(e=>{e.classes=[],e.totalStudents=0});let e={};u.forEach(t=>{e[t.dept]||(e[t.dept]={name:t.dept,total:0,classes:[]}),e[t.dept].classes.push(t),e[t.dept].total+=t.count});let t=d.length,n=r.length/t*1.25;Object.values(e).sort((e,t)=>t.total-e.total).forEach(e=>{d.sort((e,t)=>e.totalStudents-t.totalStudents);let t=d[0];if(t.totalStudents+e.total>n&&e.classes.length>1){d.sort((e,t)=>e.totalStudents-t.totalStudents);let t=d[0],n=d.length>1?d[1]:d[0];[...e.classes].sort((e,t)=>t.count-e.count).forEach(e=>{let r=t.totalStudents<=n.totalStudents?t:n;r.classes.push(e.name),r.totalStudents+=e.count})}else e.classes.forEach(e=>t.classes.push(e.name)),t.totalStudents+=e.total}),d.sort((e,t)=>e.boothNumber-t.boothNumber)};m()}async function We(e){let t=L();if(t){R(e,`counting`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading Counting Setup...</p></div>
  `);try{let[n,r,i,a,o]=await Promise.all([C.adminGetCountingMatrix(t).catch(()=>null),C.getPosts(),C.adminGetNominations(t).catch(()=>[]),C.adminGetBooths(t),C.getNominalRoll()]),s=(Array.isArray(i)?i:[]).filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`);Ge(e.querySelector(`#adminMain`),t,n,r,s,a,o)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function Ge(e,t,n,r,i,a,o){if(!a.length){e.innerHTML=`<div class="alert alert-error">❌ No booths configured.</div>`;return}if(!r.length){e.innerHTML=`<div class="alert alert-error">❌ No posts configured.</div>`;return}let s=e=>String(e.post||e.name||``),c=t=>{let{matrix:n,formSerials:o,totalRounds:c,roundLabels:u}=t,d=a.length;e.innerHTML=`
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
                ${u.map(e=>`<th>${T(e)}</th>`).join(``)}
              </tr></thead>
              <tbody>
                ${a.map((e,t)=>`
                  <tr>
                    <td class="font-bold text-indigo-300 whitespace-nowrap">
                      Table ${e.boothNumber}<br>
                      <span class="text-xs text-slate-500 font-normal">${T(e.roomName||``)}</span>
                    </td>
                    ${n[t].map((e,n)=>`
                      <td class="align-top py-2 min-w-[100px]">
                        ${e?`<div class="text-[10px] text-slate-500 mb-0.5 font-mono">#${o[`${t}-${n}`]}</div>
                             <div class="badge badge-valid block text-left" title="${T(s(e))}">${T(s(e))}</div>`:`<span class="text-slate-600">–</span>`}
                      </td>`).join(``)}
                  </tr>`).join(``)}
              </tbody>
            </table>
          </div>
        </div>
      </div>`,e.querySelector(`#btnRegenerate`).addEventListener(`click`,()=>{confirm(`Are you sure? This will discard the current matrix and generate a new one based on current Booths and Posts. Results entry serial numbers may change!`)&&l()}),e.querySelector(`#btnPrintForms`).addEventListener(`click`,()=>{let e=``,t=0;for(let r=0;r<c;r++)for(let c=0;c<d;c++){let l=n[c][r];if(!l)continue;let u=s(l),d=o[`${c}-${r}`],f=i.filter(e=>e.post===u);e+=Ke(a[c].boothNumber,r+1,u,f,d),t++}if(!t){alert(`No forms generated.`);return}let r=window.open(``,`_blank`);if(!r){alert(`Pop-up blocked.`);return}r.document.write(`<!DOCTYPE html><html><head><title>Counting Forms</title><style>
        @page{size:A4;margin:12mm}*{box-sizing:border-box}
        body{margin:0;font-family:Arial,sans-serif;background:#fff;color:#000}
        .pg{page-break-after:always;padding:10px;position:relative}.pg:last-child{page-break-after:avoid}
        .serial-tag{position:absolute;top:10px;right:10px;border:2px solid #000;padding:5px 12px;font-family:monospace;font-size:18px;font-weight:bold}
        table{width:100%;border-collapse:collapse;margin-bottom:18px}
        th,td{border:1.5px solid #000;padding:8px}th{background:#eee}
      </style></head><body>${e}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`),r.document.close()})},l=async()=>{let n=a.length,i=e=>{let t=s(e);return t.toUpperCase().startsWith(`ASSOCIATION SECRETARY `)?t.substring(22).toUpperCase().trim():null},l={};o.forEach(e=>{let t=String(e.CLASS||``).trim(),n=String(e.Dept||``).trim().toUpperCase();t&&n&&(l[t]=n)});let u=a.map(e=>new Set((e.classes||[]).map(e=>l[e]||``).filter(Boolean))),d=a.map(e=>{let t=new Set;return(e.classes||[]).forEach(e=>{let n=e.toUpperCase();[`MA`,`MSC`,`MCOM`,`M.SC`,`M.COM`,`M.A`].some(e=>n.includes(e))?t.add(`PG`):(n.includes(`1ST YEAR`)&&t.add(`1`),n.includes(`2ND YEAR`)&&t.add(`2`),n.includes(`3RD YEAR`)&&t.add(`3`))}),t}),f=r.filter(e=>{let t=s(e).toUpperCase();return t.includes(`UUC`)||t.includes(`UNIVERSITY UNION COUNCILLOR`)}),p=r.filter(e=>!f.includes(e)&&s(e).toUpperCase().includes(`ASSOCIATION`)),m=r.filter(e=>!f.includes(e)&&!p.includes(e)&&e.yearRestriction&&String(e.yearRestriction).trim()!==``),h=r.filter(e=>!f.includes(e)&&!p.includes(e)&&!m.includes(e)),g=h.length,_=Array.from({length:n},(e,t)=>{let n=[];p.forEach(e=>{let r=i(e);r&&u[t].has(r)&&n.push(e)}),m.forEach(e=>{d[t].has(String(e.yearRestriction))&&n.push(e)});for(let e=0;e<g;e++)n.push(h[(t+e)%g]);return f.forEach(e=>n.push(e)),n}),v=Math.max(..._.map(e=>e.length),0);_.forEach(e=>{for(;e.length<v;)e.push(null)});let y={},b=1;for(let e=0;e<v;e++)for(let t=0;t<n;t++)_[t][e]&&(y[`${t}-${e}`]=b++);let x=[];for(let e=0;e<v;e++)x.push(`Round ${e+1}`);let S={matrix:_,formSerials:y,totalRounds:v,roundLabels:x};try{e.innerHTML=`<div class="text-center py-20"><span class="spinner"></span><p class="mt-4 text-slate-400">Saving Matrix...</p></div>`,await C.adminSaveCountingMatrix(t,S),D(`Counting Matrix saved successfully!`,`success`),c(S)}catch(e){D(`Error saving matrix: `+e.message,`error`),c(S)}};n?c(n):(e.innerHTML=`
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
        <div class="text-5xl mb-4">🧩</div>
        <h3 class="text-xl font-bold text-white mb-2">No Matrix Found</h3>
        <p class="text-slate-400 mb-6">The counting matrix has not been generated and saved yet.</p>
        <button id="btnInitialGenerate" class="btn btn-primary px-10">Generate Matrix Now</button>
      </div>
    `,e.querySelector(`#btnInitialGenerate`).addEventListener(`click`,l))}function Ke(e,t,n,r,i){let a=r.length?r.map((e,t)=>`<tr>
        <td style="text-align:center;padding:18px 8px;font-weight:bold">${t+1}</td>
        <td style="padding:18px 8px;font-size:15px;font-weight:bold">
          ${T(e.candidateName||``)}
          <div style="font-size:11px;font-weight:normal;color:#333;margin-top:2px;">${T(e.candidateClass||``)}</div>
        </td>
        <td style="padding:18px 8px"></td></tr>`).join(``):`<tr><td colspan="3" style="padding:14px;text-align:center;color:#555">No Candidates Found</td></tr>`;return`<div class="pg">
    <div class="serial-tag">FORM #${i}</div>
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px;padding-right:100px;">
      <div style="font-size:11px;color:#555">${collegeName} — College Union Election</div>
      <h2 style="margin:6px 0 0;font-size:20px;text-transform:uppercase;letter-spacing:2px">Counting Form</h2>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:15px;font-weight:bold">
        <span>TABLE: <u>${e}</u></span><span>ROUND: <u>${t}</u></span>
      </div>
      <h3 style="margin:10px 0 0;font-size:15px;text-decoration:underline;text-transform:uppercase">POST: ${T(n)}</h3>
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
  </div>`}var U=[],W=!1,qe=null;window.addEventListener(`beforeunload`,e=>{U.some(e=>e.status===`pending`||e.status===`syncing`||e.status===`retry`)&&(e.preventDefault(),e.returnValue=`You have unsaved forms syncing in the background. Are you sure you want to leave?`)});function G(e){U.forEach(t=>{t.payload&&t.payload.forEach(t=>{let n=e.findIndex(e=>String(e.TableNumber)===String(t.TableNumber)&&String(e.Post)===t.Post&&e.CandidateId===t.CandidateId);n>=0?(e[n].Votes=t.Votes,e[n].RoundNumber=t.RoundNumber,e[n].FormSerial=t.FormSerial):e.push({...t})})})}async function Je(e){let t=L();if(t){R(e,`results-entry`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading data...</p></div>
  `);try{let[n,r,i,a,o]=await Promise.all([C.adminGetBooths(t).catch(()=>[]),C.getPosts(),C.adminGetNominations(t).catch(()=>[]),C.getResults().catch(()=>[]),C.adminGetCountingMatrix(t).catch(()=>null)]),s=(Array.isArray(i)?i:[]).filter(e=>e.status===`Valid`&&e.withdrawalStatus!==`Approved`);Ye(e.querySelector(`#adminMain`),t,n,r,s,a,o)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function Ye(e,t,n,r,i,a,o){let s=e=>String(e.post||e.name||``);if(!o){e.innerHTML=`
      <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
        <div class="text-5xl mb-4">⚠️</div>
        <h3 class="text-xl font-bold text-white mb-2">Matrix Not Set</h3>
        <p class="text-slate-400 mb-6">The Counting Matrix must be generated and saved in the "Counting Setup" page before you can enter results.</p>
      </div>
    `;return}let{matrix:c,formSerials:l}=o,u={};Object.entries(l).forEach(([e,t])=>{let[n,r]=e.split(`-`).map(Number),i=c[n][r];u[t]={t:n,r,postName:s(i)}});let d={};Object.entries(l).forEach(([e,t])=>{let[r,i]=e.split(`-`).map(Number),a=c[r][i];d[t]={serial:t,tableNum:n[r]?.boothNumber,postName:s(a),roundNum:i+1}}),e.innerHTML=`
    <div class="page-enter w-full max-w-[1500px] mx-auto">
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

        <!-- LEFT: Entry Panel -->
        <div class="xl:col-span-7 space-y-4">
          <div>
            <h3 class="text-xl font-bold text-white">Enter Vote Counts</h3>
            <p class="text-slate-400 text-sm">Enter the Form Serial Number from the counting form to load the entry sheet.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="glass rounded-xl p-5">
              <label class="block text-sm text-slate-300 mb-1">Form Serial Number</label>
              <div class="flex gap-2">
                <input type="number" id="txtSerial" class="field" placeholder="e.g. 15" autofocus>
                <button id="btnLoadBySerial" class="btn btn-primary px-6">Load Form</button>
              </div>
            </div>

            <div class="glass rounded-xl p-5 opacity-60">
              <label class="block text-sm text-slate-300 mb-1">Manual Selection (Fallback)</label>
              <div class="flex gap-2">
                <select id="selTable" class="field text-xs">
                  <option value="">Table...</option>
                  ${n.map(e=>`<option value="${e.boothNumber}">Table ${e.boothNumber}</option>`).join(``)}
                </select>
                <select id="selPost" class="field text-xs">
                  <option value="">Post...</option>
                  ${r.map(e=>`<option value="${T(e.post||e.name)}">${T(e.post||e.name)}</option>`).join(``)}
                </select>
                <button id="btnLoadForm" class="btn btn-secondary px-4 text-xs">Load</button>
              </div>
            </div>
          </div>

          <div id="entryFormArea"></div>
        </div>

        <!-- RIGHT: Entered Forms Ledger -->
        <div class="xl:col-span-5">
          <div class="glass rounded-xl overflow-hidden border border-white/10 xl:sticky xl:top-20">
            <!-- Header -->
            <div class="bg-gradient-to-r from-slate-900/80 to-indigo-900/60 p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h4 class="font-bold text-white text-sm">Forms Ledger</h4>
                <div id="ledgerSummary" class="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-0.5"></div>
              </div>
              <span id="ledgerCount" class="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 whitespace-nowrap">0/0 done</span>
            </div>
            <!-- Tabs -->
            <div class="flex border-b border-white/10 bg-slate-900/50">
              <button id="tabChips" class="ledger-tab active-tab px-4 py-2 text-xs font-semibold text-white border-b-2 border-indigo-400">All Forms</button>
              <button id="tabPending" class="ledger-tab px-4 py-2 text-xs font-semibold text-slate-400 border-b-2 border-transparent hover:text-white">⏳ Pending <span id="pendingTabCount" class="ml-1 bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full text-[10px]">0</span></button>
            </div>
            <!-- Legend (chips tab) -->
            <div id="panelChips" class="">
              <div class="flex flex-wrap gap-3 px-4 py-2 border-b border-white/10 bg-slate-900/60 text-[10px] text-slate-500">
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500/20 border border-green-500/40 inline-block"></span>Done</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-slate-800/80 border border-slate-700 inline-block"></span>Pending</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block"></span>Queued</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40 inline-block"></span>Syncing</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500/20 border border-red-500/40 inline-block"></span>Failed</span>
              </div>
              <div class="overflow-y-auto p-3" style="max-height: 55vh;">
                <div id="ledgerGrid" class="flex flex-wrap gap-1.5"></div>
              </div>
            </div>
            <!-- Pending list tab -->
            <div id="panelPending" class="hidden overflow-y-auto" style="max-height: 62vh;">
              <table class="w-full text-left">
                <thead class="sticky top-0 bg-slate-900/95 border-b border-white/10">
                  <tr>
                    <th class="px-3 py-2 text-[11px] text-slate-400 font-semibold w-14">Form #</th>
                    <th class="px-3 py-2 text-[11px] text-slate-400 font-semibold w-16">Table</th>
                    <th class="px-3 py-2 text-[11px] text-slate-400 font-semibold">Post</th>
                  </tr>
                </thead>
                <tbody id="pendingList"></tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;let f=e.querySelector(`#txtSerial`),p=e.querySelector(`#btnLoadBySerial`),m=async()=>{let e=f.value.trim();if(!e)return;let t=u[e];if(!t){D(`Invalid Serial Number: ${e}`,`error`);return}try{E(p,!0,`Loading...`),C.invalidateCache(`getResults`);let r=await C.getResults().catch(()=>[]);a.length=0,a.push(...r),G(a),h(n[t.t].boothNumber,t.postName,e,t.r+1)}catch{G(a),h(n[t.t].boothNumber,t.postName,e,t.r+1)}finally{E(p,!1,`Load Form`)}};p.addEventListener(`click`,m),f.addEventListener(`keypress`,e=>{e.key===`Enter`&&m()}),e.querySelector(`#btnLoadForm`).addEventListener(`click`,async()=>{let t=e.querySelector(`#selTable`).value,r=e.querySelector(`#selPost`).value;if(!t||!r){D(`Select Table and Post`,`warning`);return}let i=n.findIndex(e=>String(e.boothNumber)===String(t)),o=null,u=null;if(i>=0){for(let e=0;e<c[i].length;e++)if(s(c[i][e])===r){u=e+1,o=l[`${i}-${e}`];break}}try{E(e.querySelector(`#btnLoadForm`),!0,`...`),C.invalidateCache(`getResults`);let n=await C.getResults().catch(()=>[]);a.length=0,a.push(...n),G(a),h(t,r,o,u)}catch{G(a),h(t,r,o,u)}finally{E(e.querySelector(`#btnLoadForm`),!1,`Load`)}});let h=(n,r,o,s)=>{let c=e.querySelector(`#entryFormArea`),l=i.filter(e=>e.post===r);if(l.length===0){c.innerHTML=`<div class="alert alert-warning">No candidates found for ${T(r)}.</div>`;return}let u=a.filter(e=>String(e.TableNumber)===String(n)&&String(e.Post)===r),p=e=>u.find(t=>t.CandidateId===e)?.Votes||``;c.innerHTML=`
      <div class="glass rounded-xl overflow-hidden page-enter">
        <div class="bg-indigo-500/10 p-4 border-b border-indigo-500/20 flex justify-between items-center">
          <div>
            <h4 class="font-bold text-indigo-300">Table ${n} • Round ${s||`N/A`} • ${T(r)}</h4>
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
                  <div class="font-bold text-white">${T(e.candidateName)}</div>
                  <div class="text-xs text-slate-400">${T(e.candidateClass)}</div>
                </div>
              </div>
              <div class="w-32">
                <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="${T(e.id)}" data-cname="${T(e.candidateName)}" placeholder="0" value="${p(e.id)}" min="0">
              </div>
            </div>
          `).join(``)}
          
          <div class="border-t border-white/10 my-4"></div>

          <div class="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <div><div class="font-bold text-slate-300">NOTA</div></div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold vote-input" data-cid="NOTA" data-cname="NOTA" placeholder="0" value="${p(`NOTA`)}" min="0">
            </div>
          </div>
          
          <div class="flex items-center justify-between bg-red-500/5 p-4 rounded-lg border border-red-500/20">
            <div><div class="font-bold text-red-400">INVALID</div></div>
            <div class="w-32">
              <input type="number" class="field text-center text-lg font-bold border-red-500/30 vote-input" data-cid="INVALID" data-cname="Invalid" placeholder="0" value="${p(`INVALID`)}" min="0">
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
    `;let m=()=>{let e=0;c.querySelectorAll(`.vote-input`).forEach(t=>{e+=parseInt(t.value,10)||0});let t=c.querySelector(`#totalVotesDisplay`);t&&(t.textContent=e)};c.querySelectorAll(`.vote-input`).forEach(e=>{e.addEventListener(`input`,m)}),m(),c.querySelector(`#btnSaveVotes`).addEventListener(`click`,async()=>{let i=c.querySelectorAll(`.vote-input`),l=[];if(i.forEach(e=>{l.push({TableNumber:n,RoundNumber:s,Post:r,CandidateId:e.dataset.cid,CandidateName:e.dataset.cname,Votes:parseInt(e.value.trim(),10)||0,FormSerial:o||`N/A`})}),l.every(e=>e.Votes===0)&&!confirm(`All votes are 0. Are you sure you want to save?`))return;l.forEach(e=>{let t=a.findIndex(t=>String(t.TableNumber)===String(n)&&String(t.Post)===r&&t.CandidateId===e.CandidateId);t>=0?(a[t].Votes=e.Votes,a[t].RoundNumber=e.RoundNumber,a[t].FormSerial=e.FormSerial):a.push(e)});let u=Date.now().toString()+Math.random().toString(36).substr(2,5);U.push({id:u,serial:o||`Manual`,tableNum:n,postName:r,roundNum:s,payload:l,status:`pending`}),D(`Form #${o||`Manual`} queued!`,`info`),c.innerHTML=``,f.value=``,f.focus(),qe=t,q(e,a,d),K(e,a,d)})};q(e,a,d),U.some(e=>e.status===`pending`||e.status===`retry`)&&K(e,a,d)}async function K(e,t,n){if(!W){for(W=!0;U.some(e=>e.status===`pending`||e.status===`retry`);){let r=U.find(e=>e.status===`pending`||e.status===`retry`);r.status=`syncing`,q(e,t,n);try{await C.adminSaveResults(qe,r.payload),r.status=`success`}catch(e){r.status=`error`,r.errorMsg=e.message}q(e,t,n)}W=!1}}function q(e,t,n){let r=e.querySelector(`#ledgerGrid`),i=e.querySelector(`#ledgerCount`),a=e.querySelector(`#ledgerSummary`);if(!r)return;let o={};Object.keys(n).forEach(e=>{o[String(e)]=`pending`}),t.forEach(e=>{e.FormSerial&&e.FormSerial!==`N/A`&&(o[String(e.FormSerial)]=`server`)}),U.forEach(e=>{o[String(e.serial)]=e.status});let s=Object.keys(n).map(Number).sort((e,t)=>e-t),c=s.length,l=0,u=0,d=0,f=0;s.forEach(e=>{let t=o[String(e)]||`pending`;t===`server`||t===`success`?l++:t===`pending`?f++:t===`error`?d++:u++}),i&&(i.textContent=`${l}/${c} done`),a&&(a.innerHTML=`
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>${l} Done</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>${f} Pending</span>
      ${u>0?`<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>${u} Queued</span>`:``}
      ${d>0?`<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>${d} Failed</span>`:``}
    `);let p=e=>{let t=`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold select-none transition-all border cursor-pointer`;switch(e){case`server`:case`success`:return`${t} bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/40`;case`syncing`:return`${t} bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse cursor-default`;case`pending`:case`retry`:return`${t} bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/40`;case`error`:return`${t} bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/40 retry-btn`;default:return`${t} bg-slate-800/80 text-slate-500 border-slate-700 hover:bg-slate-700/80`}},m=(e,t,n)=>{let r=n[String(e)]||{},i=`Form #${e} | T-${r.tableNum||`?`} | ${r.postName||`?`}`,a=t===`syncing`?``:` | Dbl-click to load`;return t===`error`?`${i} | ❌ Failed${a} (${U.find(t=>String(t.serial)===String(e))?.errorMsg||``})`:t===`pending`?`${i} | ⏳ Not entered yet${a}`:t===`server`?`${i} | ☁️ In Sheet${a}`:t===`success`?`${i} | ✅ Saved${a}`:t===`syncing`?`${i} | 🔵 Syncing...`:i+a};r.innerHTML=s.map(e=>{let t=o[String(e)]||`not-entered`,r=U.find(t=>String(t.serial)===String(e));return`<button class="${p(t)}"
      title="${m(e,t,n)}"
      data-serial="${e}"
      ${t===`error`&&r?`data-id="${r.id}"`:``}
    >${e}</button>`}).join(``),r.querySelectorAll(`.retry-btn`).forEach(r=>{r.addEventListener(`click`,()=>{let i=r.dataset.id,a=U.find(e=>e.id===i);a&&(a.status=`retry`,q(e,t,n),K(e,t,n))})}),r.querySelectorAll(`button[data-serial]`).forEach(t=>{t.addEventListener(`dblclick`,()=>{let n=t.dataset.serial,r=e.querySelector(`#txtSerial`);r&&(r.value=n,e.querySelector(`#entryFormArea`)?.scrollIntoView({behavior:`smooth`,block:`start`}),r.dispatchEvent(new KeyboardEvent(`keypress`,{key:`Enter`,bubbles:!0})))})});let h=e.querySelector(`#pendingList`),g=e.querySelector(`#pendingTabCount`),_=s.filter(e=>(o[String(e)]||`pending`)===`pending`);if(g&&(g.textContent=_.length),h&&(_.length===0?h.innerHTML=`<tr><td colspan="3" class="px-3 py-8 text-center text-slate-500 italic text-sm">🎉 All forms entered!</td></tr>`:(h.innerHTML=_.map(e=>{let t=n[String(e)]||{};return`
          <tr class="border-b border-white/5 hover:bg-white/5 transition cursor-pointer pending-row" data-serial="${e}">
            <td class="px-3 py-2 font-bold text-slate-300 text-xs">#${e}</td>
            <td class="px-3 py-2 text-slate-400 text-xs">T-${t.tableNum||`?`}</td>
            <td class="px-3 py-2 text-slate-300 text-xs leading-tight">${T(t.postName||`?`)}</td>
          </tr>
        `}).join(``),h.querySelectorAll(`.pending-row`).forEach(t=>{t.addEventListener(`click`,()=>{let n=t.dataset.serial,r=e.querySelector(`#txtSerial`);r&&(r.value=n,r.dispatchEvent(new KeyboardEvent(`keypress`,{key:`Enter`,bubbles:!0})))})}))),!e.dataset.tabsInit){e.dataset.tabsInit=`1`;let t=e.querySelector(`#tabChips`),n=e.querySelector(`#tabPending`),r=e.querySelector(`#panelChips`),i=e.querySelector(`#panelPending`);t?.addEventListener(`click`,()=>{t.classList.add(`text-white`,`border-indigo-400`),t.classList.remove(`text-slate-400`,`border-transparent`),n.classList.remove(`text-white`,`border-indigo-400`),n.classList.add(`text-slate-400`,`border-transparent`),r.classList.remove(`hidden`),i.classList.add(`hidden`)}),n?.addEventListener(`click`,()=>{n.classList.add(`text-white`,`border-indigo-400`),n.classList.remove(`text-slate-400`,`border-transparent`),t.classList.remove(`text-white`,`border-indigo-400`),t.classList.add(`text-slate-400`,`border-transparent`),i.classList.remove(`hidden`),r.classList.add(`hidden`)})}}async function Xe(e){let t=L();if(!t)return;R(e,`Ballot Printing`,`
    <div class="text-center py-16">
      <span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span>
      <p class="text-slate-400 mt-4 text-sm">Preparing ballot generator...</p>
    </div>
  `);let r=e.querySelector(`#adminMain`);r.innerHTML=`
    <div class="space-y-6 page-enter">
      <div class="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">🗳️</span>
            Ballot Printing
          </h2>
          <p class="text-slate-400 mt-1">Generate official ballots by category. Each opens in a dedicated tab.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-indigo-500/50 transition-all">
          <div class="text-indigo-400 font-bold flex items-center gap-2">
            <span>🏆</span> General Union (A3)
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Main union posts in 2 columns. Designed for A3 paper. Chairman & Vice Chairman on top.
          </p>
          <button data-type="general" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate General Ballot</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-emerald-500/50 transition-all">
          <div class="text-emerald-400 font-bold flex items-center gap-2">
            <span>📅</span> Year Representatives (A5)
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            1st, 2nd, 3rd Year & PG Reps. Designed for A5 paper (one post per page).
          </p>
          <button data-type="year" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate Year Reps</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-amber-500/50 transition-all">
          <div class="text-amber-400 font-bold flex items-center gap-2">
            <span>🤝</span> Association Reps (A5)
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Departmental Association Secretaries. Designed for A5 paper (one post per page).
          </p>
          <button data-type="assoc" class="btn btn-primary w-full py-3 preview-btn">🖨️ Generate Association Ballots</button>
        </div>

        <div class="glass p-6 rounded-2xl border border-white/10 space-y-4 hover:border-purple-500/50 transition-all bg-purple-500/5">
          <div class="text-purple-400 font-bold flex items-center gap-2">
            <span>📊</span> Printing Summary
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Detailed serial number ranges and book counts for the printing company.
          </p>
          <button id="btnGenSummary" class="btn btn-secondary w-full py-3 border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white">📑 View Summary Report</button>
        </div>
      </div>
    </div>
  `;let i=e=>{let t=window.open(``,`_blank`);t.document.write(`
      <html>
        <head>
          <title>Official Ballots - ${n.COLLEGE_SHORT_NAME} Election</title>
          <style>
            @media print {
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
              body { background: white !important; }
              .ballot-container { margin: 0 !important; box-shadow: none !important; }
            }
            body { margin: 0; padding: 0; background: #eee; }
            
            .ballot-container {
              background: white;
              color: black;
              font-family: "Times New Roman", Times, serif;
              margin: 20px auto;
              box-shadow: 0 0 10px rgba(0,0,0,0.2);
              box-sizing: border-box;
              overflow: hidden;
            }

            .a3 { width: 297mm; min-height: 420mm; padding: 50px; }
            .a5 { width: 148mm; min-height: 210mm; padding: 25px; }

            .ballot-header { text-align: center; border-bottom: 3px double #000; margin-bottom: 25px; padding-bottom: 10px; }
            .ballot-header h1 { font-size: 22px; margin: 0; text-transform: uppercase; }
            .ballot-header h2 { font-size: 18px; margin: 5px 0 0 0; }
            
            .a3 .ballot-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              width: 100%;
              align-items: flex-start;
            }
            .a5 .ballot-grid { display: block; }

            .post-box { 
              border: 2px solid #000; 
              padding: 0; 
              display: flex; 
              flex-direction: column; 
              margin-bottom: 25px; 
              break-inside: avoid; 
              -webkit-column-break-inside: avoid;
              page-break-inside: avoid;
              width: 100%;
            }
            .post-title { background: #ccc; color: #000; text-align: center; padding: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #000; }
            
            .candidate-row { display: flex; align-items: center; border-bottom: 1px solid #000; height: 55px; }
            .candidate-row:last-child { border-bottom: none; }
            
            .sl-no { width: 40px; text-align: center; border-right: 1px solid #000; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; }
            .c-name { flex-grow: 1; padding: 0 15px; font-weight: bold; display: flex; flex-direction: column; justify-content: center; }
            .stamp-box { width: 75px; height: 100%; border-left: 1px solid #000; display: flex; align-items: center; justify-content: center; position: relative; }
            .stamp-box::after { content: ""; width: 35px; height: 35px; border: 1px dashed #ccc; border-radius: 4px; }
            
            .instr-box { text-align: center; border: 1px solid #000; padding: 8px; margin-bottom: 25px; font-weight: bold; font-size: 13px; text-transform: uppercase; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          ${e}
        </body>
      </html>
    `),t.document.close()},a=async(e=`all`)=>{let r,i,a,o;try{[r,i,a,o]=await Promise.all([C.adminGetPosts(t),C.getFinalNominations(),C.getPublicSchedule(),C.adminGetSettings(t).catch(()=>({}))])}catch(e){throw Error(e.message.includes(`not published`)?`Final List Not Published. Please finalize and publish the list first.`:e.message)}let s=o.collegeName||n.COLLEGE_NAME,c=o.collegeShortName||n.COLLEGE_SHORT_NAME,l=a.electionYear||new Date().getFullYear().toString(),u=i.active||[];if(u.length===0)throw Error(`No active candidates found.`);let d=e=>{let t=e.post.toLowerCase();return t.includes(`representative`)||t.includes(`year`)},f=e=>{let t=e.post.toLowerCase();return t.includes(`association`)||t.includes(`assoc`)},p=e=>!d(e)&&!f(e),m=r.filter(e=>u.filter(t=>t.post===e.post).length>1),h=``;if(e===`all`||e===`general`){let e=m.filter(p);if(e.length>0){h+=`
          <div class="ballot-container a3 page-break">
            <!-- Counterfoil -->
            <div style="border-bottom: 2px dotted #000; padding-bottom: 20px; margin-bottom: 30px; text-align: center;">
              <h1 style="font-size: 16px; margin: 0;">COLLEGE UNION ELECTION ${l}</h1>
              <h1 style="font-size: 18px; margin: 5px 0;">${T(s)}</h1>
              <h2 style="font-size: 14px; margin: 0;">OFFICIAL BALLOT PAPER (GENERAL) - COUNTERFOIL</h2>
              <div style="margin-top: 15px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>SL.NO. G____________</span>
                  <span style="font-size: 10px; color: #666; font-style: italic;">(To be detached before voting)</span>
                </div>
                <div style="font-size: 13px;">Sl. No of Voter in Marked Copy: ____________</div>
              </div>
            </div>

            <div class="ballot-header">
              <h1>COLLEGE UNION ELECTION ${l}</h1>
              <h1>${T(s)}</h1>
              <h2>OFFICIAL BALLOT PAPER (GENERAL)</h2>
            </div>
            <div class="meta-row"><div>SL.NO. G____________</div><div>Signature of PRO</div></div>
            <div class="instr-box">MARK THE VOTER'S CHOICE WITH THE MARKING SEAL IN THE SPACE PROVIDED</div>
            <div class="ballot-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: flex-start;">
              <div class="ballot-col" id="col1"></div>
              <div class="ballot-col" id="col2"></div>
            </div>
          </div>
        `;let t=[...e].sort((e,t)=>{let n=e.post.toLowerCase(),r=t.post.toLowerCase();return n.includes(`chairman`)&&!n.includes(`vice`)?-1:r.includes(`chairman`)&&!r.includes(`vice`)?1:n.includes(`vice chairman`)?-1:r.includes(`vice chairman`)||n.includes(`university union councillor`)||n.includes(`uuc`)?1:r.includes(`university union councillor`)||r.includes(`uuc`)?-1:0}),n=``,r=``;t.forEach((e,t)=>{let i=u.filter(t=>t.post===e.post),a=`
            <div class="post-box">
              <div class="post-title">${T(e.post.toUpperCase())}</div>
              ${i.map((e,t)=>`
                <div class="candidate-row">
                  <div class="sl-no">${t+1}</div>
                  <div class="c-name">
                    <div style="font-size: 13px; text-transform: uppercase;">${T(e.candidateName)}</div>
                    <div style="font-size: 10px; font-weight: normal; color: #444;">${T(e.candidateClass)}</div>
                  </div>
                  <div class="stamp-box"></div>
                </div>
              `).join(``)}
              <div class="candidate-row"><div class="sl-no">${i.length+1}</div><div class="c-name">NOTA</div><div class="stamp-box"></div></div>
            </div>
          `;t%2==0?n+=a:r+=a}),h=h.replace(`<div class="ballot-col" id="col1"></div>`,`<div class="ballot-col" id="col1">${n}</div>`),h=h.replace(`<div class="ballot-col" id="col2"></div>`,`<div class="ballot-col" id="col2">${r}</div>`)}}let g=m.filter(e=>d(e)||f(e));return(e===`all`||e===`year`||e===`assoc`)&&g.filter(t=>e===`all`||e===`year`&&d(t)||e===`assoc`&&f(t)).forEach(e=>{let t=u.filter(t=>t.post===e.post),n=d(e)?`R`:`A`;h+=`
          <div class="ballot-container a5 page-break">
            <!-- Counterfoil -->
            <div style="border-bottom: 2px dotted #000; padding-bottom: 15px; margin-bottom: 20px; text-align: center;">
              <h1 style="font-size: 14px; margin: 0;">${T(c)} ELECTION ${l}</h1>
              <h2 style="font-size: 12px; margin: 2px 0;">OFFICIAL BALLOT (${n}) - COUNTERFOIL</h2>
              <div style="margin-top: 10px; font-weight: bold; text-align: left; display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>SL.NO. ${n}____________</span>
                  <span style="font-size: 9px; color: #666; font-style: italic;">(To be detached)</span>
                </div>
                <div>Sl. No of Voter in Marked Copy: ____________</div>
              </div>
            </div>

            <div class="ballot-header">
              <h1>${T(c)} ELECTION ${l}</h1>
              <h2 style="font-size: 15px; margin-top: 5px; font-weight: bold;">BALLOT PAPER (${n})</h2>
            </div>
            <div class="meta-row" style="font-size: 12px;"><div>SL.NO. ${n}____________</div><div>PRO Sign</div></div>
            <div class="post-box">
              <div class="post-title">${T(e.post.toUpperCase())}</div>
              ${t.map((e,t)=>`
                <div class="candidate-row">
                  <div class="sl-no">${t+1}</div>
                  <div class="c-name">
                    <div style="font-size: 13px; text-transform: uppercase;">${T(e.candidateName)}</div>
                    <div style="font-size: 10px; font-weight: normal; color: #444;">${T(e.candidateClass)}</div>
                  </div>
                  <div class="stamp-box"></div>
                </div>
              `).join(``)}
              <div class="candidate-row"><div class="sl-no">${t.length+1}</div><div class="c-name">NOTA</div><div class="stamp-box"></div></div>
            </div>
          </div>
        `}),h},o=async e=>{try{D(`Generating ballots...`,`info`),i(await a(e))}catch(e){D(e.message,`error`)}},s=async()=>{try{D(`Calculating Master Plan...`,`info`);let[e,r,a]=await Promise.all([C.getPublicSchedule(),C.adminGetSettings(t).catch(()=>({})),C.adminGetBallotPlan(t).catch(()=>null)]);if(!a)return confirm(`No Master Plan found. Generate it now based on current final list and booths?`)?(await c(),s()):void 0;let o=a,l=e.electionYear||new Date().getFullYear(),u=r.collegeName||`Government Victoria College Palakkad`,d=e=>!e||Array.isArray(e)&&e.length===0?`-`:typeof e==`string`?e:`
          <table style="width:100%; border-collapse:collapse; font-size:10px; background:rgba(0,0,0,0.02);">
            ${e.map(e=>`
              <tr>
                <td style="padding:4px; border:1px solid #eee; font-weight:bold; width:45px;">${e.qty} x ${e.size}</td>
                <td style="padding:4px; border:1px solid #eee; line-height:1.4;">
                  ${e.items.map(e=>`<span style="display:inline-block; margin-right:8px;"><strong style="color:#4f46e5;">${e.id}:</strong> ${e.range}</span>`).join(` `)}
                </td>
              </tr>
            `).join(``)}
          </table>
        `;i(`
        <div style="padding: 40px; font-family: sans-serif; color: #333;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">BALLOT PRINTING SUMMARY - ${l}</h1>
            <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #666;">${T(u)}</h2>
          </div>

          <p style="font-size: 14px; margin-bottom: 20px;">
            This document provides the sequential serial number ranges for each ballot category. 
            <strong>Note:</strong> Rep and Association ballots are numbered <strong>Post-wise</strong> (one post is completed across all assigned booths before starting the next).
          </p>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #4f46e5;">1. General Union Ballots (Series: G1, G2, G3...)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #000;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 15%;">Booth No</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">Voters</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 15%;">Sl No From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 15%;">Sl No To</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 45%;">Book Breakdowns</th>
              </tr>
            </thead>
            <tbody>
              ${o.general.results.map(e=>`
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">Booth ${e.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${e.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">G${e.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${d(e.books||e.bookHtml)}</td>
                </tr>
              `).join(``)}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td style="border: 1px solid #ddd; padding: 10px;">TOTAL GENERAL</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${o.general.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">G${o.general.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #10b981;">2. Year Representative Ballots (Series: R1, R2, R3...)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #000;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 25%;">Post Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 10%;">Booth</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">Voters</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">To</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 35%;">Book Breakdowns</th>
              </tr>
            </thead>
            <tbody>
              ${o.reps.results.map(e=>`
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; font-size: 11px;">${T(e.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">B${e.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${e.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">R${e.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${d(e.books||e.bookHtml)}</td>
                </tr>
              `).join(``)}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL REPRESENTATIVE</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${o.reps.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">R${o.reps.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <h3 style="background: #eee; padding: 8px 15px; border-left: 5px solid #f59e0b;">3. Association Secretary Ballots (Series: A1, A2, A3...)</h3>
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 25%;">Post Name</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 10%;">Booth</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">Voters</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">From</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">To</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 35%;">Book Breakdowns</th>
              </tr>
            </thead>
            <tbody>
              ${o.assocs.results.map(e=>`
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px; font-size: 11px;">${T(e.post)}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">B${e.booth}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${e.count}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${e.start}</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">A${e.end}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${d(e.books||e.bookHtml)}</td>
                </tr>
              `).join(``)}
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #ddd; padding: 10px;">TOTAL ASSOCIATION</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${o.assocs.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A1</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">A${o.assocs.total}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">—</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; text-align: center;">
            Generated on ${new Date().toLocaleString()} | Official ${n.COLLEGE_SHORT_NAME} Election Portal
          </div>
        </div>
      `)}catch(e){D(e.message,`error`)}},c=async e=>{let n=e?.target,r=`🔄 Finalize Master Plan`;try{n&&E(n,!0,r),D(`Calculating and saving Master Plan on server...`,`info`),await C.adminGenerateBallotPlan(t),D(`Master Plan finalized successfully!`,`success`),n&&E(n,!1,r)}catch(e){n&&E(n,!1,r),D(e.message,`error`)}};r.querySelector(`#btnGenSummary`).onclick=s,r.querySelectorAll(`.preview-btn`).forEach(e=>{e.onclick=()=>o(e.dataset.type)})}function Ze(e){let t=L();if(!t)return;R(e,`testing`,`
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
            <p class="text-slate-400 text-sm">Creates 2 synthetic candidates for every post and <strong>automatically injects random vote counts</strong> for immediate results testing.</p>
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

Proceed?`))return;E(r,!0,`🧪 Inject Test Nominations`);let i=n.querySelector(`#injectStatus`);i.innerHTML=``;try{let e=await C.adminInjectTestData(t),n=e.skipped>0?`<br><span class="text-amber-400 text-xs mt-1 block">⚠️ ${e.skipped} post(s) skipped — not enough eligible students in NominalRoll: <em>${e.skippedPosts.join(`, `)}</em></span>`:``;i.innerHTML=`
        <div class="alert mt-3" style="background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #6ee7b7;">
          ✅ Successfully injected <strong>${e.injected}</strong> test nominations across posts. All rules (gender, year, dept) were respected.${n}
        </div>`,D(`Injected ${e.injected} test nominations!`,`success`)}catch(e){i.innerHTML=`<div class="alert alert-error mt-3">❌ ${T(e.message)}</div>`,D(`Failed: ${e.message}`,`error`)}finally{E(r,!1,`🧪 Inject Test Nominations`)}}),n.querySelector(`#btnWipeData`).addEventListener(`click`,async e=>{let t=e.target,r=n.querySelector(`#wipePasswordInput`).value.trim();if(!r){D(`Please enter the admin password to confirm the wipe.`,`warning`),n.querySelector(`#wipePasswordInput`).focus();return}if(!confirm(`⚠️ DANGER ZONE ⚠️

This will PERMANENTLY DELETE:
• All Nominations
• ValidList
• FinalList
• Results

This action CANNOT be undone.

Are you absolutely sure?`))return;E(t,!0,`🗑️ Wiping...`);let i=n.querySelector(`#wipeStatus`);i.innerHTML=``;try{await C.adminWipeData(r),n.querySelector(`#wipePasswordInput`).value=``,i.innerHTML=`
        <div class="alert mt-3" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #fca5a5;">
          ✅ All transactional data has been wiped. Publish flags reset to false.
        </div>`,D(`All data wiped successfully.`,`success`)}catch(e){i.innerHTML=`<div class="alert alert-error mt-3">❌ ${T(e.message)}</div>`,D(`Failed: ${e.message}`,`error`)}finally{E(t,!1,`🗑️ Permanently Wipe All Data`)}})}async function Qe(e){let t=L();if(t){R(e,`results`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Aggregating results...</p></div>
  `);try{let[n,r,i,a,o]=await Promise.all([C.getPosts(),C.getFinalNominations(),C.getResults().catch(()=>[]),C.getPublicSchedule().catch(()=>({})),C.adminGetSettings(t).catch(()=>({}))]);$e(e.querySelector(`#adminMain`),t,n,r.active||[],i,a,o)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function $e(e,t,n,r,i,a,o){let s=a.electionYear||new Date().getFullYear(),c=o.collegeName||`GOVERNMENT VICTORIA COLLEGE PALAKKAD`;o.collegeShortName;let l={};i.forEach(e=>{l[e.Post]||(l[e.Post]={}),l[e.Post][e.CandidateId]||(l[e.Post][e.CandidateId]=0),l[e.Post][e.CandidateId]+=Number(e.Votes)||0});let u=n.map(e=>{let t=r.filter(t=>t.post===e.post),n=l[e.post]||{};if(t.length===1)return{post:e.post,type:`unanimous`,winner:t[0],candidates:t};if(t.length===0)return{post:e.post,type:`no-candidates`};let i=t.map(e=>({...e,votes:n[e.id]||0}));i.sort((e,t)=>t.votes-e.votes);let a=i[0].votes,o=i.filter(e=>e.votes===a&&e.votes>0),s=o.length>1;return{post:e.post,type:`election`,candidates:i,winner:s?null:o[0],isTie:s,totalVotes:Object.values(n).reduce((e,t)=>e+t,0),nota:n.NOTA||0,invalid:n.INVALID||0}});e.innerHTML=`
    <div class="page-enter space-y-6">
      <div class="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <h3 class="text-2xl font-bold text-white">Election Results Summary</h3>
          <p class="text-slate-400 text-sm">Post-wise breakdown of votes and winning candidates.</p>
        </div>
        <button id="btnPrintOfficial" class="btn btn-primary px-8 flex items-center gap-2">
          <span>🖨️</span> Print Official Result Sheet
        </button>
      </div>

      <div class="grid grid-cols-1 gap-6">
        ${u.map(e=>{let t=e.post.toUpperCase().includes(`UUC`)||e.post.toUpperCase().includes(`UNIVERSITY`)?2:1,n=0;return e.type===`election`&&e.candidates.length>t&&(n=e.candidates[t].votes),`
            <div class="glass rounded-2xl overflow-hidden border border-white/5 page-enter shadow-lg">
              <div class="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                <h4 class="font-bold text-indigo-400 uppercase tracking-wider text-sm">${T(e.post)}</h4>
                ${e.type===`unanimous`?`<span class="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ELECTED UNANIMOUSLY</span>`:`<span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${e.isTie?`⚖️ TIE DETECTED`:`CONTESTED ELECTION`}</span>`}
              </div>
              <div class="p-6">
                ${e.type===`no-candidates`?`<p class="text-slate-500 italic text-sm text-center py-4">No valid nominations received for this post.</p>`:`
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="text-slate-500 text-[10px] uppercase tracking-widest text-left border-b border-white/5">
                        <th class="pb-3 font-bold">Candidate Name</th>
                        <th class="pb-3 font-bold text-center">Class</th>
                        <th class="pb-3 font-bold text-right">Votes</th>
                        <th class="pb-3 font-bold text-center w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      ${e.candidates.map((r,i)=>{let a=i<t&&r.votes>0,o=a?r.votes-n:0;return`
                          <tr class="${a?`bg-white/[0.02]`:``}">
                            <td class="py-4">
                              <div class="flex items-center gap-2">
                                <span class="font-bold text-white">${T(r.candidateName)}</span>
                                ${o>0?`<span class="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-green-500/30">LEAD: ${o}</span>`:``}
                              </div>
                            </td>
                            <td class="py-4 text-slate-400 text-center text-[11px]">${T(r.candidateClass)}</td>
                            <td class="py-4 text-right font-mono text-lg ${a?`text-emerald-400`:`text-slate-300`}">
                              ${e.type===`unanimous`?`—`:r.votes}
                            </td>
                            <td class="py-4 text-center">
                              ${a?`<span class="text-emerald-400 text-[10px] font-black border border-emerald-400/30 px-2 py-0.5 rounded bg-emerald-500/10">WINNING</span>`:``}
                            </td>
                          </tr>
                        `}).join(``)}
                    </tbody>
                  </table>

                  ${e.type===`election`?`
                    <div class="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                      <div class="flex justify-between items-center py-2 px-3 bg-white/5 rounded border border-white/5 text-[11px]">
                        <span class="text-slate-500 uppercase tracking-widest font-bold">NOTA</span>
                        <span class="text-white font-bold">${e.nota}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 px-3 bg-white/5 rounded border border-white/5 text-[11px]">
                        <span class="text-slate-500 uppercase tracking-widest font-bold">Invalid</span>
                        <span class="text-red-400/70 font-bold">${e.invalid}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 px-3 bg-indigo-500/10 rounded border border-indigo-500/20 text-[11px]">
                        <span class="text-indigo-300 uppercase tracking-widest font-bold">Valid Votes</span>
                        <span class="text-white font-black text-sm">${e.totalVotes-e.invalid}</span>
                      </div>
                      <div class="flex justify-between items-center py-2 px-3 bg-purple-500/10 rounded border border-purple-500/20 text-[11px]">
                        <span class="text-purple-300 uppercase tracking-widest font-bold">Grand Total</span>
                        <span class="text-white font-black text-sm">${e.totalVotes}</span>
                      </div>
                    </div>
                  `:``}
                  `}
              </div>
            </div>
          `}).join(``)}
      </div>
    </div>
  `,e.querySelector(`#btnPrintOfficial`).addEventListener(`click`,()=>{let e=`
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 20px; }
        .official-sheet { max-w: 850px; margin: 0 auto; padding: 40px; border: 1px solid #ddd; background: white; }
        .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { margin: 5px 0 0 0; font-size: 16px; color: #444; font-weight: 600; }
        .result-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .result-table th, .result-table td { border: 1px solid #000; padding: 12px 10px; font-size: 13px; }
        .result-table th { background: #f2f2f2; text-align: left; text-transform: uppercase; font-size: 11px; }
        .post-header { background: #f9f9f9; font-weight: bold; font-size: 14px; text-transform: uppercase; color: #000; }
        .winner-row { background: #fafff9 !important; font-weight: bold; }
        .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-start; }
        .sig-box { width: 250px; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-size: 12px; font-weight: bold; margin-top: 40px; }
        @media print {
          body { padding: 0; }
          .official-sheet { border: none; width: 100%; max-width: 100%; padding: 0; }
          .post-header { background-color: #eee !important; -webkit-print-color-adjust: exact; }
          .winner-row { background-color: #fafff9 !important; -webkit-print-color-adjust: exact; }
        }
      </style>
      <div class="official-sheet">
        <div class="header">
          <h1>College Union Election ${s}</h1>
          <h2>${T(c)}</h2>
          <div style="font-size: 18px; margin-top: 15px; font-weight: 900; text-decoration: underline;">OFFICIAL RESULT NOTIFICATION</div>
        </div>

        <p style="font-size: 14px; margin-bottom: 25px; text-align: justify;">
          The following candidates are hereby declared to have been duly elected to the respective offices of the College Union for the academic year ${s}, 
          based on the counting of votes held on ${new Date().toLocaleDateString(`en-IN`,{day:`numeric`,month:`long`,year:`numeric`})}.
        </p>

        <table class="result-table">
          <thead>
            <tr>
              <th style="width: 10%; text-align: center;">Sl. No.</th>
              <th style="width: 45%;">Name of Candidate</th>
              <th style="text-align: center; width: 15%;">Votes Secured</th>
              <th style="width: 30%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${u.map(e=>e.type===`no-candidates`?``:`
                <tr class="post-header">
                  <td colspan="4" style="background: #eaeaea; padding: 15px 10px; border-bottom: 2px solid #000;">
                    ${T(e.post)}
                  </td>
                </tr>
                ${e.candidates.map((t,n)=>{let r=e.winner&&e.winner.id===t.id;return`
                    <tr class="${r?`winner-row`:``}">
                      <td style="text-align: center; color: #555; font-size: 12px;">${n+1}</td>
                      <td style="font-weight: ${r?`bold`:`normal`}; font-size: 14px;">${T(t.candidateName)}</td>
                      <td style="text-align: center; font-weight: bold; font-size: 14px;">${e.type===`unanimous`?`—`:t.votes||0}</td>
                      <td style="font-size: 12px; font-weight: bold;">
                        ${r?e.type===`unanimous`?`ELECTED UNANIMOUSLY`:`✓ ELECTED`:``}
                      </td>
                    </tr>
                  `}).join(``)}
              `).join(``)}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-size: 13px;">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString(`en-IN`)}</p>
            <p><strong>Place:</strong> Palakkad</p>
          </div>
          <div class="sig-box">
            RETURNING OFFICER<br>
            <span style="font-weight: normal; font-size: 11px;">College Union Election ${s}</span>
          </div>
        </div>
      </div>
    `,t=window.open(``,`_blank`);if(!t){D(`Popup blocked! Please allow popups to print.`,`error`);return}t.document.write(`
      <html>
        <head><title>Election Results ${s}</title></head>
        <body>
          ${e}
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 500);
            });
          <\/script>
        </body>
      </html>
    `),t.document.close()})}var et=`election_results_cache`,J=`election_results_last_fetch`,tt=300*1e3;async function nt(e){e.innerHTML=`
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
  `;let t=e.querySelector(`#cacheTimer`),n=e.querySelector(`#btnRefresh`),r=()=>{let e=localStorage.getItem(J);if(!e){t.textContent=``,n.disabled=!1,n.classList.remove(`opacity-50`,`cursor-not-allowed`);return}let r=parseInt(e,10)+tt,i=Math.max(0,r-Date.now());i<=0?(t.textContent=`Live Update Available`,t.classList.add(`text-green-400`),n.disabled=!1,n.classList.remove(`opacity-50`,`cursor-not-allowed`,`pointer-events-none`)):(t.textContent=`Update in ${Math.floor(i/6e4)}:${Math.floor(i%6e4/1e3).toString().padStart(2,`0`)}`,t.classList.remove(`text-green-400`),n.disabled=!0,n.classList.add(`opacity-50`,`cursor-not-allowed`,`pointer-events-none`))};setInterval(r,1e3),r(),e.querySelector(`#backToHome`).addEventListener(`click`,()=>o.navigate(`/`)),n.addEventListener(`click`,t=>{if(n.disabled||n.classList.contains(`pointer-events-none`)){t.preventDefault();return}rt(e.querySelector(`#resultsMain`),!0)}),await rt(e.querySelector(`#resultsMain`))}async function rt(e,t=!1){try{let n=localStorage.getItem(J),r=localStorage.getItem(et),i,a;if(!t&&n&&r&&Date.now()-parseInt(n,10)<tt){let t=JSON.parse(r);i=t.posts,a=t.results,o(e,(t.schedule||{}).electionYear||new Date().getFullYear())}else{e.innerHTML=`
        <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Fetching Live Results...</p></div>
      `,t&&(C.invalidateCache(`getResults`),C.invalidateCache(`getPosts`),C.invalidateCache(`getPublicSchedule`));let n;[i,a,n]=await Promise.all([C.getPosts(),C.getResults().catch(()=>[]),C.getPublicSchedule().catch(()=>({}))]),localStorage.setItem(J,Date.now().toString()),localStorage.setItem(et,JSON.stringify({posts:i,results:a,schedule:n})),o(e,n.electionYear||new Date().getFullYear())}function o(e,t){let n=e.closest(`.page-enter`)?.querySelector(`h1`);n&&(n.textContent=`Live Election Results ${t}`)}if(a.length===0){e.innerHTML=`
        <div class="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <div class="text-5xl mb-4">📊</div>
          <h2 class="text-2xl font-bold text-white mb-2">Counting in Progress</h2>
          <p class="text-slate-400">No results have been published yet. Please check back later.</p>
        </div>
      `;return}let s={};i.forEach(e=>{let t=e.post||e.name;s[t]={}}),a.forEach(e=>{let t=e.Post;s[t]||(s[t]={}),s[t][e.CandidateId]||(s[t][e.CandidateId]={name:e.CandidateName,votes:0}),s[t][e.CandidateId].votes+=Number(e.Votes)||0});let c=``,l=i.filter(e=>{let t=e.post||e.name;return!e.deptRestriction&&!t.toUpperCase().includes(`ASSOCIATION`)});if(l.length>0){let e=``;l.forEach(t=>{let n=t.post||t.name,r=s[n];if(!r)return;let i=Object.keys(r).filter(e=>e!==`INVALID`&&e!==`NOTA`);if(i.length===0)return;let a=i.map(e=>r[e]);a.sort((e,t)=>t.votes-e.votes);let o=n.toUpperCase().includes(`UUC`)||n.toUpperCase().includes(`UNIVERSITY`)?2:1,c=0;a.length>o&&(c=a[o].votes);let l=a.filter((e,t)=>t<o&&e.votes>0),u=l.length>0?l.map(e=>{let t=e.votes-c;return`<div class="flex flex-wrap items-center gap-1.5 mb-1.5 last:mb-0">
                        <span class="whitespace-nowrap">${T(e.name)}</span>
                        <span class="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">${e.votes} votes</span>
                        ${t>0?`<span class="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-green-500/30 whitespace-nowrap">Lead: ${t}</span>`:``}
                      </div>`}).join(``):`<span class="text-slate-500 italic text-xs font-normal">Awaiting Results</span>`;e+=`
          <tr class="border-b border-white/5 hover:bg-white/5 transition">
            <td class="py-3 px-4 font-bold text-slate-300 text-xs sm:text-sm leading-tight w-1/2">${T(n)}</td>
            <td class="py-3 px-4 text-amber-400 font-bold text-sm leading-tight w-1/2">${u}</td>
          </tr>
        `}),e&&(c+=`
          <div class="glass rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl mb-12 page-enter">
            <div class="bg-gradient-to-r from-slate-900/90 to-amber-900/40 p-4 border-b border-amber-500/20 flex items-center justify-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="text-lg font-black text-amber-400 uppercase tracking-widest m-0">Leading Candidates</h2>
            </div>
            <div class="overflow-x-auto bg-slate-900/40">
              <table class="w-full text-left">
                <tbody>
                  ${e}
                </tbody>
              </table>
            </div>
          </div>
        `)}c+=`<div class="space-y-12">`,i.forEach(e=>{let t=e.post||e.name,n=s[t];if(!n)return;let r=Object.keys(n);if(r.length===0)return;let i=r.filter(e=>e!==`INVALID`&&e!==`NOTA`).map(e=>n[e]),a=n.INVALID,o=n.NOTA,l=t.toUpperCase().includes(`UUC`)||t.toUpperCase().includes(`UNIVERSITY`)?2:1;i.sort((e,t)=>t.votes-e.votes);let u=i.length?i[0].votes:0,d=i.reduce((e,t)=>e+t.votes,0)+(o?o.votes:0),f=d+(a?a.votes:0),p=0;i.length>l?p=i[l].votes:i.length>0&&(p=0),c+=`
        <div class="glass rounded-2xl overflow-hidden border border-white/10 page-enter shadow-2xl">
          <div class="bg-gradient-to-r from-slate-900/80 to-indigo-900/80 p-6 border-b border-white/10">
            <h2 class="text-2xl font-bold text-white tracking-tight">${T(t)}</h2>
          </div>
          <div class="p-6 space-y-6 bg-slate-900/20">
            ${i.map((e,t)=>{let n=f>0?(e.votes/f*100).toFixed(1):0,r=u>0?e.votes/u*100:0,i=t<l&&e.votes>0,a=i?e.votes-p:0;return`
                <div class="relative">
                  <div class="flex justify-between items-end mb-2 relative z-10">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full ${i?`bg-amber-500 text-amber-950`:`bg-white/10 text-white`} flex items-center justify-center font-bold text-sm shadow-lg">
                        ${i?`🏆`:t+1}
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-white text-lg">${T(e.name)}</span>
                          ${a>0?`<span class="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-green-500/30">LEAD: ${a}</span>`:``}
                        </div>
                      </div>
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
            
            <div class="mt-8 pt-6 border-t border-white/10 space-y-3">
              ${o&&o.votes>0?`
                <div class="flex justify-between text-sm text-slate-400">
                  <span>None of the Above (NOTA)</span>
                  <span class="font-bold text-white">${o.votes} <span class="text-xs text-slate-500 font-normal ml-1">(${(o.votes/f*100).toFixed(1)}%)</span></span>
                </div>
              `:``}

              ${a&&a.votes>0?`
                <div class="flex justify-between text-sm text-slate-500">
                  <span>Invalid / Rejected</span>
                  <span class="font-bold text-red-400">${a.votes} <span class="text-xs text-slate-500 font-normal ml-1">(${(a.votes/f*100).toFixed(1)}%)</span></span>
                </div>
              `:``}

              <div class="flex justify-between items-center py-2 px-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 mt-4">
                <span class="text-xs font-bold text-indigo-300 uppercase tracking-widest">Total Valid Votes</span>
                <span class="text-lg font-black text-white">${d}</span>
              </div>

              <div class="flex justify-between items-center py-2 px-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <span class="text-xs font-bold text-purple-300 uppercase tracking-widest">Grand Total</span>
                <span class="text-lg font-black text-white">${f}</span>
              </div>
            </div>
          </div>
        </div>
      `}),c+=`</div>`,c===`<div class="space-y-12"></div>`?e.innerHTML=`
        <div class="alert alert-info text-center">Results backend is initialized, but no votes have been aggregated for the configured posts yet.</div>
      `:e.innerHTML=c}catch(t){e.innerHTML=`<div class="alert alert-error">❌ Failed to load results: ${T(t.message)}</div>`}}async function it(e){e.innerHTML=`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `;try{let[t,n]=await Promise.all([C.getNominalRoll(),C.getSettings()]);at(e,t,n)}catch(t){e.innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}function at(e,t,n){let r=n.nominalRollFinalized===`true`,i=[...t],a=``,o=()=>{let t=i.filter(e=>[e.NAME,e.CLASS,e[`ADMISION NO`],e[`Nominal Roll Serial Number`]].some(e=>String(e||``).toLowerCase().includes(a.toLowerCase())));e.innerHTML=`
      <div class="page-enter space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <button data-nav="/" class="text-slate-400 hover:text-white mb-2 flex items-center gap-2 text-sm transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Home
            </button>
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
            <input type="text" id="searchInput" class="field pl-10" placeholder="Search by name, class, adm. no, or serial..." value="${T(a)}">
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
                    <td class="font-bold text-indigo-400">${T(e[`Nominal Roll Serial Number`])}</td>
                    <td class="font-mono text-xs">${T(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                    <td class="text-white font-medium">${T(e.NAME)}</td>
                    <td class="text-slate-300 text-sm">${T(e.CLASS)}</td>
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
          <div class="college">${T(a)}</div>
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
                <td class="sl">${T(e[`Nominal Roll Serial Number`])}</td>
                <td class="adm">${T(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                <td style="font-weight:bold">${T(e.NAME)}</td>
                <td class="cls">${T(e.CLASS)}</td>
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
  `),c.document.close()}async function X(e){let t=L();if(t){R(e,`nominalRoll`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading nominal roll...</p></div>
  `);try{let[n,r]=await Promise.all([C.getNominalRoll(),C.getSettings()]);ot(e.querySelector(`#adminMain`),t,n,r)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function ot(e,t,n,r){let i=r.nominalRollFinalized===`true`,a=[...n],o=``,s=[...new Set(n.map(e=>String(e.CLASS).trim()))].sort(),c=[...new Set(n.map(e=>String(e.Dept||`–`).trim()))].sort(),l=()=>{let n=a.filter(e=>[e.NAME,e.CLASS,e[`ADMISION NO`],e[`Nominal Roll Serial Number`]].some(e=>String(e||``).toLowerCase().includes(o.toLowerCase())));e.innerHTML=`
      <div class="page-enter space-y-6">
        
    <div id="uploadPanel" class="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      <button id="toggleUploadPanel" class="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📤</span>
          <div class="text-left">
            <div class="text-white font-bold text-sm">Upload New Nominal Roll</div>
            <div class="text-slate-400 text-xs">Replace entire roll from CSV — resets all nominations & results</div>
          </div>
        </div>
        <span id="uploadChevron" class="text-slate-400 text-lg transition-transform duration-200">▼</span>
      </button>

      <div id="uploadPanelBody" class="hidden border-t border-white/10">
        <div class="p-6 space-y-6">

          <!-- Step 1: Download Template -->
          <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <div>
              <div class="text-white font-bold text-sm mb-1">📥 Step 1 — Download the CSV Template</div>
              <div class="text-slate-400 text-xs">The template contains both Format 1 (Class) and Format 2 (Year/Stream) examples.<br><strong>CRITICAL:</strong> Keep ONLY the header row of the format you want to use. Delete ALL other sample rows and titles before saving.</div>
            </div>
            <button id="btnDownloadTemplate" class="btn btn-secondary shrink-0">
              <span id="templateBtnText">⬇️ Download Template</span>
            </button>
          </div>

          <!-- Step 2: Pick CSV File -->
          <div>
            <div class="text-white font-bold text-sm mb-3">📂 Step 2 — Select Your CSV File</div>
            <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all group">
              <div class="text-center">
                <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</div>
                <div class="text-slate-400 text-sm" id="filePickerLabel">Click to select a .csv file</div>
              </div>
              <input type="file" id="csvFileInput" accept=".csv" class="hidden">
            </label>
          </div>

          <!-- Preview (hidden until file selected) -->
          <div id="csvPreview" class="hidden space-y-4">
            <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm">
              <div class="text-emerald-300 font-bold mb-2">✅ File Parsed Successfully</div>
              <div id="csvSummary" class="text-slate-300 space-y-1 text-xs"></div>
            </div>

            <!-- Danger Warning -->
            <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div class="text-red-300 font-bold text-sm mb-2">⚠️ DESTRUCTIVE OPERATION — Read Before Proceeding</div>
              <ul class="text-red-200/80 text-xs space-y-1 list-disc list-inside">
                <li>The entire current Nominal Roll will be <strong>permanently replaced</strong></li>
                <li>All submitted <strong>Nominations</strong> will be deleted</li>
                <li>The <strong>Valid List</strong> and <strong>Final List</strong> will be cleared</li>
                <li>All <strong>Results</strong> and <strong>Ballot Plans</strong> will be wiped</li>
                <li>Election flags (finalized, published) will be <strong>reset to false</strong></li>
              </ul>
            </div>

            <!-- Confirmation -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Type <span class="text-red-400 font-mono">RESET</span> to confirm
                </label>
                <input type="text" id="confirmResetText" class="field font-mono tracking-widest uppercase" placeholder="RESET" autocomplete="off">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Re-enter Admin Password</label>
                <input type="password" id="confirmPwd" class="field" placeholder="Admin password" autocomplete="current-password">
              </div>
              <button id="btnUploadRoll" class="btn w-full py-3 text-sm font-bold opacity-50 cursor-not-allowed" disabled
                style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; border: none;">
                🚨 Upload & Reset Entire System
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  
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

        <div class="glass rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center w-full shadow-lg mb-2">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" id="searchInput" class="field w-full pl-10 bg-black/20 focus:bg-black/40 transition-colors" placeholder="Search by student name, class, admission no, or serial..." value="${T(o)}">
          </div>
          <div class="text-slate-400 text-sm md:w-auto w-full text-right shrink-0">
            Showing <strong class="text-white">${n.length}</strong> / ${a.length} students
          </div>
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
                    <td class="font-bold text-indigo-400">${T(e[`Nominal Roll Serial Number`])}</td>
                    <td class="font-mono text-xs">${T(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                    <td class="text-white font-medium">${T(e.NAME)}</td>
                    <td class="text-slate-300 text-sm">${T(e.CLASS)}</td>
                    <td class="text-slate-400 text-xs">${T(e.Dept||`–`)}</td>
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
                ${s.map(e=>`<option value="${T(e)}">${T(e)}</option>`).join(``)}
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
                ${c.map(e=>`<option value="${T(e)}">${T(e)}</option>`).join(``)}
              </select>
            </div>
          </div>
          <div class="flex gap-2 mt-8">
            <button id="btnCancelAdd" class="btn btn-secondary flex-1">Cancel</button>
            <button id="btnConfirmAdd" class="btn btn-primary flex-1">Save Student</button>
          </div>
        </div>
      </div>
    `;let r=e.querySelector(`.dropdown-toggle`),u=e.querySelector(`.dropdown-menu`);r&&(r.onclick=e=>{e.stopPropagation(),u.classList.toggle(`hidden`)}),window.onclick=()=>u?.classList.add(`hidden`),e.querySelector(`#searchInput`).oninput=t=>{o=t.target.value,l(),e.querySelector(`#searchInput`).focus();let n=e.querySelector(`#searchInput`).value;e.querySelector(`#searchInput`).value=``,e.querySelector(`#searchInput`).value=n},i||(e.querySelector(`#btnAddNew`).onclick=()=>e.querySelector(`#addModal`).classList.remove(`hidden`),e.querySelector(`#btnCancelAdd`).onclick=()=>e.querySelector(`#addModal`).classList.add(`hidden`),e.querySelector(`#btnConfirmAdd`).onclick=async n=>{let r={serial:e.querySelector(`#addSerial`).value,name:e.querySelector(`#addName`).value,class:e.querySelector(`#addClass`).value,admission:e.querySelector(`#addAdm`).value,dept:e.querySelector(`#addDept`).value};if(!r.serial||!r.name||!r.class)return D(`Please fill required fields.`,`warning`);E(n.target,!0,`Save Student`);try{await C.adminAddStudent(t,r),D(`Student added to roll.`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){D(e.message,`error`),E(n.target,!1,`Save Student`)}},e.querySelectorAll(`.delete-student`).forEach(n=>{n.onclick=async()=>{if(confirm(`Delete student #${n.dataset.serial}?`))try{await C.adminDeleteStudent(t,n.dataset.serial),D(`Student removed.`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){D(e.message,`error`)}}}),e.querySelector(`#btnFinalize`).onclick=async n=>{if(confirm(`FINALIZATION WARNING:

1. All students will be sorted by Class and Name.
2. NEW Serial Numbers will be generated sequentially (1, 2, 3...).
3. The roll will be LOCKED for all future edits.

Are you absolutely sure?`)){E(n.target,!0,`Finalizing...`);try{await C.adminFinalizeRoll(t),D(`Nominal Roll Finalized Successfully!`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){D(e.message,`error`),E(n.target,!1,`Finalize & Lock Roll`)}}}),e.querySelector(`#btnPrintSerial`).onclick=()=>st(a,i,`serial`),e.querySelector(`#btnPrintClass`).onclick=()=>st(a,i,`class`),e.querySelector(`#toggleUploadPanel`).onclick=()=>{let t=e.querySelector(`#uploadPanelBody`),n=e.querySelector(`#uploadChevron`);t.classList.toggle(`hidden`),n.style.transform=t.classList.contains(`hidden`)?``:`rotate(180deg)`},e.querySelector(`#btnDownloadTemplate`).onclick=async e=>{let n=e.currentTarget;E(n,!0,`Downloading...`);try{let e=await C.adminGetNominalRollTemplate(t),n=[e.headers.join(`,`)];e.rows.forEach(e=>{n.push(e.map(e=>{let t=String(e??``);return t.includes(`,`)||t.includes(`"`)?`"${t.replace(/"/g,`""`)}"`:t}).join(`,`))});let r=new Blob([n.join(`\r
`)],{type:`text/csv;charset=utf-8;`}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i,a.download=`NominalRoll_Template.csv`,a.click(),URL.revokeObjectURL(i),D(`Template downloaded!`,`success`)}catch(e){D(e.message,`error`)}finally{E(n,!1,`⬇️ Download Template`)}};let d=null,f=[],p=[`Nominal Roll Serial Number`,`NAME`,`CLASS`,`ADMISION NO`,`Dept`],m=[`Nominal Roll Serial Number`,`NAME`,`YEAR`,`STREAM`,`ADMISION NO`,`Dept`];e.querySelector(`#csvFileInput`).onchange=t=>{let n=t.target.files[0];if(!n)return;e.querySelector(`#filePickerLabel`).textContent=`📄 ${n.name}`;let r=new FileReader;r.onload=t=>{let n=t.target.result.replace(/\r\n/g,`
`).replace(/\r/g,`
`).split(`
`).filter(e=>e.trim());if(n.length<2){D(`CSV file appears empty.`,`error`);return}let r=-1;for(let e=0;e<Math.min(n.length,20);e++){let t=n[e].split(`,`).map(e=>e.trim().replace(/^"|"$/g,``));if(p.every(e=>t.includes(e))){r=e,f=p;break}if(m.every(e=>t.includes(e))){r=e,f=m;break}}if(r===-1){D(`Missing required columns. Please use one of the standard templates.`,`error`),e.querySelector(`#csvPreview`).classList.add(`hidden`);return}let i=n[r].split(`,`).map(e=>e.trim().replace(/^"|"$/g,``)),a=f.map(e=>i.indexOf(e));d=n.slice(r+1).map(e=>{let t=[],n=``,r=!1;for(let i of e+`,`)i===`"`?r=!r:i===`,`&&!r?(t.push(n.trim()),n=``):n+=i;return a.map(e=>t[e]??``)}).filter(e=>e[1]&&e[1].trim()!==``&&e[1]!==`NAME`),f.indexOf(`NAME`);let o=f.indexOf(`Dept`),s=[];s=f===p?[...new Set(d.map(e=>e[f.indexOf(`CLASS`)]))].sort():[...new Set(d.map(e=>`${e[f.indexOf(`YEAR`)]} ${e[f.indexOf(`STREAM`)]} ${e[o]}`.trim()))].sort();let c=[...new Set(d.map(e=>e[o]))].sort();e.querySelector(`#csvSummary`).innerHTML=`
          <div>👥 <strong class="text-white">${d.length}</strong> students detected using <strong>${f===p?`Legacy Format`:`Explicit Format`}</strong></div>
          <div>🏛️ <strong class="text-white">${c.length}</strong> departments: ${c.map(e=>`<span class="text-indigo-300">${T(e)}</span>`).join(`, `)}</div>
          <div>📚 <strong class="text-white">${s.length}</strong> unique classes found</div>
        `,e.querySelector(`#csvPreview`).classList.remove(`hidden`),h()},r.readAsText(n)};let h=()=>{let t=e.querySelector(`#confirmResetText`)?.value.trim().toUpperCase()===`RESET`,n=(e.querySelector(`#confirmPwd`)?.value.trim()||``)!==``,r=e.querySelector(`#btnUploadRoll`);if(!r)return;let i=t&&n&&d&&d.length>0;r.disabled=!i,r.classList.toggle(`opacity-50`,!i),r.classList.toggle(`cursor-not-allowed`,!i)};e.querySelector(`#confirmResetText`).addEventListener(`input`,h),e.querySelector(`#confirmPwd`).addEventListener(`input`,h),e.querySelector(`#btnUploadRoll`).onclick=async t=>{let n=e.querySelector(`#confirmPwd`).value.trim();if(!d||d.length===0)return D(`No data to upload.`,`error`);if(confirm(`FINAL CONFIRMATION\n\nYou are about to replace the Nominal Roll with ${d.length} students.\nAll nominations, results, and election data will be permanently deleted.\n\nThis CANNOT be undone. Proceed?`)){E(t.target,!0,`Uploading & Resetting...`);try{D(`✅ Nominal Roll updated with ${(await C.adminUploadNominalRoll(n,{headers:f,rows:d})).count||d.length} students. All election data has been reset.`,`success`),X(e.closest(`#appContainer`)||e.parentElement)}catch(e){D(e.message,`error`),E(t.target,!1,`🚨 Upload & Reset Entire System`)}}}};l()}function st(e,t,r){let i=[...e];r===`class`?i.sort((e,t)=>{let n=String(e.CLASS).toUpperCase(),r=String(t.CLASS).toUpperCase();return n===r?String(e.NAME).toUpperCase().localeCompare(String(t.NAME).toUpperCase()):n.localeCompare(r)}):i.sort((e,t)=>Number(e[`Nominal Roll Serial Number`])-Number(t[`Nominal Roll Serial Number`]));let a=n.COLLEGE_NAME||`GOVERNMENT VICTORIA COLLEGE, PALAKKAD`,o=t?`FINAL NOMINAL ROLL`:`DRAFT NOMINAL ROLL`,s=new Date().toLocaleString(),c=window.open(``,`_blank`);c.document.write(`
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
          <div class="college">${T(a)}</div>
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
                <td class="sl">${T(e[`Nominal Roll Serial Number`])}</td>
                <td class="adm">${T(e[`ADMISION NO`]||e[`ADMISSION NO`]||`–`)}</td>
                <td style="font-weight:bold">${T(e.NAME)}</td>
                <td class="cls">${T(e.CLASS)}</td>
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
  `),c.document.close()}async function ct(e){let t=L();if(t){R(e,`schedule`,`
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading schedule...</p></div>
  `);try{let n=await C.getPublicSchedule();lt(e.querySelector(`#adminMain`),t,n)}catch(t){e.querySelector(`#adminMain`).innerHTML=`<div class="alert alert-error">❌ ${T(t.message)}</div>`}}}function lt(e,t,n){let r=e=>e?new Date(e).toISOString().slice(0,16):``;e.innerHTML=`
    <div class="page-enter space-y-6 max-w-4xl">
      <div>
        <h3 class="text-xl font-bold text-white">Election Schedule</h3>
        <p class="text-slate-400 text-sm">Set official deadlines and windows for the election process.</p>
      </div>

      <div class="glass rounded-xl p-6 border-l-4 border-l-indigo-500 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Election Year -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Election Year</label>
            <input type="number" id="electionYear" class="field" value="${n.electionYear||new Date().getFullYear()}">
            <p class="text-[10px] text-slate-500 mt-1">Used in all ballot headers and titles (e.g., 2026).</p>
          </div>

          <!-- Notification Date -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notification Date (For Age Calculation)</label>
            <input type="date" id="notificationDate" class="field" value="${n.notificationDate||``}">
            <p class="text-[10px] text-slate-500 mt-1">Student age will be calculated as of this date.</p>
          </div>
        </div>

        <hr class="border-white/10" />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Nomination Deadline -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nomination Deadline</label>
            <input type="datetime-local" id="nominationDeadline" class="field" value="${r(n.nominationDeadline)}">
          </div>

          <!-- Withdrawal Window Start -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal Start</label>
            <input type="datetime-local" id="withdrawalStart" class="field" value="${r(n.withdrawalStart)}">
          </div>

          <!-- Withdrawal Window End -->
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Withdrawal End</label>
            <input type="datetime-local" id="withdrawalEnd" class="field" value="${r(n.withdrawalEnd)}">
          </div>
        </div>
        
        <div class="pt-4">
          <button id="btnSaveSchedule" class="btn btn-primary w-full md:w-auto px-8">💾 Save Election Schedule</button>
        </div>
      </div>

      <!-- Current Status Information -->
      <div class="glass rounded-xl p-5 border border-white/5">
        <h4 class="text-sm font-bold text-slate-300 mb-3">Live Status Information</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">Nomination Status:</span>
            <span id="statusNom" class="font-medium">Checking...</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Withdrawal Window:</span>
            <span id="statusWith" class="font-medium">Checking...</span>
          </div>
        </div>
      </div>
    </div>
  `;let i=()=>{let t=new Date,n=e.querySelector(`#nominationDeadline`).value,r=e.querySelector(`#withdrawalStart`).value,i=e.querySelector(`#withdrawalEnd`).value,a=n&&t>new Date(n)?`<span class="text-rose-400">CLOSED</span>`:`<span class="text-emerald-400">OPEN</span>`;e.querySelector(`#statusNom`).innerHTML=a;let o=`<span class="text-slate-500">Not Set</span>`;r&&i&&(o=t<new Date(r)?`<span class="text-amber-400">PENDING (Starts soon)</span>`:t>new Date(i)?`<span class="text-rose-400">CLOSED</span>`:`<span class="text-emerald-400">ACTIVE (Open now)</span>`),e.querySelector(`#statusWith`).innerHTML=o};i(),e.querySelectorAll(`input`).forEach(e=>e.onchange=i),e.querySelector(`#btnSaveSchedule`).onclick=async n=>{let r={electionYear:e.querySelector(`#electionYear`).value,notificationDate:e.querySelector(`#notificationDate`).value,nominationDeadline:e.querySelector(`#nominationDeadline`).value?new Date(e.querySelector(`#nominationDeadline`).value).toISOString():``,withdrawalStart:e.querySelector(`#withdrawalStart`).value?new Date(e.querySelector(`#withdrawalStart`).value).toISOString():``,withdrawalEnd:e.querySelector(`#withdrawalEnd`).value?new Date(e.querySelector(`#withdrawalEnd`).value).toISOString():``};E(n.target,!0,`Saving Schedule...`);try{await C.adminSaveSchedule(t,r),D(`Election schedule updated successfully!`,`success`),i()}catch(e){D(e.message,`error`)}finally{E(n.target,!1,`💾 Save Election Schedule`)}}}async function ut(e){let t=L();t&&(window.ADMIN_BYPASS_PWD=t,R(e,`direct-nomination`,`
    <div id="adminFormContainer" class="p-6">
       <div class="alert alert-info mb-6">
         🛡️ <strong>Admin Direct Entry Mode:</strong> Deadlines and window restrictions are bypassed.
       </div>
       <div id="nominationWrapper"></div>
    </div>
  `),await N(e.querySelector(`#nominationWrapper`)))}async function dt(e){let t=L();if(!t)return;R(e,`audit`,`
    <div class="page-enter space-y-8">
      <div class="flex items-end justify-between">
        <div>
          <h3 class="text-2xl font-bold text-white">Internal Audit System</h3>
          <p class="text-slate-400 text-sm mt-1">Cross-check nominal roll, ballot plans, nominations, and counting matrices for discrepancies.</p>
        </div>
        <button id="btnRunAudit" class="btn btn-primary">
          <span class="mr-2">🔍</span> Run Full System Audit
        </button>
      </div>

      <div id="auditResults" class="space-y-6">
        <div class="glass rounded-2xl p-8 text-center text-slate-400 border border-white/5">
          <div class="text-4xl mb-4 opacity-50">🛡️</div>
          <p>Click "Run Full System Audit" to begin verifying data integrity.</p>
        </div>
      </div>
    </div>
  `);let n=e.querySelector(`#btnRunAudit`),r=e.querySelector(`#auditResults`);n.addEventListener(`click`,async()=>{n.disabled=!0,n.innerHTML=`<span class="spinner w-4 h-4 mr-2 border-2"></span> Running Audit...`,r.innerHTML=`
      <div class="glass rounded-2xl p-12 text-center text-slate-400 border border-white/5">
        <div class="spinner w-10 h-10 border-4 border-indigo-500 mb-4 mx-auto"></div>
        <p class="font-bold text-white">Analyzing Data...</p>
        <p class="text-xs mt-2">This may take a few seconds as the system cross-references all data layers.</p>
      </div>
    `;try{let e=(await C.adminRunAudit(t)).report,n=(e,t)=>t.pass?`
            <div class="glass rounded-2xl p-6 border-l-4 border-emerald-500 bg-emerald-500/5">
              <div class="flex items-center text-emerald-400 font-bold mb-2">
                <span class="mr-2">✅</span> ${T(e)}
              </div>
              <p class="text-xs text-slate-400">All data points passed the integrity check perfectly.</p>
            </div>
          `:`
            <div class="glass rounded-2xl p-6 border-l-4 border-rose-500 bg-rose-500/5">
              <div class="flex items-center text-rose-400 font-bold mb-4">
                <span class="mr-2">❌</span> ${T(e)}
              </div>
              <ul class="list-disc pl-5 space-y-2 text-xs text-rose-300">
                ${t.details.map(e=>`<li>${T(e)}</li>`).join(``)}
              </ul>
            </div>
          `;r.innerHTML=`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${n(`1. Nominal Roll vs Ballot Plan`,e.rollCheck)}
          ${n(`2. Serial Number Integrity (Nominations)`,e.serialCheck)}
          ${n(`3. Counting Matrix vs Results Math`,e.resultsCheck)}
          ${n(`4. Ballot Forms Accounting`,e.formsCheck)}
        </div>
      `,e.rollCheck.pass&&e.serialCheck.pass&&e.resultsCheck.pass&&e.formsCheck.pass?r.innerHTML=`
           <div class="glass rounded-2xl p-8 text-center border border-emerald-500/30 bg-emerald-500/10 mb-6">
             <div class="text-4xl mb-4">🎉</div>
             <h3 class="text-xl font-bold text-emerald-400">All Systems Go!</h3>
             <p class="text-sm text-slate-300 mt-2">The audit found absolutely zero discrepancies. The data is perfectly synchronized.</p>
           </div>
         `+r.innerHTML:r.innerHTML=`
           <div class="glass rounded-2xl p-8 text-center border border-rose-500/30 bg-rose-500/10 mb-6">
             <div class="text-4xl mb-4">⚠️</div>
             <h3 class="text-xl font-bold text-rose-400">Discrepancies Found</h3>
             <p class="text-sm text-slate-300 mt-2">Please review the failed checks below and resolve the inconsistencies.</p>
           </div>
         `+r.innerHTML,D(`Audit completed.`,`info`)}catch(e){r.innerHTML=`<div class="alert alert-error">❌ Audit failed: ${T(e.message)}</div>`,D(e.message,`error`)}finally{n.disabled=!1,n.innerHTML=`<span class="mr-2">🔍</span> Run Full System Audit`}})}var ft=document.getElementById(`app`);document.body.insertAdjacentHTML(`afterbegin`,`
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
  `),document.getElementById(`app`).style.marginTop=`48px`);var Z=e=>t=>{ft.innerHTML=``,e(ft,t)};o.on(`/`,Z(se)).on(`/submit`,Z(N)).on(`/find`,Z(he)).on(`/valid-list`,Z(ve)).on(`/final-list`,Z(xe)).on(`/withdraw`,Z(we)).on(`/results`,Z(nt)).on(`/nominal-roll`,Z(it)).on(`/admin`,Z(Me)).on(`/admin/dashboard`,Z(Ne)).on(`/admin/verify`,Z(Pe)).on(`/admin/withdrawals`,Z(Ie)).on(`/admin/publish`,Z(Re)).on(`/admin/posts`,Z(ze)).on(`/admin/ballots`,Z(Xe)).on(`/admin/booths`,Z(He)).on(`/admin/counting`,Z(We)).on(`/admin/results-entry`,Z(Je)).on(`/admin/results`,Z(Qe)).on(`/admin/nominal-roll`,Z(X)).on(`/admin/schedule`,Z(ct)).on(`/admin/direct-nomination`,Z(ut)).on(`/admin/testing`,Z(Ze)).on(`/admin/audit`,Z(dt)).setDefault(`/`),document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-nav]`);t&&(e.preventDefault(),o.navigate(t.dataset.nav))}),o.start(),document.body.insertAdjacentHTML(`beforeend`,`
  <div id="sync-status" class="fixed top-4 right-4 z-[9999] bg-black/80 backdrop-blur border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-medium text-white shadow-xl transition-all duration-300 transform translate-y-[-150%] opacity-0">
    <span id="sync-icon" class="animate-spin inline-block">🔄</span>
    <span id="sync-text">Saving changes...</span>
  </div>
`);var Q=document.getElementById(`sync-status`),$=document.getElementById(`sync-icon`),pt=document.getElementById(`sync-text`);m(e=>{e===`saving`?(Q.classList.remove(`translate-y-[-150%]`,`opacity-0`),Q.classList.add(`translate-y-0`,`opacity-100`),$.className=`animate-spin inline-block text-indigo-400`,$.innerHTML=`&#8635;`,pt.innerText=`Saving changes...`):e===`saved`?($.className=`inline-block text-emerald-400`,$.innerHTML=`&#10003;`,pt.innerText=`All changes saved`):e===`idle`&&(Q.classList.remove(`translate-y-0`,`opacity-100`),Q.classList.add(`translate-y-[-150%]`,`opacity-0`))}),C.initPublicData();