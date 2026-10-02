/**
 * theme.js
 * Comprehensive institutional theme manager for GCC Election Portal.
 * Supports:
 *  1. Midnight Slate (Dark - Default)
 *  2. University Navy & Clean White (Formal Institutional Light)
 *  3. Academic Emerald Green (Formal Academic Light)
 *  4. Warm Slate Executive (Formal Daylight Neutral)
 *  5. Government Portal Classic (Official Administrative Styling)
 */

export const THEMES = [
  {
    id: 'dark',
    name: 'Midnight Slate',
    category: 'dark',
    icon: '🌙',
    badge: 'Dark',
    desc: 'Modern deep slate with indigo/violet accents and high-contrast glow',
    primaryColor: '#6366f1',
    bgColor: '#020617',
    surfaceColor: '#0f172a',
    textColor: '#f8fafc',
    borderColor: 'rgba(255,255,255,0.1)'
  },
  {
    id: 'light-navy',
    name: 'University Navy & White',
    category: 'light',
    icon: '🏛️',
    badge: 'Light / Institutional',
    desc: 'Prestigious academic daylight theme: Crisp white background with Oxford Navy & royal blue accents',
    primaryColor: '#1e40af',
    bgColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#cbd5e1'
  },
  {
    id: 'light-emerald',
    name: 'Academic Emerald Green',
    category: 'light',
    icon: '🌲',
    badge: 'Light / Botanical',
    desc: 'Formal university collegiate theme: Crisp ivory/white with British Racing & Emerald Green accents',
    primaryColor: '#059669',
    bgColor: '#f6f9f6',
    surfaceColor: '#ffffff',
    textColor: '#064e3b',
    borderColor: '#a7f3d0'
  },
  {
    id: 'light-slate',
    name: 'Warm Slate Executive',
    category: 'light',
    icon: '🏢',
    badge: 'Light / Neutral',
    desc: 'Executive clean daylight styling: Warm neutral slate background with deep graphite typography',
    primaryColor: '#334155',
    bgColor: '#f8fafc',
    surfaceColor: '#ffffff',
    textColor: '#1e293b',
    borderColor: '#cbd5e1'
  },
  {
    id: 'gov-portal',
    name: 'Government Portal Classic',
    category: 'light',
    icon: '🏛️',
    badge: 'Light / Official',
    desc: 'Official administrative government portal style: Ashoka Navy, structured cards, crisp high-readability',
    primaryColor: '#003366',
    bgColor: '#f0f4f8',
    surfaceColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#94a3b8'
  }
];

export function getActiveTheme() {
  try {
    return localStorage.getItem('app_theme') || 'dark';
  } catch (_) {
    return 'dark';
  }
}

export function applyTheme(themeId, persist = true) {
  const matched = THEMES.find(t => t.id === themeId);
  const target = matched ? matched.id : 'dark';

  document.documentElement.setAttribute('data-theme', target);
  if (target === 'dark') {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.add('theme-light');
    document.documentElement.style.colorScheme = 'light';
  }

  if (persist) {
    try {
      localStorage.setItem('app_theme', target);
      if (target !== 'dark') {
        localStorage.setItem('last_light_theme', target);
      }
    } catch (_) {}
  }

  window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: { theme: target } }));
  return target;
}

export function toggleDaylightDark() {
  const current = getActiveTheme();
  if (current === 'dark') {
    const lastLight = localStorage.getItem('last_light_theme') || 'light-navy';
    return applyTheme(lastLight);
  } else {
    return applyTheme('dark');
  }
}

export function initTheme() {
  const saved = getActiveTheme();
  applyTheme(saved, false);
}

/**
 * Returns HTML for the compact Theme Switcher Dropdown in Admin Header
 */
