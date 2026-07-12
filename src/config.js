/**
 * config.js
 * Central configuration. Replace APPS_SCRIPT_URL with your deployed Google Apps Script URL.
 */

export const CONFIG = {
  // ⚠️ REPLACE THIS with your deployed Google Apps Script Web App URL
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw29XuhvNI4cV-tlAWz5IaRrWPY1T9P7ZiQJbu-7za9226PyEqlhuLOrOMTG2QulzzOog/exec',

  // Election date for age cutoff (YYYY-MM-DD)
  ELECTION_DATE: '2026-10-12',

  // College name for printed forms
  COLLEGE_NAME: 'Government Victoria College, Palakkad',
  COLLEGE_SHORT_NAME: 'GVC',

  // Posts are now managed dynamically via the Admin → Manage Posts page.
  // This array is used only as a fallback if the API hasn't loaded yet.
  DEFAULT_POSTS: [
    { post: 'The Chairman',                         femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'The Vice Chairman',                    femaleOnly: true,  finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'The Secretary',                        femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'The Joint Secretary',                  femaleOnly: true,  finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'The Chief Student Editor',             femaleOnly: false, finalYearIneligible: true,  yearRestriction: '', deptRestriction: false },
    { post: 'The Secretary Fine Arts',              femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'The General Captain For Sports And Games', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'The University Union Councillor',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: false },
    { post: 'I UG Representative',                  femaleOnly: false, finalYearIneligible: false, yearRestriction: '1', deptRestriction: false },
    { post: 'II UG Representative',                 femaleOnly: false, finalYearIneligible: false, yearRestriction: '2', deptRestriction: false },
    { post: 'III UG Representative',                femaleOnly: false, finalYearIneligible: false, yearRestriction: '3', deptRestriction: false },
    { post: 'PG Representative',                    femaleOnly: false, finalYearIneligible: false, yearRestriction: 'PG', deptRestriction: false },
    { post: 'Association Secretary Botany',         femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Chemistry',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Commerce',       femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Computer Science', femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Economics',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary English',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Hindi',          femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary History',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Malayalam',      femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Mathematics',    femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Physics',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Psychology',     femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Sanskrit',       femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Tamil',          femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
    { post: 'Association Secretary Zoology',        femaleOnly: false, finalYearIneligible: false, yearRestriction: '', deptRestriction: true },
  ],
};
