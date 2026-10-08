import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { DEFAULT_COLLEGE_LOGO } from './src/data/defaultEmblem.js';

const collegeName = 'GOVERNMENT COLLEGE CHITTUR';
const collegePlace = 'Chittur, Palakkad';
const collegeShort = 'GCC';
const electionYear = '2026';
const emblemDataUrl = DEFAULT_COLLEGE_LOGO;

// 30 Counting Tables corresponding to 30 Polling Booths across 15 Departments of GCC
const countingTablesData = [
  {
    tableNum: 1,
    dept: 'Botany',
    icon: '🌿',
    room: 'Room B1, Botany Block',
    classesDesc: '1st B.Sc Botany, 2nd B.Sc Botany, 3rd B.Sc Botany',
    electors: 120,
    supervisor: 'Dr. Radhakrishnan V. (Associate Prof. & HoD, Botany)',
    assistant: 'Sri. Manoj Kumar K. (Senior Clerk)',
    inCharge: 'Dr. Preetha S. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Botany', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #1)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class / Cohort Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #2)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #3-#9)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #10)', isUuc: true }
    ]
  },
  {
    tableNum: 2,
    dept: 'Botany',
    icon: '🌿',
    room: 'Room B2, Botany PG Hall',
    classesDesc: '1st M.Sc Botany, 2nd M.Sc Botany',
    electors: 31,
    supervisor: 'Dr. Anoop P. (Assistant Prof., Botany)',
    assistant: 'Smt. Bindu M. (Clerk)',
    inCharge: 'Dr. Preetha S. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Botany', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #11)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #12)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #13-#19)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #20)', isUuc: true }
    ]
  },
  {
    tableNum: 3,
    dept: 'Chemistry',
    icon: '🔬',
    room: 'Room CH1, Chemistry Block',
    classesDesc: '1st B.Sc Chemistry, 2nd B.Sc Chemistry, 3rd B.Sc Chemistry',
    electors: 138,
    supervisor: 'Dr. Suresh Babu T. (Associate Prof., Chemistry)',
    assistant: 'Sri. Rajan P. (Office Attendant)',
    inCharge: 'Prof. Haridasan K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Chemistry', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #21)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class / Cohort Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #22)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #23-#29)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #30)', isUuc: true }
    ]
  },
  {
    tableNum: 4,
    dept: 'Chemistry',
    icon: '🔬',
    room: 'Room CH2, Chemistry PG Seminar Hall',
    classesDesc: '1st M.Sc Chemistry, 2nd M.Sc Chemistry',
    electors: 35,
    supervisor: 'Dr. Sunitha Nair (Assistant Prof., Chemistry)',
    assistant: 'Sri. Shaji K. (Senior Clerk)',
    inCharge: 'Prof. Haridasan K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Chemistry', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #31)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #32)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #33-#39)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #40)', isUuc: true }
    ]
  },
  {
    tableNum: 5,
    dept: 'Commerce',
    icon: '🏛️',
    room: 'Room C1, Commerce Block (GF)',
    classesDesc: '1st B.Com (Finance), 2nd B.Com (Finance)',
    electors: 122,
    supervisor: 'Dr. Mohammed Shafi (Associate Prof., Commerce)',
    assistant: 'Smt. Smitha V. (Head Accountant)',
    inCharge: 'Dr. Jayakumar R. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Commerce', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #41)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG & II UG Representatives', desc: 'Class / Cohort Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #42)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #43-#49)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #50)', isUuc: true }
    ]
  },
  {
    tableNum: 6,
    dept: 'Commerce',
    icon: '🏛️',
    room: 'Room C2, Commerce Block (1st Floor)',
    classesDesc: '3rd B.Com (Finance), 1st M.Com, 2nd M.Com',
    electors: 100,
    supervisor: 'Sri. Vinod Kumar P. (Assistant Prof., Commerce)',
    assistant: 'Sri. Sivadasan M. (Senior Clerk)',
    inCharge: 'Dr. Jayakumar R. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Commerce', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #51)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'III UG & PG Representatives', desc: 'Class & Post-Graduate Representatives', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #52)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #53-#59)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #60)', isUuc: true }
    ]
  },
  {
    tableNum: 7,
    dept: 'Economics',
    icon: '📈',
    room: 'Room E1, Arts Block (GF)',
    classesDesc: '1st B.A Economics, 2nd B.A Economics, 3rd B.A Economics',
    electors: 157,
    supervisor: 'Dr. Unnikrishnan K. (Associate Prof., Economics)',
    assistant: 'Sri. Gopalakrishnan (Office Attendant)',
    inCharge: 'Prof. Sasidharan M. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Economics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #61)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class / Cohort Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #62)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #63-#69)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #70)', isUuc: true }
    ]
  },
  {
    tableNum: 8,
    dept: 'Economics',
    icon: '📈',
    room: 'Room E2, Arts Block (1st Floor)',
    classesDesc: '1st M.A Economics, 2nd M.A Economics, Research Scholars (RS1-RS2)',
    electors: 41,
    supervisor: 'Dr. Maya Devi (Assistant Prof., Economics)',
    assistant: 'Smt. Geetha R. (Clerk)',
    inCharge: 'Prof. Sasidharan M. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Economics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #71)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #72)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #73-#79)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #80)', isUuc: true }
    ]
  },
  {
    tableNum: 9,
    dept: 'Electronics',
    icon: '⚡',
    room: 'Room EL1, Electronics Block',
    classesDesc: '1st B.Sc Electronics, 2nd B.Sc Electronics',
    electors: 75,
    supervisor: 'Sri. Pradeep Kumar (Assistant Prof., Electronics)',
    assistant: 'Sri. Balan T. (Lab Staff)',
    inCharge: 'Dr. Vijayan K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Electronics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #81)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG & II UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #82)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #83-#89)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #90)', isUuc: true }
    ]
  },
  {
    tableNum: 10,
    dept: 'Electronics',
    icon: '⚡',
    room: 'Room EL2, Electronics PG Lab',
    classesDesc: '3rd B.Sc Electronics, 1st M.Sc, 2nd M.Sc Electronics',
    electors: 62,
    supervisor: 'Smt. Renuka P. (Assistant Prof., Electronics)',
    assistant: 'Sri. Sajeevan C. (Clerk)',
    inCharge: 'Dr. Vijayan K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Electronics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #91)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'III UG & PG Representatives', desc: 'Class & PG Representatives', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #92)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #93-#99)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #100)', isUuc: true }
    ]
  },
  {
    tableNum: 11,
    dept: 'English',
    icon: '📚',
    room: 'Room ENG1, Language Lab Wing',
    classesDesc: '1st B.A English, 2nd B.A English, 3rd B.A English',
    electors: 118,
    supervisor: 'Dr. Thomas Mathew (Associate Prof., English)',
    assistant: 'Smt. Valsala K. (Senior Clerk)',
    inCharge: 'Prof. Radhika N. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary English', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #101)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #102)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #103-#109)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #110)', isUuc: true }
    ]
  },
  {
    tableNum: 12,
    dept: 'English',
    icon: '📚',
    room: 'Room ENG2, Language Lab Hall',
    classesDesc: '1st M.A English, 2nd M.A English',
    electors: 36,
    supervisor: 'Dr. Deepa K. (Assistant Prof., English)',
    assistant: 'Sri. Santhosh P. (Attendant)',
    inCharge: 'Prof. Radhika N. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary English', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #111)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #112)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #113-#119)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #120)', isUuc: true }
    ]
  },
  {
    tableNum: 13,
    dept: 'Geography',
    icon: '🌍',
    room: 'Room G1, Geography Department Hall',
    classesDesc: '1st B.Sc Geography, 2nd B.Sc Geography, 3rd B.Sc Geography',
    electors: 114,
    supervisor: 'Dr. Santhosh Kumar (Associate Prof., Geography)',
    assistant: 'Sri. Mohandas K. (Senior Clerk)',
    inCharge: 'Dr. Sudheer V. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Geography', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #121)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #122)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #123-#129)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #130)', isUuc: true }
    ]
  },
  {
    tableNum: 14,
    dept: 'Geography',
    icon: '🌍',
    room: 'Room G2, GIS & Cartography Lab',
    classesDesc: '1st M.Sc Geography, 2nd M.Sc Geography, Research Scholars (RS3-RS4)',
    electors: 32,
    supervisor: 'Dr. Rekha M. (Assistant Prof., Geography)',
    assistant: 'Smt. Latha P. (Clerk)',
    inCharge: 'Dr. Sudheer V. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Geography', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #131)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #132)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #133-#139)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #140)', isUuc: true }
    ]
  },
  {
    tableNum: 15,
    dept: 'History',
    icon: '🏛️',
    room: 'Room H1, Heritage Block (GF)',
    classesDesc: '1st B.A History, 2nd B.A History, 3rd B.A History',
    electors: 145,
    supervisor: 'Dr. Balakrishnan P. (Associate Prof., History)',
    assistant: 'Sri. Muraleedharan (Office Attendant)',
    inCharge: 'Prof. Manikandan T. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary History', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #141)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #142)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #143-#149)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #150)', isUuc: true }
    ]
  },
  {
    tableNum: 16,
    dept: 'History',
    icon: '🏛️',
    room: 'Room H2, Heritage Block (1st Floor)',
    classesDesc: '1st M.A History, 2nd M.A History',
    electors: 38,
    supervisor: 'Dr. Sajitha K. (Assistant Prof., History)',
    assistant: 'Sri. Chandran M. (Senior Clerk)',
    inCharge: 'Prof. Manikandan T. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary History', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #151)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #152)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #153-#159)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #160)', isUuc: true }
    ]
  },
  {
    tableNum: 17,
    dept: 'Malayalam',
    icon: '📖',
    room: 'Room M1, Bhasha Bhavan (GF)',
    classesDesc: '1st B.A Malayalam, 2nd B.A Malayalam, 3rd B.A Malayalam',
    electors: 130,
    supervisor: 'Dr. Madhavan K. (Associate Prof., Malayalam)',
    assistant: 'Smt. Sujatha P. (Clerk)',
    inCharge: 'Dr. Sreedevi K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Malayalam', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #161)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #162)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #163-#169)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #170)', isUuc: true }
    ]
  },
  {
    tableNum: 18,
    dept: 'Malayalam',
    icon: '📖',
    room: 'Room M2, Bhasha Bhavan (1st Floor)',
    classesDesc: '1st M.A Malayalam, 2nd M.A Malayalam',
    electors: 34,
    supervisor: 'Dr. Pravitha V. (Assistant Prof., Malayalam)',
    assistant: 'Sri. Jayaprakash (Attendant)',
    inCharge: 'Dr. Sreedevi K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Malayalam', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #171)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #172)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #173-#179)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #180)', isUuc: true }
    ]
  },
  {
    tableNum: 19,
    dept: 'Mathematics',
    icon: '📐',
    room: 'Room MATH1, Main Science Wing',
    classesDesc: '1st B.Sc Mathematics, 2nd B.Sc Mathematics, 3rd B.Sc Mathematics',
    electors: 135,
    supervisor: 'Dr. Ramanathan P. (Associate Prof., Mathematics)',
    assistant: 'Sri. Narayanan K. (Senior Clerk)',
    inCharge: 'Dr. Mini V. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Mathematics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #181)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #182)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #183-#189)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #190)', isUuc: true }
    ]
  },
  {
    tableNum: 20,
    dept: 'Mathematics',
    icon: '📐',
    room: 'Room MATH2, Ramanujan Seminar Hall',
    classesDesc: '1st M.Sc Mathematics, 2nd M.Sc Mathematics, Research Scholars (RS5-RS7)',
    electors: 39,
    supervisor: 'Dr. Saritha N. (Assistant Prof., Mathematics)',
    assistant: 'Smt. Mini K. (Clerk)',
    inCharge: 'Dr. Mini V. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Mathematics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #191)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #192)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #193-#199)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #200)', isUuc: true }
    ]
  },
  {
    tableNum: 21,
    dept: 'Music',
    icon: '🎵',
    room: 'Room MUS1, Fine Arts & Music Block',
    classesDesc: '1st B.A Music, 2nd B.A Music, 3rd B.A Music',
    electors: 90,
    supervisor: 'Dr. Harikumar S. (Associate Prof., Music)',
    assistant: 'Sri. Sasikumar P. (Office Attendant)',
    inCharge: 'Prof. Venugopal K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Music', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #201)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #202)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #203-#209)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #210)', isUuc: true }
    ]
  },
  {
    tableNum: 22,
    dept: 'Music',
    icon: '🎵',
    room: 'Room MUS2, Sangeetha Sabha Hall',
    classesDesc: '1st M.A Music, 2nd M.A Music, Research Scholars (RS8-RS11)',
    electors: 28,
    supervisor: 'Dr. Gayathri Devi (Assistant Prof., Music)',
    assistant: 'Smt. Parvathy M. (Clerk)',
    inCharge: 'Prof. Venugopal K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Music', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #211)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #212)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #213-#219)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #220)', isUuc: true }
    ]
  },
  {
    tableNum: 23,
    dept: 'Philosophy',
    icon: '💡',
    room: 'Room P1, Humanities Wing',
    classesDesc: '1st B.A Philosophy, 2nd B.A Philosophy, 3rd B.A Philosophy',
    electors: 120,
    supervisor: 'Dr. Padmanabhan C. (Associate Prof., Philosophy)',
    assistant: 'Sri. Ramachandran (Senior Clerk)',
    inCharge: 'Dr. Keshava Prasad (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Philosophy', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #221)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #222)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #223-#229)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #230)', isUuc: true }
    ]
  },
  {
    tableNum: 24,
    dept: 'Philosophy',
    icon: '💡',
    room: 'Room P2, Ethics Seminar Hall',
    classesDesc: '1st M.A Philosophy, 2nd M.A Philosophy',
    electors: 30,
    supervisor: 'Dr. Anila K. (Assistant Prof., Philosophy)',
    assistant: 'Smt. Sobhana T. (Clerk)',
    inCharge: 'Dr. Keshava Prasad (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Philosophy', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #231)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #232)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #233-#239)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #240)', isUuc: true }
    ]
  },
  {
    tableNum: 25,
    dept: 'Physics',
    icon: '⚡',
    room: 'Room PHY1, C.V. Raman Physics Wing',
    classesDesc: '1st B.Sc Physics, 2nd B.Sc Physics, 3rd B.Sc Physics',
    electors: 132,
    supervisor: 'Dr. Sreevalsan K. (Associate Prof., Physics)',
    assistant: 'Sri. Sukumaran N. (Senior Clerk)',
    inCharge: 'Prof. Damodaran V. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Physics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #241)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #242)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #243-#249)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #250)', isUuc: true }
    ]
  },
  {
    tableNum: 26,
    dept: 'Physics',
    icon: '⚡',
    room: 'Room PHY2, Physics Research Hall',
    classesDesc: '1st M.Sc Physics, 2nd M.Sc Physics',
    electors: 33,
    supervisor: 'Dr. Kavitha P. (Assistant Prof., Physics)',
    assistant: 'Smt. Leela C. (Office Attendant)',
    inCharge: 'Prof. Damodaran V. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Physics', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #251)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #252)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #253-#259)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #260)', isUuc: true }
    ]
  },
  {
    tableNum: 27,
    dept: 'Tamil',
    icon: '🏛️',
    room: 'Room T1, South Indian Languages Wing',
    classesDesc: '1st B.A Tamil, 2nd B.A Tamil, 3rd B.A Tamil',
    electors: 114,
    supervisor: 'Dr. Muthuswamy S. (Associate Prof., Tamil)',
    assistant: 'Sri. Thangaraj M. (Senior Clerk)',
    inCharge: 'Dr. Subramanian K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Tamil', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #261)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #262)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #263-#269)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #270)', isUuc: true }
    ]
  },
  {
    tableNum: 28,
    dept: 'Tamil',
    icon: '🏛️',
    room: 'Room T2, Sangam Literature Hall',
    classesDesc: '1st M.A Tamil, 2nd M.A Tamil, Research Scholars (RS12-RS21)',
    electors: 38,
    supervisor: 'Dr. Selvi V. (Assistant Prof., Tamil)',
    assistant: 'Sri. Arumugham (Attendant)',
    inCharge: 'Dr. Subramanian K. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Tamil', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #271)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #272)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #273-#279)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #280)', isUuc: true }
    ]
  },
  {
    tableNum: 29,
    dept: 'Zoology',
    icon: '🔬',
    room: 'Room Z1, Life Sciences Block (GF)',
    classesDesc: '1st B.Sc Zoology, 2nd B.Sc Zoology, 3rd B.Sc Zoology',
    electors: 126,
    supervisor: 'Dr. Raveendran K. (Associate Prof., Zoology)',
    assistant: 'Sri. Jayachandran P. (Senior Clerk)',
    inCharge: 'Prof. Krishnadas C. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Zoology', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #281)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'I UG, II UG & III UG Representatives', desc: 'Class Representatives (UG)', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #282)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #283-#289)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #290)', isUuc: true }
    ]
  },
  {
    tableNum: 30,
    dept: 'Zoology',
    icon: '🔬',
    room: 'Room Z2, Entomology & Genetics Lab',
    classesDesc: '1st M.Sc Zoology, 2nd M.Sc Zoology',
    electors: 31,
    supervisor: 'Dr. Sheeja M. (Assistant Prof., Zoology)',
    assistant: 'Smt. Shailaja K. (Clerk)',
    inCharge: 'Prof. Krishnadas C. (Core Committee)',
    stages: [
      { stage: 'Stage 1', code: 'A-Series', post: 'Association Secretary Zoology', desc: 'Department Student Association', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #291)' },
      { stage: 'Stage 2', code: 'R-Series', post: 'PG Representative', desc: 'Post-Graduate Student Representative', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #292)' },
      { stage: 'Stage 3', code: 'G-Series', post: 'General Union Executive Seats', desc: 'Chairman, Vice Chairman, Gen. Secretary, Joint Sec., Arts Club Sec., Student Editor, Sports Captain', target: '25-Ballot Bundles', form: 'Form 5 / Form 6 (Sl #293-#299)' },
      { stage: 'Stage 4', code: 'UUC-Series', post: 'University Union Councillor (UUC)', desc: 'Statutory 2-Seat Campus Quota', target: 'Special Multi-Vote Tally', form: 'Form 6-T / Form 7 (Sl #300)', isUuc: true }
    ]
  }
];

function generatePlacardsHtml() {
  const pagesHtml = countingTablesData.map((tData, idx) => {
    return `
    <div class="placard-page ${idx < countingTablesData.length - 1 ? 'page-break' : ''}">
      <div class="placard-frame">

        <!-- Micro Header -->
        <div class="micro-header">
          GOVERNMENT COLLEGE CHITTUR &bull; COLLEGE UNION ELECTION ${electionYear} &bull; STATUTORY COUNTING HALL TABLE PROTOCOL &bull; TABLE ${tData.tableNum} RECORD
        </div>

        <!-- Section 1: Institutional Header -->
        <div class="inst-header">
          <div class="inst-logo-box">
            <img src="${emblemDataUrl}" class="inst-logo" alt="GCC Emblem">
          </div>
          <div class="inst-text-box">
            <div class="college-name">${collegeName}</div>
            <div class="college-sub">${collegePlace} &bull; Affiliated to University of Calicut</div>
            <div class="doc-main-title">COUNTING TABLE OPERATING PROTOCOL &amp; STATUTORY SEQUENCE</div>
            <div class="doc-sub-title">College Union Elections ${electionYear} &bull; Counting Hall Deployment &bull; Formulated Under University Bylaws</div>
          </div>
          <div class="mandatory-tag">
            <div class="tag-title">📌 MANDATORY NOTICE</div>
            <div class="tag-desc">MUST BE AFFIXED ON TABLE TOP</div>
          </div>
        </div>

        <!-- Section 2: Table & Personnel Master Banner -->
        <div class="table-info-banner">
          <div class="table-number-box">
            <div class="table-sub-lbl">OFFICIAL DESIGNATED</div>
            <div class="table-big-num">TABLE ${tData.tableNum}</div>
            <div class="table-dept-pill">${tData.icon} Dept. of ${tData.dept}</div>
          </div>

          <div class="table-details-box">
            <div class="info-row">
              <span class="info-lbl">📍 CORRESPONDING BOOTH:</span>
              <span class="info-val"><strong>Booth No. ${tData.tableNum}</strong> &bull; ${tData.room}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">👥 ALLOTTED CLASSES:</span>
              <span class="info-val">${tData.classesDesc}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">🗳️ ELECTOR STRENGTH:</span>
              <span class="info-val"><strong>${tData.electors} Registered Electors</strong> (Ballot Account Target)</span>
            </div>
          </div>

          <div class="table-squad-box">
            <div class="squad-title">OFFICIAL COUNTING SQUAD</div>
            <div class="squad-item"><strong>Supervisor:</strong> ${tData.supervisor}</div>
            <div class="squad-item"><strong>Assistant:</strong> ${tData.assistant}</div>
            <div class="squad-item"><strong>In-Charge:</strong> ${tData.inCharge}</div>
          </div>
        </div>

        <!-- Section 3: Statutory Counting Sequence (Table-Specific Matrix) -->
        <div class="section-container">
          <div class="section-title-bar green-bar">
            <span>📋 STATUTORY 4-STAGE COUNTING SEQUENCE (ROUND-BY-ROUND OPERATIONAL MATRIX)</span>
            <span class="section-sub-badge">TABLE ${tData.tableNum} WORKFLOW</span>
          </div>

          <table class="seq-table">
            <thead>
              <tr>
                <th style="width: 11%;">STAGE / ROUND</th>
                <th style="width: 17%;">BALLOT SERIES &bull; TIER</th>
                <th style="width: 28%;">CONTESTED POST ALLOTTED</th>
                <th style="width: 14%;">BUNDLE TARGET</th>
                <th style="width: 12%;">STATUTORY FORM</th>
                <th style="width: 18%;">SUPERVISOR EXECUTION RECORD</th>
              </tr>
            </thead>
            <tbody>
              ${tData.stages.map(st => `
                <tr class="${st.isUuc ? 'uuc-row' : ''}">
                  <td class="col-stage">
                    <span class="stage-badge ${st.isUuc ? 'badge-uuc' : ''}">${st.stage}</span>
                  </td>
                  <td class="col-tier">
                    <span class="code-pill ${st.isUuc ? 'code-uuc' : ''}">${st.code}</span>
                    <div class="tier-desc">${st.desc}</div>
                  </td>
                  <td class="col-post">
                    <div class="post-title ${st.isUuc ? 'post-uuc' : ''}">${st.post}</div>
                  </td>
                  <td class="col-target">
                    <strong>${st.target}</strong>
                    <div class="target-sub">+ Doubtful Tray</div>
                  </td>
                  <td class="col-form">
                    <strong>${st.form}</strong>
                  </td>
                  <td class="col-record">
                    <div class="record-grid">
                      <div class="rec-item">Start: [ &nbsp;&nbsp;:&nbsp;&nbsp; ]</div>
                      <div class="rec-item">End: [ &nbsp;&nbsp;:&nbsp;&nbsp; ]</div>
                      <div class="rec-item">Valid: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
                      <div class="rec-item">Doubt: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</div>
                      <div class="rec-item sign">Sign: _________</div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Section 4: CRITICAL UUC STATUTORY DIRECTIVE (The Core Requirement) -->
        <div class="uuc-directive-card">
          <div class="uuc-header">
            <span class="uuc-alert-icon">🛑</span>
            <span class="uuc-header-title">MANDATORY STATUTORY DIRECTIVE — RETURNING OFFICER CLEARANCE REQUIRED</span>
            <span class="uuc-header-tag">STRICT COMPLIANCE</span>
          </div>
          <div class="uuc-body">
            <div class="uuc-callout-strong" style="font-size: 8.5pt; padding: 4px 8px; letter-spacing: 0.3px;">
              DO NOT COUNT UUC BALLOTS WITHOUT EXPLICIT CLEARANCE FROM THE RETURNING OFFICER (RO).
            </div>
            <div class="uuc-directives-grid">
              <div class="uuc-point">
                <strong>1. REMAIN SEALED:</strong> UUC ballot packets must remain strictly locked and sealed during Stages 1, 2, and 3 until other seats are completed.
              </div>
              <div class="uuc-point">
                <strong>2. CENTRAL CONSOLIDATION:</strong> Multi-seat campus quota requires simultaneous hall-wide counting across all 30 counting tables.
              </div>
              <div class="uuc-point">
                <strong>3. RO SIGNAL REQUIRED:</strong> Open and count UUC ONLY when explicit clearance is given by the Returning Officer. Premature counting is prohibited.
              </div>
            </div>
          </div>
        </div>

        <!-- Section 5: Standard Operating Protocol for Counting Table Staff -->
        <div class="section-container">
          <div class="section-title-bar blue-bar">
            <span>⚙️ STANDARD OPERATING INSTRUCTIONS FOR COUNTING TABLE OFFICIALS</span>
            <span class="section-sub-badge">STATUTORY COMPLIANCE REQUIRED</span>
          </div>

          <div class="rules-grid">
            <div class="rule-card">
              <div class="rule-num">1</div>
              <div class="rule-txt">
                <strong>Seal &amp; Account Audit:</strong> Before opening ballot box, verify Strip Seal &amp; Special Tag numbers against <em>Form 2 (Ballot Paper Account)</em> in the presence of Counting Agents.
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-num">2</div>
              <div class="rule-txt">
                <strong>25-Ballot Standard Bundles:</strong> Unfold ballots face up, verify statutory stamp, and sort into neat bundles of exactly <strong>25 valid ballots</strong>, tied securely with paper slips.
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-num">3</div>
              <div class="rule-txt">
                <strong>Zero Table Rejection:</strong> Table officials have <strong>no authority to reject ballots</strong>. Put all doubtful ballots into the <em>Doubtful Tray</em> for sole adjudication by the RO.
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-num">4</div>
              <div class="rule-txt">
                <strong>Agent Perimeter Discipline:</strong> Counting agents must remain behind the table barrier. Agents may observe and note totals, but are <strong>strictly prohibited from touching ballots</strong>.
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-num">5</div>
              <div class="rule-txt">
                <strong>Sign-off &amp; Handover:</strong> Supervisor records scores in Form 6, obtains signatures of candidate agents, and personally carries the signed return to the central RO Tabulation Desk.
              </div>
            </div>
            <div class="rule-card">
              <div class="rule-num">6</div>
              <div class="rule-txt">
                <strong>Secrecy &amp; Prohibitions:</strong> Mobile phones, cameras, and unauthorized pens are strictly barred at counting tables. Only green/red pens of the Supervisor are permitted for marking.
              </div>
            </div>
          </div>
        </div>

        <!-- Section 6: Official Endorsement & Signatures Footer -->
        <div class="footer-sign-box">
          <div class="sign-col">
            <div class="sign-line"></div>
            <div class="sign-title">COUNTING ASSISTANT</div>
            <div class="sign-sub">Signature &bull; Name &bull; Mobile</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div class="sign-title">COUNTING SUPERVISOR</div>
            <div class="sign-sub">Signature &bull; Date &bull; Time Log</div>
          </div>
          <div class="sign-col">
            <div class="sign-line"></div>
            <div class="sign-title">CORE COMMITTEE IN-CHARGE</div>
            <div class="sign-sub">Table Hall Supervisor &bull; Verification</div>
          </div>
          <div class="sign-col ro-col">
            <div class="sign-seal-stamp">OFFICIAL EMBOSS SEAL</div>
            <div class="sign-line"></div>
            <div class="sign-title">RETURNING OFFICER (RO)</div>
            <div class="sign-sub">Government College Chittur, Palakkad</div>
          </div>
        </div>

      </div>
    </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Counting Table Sequence Placards - Government College Chittur</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 4mm 5mm 4mm 5mm;
      @bottom-right {
        content: "Table Sequence Placard &bull; Page " counter(page) " of " counter(pages);
        font-family: 'Inter', sans-serif;
        font-size: 7pt;
        font-weight: 700;
        color: #475569;
      }
      @bottom-left {
        content: "Government College Chittur — Official Statutory Counting Placard";
        font-family: 'Inter', sans-serif;
        font-size: 7pt;
        color: #475569;
      }
    }

    @media print {
      html, body {
        width: 210mm;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
      .no-print {
        display: none !important;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: #e2e8f0;
      color: #0f172a;
      line-height: 1.25;
      font-size: 8.5pt;
    }

    /* Screen Topbar */
    .screen-topbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .topbar-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-weight: 700;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .topbar-btn:hover { background: #1d4ed8; }

    /* Single A4 Page Container */
    .placard-page {
      width: 202mm;
      height: 289mm;
      max-height: 289mm;
      margin: 6mm auto;
      background: #ffffff;
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }

    @media print {
      .placard-page {
        width: 100% !important;
        height: 289mm !important;
        max-height: 289mm !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
    }

    /* Outer Security Frame */
    .placard-frame {
      border: 2.5px solid #0f172a;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 3mm 3.5mm;
      box-sizing: border-box;
    }

    /* Micro Header */
    .micro-header {
      font-size: 5.5pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-align: center;
      color: #475569;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 1.5px;
      margin-bottom: 2mm;
      text-transform: uppercase;
    }

    /* Inst Header */
    .inst-header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 2mm;
      margin-bottom: 2mm;
    }
    .inst-logo-box {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .inst-logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      mix-blend-mode: multiply;
    }
    .inst-text-box {
      flex: 1;
      line-height: 1.15;
    }
    .college-name {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .college-sub {
      font-size: 7.5pt;
      font-weight: 600;
      color: #475569;
    }
    .doc-main-title {
      font-size: 9.5pt;
      font-weight: 900;
      color: #b91c1c;
      letter-spacing: 0.3px;
      margin-top: 1.5px;
      text-transform: uppercase;
    }
    .doc-sub-title {
      font-size: 6.8pt;
      font-weight: 600;
      color: #334155;
    }
    .mandatory-tag {
      background: #fef2f2;
      border: 1.5px solid #dc2626;
      border-radius: 4px;
      padding: 4px 6px;
      text-align: center;
      flex-shrink: 0;
      width: 125px;
    }
    .tag-title {
      font-size: 7pt;
      font-weight: 900;
      color: #dc2626;
    }
    .tag-desc {
      font-size: 5.5pt;
      font-weight: 700;
      color: #991b1b;
      margin-top: 1px;
    }

    /* Table & Squad Banner */
    .table-info-banner {
      display: grid;
      grid-template-columns: 140px 1fr 185px;
      gap: 6px;
      background: #f8fafc;
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      padding: 4px 6px;
      margin-bottom: 2mm;
    }
    .table-number-box {
      background: #0f172a;
      color: #fff;
      border-radius: 4px;
      padding: 4px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .table-sub-lbl {
      font-size: 6pt;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }
    .table-big-num {
      font-size: 16pt;
      font-weight: 900;
      color: #fde047;
      line-height: 1.1;
      letter-spacing: 0.5px;
    }
    .table-dept-pill {
      font-size: 6.5pt;
      font-weight: 800;
      background: #334155;
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 2px;
      color: #f8fafc;
    }
    .table-details-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2.5px;
      font-size: 7.2pt;
      padding: 0 4px;
    }
    .info-row {
      display: flex;
      gap: 4px;
      line-height: 1.2;
    }
    .info-lbl {
      font-weight: 800;
      color: #475569;
      flex-shrink: 0;
      font-size: 6.8pt;
    }
    .info-val {
      color: #0f172a;
    }
    .table-squad-box {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 5px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5px;
      font-size: 6.5pt;
      line-height: 1.15;
    }
    .squad-title {
      font-size: 6.5pt;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 1px;
      margin-bottom: 1px;
    }
    .squad-item {
      color: #1e293b;
    }

    /* Section Container & Bar */
    .section-container {
      margin-bottom: 2mm;
    }
    .section-title-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2.5px 6px;
      border-radius: 3px 3px 0 0;
      font-size: 7.5pt;
      font-weight: 900;
      color: #fff;
    }
    .green-bar { background: #065f46; border: 1.5px solid #065f46; }
    .blue-bar { background: #1e3a8a; border: 1.5px solid #1e3a8a; }
    .section-sub-badge {
      font-size: 6.2pt;
      font-weight: 800;
      background: rgba(255,255,255,0.2);
      padding: 1px 5px;
      border-radius: 3px;
    }

    /* Table Styling */
    .seq-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      border-top: none;
      font-size: 7.2pt;
    }
    .seq-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 900;
      text-align: left;
      padding: 3px 4px;
      border: 1px solid #94a3b8;
      font-size: 6.5pt;
      text-transform: uppercase;
    }
    .seq-table td {
      padding: 3.5px 4px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      line-height: 1.15;
    }
    .seq-table tbody tr:nth-child(even) { background: #f8fafc; }
    
    .uuc-row {
      background: #fef2f2 !important;
      border: 1.5px solid #dc2626 !important;
    }

    .col-stage { text-align: center; }
    .stage-badge {
      display: inline-block;
      font-size: 6.8pt;
      font-weight: 900;
      background: #0f172a;
      color: #fff;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .badge-uuc {
      background: #dc2626 !important;
      color: #fff !important;
      box-shadow: 0 1px 2px rgba(220,38,38,0.3);
    }

    .col-tier { font-size: 6.8pt; }
    .code-pill {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      font-size: 6.5pt;
      background: #e2e8f0;
      color: #0f172a;
      padding: 0.5px 3.5px;
      border-radius: 2px;
      border: 1px solid #cbd5e1;
    }
    .code-uuc {
      background: #fecaca !important;
      color: #991b1b !important;
      border-color: #f87171 !important;
    }
    .tier-desc { font-size: 5.8pt; color: #64748b; margin-top: 1px; }

    .post-title { font-weight: 800; color: #0f172a; font-size: 7.5pt; }
    .post-uuc { color: #b91c1c; font-size: 8pt; font-weight: 900; }

    .col-target { font-size: 6.5pt; }
    .target-sub { font-size: 5.5pt; color: #64748b; }
    .col-form { font-size: 6.5pt; color: #1e293b; font-family: 'JetBrains Mono', monospace; }

    .record-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5px;
      font-size: 5.8pt;
      font-family: 'JetBrains Mono', monospace;
      background: #fff;
      padding: 2px;
      border: 1px dashed #94a3b8;
      border-radius: 2px;
    }
    .rec-item { color: #334155; }
    .rec-item.sign { grid-column: 1 / -1; font-weight: bold; border-top: 1px dotted #cbd5e1; padding-top: 1px; }

    /* CRITICAL UUC STATUTORY DIRECTIVE CARD */
    .uuc-directive-card {
      border: 2px solid #b91c1c;
      background: #fff5f5;
      border-radius: 4px;
      margin-bottom: 2mm;
      padding: 0;
      overflow: hidden;
    }
    .uuc-header {
      background: #b91c1c;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 2.5px 6px;
    }
    .uuc-alert-icon { font-size: 9pt; }
    .uuc-header-title {
      font-size: 7.2pt;
      font-weight: 900;
      letter-spacing: 0.3px;
      flex: 1;
      text-transform: uppercase;
    }
    .uuc-header-tag {
      background: #fef08a;
      color: #854d0e;
      font-size: 6pt;
      font-weight: 900;
      padding: 1px 5px;
      border-radius: 2px;
    }
    .uuc-body {
      padding: 3.5px 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .uuc-callout-strong {
      background: #fee2e2;
      border: 1px solid #f87171;
      border-radius: 3px;
      padding: 2.5px 6px;
      font-size: 7.2pt;
      font-weight: 900;
      color: #991b1b;
      text-align: center;
      letter-spacing: 0.2px;
    }
    .uuc-directives-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1.05fr;
      gap: 4px;
      font-size: 6.2pt;
      line-height: 1.2;
      color: #450a0a;
      margin-top: 1.5px;
    }
    .uuc-point {
      background: #ffffff;
      border: 1px solid #fecaca;
      border-radius: 3px;
      padding: 2.5px 4px;
    }
    .uuc-point strong { color: #991b1b; }

    /* Standard Operating Guidelines Grid */
    .rules-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      border: 1.5px solid #1e3a8a;
      border-top: none;
      background: #fff;
      padding: 3px;
    }
    .rule-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 3px 4px;
      display: flex;
      gap: 4px;
      font-size: 6pt;
      line-height: 1.18;
    }
    .rule-num {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #1e3a8a;
      color: #fff;
      font-size: 6.5pt;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 0.5px;
    }
    .rule-txt {
      color: #1e293b;
    }
    .rule-txt strong { color: #0f172a; }

    /* Footer Signatures */
    .footer-sign-box {
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      border-radius: 4px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1.2fr;
      gap: 6px;
      padding: 3.5px 6px;
      margin-top: 1.5mm;
    }
    .sign-col {
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .sign-line {
      border-bottom: 1px dotted #475569;
      height: 18px;
      margin-bottom: 2px;
    }
    .sign-title {
      font-size: 6.5pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.2px;
    }
    .sign-sub {
      font-size: 5.2pt;
      color: #64748b;
    }
    .ro-col {
      background: #fff;
      border: 1px dashed #94a3b8;
      border-radius: 3px;
      padding: 2px 4px;
    }
    .sign-seal-stamp {
      font-size: 5pt;
      font-weight: 800;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-bottom: -1px;
    }
  </style>
</head>
<body>

  <!-- Screen Top Bar -->
  <div class="screen-topbar no-print">
    <div style="display: flex; align-items: center; gap: 12px;">
      <strong style="font-size: 15px; color: #fff;">Official Counting Table Sequence Placards</strong>
      <span style="font-size: 12px; color: #94a3b8;">30 Tables &bull; A4 Portrait &bull; Fit to Page</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <label style="font-size: 12px; font-weight: 600; color: #cbd5e1;">Select Table:</label>
      <select id="selTableFilter" style="background: #1e293b; color: #fff; border: 1px solid #475569; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
        <option value="all">🌟 All 30 Tables (Batch A4)</option>
        ${countingTablesData.map(t => `<option value="${t.tableNum}">Table ${t.tableNum} &bull; ${t.dept} (${t.room.split(',')[0]})</option>`).join('')}
      </select>
      <button class="topbar-btn" onclick="window.print()">
        <span>🖨️</span> <span id="topbarPrintLabel">Print All Table Placards (Batch A4)</span>
      </button>
      <a href="Counting_Table_Sequence_Placards_A4.pdf" target="_blank" style="background: #059669; color: #fff; text-decoration: none; padding: 8px 14px; font-weight: 700; font-size: 13px; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
        <span>📄</span> Download PDF (30 Pages)
      </a>
    </div>
  </div>

  ${pagesHtml}

  <script>
    const sel = document.getElementById('selTableFilter');
    const btnLabel = document.getElementById('topbarPrintLabel');
    function applyFilter(val) {
      const pages = document.querySelectorAll('.placard-page');
      pages.forEach(p => {
        if (val === 'all') {
          p.style.display = 'flex';
        } else {
          p.style.display = p.id === ('table-' + val) ? 'flex' : 'none';
        }
      });
      if (btnLabel) {
        btnLabel.textContent = val === 'all' ? 'Print All Table Placards (Batch A4)' : ('Print Table ' + val + ' Placard (A4)');
      }
    }
    if (sel) {
      sel.addEventListener('change', (e) => {
        applyFilter(e.target.value);
        if (e.target.value !== 'all') {
          location.hash = 'table-' + e.target.value;
        } else {
          history.replaceState(null, null, ' ');
        }
      });
    }
    window.addEventListener('DOMContentLoaded', () => {
      const hash = location.hash.replace('#table-', '');
      if (hash && sel && !isNaN(hash)) {
        sel.value = hash;
        applyFilter(hash);
      }
    });
  </script>
</body>
</html>`;
}

console.log('Generating Official Counting Table Sequence Placards for GCC (30 Tables)...');
const fullHtml = generatePlacardsHtml();
const htmlPath = resolve('Counting_Table_Sequence_Placards_A4.html');
const publicHtmlPath = resolve('public/Counting_Table_Sequence_Placards_A4.html');

writeFileSync(htmlPath, fullHtml);
try { copyFileSync(htmlPath, publicHtmlPath); } catch (e) {}
console.log('Saved HTML to:', htmlPath, 'and', publicHtmlPath);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pdfPath = resolve('Counting_Table_Sequence_Placards_A4.pdf');
const tempPdfPath = resolve('scratch/Counting_Table_Sequence_Placards_rendered.pdf');
const publicPdfPath = resolve('public/Counting_Table_Sequence_Placards_A4.pdf');

console.log('Rendering 30-Page A4 Portrait PDF via Chrome headless...');
try {
  execSync(`"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${tempPdfPath}" --no-pdf-header-footer "file:///${htmlPath.replace(/\\\\/g, '/')}"`);
  console.log('Headless Chrome successfully printed to temp PDF:', tempPdfPath);

  try {
    copyFileSync(tempPdfPath, pdfPath);
    console.log('Successfully updated primary PDF:', pdfPath);
  } catch (err) {
    console.warn('Primary PDF locked or copy err.');
  }

  try {
    copyFileSync(tempPdfPath, publicPdfPath);
    console.log('Successfully updated public PDF:', publicPdfPath);
  } catch (err) {
    console.warn('Public PDF copy err.');
  }
} catch (err) {
  console.error('Chrome headless error:', err.message);
}