export function getHeaderThemeControlsHtml() {
  const activeId = getActiveTheme();
  const activeObj = THEMES.find(t => t.id === activeId) || THEMES[0];
  const isDark = activeId === 'dark';

  return `
    <div class="flex items-center gap-1.5" id="adminHeaderThemeBox">
      <!-- Quick Daylight / Dark Mode Toggle Button -->
      <button type="button" id="btnQuickDaylightToggle" class="btn btn-secondary btn-xs py-1 px-2.5 text-xs flex items-center gap-1.5 rounded-lg border transition-all" title="Toggle Daylight / Dark Mode (${isDark ? 'Switch to Daylight' : 'Switch to Dark'})">
        <span>${isDark ? '☀️' : '🌙'}</span>
        <span class="hidden md:inline font-medium">${isDark ? 'Daylight' : 'Dark'}</span>
      </button>

      <!-- Theme Selector Dropdown Menu -->
      <div class="relative" id="themeDropdownContainer">
        <button type="button" id="btnThemeDropdownTrigger" class="btn btn-secondary btn-xs py-1 px-2.5 text-xs flex items-center gap-1.5 rounded-lg border transition-all" title="Select Institutional Theme">
          <span>${activeObj.icon}</span>
          <span class="hidden lg:inline font-medium">${activeObj.name.split(' ')[0]}</span>
          <span class="text-[10px] opacity-60">▼</span>
        </button>

        <div id="themeDropdownMenu" class="dropdown-menu hidden absolute right-0 mt-1 w-64 rounded-xl shadow-2xl p-1.5 z-50 border">
          <div class="px-2.5 py-1.5 border-b border-white/10 mb-1">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Institutional Themes</p>
          </div>
          <div class="space-y-0.5">
            ${THEMES.map(t => {
              const isSelected = t.id === activeId;
              return `
                <button type="button" class="theme-select-item w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'hover:bg-white/10 text-slate-300'}" data-theme-id="${t.id}">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">${t.icon}</span>
                    <div>
                      <div class="font-medium text-xs flex items-center gap-1.5">
                        <span>${t.name}</span>
                      </div>
                      <div class="text-[10px] opacity-70">${t.badge}</div>
                    </div>
                  </div>
                  ${isSelected ? '<span class="text-indigo-400 font-bold">✓</span>' : `
                    <span class="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0" style="background:${t.primaryColor};"></span>
                  `}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attaches event listeners for header theme controls
 */
export function setupHeaderThemeControls(containerEl) {
  const quickToggle = containerEl.querySelector('#btnQuickDaylightToggle');
  const dropdownTrigger = containerEl.querySelector('#btnThemeDropdownTrigger');
  const dropdownMenu = containerEl.querySelector('#themeDropdownMenu');
  const themeItems = containerEl.querySelectorAll('.theme-select-item');

  if (quickToggle) {
    quickToggle.onclick = (e) => {
      e.stopPropagation();
      toggleDaylightDark();
    };
  }

  if (dropdownTrigger && dropdownMenu) {
    dropdownTrigger.onclick = (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    };

    document.addEventListener('click', (e) => {
      if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
      }
    });
  }

  themeItems.forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const themeId = btn.dataset.themeId;
      if (themeId) {
        applyTheme(themeId);
        if (dropdownMenu) dropdownMenu.classList.add('hidden');
      }
    };
  });

  // Listen to theme changes to dynamically update header button labels & icons
  const onThemeChanged = (e) => {
    const newThemeId = e.detail?.theme || getActiveTheme();
    const activeObj = THEMES.find(t => t.id === newThemeId) || THEMES[0];
    const isDark = newThemeId === 'dark';

    if (quickToggle) {
      quickToggle.innerHTML = `
        <span>${isDark ? '☀️' : '🌙'}</span>
        <span class="hidden md:inline font-medium">${isDark ? 'Daylight' : 'Dark'}</span>
      `;
      quickToggle.title = `Toggle Daylight / Dark Mode (${isDark ? 'Switch to Daylight' : 'Switch to Dark'})`;
    }

    if (dropdownTrigger) {
      dropdownTrigger.innerHTML = `
        <span>${activeObj.icon}</span>
        <span class="hidden lg:inline font-medium">${activeObj.name.split(' ')[0]}</span>
        <span class="text-[10px] opacity-60">▼</span>
      `;
    }

    themeItems.forEach(btn => {
      const isSelected = btn.dataset.themeId === newThemeId;
      btn.className = `theme-select-item w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/30' : 'hover:bg-white/10 text-slate-300'}`;
      const checkEl = btn.querySelector('.text-indigo-400');
      if (isSelected && !checkEl) {
        const dot = btn.querySelector('span.rounded-full');
        if (dot) dot.outerHTML = '<span class="text-indigo-400 font-bold">✓</span>';
      }
    });
  };

  window.addEventListener('app_theme_changed', onThemeChanged);
}

