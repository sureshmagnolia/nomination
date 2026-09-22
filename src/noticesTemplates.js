/**
 * noticesTemplates.js
 * Pre-defined statutory election notification templates complying with
 * University Student Union Election Statutes and Lyngdoh Committee norms.
 */

export function getDefaultStatutoryNotices(settings = {}, schedule = {}, booths = []) {
  const year = settings.electionYear || new Date().getFullYear().toString();
  const collegeName = settings.collegeName || 'Government Victoria College, Palakkad';
  const shortName = settings.collegeShortName || 'GVC';
  const todayStr = new Date().toISOString().split('T')[0];

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
      title: `Official Election Notification — College Union Elections ${year}`,
      refNo: `${shortName}/ELEC/${year}/NOTIF-01`,
      date: schedule.notificationDate ? formatDateOnly(schedule.notificationDate) : todayStr,
      category: 'Statutory Notification',
      pinned: true,
      isPublished: true,
      signatoryName: 'Returning Officer',
      signatoryTitle: `Returning Officer & Principal / Associate Professor, ${collegeName}`,
      content: `### ELECTION NOTIFICATION
**Sub:** Conduct of College Union Elections for the Academic Year ${year} — reg.

It is hereby notified under the provisions of the University Statutes and the guidelines framed by the Lyngdoh Committee as accepted by the Hon'ble Supreme Court of India, that the elections to the **College Union and its affiliated Departmental Associations of ${collegeName}** for the academic year **${year}** will be conducted as per the schedule below:

---

#### 📅 Official Election Calendar & Timings

| Sl. No. | Stage of Election | Date & Time |
| :---: | :--- | :--- |
| **1** | Publication of Preliminary Electoral Roll (Draft Nominal Roll) | ${formatDate(schedule.draftRollStart, 'As scheduled')} |
| **2** | Last date and hour for filing Claims & Objections | ${formatDate(schedule.draftRollEnd, 'As scheduled')} |
| **3** | Publication of Final Electoral Roll (Final Nominal Roll) | ${formatDate(schedule.finalRollStart, 'As scheduled')} |
| **4** | Commencing of Filing of Nominations | ${formatDate(schedule.nominationStart, 'As scheduled')} |
| **5** | Last date and hour for Receipt of Nomination Papers | ${formatDate(schedule.nominationDeadline, 'As scheduled')} |
| **6** | Scrutiny of Nominations & Publication of Valid List | ${formatDate(schedule.validListStart, 'As scheduled')} |
| **7** | Last date and hour for Withdrawal of Candidature | ${formatDate(schedule.withdrawalEnd, 'As scheduled')} |
| **8** | Publication of Final List of Contesting Candidates | ${formatDate(schedule.finalListStart, 'As scheduled')} |
| **9** | **Date and Hours of Polling** | **${formatDate(schedule.pollingStart, 'To be announced')} to ${formatDate(schedule.pollingEnd, 'To be announced')}** |
| **10** | **Scrutiny & Counting of Votes / Declaration of Results** | **${formatDate(schedule.resultsStart, 'Immediately following poll')}** |

---

#### ⚖️ Statutory Eligibility Norms (Lyngdoh Committee Guidelines)
1. **Age Limit**:
   - Undergraduate (UG) students must be between **17 and 22 years** of age as on the date of notification.
   - Postgraduate (PG) students must not exceed **24–25 years** of age.
   - **Research Scholars are barred from contesting** for any College Union or Departmental post under statutory university election rules.
2. **Academic Standing**: The candidate must be a regular full-time enrolled student of the college, having no academic arrears and with a minimum aggregate attendance of **75%**.
3. **Disciplinary Clearance**: Candidates must not have any previous criminal records, disciplinary proceedings, or campus trial sanctions pending against them.
4. **Election Expenditure**: Election expenses for every candidate shall strictly not exceed the permissible ceiling of ₹5,000/- as mandated by Supreme Court directives.`
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
