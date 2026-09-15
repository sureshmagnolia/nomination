/**
 * config.js
 * Central configuration.
 */

export const CONFIG = {
  // Point to Vercel Serverless API
  API_BASE_URL: '/api/main',

  // Election date for age cutoff (YYYY-MM-DD)
  ELECTION_DATE: '2026-10-12',

  // College name for printed forms
  COLLEGE_NAME: 'Government Victoria College, Palakkad',
  COLLEGE_SHORT_NAME: 'GVC',

  // Posts are now managed dynamically via the Admin → Manage Posts page.
  // This array is used only as a fallback if the API hasn't loaded yet.
  DEFAULT_POSTS: [
    { post: 'The Chairman',                         femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'The Vice Chairman',                    femaleOnly: true,  finalYearIneligible: false, yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'The Secretary',                        femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'The Joint Secretary',                  femaleOnly: true,  finalYearIneligible: false, yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'The Chief Student Editor',             femaleOnly: false, finalYearIneligible: true,  yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'The Secretary Fine Arts',              femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'The General Captain For Sports And Games', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: false, restrictedDept: '' },
    { post: 'The University Union Councillor',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: false, restrictedDept: '' },
    { post: 'I UG Representative',                  femaleOnly: false, finalYearIneligible: false, yearRestriction: '1',  deptRestriction: false, restrictedDept: '' },
    { post: 'II UG Representative',                 femaleOnly: false, finalYearIneligible: false, yearRestriction: '2',  deptRestriction: false, restrictedDept: '' },
    { post: 'III UG Representative',                femaleOnly: false, finalYearIneligible: false, yearRestriction: '3',  deptRestriction: false, restrictedDept: '' },
    { post: 'PG Representative',                    femaleOnly: false, finalYearIneligible: false, yearRestriction: 'PG', deptRestriction: false, restrictedDept: '' },
    { post: 'Association Secretary Botany',         femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Botany' },
    { post: 'Association Secretary Chemistry',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Chemistry' },
    { post: 'Association Secretary Commerce',       femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Commerce' },
    { post: 'Association Secretary Computer Science', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true,  restrictedDept: 'Computer Science' },
    { post: 'Association Secretary Economics',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Economics' },
    { post: 'Association Secretary English',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'English' },
    { post: 'Association Secretary Hindi',          femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Hindi' },
    { post: 'Association Secretary History',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'History' },
    { post: 'Association Secretary Malayalam',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Malayalam' },
    { post: 'Association Secretary Mathematics',    femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Mathematics' },
    { post: 'Association Secretary Physics',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Physics' },
    { post: 'Association Secretary Psychology',     femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Psychology' },
    { post: 'Association Secretary Sanskrit',       femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Sanskrit' },
    { post: 'Association Secretary Tamil',          femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Tamil' },
    { post: 'Association Secretary Zoology',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '',   deptRestriction: true,  restrictedDept: 'Zoology' },
  ],
};
