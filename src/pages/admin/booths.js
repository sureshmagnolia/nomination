/**
 * pages/admin/booths.js
 * Admin page to manage Polling Booths and allot students (class-wise).
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { esc, showToast, setLoading } from '../../utils.js';
import { CONFIG } from '../../config.js';

export async function renderAdminBooths(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  renderAdminLayout(container, 'booths', `
    <div class="text-center py-16"><span class="spinner" style="width:2.5rem;height:2.5rem;border-width:4px;"></span><p class="text-slate-400 mt-4 text-sm">Loading booth data...</p></div>
  `);

  try {
    const [nominalRoll, booths, locations, posts, nominations, plan, settings] = await Promise.all([
      api.getNominalRoll(),
      api.adminGetBooths(pwd, true).catch(err => { console.error('GetBooths error:', err); return null; }),
      api.adminGetLocations(pwd, true).catch(err => { console.error('GetLocations error:', err); return null; }),
      api.adminGetPosts(pwd).catch(() => []),
      api.adminGetFinalNominations(pwd).catch(() => api.getFinalNominations()).catch(() => ({ active: [] })),
      api.adminGetBallotPlan(pwd).catch(() => null),
      api.adminGetSettings(pwd).catch(() => ({}))
    ]);

    if (booths === null || locations === null) {
      container.querySelector('#adminMain').innerHTML = `
        <div class="alert alert-error max-w-xl mx-auto my-8 p-6 text-center">
          <p class="font-bold text-lg text-white mb-2">❌ Error Connecting to Server</p>
          <p class="text-sm text-slate-300 mb-4">Could not retrieve existing polling booth and location data from the server. To protect your data from being overwritten, interface initialization has been paused.</p>
          <button id="btnRetryLoadBooths" class="btn btn-primary px-6">🔄 Retry Connection</button>
        </div>
      `;
      container.querySelector('#btnRetryLoadBooths')?.addEventListener('click', () => renderAdminBooths(container));
      return;
    }

    renderBoothsUI(container.querySelector('#adminMain'), pwd, nominalRoll, booths, locations, posts, nominations, plan, settings);
  } catch (e) {
    container.querySelector('#adminMain').innerHTML = `<div class="alert alert-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderBoothsUI(main, pwd, nominalRoll, initialBooths, initialLocations, posts, nominations, plan, settings) {
  // Helper for identifying distinct class key (e.g. Research Scholars by Dept)
  const getStudentClassKey = (s) => {
    const c = String(s['CLASS'] || 'Unknown').trim();
    const dept = String(s['Dept'] || 'Unknown').trim();
    const upper = c.toUpperCase();
    if (upper.includes('RESEARCH') || upper.includes('SCHOLAR') || upper.includes('PH.D') || upper.includes('PHD')) {
      return `RESEARCH SCHOLAR - ${dept}`;
    }
    return c;
  };

  const isStudentInBooth = (s, boothClasses) => {
    if (!boothClasses || !boothClasses.length) return false;
    const key = getStudentClassKey(s);
    const raw = String(s['CLASS'] || '').trim();
    return boothClasses.includes(key) || boothClasses.includes(raw);
  };

  // 1. Process Nominal Roll to get classes and sizes
  const classStats = {};
  nominalRoll.forEach(student => {
    const key = getStudentClassKey(student);
    const dept = String(student['Dept'] || 'Unknown').trim();
    if (!classStats[key]) {
      classStats[key] = { name: key, dept: dept, count: 0 };
    }
    classStats[key].count++;
  });
  
  const allClasses = Object.values(classStats).sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
  let booths = initialBooths.length ? [...initialBooths] : [{ boothNumber: 1, roomName: '', classes: [] }];
  
  // Migrate legacy generic 'RESEARCH SCHOLAR' entries to department-specific classes if applicable
  booths.forEach(b => {
    if (b.classes && b.classes.includes('RESEARCH SCHOLAR')) {
      b.classes = b.classes.filter(c => c !== 'RESEARCH SCHOLAR');
      const bDepts = new Set(b.classes.map(c => classStats[c]?.dept).filter(Boolean));
      Object.keys(classStats).filter(k => k.startsWith('RESEARCH SCHOLAR - ')).forEach(rKey => {
        if (bDepts.has(classStats[rKey].dept)) {
          b.classes.push(rKey);
        }
      });
    }
  });


  let locations = [...initialLocations];
  let editingLocIdx = null;
  let isFirstRender = true;

  const openSplitModal = (splitDepts, intactCount, totalDepts) => {
    const modal = main.querySelector('#splitAlertModal');
    const content = main.querySelector('#splitAlertModalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
        <strong>⚖️ Smart Balanced Allotment Applied:</strong><br>
        To prevent severe voter imbalance across booths (such as having booths with 240+ voters while others sit with under 90) and keep every booth evenly balanced around the target average, 
        <strong>${splitDepts.length} department${splitDepts.length > 1 ? 's' : ''}</strong> was divided across <strong>strictly 2 booths</strong> (the maximum allowable limit). 
        All other <strong>${intactCount} of ${totalDepts} departments</strong> remain 100% intact in single booths.
      </div>

      <div class="space-y-3">
        ${splitDepts.map(sd => `
          <div class="border border-white/15 bg-white/5 rounded-xl p-4 space-y-2">
            <div class="flex justify-between items-center border-b border-white/10 pb-2">
              <h5 class="font-bold text-base text-white">🏛️ ${esc(sd.name)}</h5>
              <span class="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Total: ${sd.part1.count + sd.part2.count} Voters
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div class="bg-black/30 rounded-lg p-2.5 border border-white/5">
                <div class="text-xs text-indigo-300 font-bold mb-1 flex items-center justify-between">
                  <span>📍 Booth ${sd.part1.boothNumber}</span>
                  <span class="text-[10px] text-slate-400 font-normal">(${esc(sd.part1.label)})</span>
                </div>
                <div class="text-lg font-mono font-bold text-white mb-1">${sd.part1.count} <span class="text-xs font-normal text-slate-400">voters</span></div>
                <div class="text-[11px] text-slate-300 line-clamp-2">
                  ${sd.part1.classes.map(c => esc(c)).join(', ')}
                </div>
              </div>

              <div class="bg-black/30 rounded-lg p-2.5 border border-white/5">
                <div class="text-xs text-amber-300 font-bold mb-1 flex items-center justify-between">
                  <span>📍 Booth ${sd.part2.boothNumber}</span>
                  <span class="text-[10px] text-slate-400 font-normal">(${esc(sd.part2.label)})</span>
                </div>
                <div class="text-lg font-mono font-bold text-white mb-1">${sd.part2.count} <span class="text-xs font-normal text-slate-400">voters</span></div>
                <div class="text-[11px] text-slate-300 line-clamp-2">
                  ${sd.part2.classes.map(c => esc(c)).join(', ')}
                </div>
              </div>
            </div>

            <p class="text-[11px] text-amber-300/90 pt-1">
              💡 <em>Counting instruction: During vote counting, ballots from Booth ${sd.part1.boothNumber} and Booth ${sd.part2.boothNumber} for ${esc(sd.name)} association will need to be aggregated together.</em>
            </p>
          </div>
        `).join('')}
      </div>
    `;

    modal.classList.remove('hidden');
  };

  const closeSplitModal = () => {
    const modal = main.querySelector('#splitAlertModal');
    if (modal) modal.classList.add('hidden');
  };

  const autoAllot = () => {
    booths.forEach(b => { b.classes = []; b.totalStudents = 0; });
    const numBooths = booths.length;
    if (numBooths === 0) return { splitDepts: [], intactCount: 0, totalDepts: 0, booths };

    // 1. Group all classes by Department (Research Scholars are grouped with their department!)
    const deptsMap = {};
    allClasses.forEach(cls => {
      const deptName = String(cls.dept || 'Unknown').trim();
      if (!deptsMap[deptName]) {
        deptsMap[deptName] = { name: deptName, total: 0, classes: [] };
      }
      deptsMap[deptName].classes.push(cls);
      deptsMap[deptName].total += cls.count;
    });

    const depts = Object.values(deptsMap);
    const totalStudents = nominalRoll.length || depts.reduce((sum, d) => sum + d.total, 0);
    const mean = totalStudents / numBooths;
    const numDepts = depts.length;

    // Helper: Split a department cleanly into exactly 2 coherent sub-bundles
    // Priority 1: Natural academic split (UG classes in Part A, PG classes + Research Scholars in Part B)
    // Priority 2: Balanced 2-partition of classes closest to 50/50
    function splitDeptIntoTwoHalves(dept) {
      const classes = [...dept.classes];
      if (classes.length <= 1) return null;

      // Natural academic split: UG vs PG/Scholars
      const ugClasses = classes.filter(c => {
        const u = c.name.toUpperCase();
        return u.includes('B.A') || u.includes('B.SC') || u.includes('B.COM') || u.includes('BBA') || u.includes('BCA') || u.includes('UG') || /^(I|II|III)\s+B/i.test(u);
      });
      const pgClasses = classes.filter(c => !ugClasses.includes(c));

      if (ugClasses.length > 0 && pgClasses.length > 0) {
        const ugTotal = ugClasses.reduce((s, c) => s + c.count, 0);
        const pgTotal = pgClasses.reduce((s, c) => s + c.count, 0);
        if (ugTotal >= dept.total * 0.15 && pgTotal >= dept.total * 0.15) {
          return [
            { name: dept.name, partLabel: 'UG', total: ugTotal, classes: ugClasses, isSplit: true, deptName: dept.name },
            { name: dept.name, partLabel: 'PG & Scholars', total: pgTotal, classes: pgClasses, isSplit: true, deptName: dept.name }
          ];
        }
      }

      // Balanced subset-sum partitioning into 2 parts
      classes.sort((a, b) => b.count - a.count);
      const partA = [];
      const partB = [];
      let sumA = 0;
      let sumB = 0;
      for (const c of classes) {
        if (sumA <= sumB) {
          partA.push(c);
          sumA += c.count;
        } else {
          partB.push(c);
          sumB += c.count;
        }
      }
      return [
        { name: dept.name, partLabel: 'Part 1', total: sumA, classes: partA, isSplit: true, deptName: dept.name },
        { name: dept.name, partLabel: 'Part 2', total: sumB, classes: partB, isSplit: true, deptName: dept.name }
      ];
    }

    // Smart Combine Partition Solver
    function solvePartition(items, B, constraints = []) {
      let bestAlloc = null;
      let bestLoss = Infinity;

      function calcLoss(alloc) {
        let sumSq = 0;
        let max = -Infinity;
        let min = Infinity;
        for (const b of alloc) {
          const diff = b.total - mean;
          sumSq += diff * diff;
          if (b.total > max) max = b.total;
          if (b.total < min) min = b.total;
        }
        // Heavily penalize variance and spread to force booths to be closely balanced
        return sumSq + (max - min) * 35;
      }

      for (let r = 0; r < 350; r++) {
        const alloc = Array.from({ length: B }, (_, i) => ({ id: i, total: 0, items: [] }));
        const sorted = [...items];
        if (r === 0) {
          sorted.sort((a, b) => b.total - a.total);
        } else if (r === 1) {
          sorted.sort((a, b) => a.total - b.total);
        } else {
          sorted.sort(() => Math.random() - 0.5);
        }

        let valid = true;
        for (const it of sorted) {
          let bestB = null;
          let minAddLoss = Infinity;
          for (const b of alloc) {
            if (constraints.some(c => c(b, it))) continue;
            const projectedDiff = (b.total + it.total) - mean;
            const cost = projectedDiff * projectedDiff;
            if (cost < minAddLoss) {
              minAddLoss = cost;
              bestB = b;
            }
          }
          if (!bestB) {
            const validBooths = alloc.filter(b => !constraints.some(c => c(b, it)));
            if (validBooths.length > 0) {
              validBooths.sort((a, b) => a.total - b.total);
              bestB = validBooths[0];
            } else {
              valid = false;
              bestB = alloc[0];
            }
          }
          bestB.items.push(it);
          bestB.total += it.total;
        }

        if (!valid) continue;

        // Local search hill-climbing
        let currentLoss = calcLoss(alloc);
        let improved = true;
        let step = 0;
        while (improved && step < 70) {
          improved = false;
          step++;

          // 1-move: move item from booth i to booth j
          for (let i = 0; i < B; i++) {
            for (let j = 0; j < B; j++) {
              if (i === j) continue;
              for (let k = 0; k < alloc[i].items.length; k++) {
                const it = alloc[i].items[k];
                if (constraints.some(c => c(alloc[j], it))) continue;

                alloc[i].total -= it.total;
                alloc[j].total += it.total;
                const newLoss = calcLoss(alloc);
                if (newLoss < currentLoss - 0.001) {
                  alloc[i].items.splice(k, 1);
                  alloc[j].items.push(it);
                  currentLoss = newLoss;
                  improved = true;
                  break;
                } else {
                  alloc[i].total += it.total;
                  alloc[j].total -= it.total;
                }
              }
              if (improved) break;
            }
            if (improved) break;
          }
          if (improved) continue;

          // 2-swap: swap item between booth i and booth j
          for (let i = 0; i < B; i++) {
            for (let j = i + 1; j < B; j++) {
              for (let ki = 0; ki < alloc[i].items.length; ki++) {
                for (let kj = 0; kj < alloc[j].items.length; kj++) {
                  const itA = alloc[i].items[ki];
                  const itB = alloc[j].items[kj];
                  if (constraints.some(c => c(alloc[j], itA)) || constraints.some(c => c(alloc[i], itB))) continue;

                  const gain = itA.total - itB.total;
                  alloc[i].total -= gain;
                  alloc[j].total += gain;
                  const newLoss = calcLoss(alloc);
                  if (newLoss < currentLoss - 0.001) {
                    alloc[i].items[ki] = itB;
                    alloc[j].items[kj] = itA;
                    currentLoss = newLoss;
                    improved = true;
                    break;
                  } else {
                    alloc[i].total += gain;
                    alloc[j].total -= gain;
                  }
                }
                if (improved) break;
              }
              if (improved) break;
            }
            if (improved) break;
          }
          if (improved) continue;

          // 2-to-1 swap: swap two small items in i with one item in j
          for (let i = 0; i < B; i++) {
            for (let j = 0; j < B; j++) {
              if (i === j) continue;
              if (alloc[i].items.length < 2) continue;
              for (let ki1 = 0; ki1 < alloc[i].items.length - 1; ki1++) {
                for (let ki2 = ki1 + 1; ki2 < alloc[i].items.length; ki2++) {
                  for (let kj = 0; kj < alloc[j].items.length; kj++) {
                    const itA1 = alloc[i].items[ki1];
                    const itA2 = alloc[i].items[ki2];
                    const itB = alloc[j].items[kj];
                    if (constraints.some(c => c(alloc[j], itA1)) || constraints.some(c => c(alloc[j], itA2)) || constraints.some(c => c(alloc[i], itB))) continue;

                    const gain = (itA1.total + itA2.total) - itB.total;
                    alloc[i].total -= gain;
                    alloc[j].total += gain;
                    const newLoss = calcLoss(alloc);
                    if (newLoss < currentLoss - 0.001) {
                      alloc[i].items.splice(ki2, 1);
                      alloc[i].items.splice(ki1, 1);
                      alloc[i].items.push(itB);
                      alloc[j].items.splice(kj, 1);
                      alloc[j].items.push(itA1);
                      alloc[j].items.push(itA2);
                      currentLoss = newLoss;
                      improved = true;
                      break;
                    } else {
                      alloc[i].total += gain;
                      alloc[j].total -= gain;
                    }
                  }
                  if (improved) break;
                }
                if (improved) break;
              }
              if (improved) break;
            }
            if (improved) break;
          }
        }

        if (currentLoss < bestLoss) {
          bestLoss = currentLoss;
          bestAlloc = JSON.parse(JSON.stringify(alloc));
        }
      }

      return bestAlloc;
    }

    // --- TIER 0: 0-SPLIT ATTEMPT (Highest Priority: Keep 100% of departments intact!) ---
    const tier0Alloc = solvePartition(depts, numBooths);
    let chosenAlloc = tier0Alloc;
    let splitDepts = [];

    const tier0Max = Math.max(...tier0Alloc.map(b => b.total));
    const tier0Min = Math.min(...tier0Alloc.map(b => b.total));
    const tier0Spread = tier0Max - tier0Min;

    // Almost balanced test for 0 splits:
    // Every booth should be reasonably close to the mean, with tight spread and no starvation.
    // An 87 vs 248 disparity is explicitly disallowed!
    const isTier0Balanced = (tier0Max <= Math.round(mean * 1.25)) && 
                            (tier0Min >= Math.round(mean * 0.75)) && 
                            (tier0Spread <= Math.max(Math.round(mean * 0.40), 50)) &&
                            (tier0Max / Math.max(tier0Min, 1) <= 1.45);

    if (isTier0Balanced) {
      // 0 SPLITS ACCEPTED: All departments intact and booths are almost balanced!
      chosenAlloc = tier0Alloc;
    } else {
      // --- TIER 1: AT MOST 1 DEPARTMENT SPLIT INTO AT MOST 2 BOOTHS ---
      let bestTier1 = null;
      let bestTier1Score = Infinity;
      let bestSplitDept = null;

      // Evaluate candidate large departments to split, sorted largest first
      const largeDepts = depts.filter(d => d.total > mean * 0.75 && d.classes.length > 1).sort((a, b) => b.total - a.total);

      for (const candDept of largeDepts) {
        const halves = splitDeptIntoTwoHalves(candDept);
        if (!halves) continue;

        const items = [...depts.filter(d => d.name !== candDept.name), halves[0], halves[1]];
        const constraint = (b, it) => {
          if (!it.isSplit) return false;
          return b.items.some(other => other.isSplit && other.deptName === it.deptName);
        };

        const alloc = solvePartition(items, numBooths, [constraint]);
        if (alloc) {
          const maxL = Math.max(...alloc.map(b => b.total));
          const minL = Math.min(...alloc.map(b => b.total));
          const spread = maxL - minL;
          const score = (spread * 10) + Math.abs(maxL - mean) + Math.abs(minL - mean);
          if (score < bestTier1Score) {
            bestTier1Score = score;
            bestTier1 = alloc;
            bestSplitDept = { dept: candDept, halves };
          }
        }
      }

      // Check if Tier 1 achieves balance
      const t1Max = bestTier1 ? Math.max(...bestTier1.map(b => b.total)) : Infinity;
      const t1Min = bestTier1 ? Math.min(...bestTier1.map(b => b.total)) : 0;
      const t1Spread = t1Max - t1Min;
      const isTier1Balanced = bestTier1 && (t1Spread < tier0Spread) && (t1Max <= Math.round(mean * 1.30));

      if (isTier1Balanced || (bestTier1 && largeDepts.length < 2)) {
        chosenAlloc = bestTier1;
        splitDepts.push(bestSplitDept);
      } else {
        // --- TIER 2: AT MOST 2 DEPARTMENTS SPLIT (EACH INTO AT MOST 2 BOOTHS) ---
        let bestTier2 = null;
        let bestTier2Score = Infinity;
        let bestSplitPair = null;

        for (let i = 0; i < largeDepts.length - 1; i++) {
          for (let j = i + 1; j < largeDepts.length; j++) {
            const d1 = largeDepts[i];
            const d2 = largeDepts[j];
            const h1 = splitDeptIntoTwoHalves(d1);
            const h2 = splitDeptIntoTwoHalves(d2);
            if (!h1 || !h2) continue;

            const items = [
              ...depts.filter(d => d.name !== d1.name && d.name !== d2.name),
              h1[0], h1[1],
              h2[0], h2[1]
            ];

            const constraint = (b, it) => {
              if (!it.isSplit) return false;
              return b.items.some(other => other.isSplit && other.deptName === it.deptName);
            };

            const alloc = solvePartition(items, numBooths, [constraint]);
            if (alloc) {
              const maxL = Math.max(...alloc.map(b => b.total));
              const minL = Math.min(...alloc.map(b => b.total));
              const spread = maxL - minL;
              const score = (spread * 10) + Math.abs(maxL - mean) + Math.abs(minL - mean);
              if (score < bestTier2Score) {
                bestTier2Score = score;
                bestTier2 = alloc;
                bestSplitPair = [{ dept: d1, halves: h1 }, { dept: d2, halves: h2 }];
              }
            }
          }
        }

        if (bestTier2) {
          chosenAlloc = bestTier2;
          splitDepts = bestSplitPair;
        } else if (bestTier1) {
          chosenAlloc = bestTier1;
          splitDepts.push(bestSplitDept);
        } else {
          chosenAlloc = tier0Alloc;
          splitDepts = [];
        }
      }
    }

    // Populate allotments into booths
    chosenAlloc.sort((a, b) => a.id - b.id);
    for (let i = 0; i < numBooths; i++) {
      booths[i].classes = [];
      booths[i].totalStudents = 0;
      const bAlloc = chosenAlloc.find(x => x.id === i) || { items: [] };
      for (const it of bAlloc.items) {
        it.classes.forEach(c => booths[i].classes.push(c.name));
        booths[i].totalStudents += it.total;
      }
    }

    booths.sort((a, b) => a.boothNumber - b.boothNumber);

    // Build human-readable split summary for alerts
    const splitSummary = splitDepts.map(sd => {
      const part1Booth = booths.find(b => b.classes.includes(sd.halves[0].classes[0]?.name));
      const part2Booth = booths.find(b => b.classes.includes(sd.halves[1].classes[0]?.name));
      return {
        name: sd.dept.name,
        part1: {
          boothNumber: part1Booth ? part1Booth.boothNumber : '?',
          label: sd.halves[0].partLabel,
          classes: sd.halves[0].classes.map(c => c.name),
          count: sd.halves[0].total
        },
        part2: {
          boothNumber: part2Booth ? part2Booth.boothNumber : '?',
          label: sd.halves[1].partLabel,
          classes: sd.halves[1].classes.map(c => c.name),
          count: sd.halves[1].total
        }
      };
    });

    return {
      splitDepts: splitSummary,
      intactCount: numDepts - splitSummary.length,
      totalDepts: numDepts,
      booths: booths
    };
  };

  const refreshUI = () => {
    // Recalculate booth stats
    booths.forEach(b => b.totalStudents = 0);
    const unallocated = [];
    
    allClasses.forEach(cls => {
      const assignedBooth = booths.find(b => b.classes && b.classes.includes(cls.name));
      if (assignedBooth) {
        assignedBooth.totalStudents += cls.count;
      } else {
        unallocated.push(cls);
      }
    });

    // Check department integrity across booths
    const deptBoothMap = {};
    allClasses.forEach(cls => {
      const b = booths.find(b => b.classes && b.classes.includes(cls.name));
      if (b) {
        if (!deptBoothMap[cls.dept]) deptBoothMap[cls.dept] = new Map();
        const cur = deptBoothMap[cls.dept].get(b.boothNumber) || { count: 0, classes: [] };
        cur.count += cls.count;
        cur.classes.push(cls.name);
        deptBoothMap[cls.dept].set(b.boothNumber, cur);
      }
    });
    const currentSplitDepts = Object.entries(deptBoothMap)
      .filter(([_, bMap]) => bMap.size > 1)
      .map(([dept, bMap]) => ({
        dept,
        booths: Array.from(bMap.entries()).map(([boothNum, info]) => ({ boothNum, count: info.count, classes: info.classes }))
      }));

    const scrollPos = window.scrollY;

    main.innerHTML = `
        <!-- Locations Modal -->
        <div id="locationsModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-900/80" id="locationsModalOverlay"></div>
          <div class="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg p-6 z-10 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-white text-lg">📍 Manage &amp; Edit Locations</h4>
                <span id="locationsCountBadge" class="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-mono">
                  ${locations.length} Locations
                </span>
              </div>
              <button id="btnCloseLocationsModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div class="flex gap-2 mb-4">
              <input type="text" id="newLocationInput" class="field flex-1" placeholder="Add room or location name (e.g. Room 101, Auditorium)...">
              <button id="btnAddLocation" class="btn btn-secondary whitespace-nowrap">➕ Add</button>
            </div>

            <!-- Scrollable Locations List -->
            <div class="flex-1 overflow-y-auto mb-4 pr-1 min-h-[140px] max-h-[360px]" id="locationsListContainer">
              <div id="locationsList" class="space-y-2"></div>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              <span class="text-xs text-slate-400">💡 Click <strong>✏️ Edit</strong> or double-click to rename.</span>
              <div class="flex gap-2">
                <button id="btnCloseLocationsModal2" class="btn btn-secondary">Close</button>
                <button id="btnSaveLocations" class="btn btn-primary">💾 Save Locations</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Split Department Alert Modal -->
        <div id="splitAlertModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
          <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" id="splitAlertModalOverlay"></div>
          <div class="relative bg-slate-800 rounded-2xl border border-amber-500/40 shadow-2xl w-full max-w-xl p-6 z-10 flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">⚠️</span>
                <div>
                  <h4 class="font-bold text-amber-300 text-lg">Department Split Notice</h4>
                  <p class="text-xs text-slate-400">Election Counting &amp; Ballot Precaution</p>
                </div>
              </div>
              <button id="btnCloseSplitAlertModal" class="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div class="flex-1 overflow-y-auto pr-1 space-y-4 text-sm" id="splitAlertModalContent">
              <!-- Dynamically populated -->
            </div>

            <div class="pt-4 border-t border-white/10 flex justify-end">
              <button id="btnAckSplitAlertModal" class="btn btn-primary bg-amber-600 hover:bg-amber-500 text-white font-bold px-6">
                Understood &bull; View Allotments
              </button>
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
            <button id="btnPrintRolls" class="btn btn-secondary">🖨️ Print Marked Copy (Electoral Rolls)</button>
            <button id="btnPrintBallotAccounts" class="btn btn-secondary border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white">📑 Print Ballot Accounts</button>
          </div>
        </div>
        <div id="printArea" class="hidden"></div>

        <!-- Department Integrity & Counting Notice Banner -->
        ${currentSplitDepts.length > 0 ? `
          <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200 shadow-lg">
            <div class="flex items-start gap-3">
              <span class="text-2xl mt-0.5">⚠️</span>
              <div class="flex-1">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <h5 class="font-bold text-amber-300 text-sm">Counting Notice: ${currentSplitDepts.length} Department${currentSplitDepts.length > 1 ? 's' : ''} Split Across Booths</h5>
                  <span class="text-[11px] bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded font-mono">Max 2 Booths per Dept</span>
                </div>
                <p class="text-xs text-slate-300 mb-2.5">
                  To avoid overwhelming individual booths, the following department(s) are allotted across multiple booths. 
                  <strong>During vote counting, ballots for these departments must be aggregated from the listed booths:</strong>
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  ${currentSplitDepts.map(sd => `
                    <div class="bg-black/40 rounded-lg p-2.5 border border-amber-500/20 text-xs">
                      <div class="font-bold text-white mb-1.5 flex items-center justify-between">
                        <span>🏛️ ${esc(sd.dept)}</span>
                        <span class="text-amber-400 font-mono text-[11px]">${sd.booths.reduce((s, b) => s + b.count, 0)} total voters</span>
                      </div>
                      <div class="space-y-1">
                        ${sd.booths.map(b => `
                          <div class="flex items-start gap-1.5 text-[11px] bg-white/5 p-1 rounded">
                            <span class="font-mono text-amber-300 font-bold whitespace-nowrap">Booth ${b.boothNum}:</span>
                            <span class="text-slate-300">${b.count} voters (${esc(b.classes.join(', '))})</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        ` : (unallocated.length === 0 && booths.some(b => b.classes && b.classes.length > 0)) ? `
          <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-200 flex items-center gap-2.5 text-xs shadow-sm">
            <span class="text-base">✨</span>
            <div>
              <strong class="text-emerald-300">100% Department Integrity (0 Splits):</strong>
              <span class="text-slate-300 ml-1">Every department is contained within a single booth. No ballot box merging or cross-booth aggregation is required during counting.</span>
            </div>
          </div>
        ` : ''}

        <!-- Booth Configuration -->
        <div class="glass rounded-xl p-5 border-l-4 border-l-indigo-500">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-bold text-white text-base">Booth Setup</h4>
              <span class="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2 py-0.5 font-medium flex items-center gap-1">
                <span>🛡️</span> <span>Database Persisted</span>
              </span>
            </div>
            <div class="flex gap-2 items-center">
              <label class="text-sm text-slate-300 mb-0 whitespace-nowrap">Total Booths:</label>
              <input type="number" id="numBoothsInput" class="field w-20 py-1 font-mono text-center font-bold" min="1" max="50" value="${booths.length}">
              <button id="btnUpdateBoothCount" class="btn btn-primary btn-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 px-3">
                <span>🔢</span> <span>Update & Save</span>
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="boothsContainer">
            ${booths.map((b, i) => `
              <div class="border border-white/10 rounded-lg p-3 bg-white/5 shadow-inner">
                <div class="text-[10px] text-slate-500 font-bold uppercase mb-1 flex justify-between">
                  <span>Booth ${i + 1}</span>
                  <span class="${b.totalStudents > 0 ? 'text-indigo-400' : ''}">${b.totalStudents} Students</span>
                </div>
                <div class="flex gap-1.5 items-center mb-2">
                  <select class="field text-sm py-1 flex-1 room-name-select" data-idx="${i}">
                    <option value="">-- Assign Location --</option>
                    ${locations.map(loc => `
                      <option value="${esc(loc)}" 
                        ${b.roomName === loc ? 'selected' : ''}
                        ${booths.some((ob, oi) => oi !== i && ob.roomName === loc) ? 'disabled' : ''}
                      >${esc(loc)}</option>
                    `).join('')}
                    <option value="__ADD_NEW__">➕ Add / Manage Locations...</option>
                  </select>
                  ${b.roomName ? `
                    <button type="button" class="btn btn-secondary btn-xs py-1.5 px-2 text-slate-300 hover:text-white border-white/10 quick-edit-loc-btn" data-idx="${i}" title="Edit / Rename '${esc(b.roomName)}'">
                      ✏️
                    </button>
                  ` : ''}
                </div>
                <div class="text-xs text-slate-500 h-16 overflow-y-auto bg-black/20 rounded p-1">
                  ${b.classes.length ? b.classes.map(c => `<div class="whitespace-nowrap overflow-hidden text-ellipsis">• ${esc(c)} (${classStats[c]?.count || 0})</div>`).join('') : '<em class="opacity-30">No classes assigned</em>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Unallocated Warning -->
        ${unallocated.length ? `
          <div class="alert alert-warning py-2 text-sm">
            ⚠️ <strong>${unallocated.length} classes</strong> are currently unassigned.
          </div>
        ` : ''}

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
                ${allClasses.map(cls => {
                  const assignedBooth = booths.find(b => b.classes.includes(cls.name));
                  return `
                    <tr>
                      <td class="text-xs text-slate-400">${esc(cls.dept)}</td>
                      <td class="font-medium text-sm text-white">${esc(cls.name)}</td>
                      <td class="font-mono text-indigo-300">${cls.count}</td>
                      <td>
                        <select class="field w-full md:w-44 py-1 text-xs class-booth-select" data-class="${esc(cls.name)}">
                          <option value="">-- Unassigned --</option>
                          ${booths.map((b, i) => `
                            <option value="${i}" ${assignedBooth === b ? 'selected' : ''}>Booth ${i + 1}</option>
                          `).join('')}
                        </select>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Re-scroll to previous position
    if (!isFirstRender) {
      window.scrollTo(0, scrollPos);
    }
    isFirstRender = false;

    // --- Listeners ---
    main.querySelector('#btnClearAll').addEventListener('click', async () => {
      const assignedCount = booths.reduce((acc, b) => acc + (b.classes ? b.classes.length : 0), 0);
      if (assignedCount === 0) {
        showToast('All classes are already unassigned.', 'info');
        return;
      }
      if (!confirm(`⚠️ CONFIRM CLEAR ALL CLASS ALLOTMENTS\n\nAre you sure you want to unassign all ${assignedCount} class allotment(s) across all booths?\n\nRoom locations and booth counts will be kept intact.\n\nProceed?`)) {
        return;
      }
      booths.forEach(b => b.classes = []);
      try {
        await api.adminSaveBooths(pwd, booths);
        showToast('✅ All class allotments cleared and saved to database.', 'success');
      } catch (err) {
        showToast(`Failed to update database: ${err.message}`, 'error');
      }
      refreshUI();
    });

    main.querySelector('#btnPrintRolls').addEventListener('click', () => {
      const area = main.querySelector('#printArea');
      area.innerHTML = buildElectoralRollHtml(booths, nominalRoll, posts, classStats, nominations, plan);
      
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Popup blocked! Please allow popups for this site to print.');
        return;
      }
      printWin.document.write(`
        <html>
          <head>
            <title>Electoral Rolls - Booth Allotment</title>
            <style>
              @page { size: A4 portrait; margin: 10mm 12mm; }
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; font-size: 11px; }
              .facing-sheet { padding: 0; page-break-before: always; break-before: page; page-break-after: always; break-after: page; display: flex; flex-direction: column; height: 250mm; }
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
              .roll-table tr { page-break-inside: avoid; break-inside: avoid; height: 24px; }
              @media print {
                .no-print { display: none; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${area.innerHTML}
          </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { printWin.print(); }, 500);
    });
    
    main.querySelector('#btnPrintBallotAccounts').addEventListener('click', () => {
      const area = main.querySelector('#printArea');
      area.innerHTML = buildBallotAccountHtml(booths, nominalRoll, posts, classStats, nominations, plan);
      
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert('Popup blocked! Please allow popups for this site to print.');
        return;
      }
      printWin.document.write(`
        <html>
          <head>
            <title>Ballot Accounts - Booth Wise</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { font-family: sans-serif; color: #333; margin: 0; padding: 0; }
              .page-break { page-break-after: always; }
              .account-page { padding: 20px; display: flex; flex-direction: column; box-sizing: border-box; border: 1px solid #ccc; margin: 5px; min-height: 250mm; position: relative; }
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
          <body>${area.innerHTML}</body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { printWin.print(); }, 500);
    });

    main.querySelector('#btnUpdateBoothCount').addEventListener('click', async () => {
      const num = parseInt(main.querySelector('#numBoothsInput').value, 10);
      if (isNaN(num) || num < 1 || num > 50) {
        showToast('Please enter a valid booth count between 1 and 50.', 'error');
        return;
      }
      if (num === booths.length) {
        showToast(`Booth count is already set to ${num}.`, 'info');
        return;
      }

      // If reducing count, check if any booths will lose assigned classes or locations
      if (num < booths.length) {
        const affectedBooths = booths.slice(num);
        const hasAssignedClasses = affectedBooths.some(b => b.classes && b.classes.length > 0);
        const hasAssignedRooms = affectedBooths.some(b => b.roomName && b.roomName.trim());
        let warningMsg = `⚠️ CONFIRM BOOTH COUNT REDUCTION\n\nYou are reducing total booths from ${booths.length} to ${num}.\n`;
        if (hasAssignedClasses || hasAssignedRooms) {
          warningMsg += `\nWarning: Booth(s) ${num + 1} to ${booths.length} will be removed. Any assigned classes will return to unallocated status.\n`;
        }
        warningMsg += `\nDo you want to proceed and save this change to the database?`;
        if (!confirm(warningMsg)) return;
      } else {
        if (!confirm(`Confirm setting total polling booths to ${num} and saving to database?`)) return;
      }

      if (num > booths.length) {
        for (let i = booths.length; i < num; i++) booths.push({ boothNumber: i + 1, roomName: '', classes: [] });
      } else if (num < booths.length) {
        booths = booths.slice(0, num);
      }

      try {
        await api.adminSaveBooths(pwd, booths);
        await api.adminSaveLocations(pwd, locations);
        showToast(`✅ Total booths updated to ${num} and saved to database!`, 'success');
      } catch (err) {
        showToast(`Failed to persist to database: ${err.message}`, 'error');
      }
      refreshUI();
    });

    main.querySelectorAll('.room-name-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const val = e.target.value;
        const boothIdx = parseInt(e.target.dataset.idx, 10);
        if (val === '__ADD_NEW__') {
          e.target.value = booths[boothIdx].roomName || '';
          openModal();
          const inp = modal.querySelector('#newLocationInput');
          if (inp) inp.focus();
          return;
        }

        // If unassigning an already assigned location, prompt for confirmation
        if (!val && booths[boothIdx].roomName) {
          const oldRoom = booths[boothIdx].roomName;
          if (!confirm(`Remove assigned room location "${oldRoom}" from Booth ${boothIdx + 1}?`)) {
            e.target.value = oldRoom;
            return;
          }
        }

        booths[boothIdx].roomName = val;
        try {
          await api.adminSaveBooths(pwd, booths);
          await api.adminSaveLocations(pwd, locations);
          showToast(`✅ Booth ${boothIdx + 1} location saved as "${val || 'Unassigned'}".`, 'success');
        } catch (err) {
          showToast(`Failed to save location: ${err.message}`, 'error');
        }
        refreshUI();
      });
    });

    main.querySelectorAll('.quick-edit-loc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boothIdx = parseInt(e.currentTarget.dataset.idx, 10);
        const curRoom = booths[boothIdx]?.roomName;
        if (!curRoom) return;
        const locIdx = locations.indexOf(curRoom);
        openModal();
        if (locIdx !== -1) {
          editingLocIdx = locIdx;
          rerenderLocationsList();
          const editInp = modal.querySelector(`.loc-edit-input[data-idx="${locIdx}"]`);
          if (editInp) {
            editInp.focus();
            editInp.select();
          }
        }
      });
    });

    const modal = main.querySelector('#locationsModal');
    const closeModal = () => {
      const newInp = modal.querySelector('#newLocationInput');
      if (newInp && newInp.value.trim()) {
        if (!confirm('You have entered an unadded location. Discard it?')) return;
      }
      editingLocIdx = null;
      modal.classList.add('hidden');
      refreshUI();
    };
    const openModal = () => {
      modal.classList.remove('hidden');
      rerenderLocationsList();
    };

    const commitLocEdit = async (idx) => {
      const input = modal.querySelector(`.loc-edit-input[data-idx="${idx}"]`);
      if (!input) return;
      const newVal = input.value.trim();
      if (!newVal) {
        showToast('Location name cannot be blank.', 'error');
        input.focus();
        return;
      }
      const oldVal = locations[idx];
      if (newVal === oldVal) {
        editingLocIdx = null;
        rerenderLocationsList();
        return;
      }
      const duplicate = locations.some((l, i) => i !== idx && l.toLowerCase() === newVal.toLowerCase());
      if (duplicate) {
        showToast(`Location "${newVal}" already exists.`, 'error');
        input.focus();
        return;
      }

      // If this location is assigned to any booths, confirm renaming
      const affected = booths.filter(b => b.roomName === oldVal).length;
      if (affected > 0) {
        if (!confirm(`Confirm renaming location "${oldVal}" to "${newVal}"?\n\nThis will update ${affected} booth assignment(s).`)) {
          input.value = oldVal;
          return;
        }
      }

      locations[idx] = newVal;
      booths.forEach(b => {
        if (b.roomName === oldVal) {
          b.roomName = newVal;
        }
      });
      editingLocIdx = null;
      rerenderLocationsList();
      try {
        await api.adminSaveLocations(pwd, locations);
        if (affected > 0) {
          await api.adminSaveBooths(pwd, booths);
        }
        showToast(`✅ Renamed to "${newVal}" and saved to database.`, 'success');
      } catch (err) {
        showToast(`Failed to save rename: ${err.message}`, 'error');
      }
    };

    const rerenderLocationsList = () => {
      const countBadge = modal.querySelector('#locationsCountBadge');
      if (countBadge) countBadge.textContent = `${locations.length} Locations`;

      const list = modal.querySelector('#locationsList');
      if (!locations.length) {
        list.innerHTML = '<div class="p-6 text-center text-slate-500 text-sm italic bg-black/20 rounded-xl border border-white/5">No locations added yet. Add your rooms and halls above.</div>';
        return;
      }

      list.innerHTML = locations.map((loc, i) => {
        const assignedBooths = booths.filter(b => b.roomName === loc);
        if (editingLocIdx === i) {
          return `
            <div class="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/50 flex items-center gap-2">
              <input type="text" class="field text-sm py-1 flex-1 loc-edit-input" data-idx="${i}" value="${esc(loc)}">
              <button type="button" class="btn btn-primary btn-xs py-1 px-2.5 save-loc-edit" data-idx="${i}" title="Save rename">✓ Save</button>
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 cancel-loc-edit" data-idx="${i}" title="Cancel">✕</button>
            </div>
          `;
        }
        return `
          <div class="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 transition-colors loc-item-row" data-idx="${i}">
            <div class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer loc-label-wrap" data-idx="${i}" title="Double-click to edit">
              <span class="text-base text-slate-400 flex-shrink-0">📍</span>
              <span class="text-sm font-medium text-white truncate loc-text">${esc(loc)}</span>
              ${assignedBooths.length ? assignedBooths.map(ab => `
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                  Booth ${ab.boothNumber}
                </span>
              `).join('') : ''}
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-slate-300 hover:text-white border-white/10 edit-location" data-idx="${i}" title="Rename location">
                ✏️ Edit
              </button>
              <button type="button" class="btn btn-secondary btn-xs py-1 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 delete-location" data-idx="${i}" title="Delete location">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.edit-location').forEach(btn => {
        btn.addEventListener('click', (e) => {
          editingLocIdx = parseInt(e.currentTarget.dataset.idx, 10);
          rerenderLocationsList();
          const inp = modal.querySelector(`.loc-edit-input[data-idx="${editingLocIdx}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        });
      });

      list.querySelectorAll('.loc-label-wrap').forEach(wrap => {
        wrap.addEventListener('dblclick', (e) => {
          editingLocIdx = parseInt(e.currentTarget.dataset.idx, 10);
          rerenderLocationsList();
          const inp = modal.querySelector(`.loc-edit-input[data-idx="${editingLocIdx}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        });
      });

      list.querySelectorAll('.save-loc-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          commitLocEdit(parseInt(e.currentTarget.dataset.idx, 10));
        });
      });

      list.querySelectorAll('.cancel-loc-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          editingLocIdx = null;
          rerenderLocationsList();
        });
      });

      list.querySelectorAll('.loc-edit-input').forEach(inp => {
        inp.addEventListener('keydown', (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          if (e.key === 'Enter') {
            e.preventDefault();
            commitLocEdit(idx);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            editingLocIdx = null;
            rerenderLocationsList();
          }
        });
      });

      list.querySelectorAll('.delete-location').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx, 10);
          const loc = locations[idx];
          const assigned = booths.filter(b => b.roomName === loc);
          let confirmMsg = `Delete location "${loc}"?`;
          if (assigned.length > 0) {
            const boothNums = assigned.map(b => `Booth ${b.boothNumber}`).join(', ');
            confirmMsg = `⚠️ WARNING: "${loc}" is currently assigned to ${boothNums}.\n\nDeleting it will remove the room assignment from these booths.\n\nAre you sure you want to delete "${loc}"?`;
          }
          if (!confirm(confirmMsg)) return;

          locations.splice(idx, 1);
          booths.forEach(b => { if (b.roomName === loc) b.roomName = ''; });
          if (editingLocIdx === idx) editingLocIdx = null;
          else if (editingLocIdx > idx) editingLocIdx--;
          rerenderLocationsList();

          try {
            await api.adminSaveLocations(pwd, locations);
            if (assigned.length > 0) {
              await api.adminSaveBooths(pwd, booths);
            }
            showToast(`🗑️ Location "${loc}" deleted and updated in database.`, 'success');
          } catch (err) {
            showToast(`Failed to delete location: ${err.message}`, 'error');
          }
        });
      });
    };

    main.querySelector('#btnManageLocations').addEventListener('click', openModal);
    main.querySelector('#btnCloseLocationsModal').addEventListener('click', closeModal);
    main.querySelector('#btnCloseLocationsModal2').addEventListener('click', closeModal);
    main.querySelector('#locationsModalOverlay').addEventListener('click', closeModal);

    main.querySelector('#btnAddLocation').addEventListener('click', async () => {
      const input = main.querySelector('#newLocationInput');
      const val = input.value.trim();
      if (!val) return;
      if (locations.some(l => l.toLowerCase() === val.toLowerCase())) {
        showToast(`Location "${val}" already exists.`, 'error');
        input.focus();
        return;
      }
      locations.push(val);
      input.value = '';
      rerenderLocationsList();
      try {
        await api.adminSaveLocations(pwd, locations);
        showToast(`✅ Added "${val}" and saved to database.`, 'success');
      } catch (err) {
        showToast(`Failed to save location: ${err.message}`, 'error');
      }
      const container = modal.querySelector('#locationsListContainer');
      if (container) container.scrollTop = container.scrollHeight;
    });

    main.querySelector('#newLocationInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        main.querySelector('#btnAddLocation').click();
      }
    });

    rerenderLocationsList();

    main.querySelector('#btnSaveLocations').addEventListener('click', async (e) => {
      if (editingLocIdx !== null) {
        await commitLocEdit(editingLocIdx);
      }
      const btn = e.target;
      setLoading(btn, true, '💾 Save Locations');
      try {
        await api.adminSaveLocations(pwd, locations);
        await api.adminSaveBooths(pwd, booths);
        showToast('✅ Locations and booth assignments saved to database successfully!', 'success');
        closeModal();
        refreshUI();
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Locations');
      }
    });

    main.querySelectorAll('.class-booth-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const clsName = e.target.dataset.class;
        const newBoothIdx = e.target.value;
        const currentAssignedBooth = booths.find(b => b.classes && b.classes.includes(clsName));

        // If unassigning an already assigned class, prompt for confirmation
        if (newBoothIdx === '' && currentAssignedBooth) {
          if (!confirm(`Unassign class "${clsName}" from Booth ${currentAssignedBooth.boothNumber}?`)) {
            e.target.value = String(booths.indexOf(currentAssignedBooth));
            return;
          }
        }

        booths.forEach(b => { b.classes = b.classes.filter(c => c !== clsName); });
        if (newBoothIdx !== '') {
          booths[parseInt(newBoothIdx, 10)].classes.push(clsName);
        }
        try {
          await api.adminSaveBooths(pwd, booths);
          showToast(`Class "${clsName}" assigned to ${newBoothIdx !== '' ? `Booth ${parseInt(newBoothIdx, 10) + 1}` : 'Unassigned'} and saved.`, 'info');
        } catch (err) {
          showToast(`Failed to save class assignment: ${err.message}`, 'error');
        }
        refreshUI();
      });
    });

    main.querySelector('#btnSaveBooths').addEventListener('click', async (e) => {
      if (!confirm(`💾 CONFIRM SAVE CONFIGURATION\n\nSave ${booths.length} Polling Booth(s) and ${locations.length} Location(s) to the database?`)) {
        return;
      }
      const btn = e.target;
      setLoading(btn, true, '💾 Save Configuration');
      try {
        await api.adminSaveLocations(pwd, locations);
        await api.adminSaveBooths(pwd, booths);
        showToast('✅ Booth and location configuration saved to database successfully!', 'success');
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, 'error');
      } finally {
        setLoading(btn, false, '💾 Save Configuration');
      }
    });

    main.querySelector('#btnRegenPlan').addEventListener('click', async (e) => {
      const btn = e.target;
      const defaultText = '🔄 Finalize Master Plan';
      try {
        setLoading(btn, true, defaultText);
        showToast('Calculating and saving Master Plan on server...', 'info');
        await api.adminGenerateBallotPlan(pwd);
        showToast('Master Plan finalized successfully! You can now print documents.', 'success');
        plan = await api.adminGetBallotPlan(pwd).catch(() => null);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(btn, false, defaultText);
      }
    });

    main.querySelector('#btnCloseSplitAlertModal')?.addEventListener('click', closeSplitModal);
    main.querySelector('#btnAckSplitAlertModal')?.addEventListener('click', closeSplitModal);
    main.querySelector('#splitAlertModalOverlay')?.addEventListener('click', closeSplitModal);

    main.querySelector('#btnAutoAllot').addEventListener('click', async () => {
      const assignedCount = booths.reduce((acc, b) => acc + (b.classes ? b.classes.length : 0), 0);
      let confirmMsg = `⚡ CONFIRM AUTO ALLOTMENT\n\nThis will automatically distribute classes across Booths 1 to ${booths.length}, keeping departments intact and attaching Research Scholars to their respective departments.\n\nProceed?`;
      if (assignedCount > 0) {
        confirmMsg = `⚠️ CONFIRM AUTO ALLOTMENT OVERWRITE\n\n${assignedCount} class allotment(s) are currently configured.\nAuto-allotment will replace current assignments to keep each department together and align Research Scholars with their department.\n\nAre you sure you want to proceed?`;
      }
      if (!confirm(confirmMsg)) {
        return;
      }
      const result = autoAllot();
      try {
        await api.adminSaveBooths(pwd, booths);
        refreshUI();
        if (result.splitDepts && result.splitDepts.length > 0) {
          showToast(`⚠️ Auto allotment: ${result.splitDepts.length} department(s) split across at most 2 booths.`, 'warning');
          openSplitModal(result.splitDepts, result.intactCount, result.totalDepts);
        } else {
          showToast('🎉 Optimal Allotment: All departments kept 100% intact in single booths (0 splits)!', 'success');
        }
      } catch (err) {
        refreshUI();
        showToast(`Auto allotted in memory (Failed to save to database: ${err.message})`, 'error');
        if (result.splitDepts && result.splitDepts.length > 0) {
          openSplitModal(result.splitDepts, result.intactCount, result.totalDepts);
        }
      }
    });
  };

  const buildElectoralRollHtml = (booths, students, posts, classStats, nominationsResponse, plan) => {
    const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
    const electionYear = settings?.electionYear || new Date().getFullYear().toString();
    const collegeLogo = settings?.collegeLogo || '';
    let html = '';
    
    if (!plan) {
      return `<div class="alert alert-error">❌ Master Ballot Plan not generated. Please generate it from the Ballot Printing page first.</div>`;
    }

    const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

    sortedBooths.forEach((b) => {
      if (!b.classes || b.classes.length === 0) return;
      const boothStudents = students.filter(s => isStudentInBooth(s, b.classes));
      const totalVoters = boothStudents.length;
      const boothClasses = b.classes.map(cn => classStats[cn]).filter(Boolean);
      
      const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

      html += `
      <div class="facing-sheet">
          <div class="header">
            ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:50px;max-width:130px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
            <div class="college-name">${esc(collegeName)}</div>
            <div class="title">College Union Election ${esc(electionYear)} — Booth Facing Sheet</div>
          </div>
          
          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 8px;">
            <div>
              <strong>BOOTH:</strong> <span style="font-size: 20px; border: 2px solid #000; padding: 2px 12px; margin-left: 5px;">${b.boothNumber}</span>
              <span style="margin-left: 20px;"><strong>LOCATION:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</span>
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
                ${boothClasses.map((c) => `
                  <tr><td style="font-size:13px; font-weight:bold;">${esc(c.dept)}</td><td style="font-size:13px;">${esc(c.name)}</td><td style="text-align:right; font-size:13px; font-weight:bold;">${c.count}</td></tr>
                `).join('')}
                <tr style="font-weight:bold; background:#eee">
                  <td colspan="2" style="font-size:12px;">TOTAL VOTERS ALLOTTED TO THIS BOOTH</td>
                  <td style="text-align:right; font-size:14px;">${totalVoters}</td>
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
                ${(assignments.generalParts && assignments.generalParts.length > 1) ? assignments.generalParts.map(gp => `
                  <tr style="font-weight:bold">
                    <td style="font-size:12px;">${esc(gp.title || 'General Union Posts')}</td>
                    <td style="font-size:12px;">${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.start} - ${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.end}</td>
                    <td style="text-align:center; font-size:13px;">${gp.count}</td>
                    <td style="font-size:11px;">${gp.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('') : (assignments.general ? `
                  <tr style="font-weight:bold">
                    <td style="font-size:12px;">${esc(assignments.general.title || 'General Union Posts')}</td>
                    <td style="font-size:12px;">${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.start} - ${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.end}</td>
                    <td style="text-align:center; font-size:13px;">${assignments.general.count}</td>
                    <td style="font-size:11px;">${assignments.general.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                ` : '')}
                ${assignments.reps.map(r => `
                  <tr>
                    <td style="font-size:12px; font-weight:bold;">${esc(r.post)}</td>
                    <td style="font-size:12px;">R${r.start} - R${r.end}</td>
                    <td style="text-align:center; font-size:13px;">${r.count}</td>
                    <td style="font-size:11px;">${r.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
                ${(assignments.assocs || []).slice().sort((a, b) => String(a.post || '').localeCompare(String(b.post || ''))).map(a => `
                  <tr>
                    <td style="font-size:12px; font-weight:bold;">${esc(a.post)}</td>
                    <td style="font-size:12px;">A${a.start} - A${a.end}</td>
                    <td style="text-align:center; font-size:13px;">${a.count}</td>
                    <td style="font-size:11px;">${a.bookIds}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <div class="sig-line">Returning Officer</div>
            <div class="sig-line">Presiding Officer</div>
          </div>
        </div>`;

      boothClasses.forEach(cls => {
        const classStudents = students.filter(s => String(s['CLASS']).trim() === cls.name);
        classStudents.sort((a, b) => String(a['NAME']).localeCompare(String(b['NAME'])));

        html += `
        <div class="roll-page">
          <div class="roll-header">
            <div><strong>BOOTH ${b.boothNumber}</strong> | ${esc(b.roomName || 'No Room')}</div>
            <div style="text-align:center; flex-grow:1; font-weight:bold; font-size:13px;">College Union Election ${esc(electionYear)} — MARKED COPY (${esc(cls.name)})</div>
            <div>Dept: ${esc(cls.dept)}</div>
          </div>
          <table class="roll-table">
            <thead>
              <tr>
                <th style="width:38px">Sl.No</th>
                <th style="width:70px">Adm. No</th>
                <th>Student Name</th>
                <th style="width:160px">Class</th>
                <th style="width:100px">Voter Signature</th>
              </tr>
            </thead>
            <tbody>
              ${classStudents.map(s => `
                <tr>
                  <td style="text-align:center; font-weight:bold;">${esc(String(s['Nominal Roll Serial Number'] || s['SL_NO'] || s['SL NO'] || s['Serial Number'] || s['serial_number'] || '–'))}</td>
                  <td style="font-family:monospace; font-size:9px; white-space:nowrap;">${esc(s['ADMISION NO'] || s['ADMISSION NO'] || '–')}</td>
                  <td style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s['NAME'])}</td>
                  <td style="font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s['CLASS'])}</td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display:flex; justify-content:space-between; margin-top:14px; padding:6px 12px; font-size:10px; font-weight:bold; border-top:1.5px solid #000;">
            <div>Verified by Polling Officer: ___________________</div>
            <div>Signature of Presiding Officer: ___________________</div>
          </div>
        </div>`;
      });
    });
    return html;
  };

  const buildBallotAccountHtml = (booths, students, posts, classStats, nominationsResponse, plan) => {
    const collegeName = settings?.collegeName || CONFIG.COLLEGE_NAME || 'COLLEGE UNION ELECTION';
    const electionYear = settings?.electionYear || new Date().getFullYear().toString();
    const collegeLogo = settings?.collegeLogo || '';
    let html = '';
    if (!plan) return `<div class="alert alert-error">❌ Master Ballot Plan not generated.</div>`;

    const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);

    sortedBooths.forEach((b) => {
      if (!b.classes || b.classes.length === 0) return;
      const assignments = plan.boothAssignments[b.boothNumber] || { general: null, reps: [], assocs: [] };

      const boothGeneralPosts = (assignments.generalParts && assignments.generalParts.length > 1)
        ? assignments.generalParts.map(gp => ({ name: gp.title || `General Union Posts - Part ${gp.partNumber}`, count: gp.count }))
        : (assignments.general ? [{ name: assignments.general.title || 'General Union Posts', count: assignments.general.count }] : []);
      const boothRepPosts = assignments.reps.map(r => ({ name: r.post, count: r.count }));
      const boothAssocPosts = assignments.assocs.map(a => ({ name: a.post, count: a.count }));
      const allBoothPosts = [...boothGeneralPosts, ...boothRepPosts, ...boothAssocPosts];

      html += `
      <div class="page-break">
        <div class="account-page">
          <div>
            <div class="header">
              ${collegeLogo ? `<img src="${collegeLogo}" style="max-height:50px;max-width:130px;margin:0 auto 6px auto;display:block;object-fit:contain" alt="College Logo">` : ''}
              <div class="college-name">${esc(collegeName)}</div>
              <div class="title">College Union Election ${esc(electionYear)} — Ballots &amp; Books Account</div>
            </div>
            
            <div style="font-size: 16px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 10px; border: 1px solid #ddd;">
              <div><strong>BOOTH NUMBER:</strong> <span style="font-size: 22px; font-weight: bold; margin-left: 10px;">${b.boothNumber}</span></div>
              <div style="text-align: right;"><strong>LOCATION:</strong> ${esc(b.roomName || 'UNSPECIFIED')}</div>
            </div>

          <div style="flex: 1; display: flex; flex-direction: column; margin-top: 10px; margin-bottom: 20px;">
            <table class="stats-table" style="flex: 1; font-size: 13px;">
              <thead>
                <tr>
                  <th style="width:22%; font-size:12px;">Ballot Category</th>
                  <th style="width:18%; font-size:12px;">Serial Range</th>
                  <th style="width:10%; text-align:center; font-size:12px;">Total Qty</th>
                  <th style="width:16%; font-size:12px;">Book IDs</th>
                  <th style="width:11%; text-align:center; font-size:12px;">No. Used</th>
                  <th style="width:11%; text-align:center; font-size:12px;">No. Returned</th>
                  <th style="font-size:12px;">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${(assignments.generalParts && assignments.generalParts.length > 1) ? assignments.generalParts.map(gp => `
                  <tr style="font-weight:bold;">
                    <td style="font-size:13px;">${esc(gp.title || 'General Union Posts')}</td>
                    <td style="font-size:13px;">${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.start} - ${gp.prefix === 'G' ? 'G' : gp.prefix + '-'}${gp.end}</td>
                    <td style="text-align:center; font-size:14px;">${gp.count}</td>
                    <td style="font-size:11px;">${esc(gp.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('') : (assignments.general ? `
                  <tr style="font-weight:bold;">
                    <td style="font-size:13px;">${esc(assignments.general.title || 'General Union Posts')}</td>
                    <td style="font-size:13px;">${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.start} - ${assignments.general.prefix && assignments.general.prefix !== 'G' ? assignments.general.prefix + '-' : 'G'}${assignments.general.end}</td>
                    <td style="text-align:center; font-size:14px;">${assignments.general.count}</td>
                    <td style="font-size:11px;">${esc(assignments.general.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                ` : '')}
                ${assignments.reps.map(r => `
                  <tr>
                    <td style="font-size:13px; font-weight:bold;">${esc(r.post)}</td>
                    <td style="font-size:13px;">R${r.start} - R${r.end}</td>
                    <td style="text-align:center; font-size:14px;">${r.count}</td>
                    <td style="font-size:11px;">${esc(r.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
                ${assignments.assocs.map(a => `
                  <tr>
                    <td style="font-size:13px; font-weight:bold;">${esc(a.post)}</td>
                    <td style="font-size:13px;">A${a.start} - A${a.end}</td>
                    <td style="text-align:center; font-size:14px;">${a.count}</td>
                    <td style="font-size:11px;">${esc(a.bookIds || '-')}</td>
                    <td></td><td></td><td></td>
                  </tr>
                `).join('')}
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
                ${allBoothPosts.map(p => `
                  <tr>
                    <td style="font-size: 13px; font-weight: bold;">${esc(p.name)}</td>
                    <td style="text-align:center; font-weight:bold; font-size:14px;">${p.count}</td>
                    <td></td>
                    <td></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          </div>

          <div class="footer">
            <div class="sig-line">Presiding Officer</div>
          </div>
        </div>
      </div>`;
    });
    return html;
  };

  refreshUI();
}

