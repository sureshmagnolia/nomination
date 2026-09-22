/**
 * noticesTemplates.js
 * Pre-defined statutory election notification templates complying with
 * University Student Union Election Statutes.
 */

import { CONFIG } from './config.js';

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
  const mainOfficePosts = configuredPosts.filter(p => !assocSecPosts.includes(p) && !classRepPosts.includes(p));

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
    : `- **THE CHAIRMAN**\n- **THE VICE CHAIRMAN** *(Reserved for Women)*\n- **THE SECRETARY**\n- **THE JOINT SECRETARY** *(Reserved for Women)*\n- **THE CHIEF STUDENT EDITOR** *(Final Year Ineligible)*\n- **THE SECRETARY FINE ARTS**\n- **THE GENERAL CAPTAIN FOR SPORTS AND GAMES**\n- **THE UNIVERSITY UNION COUNCILLOR** *(2 Posts)*`;

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
      refNo: `${shortName}/ELEC/${year}/NOTIF-01`,
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

### Official Election Schedule (Academic Year ${year}–${nextYear})

| Activity | Date | Day | Time |
| :--- | :---: | :---: | :---: |
| Publication of the Preliminary Electoral Roll | 23-09-2026 | Wednesday | 11:00 AM |
| Last date and time for correction/addition/deletion in the Preliminary Electoral Roll | 25-09-2026 | Friday | 4:00 PM |
| Publication of the Final Electoral Roll | 28-09-2026 | Monday | 4:00 PM |
| Date of Notification of the Election for the Academic Year 2026–27 | 29-09-2026 | Tuesday | 4:00 PM |
| Last Date and Time for Submission of Nominations | 01-10-2026 | Thursday | Until 12:00 Noon |
| Date and Time for Scrutiny of Nominations | 01-10-2026 | Thursday | 2:00 PM |
| Date and Time for Publication of the List of Valid Nominations | 01-10-2026 | Thursday | 5:00 PM |
| Last Date and Time for Withdrawal of Nominations | 05-10-2026 | Monday | Until 12:00 Noon |
| Date and Time for Publication of the Final List of Nominations | 05-10-2026 | Monday | 5:00 PM |
| Date and Time for Polling – Presidential Mode &amp; Union Office Bearers Election | 15-10-2026 | Thursday | 9:30 AM to 12:30 PM |
| Date and Time for Counting of Votes &amp; Declaration of Results | 15-10-2026 | Thursday | From 2:00 PM onwards |

---

All students are directed to strictly adhere to the University Code of Conduct, the Calicut University Student Union Election Bye-laws, and campus discipline rules. Nomination forms and related documents are available at the college election portal.

**Returning Officer**  
*(College Seal)*`
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
**${formatDate(schedule.pollingStart, '9:30 AM')} to ${formatDate(schedule.pollingEnd, '1:30 PM')}**.

---

#### 🏫 Designated Polling Booths & Allotted Classes

${boothSummaryText}

---

#### 🗳️ Ballots Issued at Polling Booths:
Every eligible elector registered on the Final Nominal Roll will receive the following official ballot papers from the Presiding Officer:
1. **White / Main General Ballot Paper**: For General Union Executive Posts (Chairman, Vice Chairman, Secretary, Joint Secretary, UUC, Chief Student Editor, General Captain, Fine Arts Secretary).
2. **Colored Departmental Ballot Paper**: For your respective Department Association Secretary.
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
    }
  ];
}
