/**
 * noticesTemplates.js
 * Pre-defined statutory election notification templates complying with
 * University Student Union Election Statutes.
 */

import { CONFIG } from './config.js';
import { sortPosts } from './utils.js';

export function getDefaultStatutoryNotices(settings = {}, schedule = {}, booths = [], posts = []) {
  const year = String(settings.electionYear || '').trim() || (schedule && schedule.electionYear) || new Date().getFullYear().toString();
  const nextYear = (parseInt(year, 10) + 1).toString();
  const collegeName = String(settings.collegeName || '').trim() || CONFIG.COLLEGE_NAME || 'College Union';
  const shortName = String(settings.collegeShortName || '').trim() || CONFIG.COLLEGE_SHORT_NAME || 'CUE';
  const todayStr = new Date().toISOString().split('T')[0];

  // Dynamic extraction of posts configured by the admin in Manage Election Posts
  const configuredPosts = Array.isArray(posts) && posts.length > 0 ? posts : (CONFIG.DEFAULT_POSTS || []);

  // Association Secretaries: department-specific posts
  const assocSecPosts = configuredPosts.filter(p => {
    const pName = String(p.post || '').trim().toLowerCase();
    return pName.startsWith('association secretary') || (p.deptRestriction && pName.includes('secretary')) || p.deptRestriction || p.restrictedDept;
  }).sort((a, b) => String(a.post || '').localeCompare(String(b.post || '')));

  // Class Representatives: year/class representative posts
  const classRepPosts = configuredPosts.filter(p => {
    const pName = String(p.post || '').trim().toLowerCase();
    return !assocSecPosts.includes(p) && (pName.includes('representative') || pName.includes('rep') || p.yearRestriction);
  });

  // Main Office Bearers: executive & campus-wide union posts
  const mainOfficePosts = sortPosts(configuredPosts.filter(p => !assocSecPosts.includes(p) && !classRepPosts.includes(p)));

  const formatPostLine = (p) => {
    const postName = String(p.post || '').trim().toUpperCase();
    const notes = [];
    if (postName.includes('UNIVERSITY UNION COUNCILLOR') && !postName.includes('POST')) {
      notes.push('2 Posts');
    }
    if (p.femaleOnly && !postName.includes('WOMEN') && !postName.includes('FEMALE') && !postName.includes('LADY')) {
      notes.push('Reserved for Women');
    }
    if (p.finalYearIneligible) {
      notes.push('Final Year Ineligible');
    }
    if (p.deptRestriction && p.restrictedDept && !postName.includes(p.restrictedDept.toUpperCase())) {
      notes.push(`Dept: ${p.restrictedDept}`);
    }
    const noteStr = notes.length > 0 ? ` *(${notes.join(', ')})*` : '';
    return `- **${postName}**${noteStr}`;
  };

  const mainOfficeListText = mainOfficePosts.length > 0
    ? mainOfficePosts.map(formatPostLine).join('\n')
    : `- **THE CHAIRPERSON**\n- **THE VICE CHAIRPERSON** *(Reserved for Women)*\n- **THE SECRETARY**\n- **THE JOINT SECRETARY** *(Reserved for Women)*\n- **THE CHIEF STUDENT EDITOR** *(Final Year Ineligible)*\n- **THE SECRETARY FINE ARTS**\n- **THE GENERAL CAPTAIN FOR SPORTS AND GAMES**\n- **THE UNIVERSITY UNION COUNCILLOR** *(2 Posts)*`;

  const classRepListText = classRepPosts.length > 0
    ? classRepPosts.map(formatPostLine).join('\n')
    : `- **I UG REPRESENTATIVE**\n- **II UG REPRESENTATIVE**\n- **III UG REPRESENTATIVE**\n- **PG REPRESENTATIVE**`;

  const assocSecListText = assocSecPosts.length > 0
    ? assocSecPosts.map(formatPostLine).join('\n')
    : `- **ASSOCIATION SECRETARY BOTANY**\n- **ASSOCIATION SECRETARY CHEMISTRY**\n- **ASSOCIATION SECRETARY COMMERCE**\n- **ASSOCIATION SECRETARY COMPUTER SCIENCE**\n- **ASSOCIATION SECRETARY ECONOMICS**\n- **ASSOCIATION SECRETARY ENGLISH**\n- **ASSOCIATION SECRETARY HINDI**\n- **ASSOCIATION SECRETARY HISTORY**\n- **ASSOCIATION SECRETARY MALAYALAM**\n- **ASSOCIATION SECRETARY MATHEMATICS**\n- **ASSOCIATION SECRETARY PHYSICS**\n- **ASSOCIATION SECRETARY PSYCHOLOGY**\n- **ASSOCIATION SECRETARY SANSKRIT**\n- **ASSOCIATION SECRETARY TAMIL**\n- **ASSOCIATION SECRETARY ZOOLOGY**`;

  const formatDate = (iso, fallback = 'To be notified') => {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (iso, fallback = 'To be notified') => {
    if (!iso) return fallback;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Build booth list summary string
  let boothSummaryText = '';
  if (booths && booths.length) {
    boothSummaryText = booths.map(b => {
      const clsList = (b.classes || []).join(', ') || 'Classes as designated';
      return `• **Polling Booth No. ${b.boothNumber}** [Location: ${b.roomName || 'Designated Hall'}]\n  Allotted Classes: ${clsList}`;
    }).join('\n\n');
  } else {
    boothSummaryText = '• Polling Booths and Station allotments will be published as per the official booth allocation chart.';
  }

  return [
    {
      id: 'statutory_notice_election_notification',
      title: `ELECTION NOTIFICATION ${year}`,
      refNo: `${shortName}/ELEC/${year}/NOTIF-01 (Ref: U.O.No. 12646/2026/Admn)`,
      date: `29-09-2026`,
      category: 'Statutory Notification',
      pinned: true,
      isPublished: true,
      signatoryName: settings.returningOfficerName || 'Returning Officer',
      signatoryTitle: settings.returningOfficerDesignation || `Returning Officer, ${collegeName}`,
      content: `In accordance with the provisions of the Calicut University Act and College Union Election Statutes, it is hereby notified for the information of all students and electors of **${collegeName}** that the election to the College Union for the Academic Year **${year}–${nextYear}** will be conducted as per the statutory schedule mandated by the University.

The election will be held for the following posts:

:::columns
### Main Office Bearers
${mainOfficeListText}

### Class Representatives
${classRepListText}
:::split:::
### Association Secretaries
${assocSecListText}
:::

---

All students are directed to strictly adhere to the University Code of Conduct, the Calicut University Student Union Election Bye-laws, and campus discipline rules. Nomination forms and related documents are available at the college election portal.

> **Statutory Definition (As per U.O.No. 13078/2026/Admn Section I):**
> **Office Bearers** comprise the Chairperson, Vice-Chairperson, Secretary, and Joint Secretary.
> **Executive Members** comprise the University Union Councillor(s), Fine Arts Secretary, General Captain, Student Editor, Class/Year Representatives, and Association Secretaries.`
    },

    {
      id: 'statutory_notice_booth_allotment',
      title: `Notice on Polling Booths, Station Locations & Class Allotments`,
      refNo: `${shortName}/ELEC/${year}/NOTIF-02`,
      date: todayStr,
      category: 'Polling Booth Info',
      pinned: true,
      isPublished: true,
      signatoryName: 'Returning Officer',
      signatoryTitle: `Returning Officer, ${collegeName}`,
      content: `### POLLING BOOTHS & STATIONS ALLOTMENT NOTICE

Notice is hereby given to all students and electors of **${collegeName}** regarding the designated **Polling Stations and Booth Allotments** for the College Union Elections ${year}.

Voting shall take place strictly at the designated polling booths between the official polling hours:
**${formatDate(schedule.pollingStart, '09:30 AM')} to ${formatDate(schedule.pollingEnd, '12:30 PM')}**.

---

#### 🏫 Designated Polling Booths & Allotted Classes

${boothSummaryText}

---

#### 🗳️ Ballots Issued at Polling Booths:
Every eligible elector registered on the Final Nominal Roll will receive the official ballot papers from the Presiding Officer as applicable:
1. **White / Main General Ballot Paper**: For General Union Executive Posts (Chairperson, Vice Chairperson, Secretary, Joint Secretary, UUC, Chief Student Editor, General Captain, Fine Arts Secretary).
2. **Colored Departmental Ballot Paper**: For your respective Department Association Secretary *(issued only in booths/departments where the post is contested)*.
3. **Year Representative Ballot Paper**: For your respective Year Representative (I UG / II UG / III UG / PG Representative).

*Electors are requested to verify their names on the Nominal Roll facing sheet outside their respective booth before joining the queue.*`
    },

    {
      id: 'statutory_notice_code_of_conduct',
      title: `Model Code of Conduct & Campus Campaigning Directives`,
      refNo: `${shortName}/ELEC/${year}/MCC-03`,
      date: todayStr,
      category: 'Code of Conduct',
      pinned: false,
      isPublished: true,
      signatoryName: 'Returning Officer',
      signatoryTitle: `Returning Officer & Principal, ${collegeName}`,
      content: `### MODEL CODE OF CONDUCT FOR CANDIDATES AND STUDENT GROUPS

With the announcement of the College Union Election ${year}, the **Model Code of Conduct (MCC)** comes into force with immediate effect across the entire campus. All contesting candidates, election agents, proposers, seconders, and students must strictly adhere to the following:

1. **Defacement of Campus Property Strictly Prohibited**:
   - No student or candidate shall indulge in defacing walls, doors, desks, trees, or campus infrastructure with graffiti, paint, chalk, or pasted posters.
   - Use only the earmarked bulletin and notice boards approved by the Returning Officer for displaying printed/handwritten manifestos.
2. **Prohibition of External Influence**:
   - No political parties, outside organizations, or non-students shall be permitted inside the college campus for canvassing or campaigning under any circumstances.
   - Use of vehicles, motorcades, bike rallies, loudspeakers, or musical sound systems on campus is strictly forbidden.
3. **Eco-Friendly Campaigning**:
   - No non-biodegradable plastics, banners, flex boards, or toxic materials shall be used. Candidates are encouraged to use recycled paper, digital social notices, or verbal presentations.
4. **Decorum & Mutual Respect**:
   - No candidate shall indulge in any activity that creates mutual hatred or causes tension between different religions, castes, linguistic groups, or departments.
   - Criticism of opponents shall be strictly confined to their policies, manifesto, and work, and shall avoid personal attacks.
5. **Silence Period**:
   - All physical canvassing and campaigning shall cease 24 hours prior to the commencement of polling.`
    },

    {
      id: 'statutory_notice_voter_instructions',
      title: `Voter Guidelines & Mandatory Identity Verification Instructions`,
      refNo: `${shortName}/ELEC/${year}/VOTE-04`,
      date: todayStr,
      category: 'Voter Instructions',
      pinned: false,
      isPublished: true,
      signatoryName: 'Returning Officer',
      signatoryTitle: `Returning Officer, ${collegeName}`,
      content: `### GUIDELINES FOR VOTERS ON POLLING DAY

All bona fide regular students whose names appear in the Final Nominal Roll of **${collegeName}** are requested to note the following crucial voting guidelines:

---

#### 🪪 Mandatory Identification:
- Every voter **MUST produce their official College Identity Card with photograph** before the Polling Officer at the entrance of their designated Polling Station.
- If an ID card has been lost or damaged, the student must obtain a bona fide temporary voter slip attested by their Head of Department (HOD) and the Principal in advance.

#### 🚫 Electronic Devices Strictly Banned:
- **Mobile phones, smartwatches, cameras, recording equipment, and digital transmitters are strictly forbidden inside the Polling Booth and Voting Compartment.**
- Any elector found taking photos or videos of marked ballot papers will face immediate cancellation of their vote and strict disciplinary proceedings.

#### 📝 Manner of Voting:
1. Report to your designated Polling Booth (see the Booth Allotment Directory).
2. The Polling Officer will verify your name in the Marked Copy of the Electoral Roll and mark your left index finger with indelible ink.
3. Receive your official stamped Ballot Papers and proceed to the secret voting compartment.
4. Mark your vote using the official stamp provided by the Presiding Officer.
5. Fold the ballot paper vertically and horizontally as instructed and drop it into the sealed Ballot Box.
6. Vacate the polling station premises immediately to maintain smooth queue movement.`
    },

    {
      id: 'statutory_notice_counting_and_results',
      title: `Notice on Scrutiny, Counting of Ballots & Results Declaration`,
      refNo: `${shortName}/ELEC/${year}/COUNT-05`,
      date: todayStr,
      category: 'Counting & Results',
      pinned: false,
      isPublished: true,
      signatoryName: 'Returning Officer',
      signatoryTitle: `Returning Officer, ${collegeName}`,
      content: `### COUNTING OF VOTES AND DECLARATION OF RESULTS

Notice is hereby given that the scrutiny and counting of votes polled in the College Union Elections ${year} will commence at the **Central Counting Hall (Auditorium)** as per the schedule below:

- **Counting Commences**: ${formatDate(schedule.resultsStart, 'Immediately following closure of poll')}
- **Venue**: Central Counting Hall / College Auditorium
- **Table Allocation**: Numbered counting tables corresponding to Polling Booths.

---

#### 👥 Entry & Admission to Counting Hall:
1. Only the contesting candidates and their authorized Counting Agents (one agent per candidate per counting table, bearing official ID cards and signed credentials) will be permitted inside the Counting Hall.
2. Mobile phones and electronic communication devices are completely prohibited inside the counting hall.
3. The Returning Officer will announce the booth-wise round tally and the final combined score upon completion of each post.
4. The candidate securing the highest number of valid votes will be declared elected and presented with the Certificate of Election.
5. In the event of an equality of votes between two candidates, the result shall be decided by the Returning Officer drawing lots in the presence of the candidates.`
    },

    {
      id: 'statutory_notice_presiding_officer_instructions',
      title: `Instructions for Presiding Officers & Polling Teams`,
      refNo: `${shortName}/ELEC/${year}/PrO-GUIDE-01`,
      date: todayStr,
      category: 'Presiding Officer Guide',
      pinned: true,
      isPublished: true,
      signatoryName: 'Returning Officer',
      signatoryTitle: `Returning Officer, ${collegeName}`,
      content: `### INSTRUCTIONS FOR PRESIDING OFFICERS & POLLING TEAMS

These instructions outline the operational workflow for conducting the poll, maintaining voting secrecy, issuing the correct ballot papers, and sealing materials at the close of voting.

---

#### 📦 1. Material Collection & Verification Checklist (08:00 AM)
Report to the Central Distribution Centre (Auditorium) and verify all items:
- **Marked Copies of Electoral Roll** (2 sets) & Working Copy (1 set).
- **Ballot Paper Booklets** (White/General, Year Representatives, Department Associations).
- **Ballot Box & Padlock** with Key in designated Key Envelope.
- **Sealing Materials**: White cloth for wrapping the lock, Red Sealing Wax (Lac), candles, matchbox, official brass seal, and Paper Strip Seal.
- **Stationery & Equipment**: Indelible ink, Arrow cross-mark rubber stamps, inking pads, pens, transparent tape, and long metal ruler/scale.
- **Envelopes**: Cover A (Marked Roll), Cover B1 (Ballot Paper Account Copy 1), Cover B2 (Ballot Paper Account Copy 2 — to tape on box), and cover for counterfoils and unused ballots.
- **Numbered Queue Tokens** (for voters waiting at 01:00 PM).

---

#### 🏫 2. Pre-Poll Booth Setup (08:45 AM – 09:30 AM)
1. **Voting Compartment Privacy**: Set up in a secure, well-lit corner away from open doors and windows to ensure 100% secrecy of vote.
2. **Door Display**: Affix Booth Allotment Door Poster outside the entrance.
3. **Demonstration of Empty Box (09:15 AM)**: Open the ballot box completely in front of authorized Polling Agents and the polling team to verify it is completely empty.
4. **Initial Locking & Sealing**: Close box lid, lock with padlock, wrap lock with provided cloth, apply hot red wax with brass seal, and place key in designated envelope.
5. **Drop Slit**: Ensure aperture slit is set in the OPEN position so folded ballots can easily slide inside.

---

#### 🗳️ 3. Ballot Papers & Issuing Guidelines
Please follow these distribution rules carefully:
1. **General Union Ballot Paper (White)**:
   - Issued to **every eligible student** voting at the booth, irrespective of department or year.
   - Contains major college-wide executive posts (Chairman, Vice Chairperson, General Secretary, Joint Secretary, Arts Club Secretary, Student Editor, General Captain, UUC).
   - *(എല്ലാ വിദ്യാർഥികൾക്കും നൽകേണ്ട പൊതു യൂണിയൻ ബാലറ്റ് പേപ്പർ)*.
2. **Year / Class Representative Ballot Papers**:
   - **PG Students**: ALL Postgraduate students (across MA, MSc, MCom — both 1st & 2nd Year) receive the **exact same PG Representative ballot paper**. There are no separate departmental ballots for PG representative.
   - *(പി.ജി. വിദ്യാർഥികൾക്കെല്ലാം ഒരേ PG Representative ബാലറ്റ് പേപ്പറാണ് നൽകേണ്ടത്)*.
   - **1st Year UG Students**: ALL 1st Year undergraduate students (BA, BSc, BCom) receive the **exact same I UG Representative ballot paper**.
   - *(എല്ലാ വിഷയങ്ങളിലെയും ഒന്നാം വർഷ ഡിഗ്രി വിദ്യാർഥികൾക്കും ഒരേ First Year UG Representative ബാലറ്റ് പേപ്പർ)*.
   - **2nd Year UG Students**: Receive the **exact same II UG Representative ballot paper**.
   - **3rd Year UG Students**: Receive the **exact same III UG Representative ballot paper**.
3. **Department Association Ballot Papers**:
   - Pertains to Department Association Secretary posts.
   - **All students belonging to the same academic department (both UG and PG classes of that department) receive the exact same Department Association ballot paper**.
   - *(ഒരേ ഡിപ്പാർട്ട്മെന്റിലെ എല്ലാ യു.ജി., പി.ജി. വിദ്യാർഥികൾക്കും ഒരേ അസോസിയേഷൻ ബാലറ്റ് പേപ്പർ)*.
4. **Posts Without Election / Uncontested Posts (തിരഞ്ഞെടുപ്പ് ഇല്ലാത്ത പോസ്റ്റുകൾ)**:
   - Where a candidate is elected uncontested (unopposed), or where no nominations were filed, **no election is held and no ballot paper is printed or issued**.
   - Ballot papers are supplied **only for actively contested posts**. Voting takes place exclusively for the contested posts listed on the supplied ballots.
   - *(എതിരില്ലാതെ തിരഞ്ഞെടുക്കപ്പെട്ട പോസ്റ്റുകൾക്ക് തിരഞ്ഞെടുപ്പ് ഉണ്ടാകുന്നതല്ല; അതിനാൽ അവയ്ക്ക് ബാലറ്റ് പേപ്പർ നൽകേണ്ടതില്ല)*.

---

#### 👥 4. Duties During Polling Hours (09:30 AM – 01:00 PM)
1. **Polling Officer 1 (Identity & Roll Verification)**:
   - Verify student's original College ID Card with photo.
   - Locate student's name in Marked Roll, announce name and serial number aloud, and **round off / circle the serial number in the roll to mark voted**.
2. **Polling Officer 2 (Ballot Paper Issuance)**:
   - Ensure the **Presiding Officer has signed the back of each ballot paper** before issuing.
   - Record student's roll serial number on the counterfoil of all issued ballots.
   - **Pre-fold each ballot paper along the score lines** before handing it over.
   - Hand over the **arrow cross-mark rubber stamp** and instruct the voter to mark using the stamp only.
3. **Presiding Officer & Polling Area Supervision**:
   - Direct voter to secret compartment and ensure they drop all ballots into the ballot box.
   - **Managing Box Space**: Intermittently insert the **long metal scale / ruler** through the slit to gently press down ballots and ensure adequate space inside the box.
   - **Mobile Phone Ban**: Strictly no mobile phones or cameras inside the polling station.

---

#### 🔒 5. Close of Poll & Sealing Procedures (01:00 PM)
1. **Queue Tokens at 01:00 PM**: Distribute numbered tokens to all voters waiting in line at 01:00 PM, distributing **from the back of the queue towards the front**. Allow all token holders to vote.
2. **Sealing Ballot Box Mouth (Slit)**:
   - Close internal mechanical slit flap.
   - Affix Paper Strip Seal over the slit, apply hot red wax with brass seal, and have **Presiding Officer and Polling Agents sign across the seal**.
3. **Ballot Paper Account (Two Copies Rule)**:
   - Prepare **TWO IDENTICAL COPIES** of Ballot Paper Account, balancing all figures (Issued = Received − [Unused + Cancelled]).
   - Both copies must be signed by the **Presiding Officer AND all Polling Agents present** (signatures below Presiding Officer).
   - **COPY 1 (Cover B1)**: Place in Cover B1, seal with red wax, and hand over separately at the reception desk.
   - **COPY 2 (Cover B2)**: Place in Cover B2, seal with red wax, and **FIRMLY TAPE / STICK THIS ENTIRE SEALED COVER DIRECTLY TO THE OUTER LID OF THE BALLOT BOX** using wide transparent tape.
4. **Sealing Ballot Books**: Place counterfoils of used ballots, unused ballots, and cancelled ballots in the designated cover and seal it.
5. **Sealing Marked Roll (Cover A)**: Place Marked Copy of Electoral Roll into Cover A and seal it.

---

#### 🏛️ 6. Reception Counter Handover Sequence
At the Central Reception Counter (Auditorium), hand over items in this exact sequence:
1. **Sealed Ballot Box** (with Sealed Cover B2 containing Ballot Paper Account Copy 2 taped to box lid).
2. **Cover B1: Sealed Ballot Paper Account** (Copy 1 — Handover Copy).
3. **Cover A: Sealed Marked Copy of Electoral Roll**.
4. **Sealed Cover with Counterfoils & Unused Ballots**.
5. **Polling Kit Bag** with remaining stationery, brass seal, stamps, and key envelope.
Collect your official **Presiding Officer Clearance Slip** from the Returning Officer.`
    }
  ];
}
