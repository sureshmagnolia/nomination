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

  // Posts available for nomination
  POSTS: [
    'The Chairman',
    'The Vice Chairman',
    'The Secretary',
    'The Joint Secretary',
    'The Chief Student Editor',
    'The Secretary Fine Arts',
    'The General Captain For Sports And Games',
    'The University Union Councillor',
    'I UG Representative',
    'II UG Representative',
    'III UG Representative',
    'PG Representative',
    'Association Secretary Botany',
    'Association Secretary Chemistry',
    'Association Secretary Commerce',
    'Association Secretary Computer Science',
    'Association Secretary Economics',
    'Association Secretary English',
    'Association Secretary Hindi',
    'Association Secretary History',
    'Association Secretary Malayalam',
    'Association Secretary Mathematics',
    'Association Secretary Physics',
    'Association Secretary Psychology',
    'Association Secretary Sanskrit',
    'Association Secretary Tamil',
    'Association Secretary Zoology',
  ],

  // Eligibility rules
  FEMALE_ONLY_POSTS: ['The Vice Chairman', 'The Joint Secretary'],
  FINAL_YEAR_INELIGIBLE_POSTS: ['The Chief Student Editor'],
};
