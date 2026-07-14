/**
 * pages/admin/directNomination.js
 * Admin-only direct nomination entry. Bypasses public deadlines.
 */
import { api } from '../../api.js';
import { renderAdminLayout, getAdminPassword } from './layout.js';
import { renderSubmitNomination } from '../submitNomination.js';

export async function renderAdminDirectNomination(container) {
  const pwd = getAdminPassword(); if (!pwd) return;
  
  // We reuse the public renderSubmitNomination but inject the admin password context
  // To do this cleanly, we'll wrap the container and provide a global 'ADMIN_BYPASS_PWD'
  // which the submitNomination logic can pick up.
  
  window.ADMIN_BYPASS_PWD = pwd;
  
  renderAdminLayout(container, 'direct-nomination', `
    <div id="adminFormContainer" class="p-6">
       <div class="alert alert-info mb-6">
         🛡️ <strong>Admin Direct Entry Mode:</strong> Deadlines and window restrictions are bypassed.
       </div>
       <div id="nominationWrapper"></div>
    </div>
  `);

  const wrapper = container.querySelector('#nominationWrapper');
  await renderSubmitNomination(wrapper);
  
  // Clean up when leaving (handled by router usually, but safe to do)
}
