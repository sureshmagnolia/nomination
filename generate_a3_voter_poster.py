import os
import base64

# Read emblem base64
with open('images/gcc_settings_emblem.png', 'rb') as f:
    emblem_b64 = "data:image/png;base64," + base64.b64encode(f.read()).decode('ascii')

# Read purple thumb base64
with open('scratch/purple_thumb.txt', 'r', encoding='utf-8') as f:
    thumb_b64 = f.read().strip()

# Pure Arrow Cross Stamp SVG function (no outer outline, rotated 45 degrees so center forms an 'X')
def get_stamp_svg(size=28, extra_class=""):
    arm_markup = '''<g>
      <path d="M 0,0 L 0,-21 C 0,-29 7,-30 15,-30 C 23,-30 26,-24 26,-16 L 26,-11" 
            fill="none" stroke="currentColor" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="18,-15 26,-2 34,-15" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    </g>'''
    return f'''<svg class="stamp-svg {extra_class}" xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="{size}" height="{size}">
  <g transform="rotate(45)">
    <circle cx="0" cy="0" r="5" fill="currentColor"/>
    {arm_markup}
    <g transform="rotate(90)">{arm_markup}</g>
    <g transform="rotate(180)">{arm_markup}</g>
    <g transform="rotate(270)">{arm_markup}</g>
  </g>
</svg>'''

css_shared = """
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&family=Noto+Sans+Tamil:wght@400;500;600;700;800;900&display=swap');

  @page {
    size: A3 portrait;
    margin: 6mm 8mm 6mm 8mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    background: #cbd5e1;
    line-height: 1.25;
    -webkit-font-smoothing: antialiased;
  }

  .ml { font-family: 'Noto Sans Malayalam', 'Inter', sans-serif; }
  .ta { font-family: 'Noto Sans Tamil', 'Inter', sans-serif; }

  /* Poster wrapper */
  .poster-wrapper {
    width: 297mm;
    min-height: 420mm;
    max-height: 420mm;
    margin: 20px auto;
    padding: 4.5mm 7mm;
    background: #ffffff;
    box-shadow: 0 10px 35px rgba(0,0,0,0.3);
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  @media print {
    body {
      background: #ffffff !important;
      padding: 0 !important;
    }
    .poster-wrapper {
      width: 100% !important;
      min-height: 100% !important;
      max-height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .screen-control-bar {
      display: none !important;
    }
  }

  /* Outer Border Frame */
  .poster-border {
    border: 3.5px solid #0f172a;
    outline: 2px solid #d97706;
    outline-offset: -5px;
    padding: 4.5mm 6.5mm;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
  }

  /* ---------------- HEADER ---------------- */
  .poster-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2.5px solid #0f172a;
    padding-bottom: 3.5px;
    margin-bottom: 3.5px;
    gap: 14px;
  }

  .header-logo {
    width: 68px;
    height: 68px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .header-center {
    flex: 1;
    text-align: center;
  }

  .college-title-en {
    font-size: 19pt;
    font-weight: 900;
    letter-spacing: 1.2px;
    color: #0f172a;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .college-title-sub {
    font-size: 8.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 1px;
    letter-spacing: 0.3px;
  }

  .election-badge-title {
    font-size: 12.5pt;
    font-weight: 900;
    letter-spacing: 1.5px;
    color: #991b1b;
    margin-top: 2px;
    text-transform: uppercase;
  }

  .poster-doc-title {
    font-size: 11pt;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #1e3a8a;
    text-transform: uppercase;
    margin-top: 1px;
  }

  .header-badge-box {
    width: 74px;
    height: 68px;
    border: 2px dashed #0f172a;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4px;
    background: #f8fafc;
    flex-shrink: 0;
  }
  .header-badge-box .badge-icon { font-size: 20pt; line-height: 1; }
  .header-badge-box .badge-txt { font-size: 7pt; font-weight: 800; color: #0f172a; margin-top: 3px; text-transform: uppercase; line-height: 1.1; }

  /* ---------------- SCHEDULE & DIRECTIVE BANNER ---------------- */
  .schedule-banner {
    display: grid;
    grid-template-columns: 1.15fr 1.05fr 1.15fr 1.15fr;
    gap: 7px;
    background: #0f172a;
    color: #ffffff;
    border-radius: 5px;
    padding: 5px 10px;
    margin-bottom: 5px;
    align-items: center;
  }

  .banner-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 8.5pt;
  }
  .banner-pill .pill-icon { font-size: 13pt; flex-shrink: 0; }
  .banner-pill .pill-text { display: flex; flex-direction: column; line-height: 1.15; }
  .banner-pill .pill-label { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; color: #94a3b8; }
  .banner-pill .pill-val { font-size: 8.8pt; font-weight: 800; color: #fde047; }
  .banner-pill .pill-val-alt { font-size: 8.8pt; font-weight: 800; color: #38bdf8; }

  /* ---------------- SECTION HEADERS ---------------- */
  .sec-heading-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3.5px 10px;
    border-radius: 4px;
    margin-bottom: 3.5px;
  }
  .sec-title-main {
    font-size: 10.2pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sec-title-sub {
    font-size: 7.6pt;
    font-weight: 700;
    letter-spacing: 0.3px;
    opacity: 0.9;
  }

  /* ---------------- PART 1: 8 ESSENTIAL VOTER GUIDELINES ---------------- */
  .guidelines-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    margin-bottom: 4px;
  }

  .guide-card {
    border-radius: 5px;
    padding: 4.5px 7px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 68px;
  }
  .guide-card-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    padding-bottom: 3.5px;
    border-bottom: 1px solid rgba(0,0,0,0.1);
  }
  .guide-num-badge {
    width: 21px;
    height: 21px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8.5pt;
    font-weight: 900;
    flex-shrink: 0;
  }
  .guide-card-titles {
    flex: 1;
    line-height: 1.1;
  }
  .guide-card-title-en {
    font-size: 7.9pt;
    font-weight: 900;
    text-transform: uppercase;
  }
  .guide-card-title-sub {
    font-size: 6.6pt;
    font-weight: 700;
    opacity: 0.88;
    line-height: 1.15;
  }
  .guide-card-body {
    font-size: 6.9pt;
    line-height: 1.2;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2.5px;
  }
  .guide-body-en {
    font-size: 7.05pt;
    font-weight: 700;
    line-height: 1.2;
    color: #0f172a;
  }
  .guide-body-en strong {
    font-weight: 900;
  }
  .guide-body-ml {
    font-size: 6.55pt;
    font-weight: 500;
    line-height: 1.18;
    color: #334155;
  }
  .guide-body-ta {
    font-size: 6.55pt;
    font-weight: 500;
    line-height: 1.18;
    color: #475569;
  }

  /* ---------------- PART 2: BALLOT MARKING GUIDE ---------------- */
  .marking-guide-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  /* Valid Votes Section */
  .valid-section-wrap {
    border-radius: 5px;
    padding: 5px 8px;
  }
  .valid-header-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid;
  }
  .valid-title {
    font-size: 10pt;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
  }
  .valid-title-sub {
    font-size: 7.5pt;
    font-weight: 800;
  }
  .valid-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  /* UUC Dual-Vote Section */
  .uuc-section-wrap {
    border-radius: 5px;
    padding: 6px 10px;
  }
  .uuc-header-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 5px;
    padding-bottom: 3.5px;
    border-bottom: 1.5px solid;
  }
  .uuc-title {
    font-size: 9.6pt;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
  }
  .uuc-title-sub {
    font-size: 7.4pt;
    font-weight: 800;
  }
  .uuc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8.5px;
  }

  /* Invalid Votes Section */
  .invalid-section-wrap {
    border-radius: 5px;
    padding: 5px 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .invalid-header-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid;
  }
  .invalid-title {
    font-size: 10pt;
    font-weight: 900;
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
  }
  .invalid-title-sub {
    font-size: 7.5pt;
    font-weight: 800;
  }
  .invalid-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8.5px;
    flex: 1;
  }

  /* Ballot Card Design */
  .ballot-example-card {
    border-radius: 4px;
    padding: 4.5px 7px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .ballot-example-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  .ballot-tag {
    font-size: 7pt;
    font-weight: 900;
    text-transform: uppercase;
    padding: 1.5px 6px;
    border-radius: 3px;
    letter-spacing: 0.3px;
  }
  .ballot-id-title {
    font-size: 7.6pt;
    font-weight: 800;
  }

  .ballot-content-flex {
    display: flex;
    gap: 9px;
    align-items: center;
  }

  /* Ballot Paper Graphic */
  .ballot-box-graphic {
    width: 124px;
    flex-shrink: 0;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .ballot-graphic-row {
    display: flex;
    height: 25px;
    align-items: center;
    position: relative;
  }
  .ballot-cand-col {
    width: 58%;
    padding: 0 6px;
    font-weight: 900;
    font-size: 8pt;
    letter-spacing: 0.3px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.1;
  }
  .ballot-cand-col .cand-sub {
    font-size: 6.5pt;
    font-weight: 700;
    opacity: 0.85;
  }
  .ballot-mark-col {
    width: 42%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* UUC Graphic 3-Row Compact Styles */
  .ballot-box-graphic.uuc-graphic {
    width: 104px;
    flex-shrink: 0;
  }
  .ballot-graphic-row.uuc-row {
    height: 18px;
  }
  .ballot-cand-col.uuc-cand {
    width: 56%;
    padding: 0 4.5px;
    font-size: 7.2pt;
    font-weight: 900;
  }
  .ballot-cand-col.uuc-cand .cand-sub {
    font-size: 5.8pt;
    font-weight: 700;
  }
  .ballot-mark-col.uuc-mark {
    width: 44%;
  }

  /* Stamp marks */
  .ballot-mark-col .stamp-svg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    user-select: none;
  }
  .stamp-svg {
    display: inline-block;
    vertical-align: middle;
  }
  .tick-stamp {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 19pt;
    font-weight: 900;
    font-family: Arial, sans-serif !important;
    line-height: 1;
    color: #000;
  }
  .thumb-stamp {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 48px;
    height: 25px;
    background-repeat: no-repeat;
    background-size: contain;
    background-position: center;
    opacity: 0.95;
  }
  .sig-stamp {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Brush Script MT', cursive, sans-serif;
    font-size: 13.5pt;
    font-weight: bold;
    color: #000000;
  }

  /* Specific border offsets for Valid 2 and Invalid 2 */
  .ballot-mark-col .stamp-svg.center-in-priya {
    top: 18% !important; /* Top ~1/5 crosses border into upper cell, center intersection clearly in Priya's box */
    z-index: 10;
  }
  .ballot-mark-col .stamp-svg.center-on-border {
    top: 0% !important; /* intersection center point exactly on dividing border line */
    z-index: 10;
  }

  .ballot-reason-desc {
    flex: 1;
    font-size: 7.2pt;
    line-height: 1.25;
  }
  .ballot-reason-desc .reason-en {
    font-weight: 800;
    margin-bottom: 2px;
  }
  .ballot-reason-desc .reason-ml {
    font-weight: 600;
    margin-bottom: 2px;
    opacity: 0.95;
  }
  .ballot-reason-desc .reason-ta {
    font-weight: 600;
    opacity: 0.85;
    font-size: 6.8pt;
  }

  /* Golden Rule Warning Card */
  .golden-rule-card {
    border-radius: 4px;
    padding: 5px 7px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .golden-rule-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 8pt;
    font-weight: 900;
    text-transform: uppercase;
    margin-bottom: 4px;
    padding-bottom: 3.5px;
    border-bottom: 1.5px solid;
  }
  .golden-rule-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 7.1pt;
    line-height: 1.25;
  }
  .rule-line {
    display: flex;
    align-items: flex-start;
    gap: 5px;
  }
  .rule-line strong { font-weight: 800; }
  .rule-bullet { font-size: 8pt; flex-shrink: 0; line-height: 1; margin-top: 1px; }

  /* ---------------- FOOTER ---------------- */
  .poster-footer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    border-top: 2px solid #0f172a;
    padding-top: 3.5px;
    margin-top: 3.5px;
    font-size: 7.6pt;
  }
  .footer-authority {
    line-height: 1.25;
  }
  .footer-authority strong {
    font-size: 8.5pt;
    font-weight: 900;
    color: #0f172a;
    text-transform: uppercase;
  }

  /* ==============================================================
     THEME: COLORFUL (DEFAULT)
     ============================================================== */
  .theme-color .poster-border {
    border-color: #0f172a;
    outline-color: #d97706;
  }
  .theme-color .sec-heading-bar {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    color: #ffffff;
    border: 1px solid #1e293b;
  }
  .theme-color .sec-title-main { color: #fde047; }
  .theme-color .sec-title-sub { color: #cbd5e1; }

  .theme-color .guide-card {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
  }
  .theme-color .guide-card:nth-child(1) .guide-num-badge { background: #1e3a8a; color: #fff; }
  .theme-color .guide-card:nth-child(2) .guide-num-badge { background: #0f766e; color: #fff; }
  .theme-color .guide-card:nth-child(3) .guide-num-badge { background: #b45309; color: #fff; }
  .theme-color .guide-card:nth-child(4) .guide-num-badge { background: #6d28d9; color: #fff; }
  .theme-color .guide-card:nth-child(5) .guide-num-badge { background: #1d4ed8; color: #fff; }
  .theme-color .guide-card:nth-child(6) .guide-num-badge { background: #0369a1; color: #fff; }
  .theme-color .guide-card:nth-child(7) .guide-num-badge { background: #15803d; color: #fff; }
  .theme-color .guide-card:nth-child(8) .guide-num-badge { background: #be123c; color: #fff; }

  .theme-color .guide-card-title-en { color: #0f172a; }
  .theme-color .guide-card-title-ml { color: #475569; }
  .theme-color .guide-card-body { color: #334155; }
  .theme-color .guide-card-body strong { color: #0f172a; }

  /* Valid Section in Color */
  .theme-color .valid-section-wrap {
    background: #f0fdf4;
    border: 2px solid #16a34a;
  }
  .theme-color .valid-header-badge {
    border-color: #16a34a;
    color: #15803d;
  }
  .theme-color .valid-title { color: #15803d; }
  .theme-color .valid-title-sub { color: #166534; }
  .theme-color .ballot-example-card.valid-card {
    background: #ffffff;
    border: 1.5px solid #86efac;
  }
  .theme-color .ballot-tag.tag-valid {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
  }
  .theme-color .ballot-box-graphic {
    border: 1.5px solid #15803d;
  }
  .theme-color .ballot-graphic-row {
    border-bottom: 1.5px solid #15803d;
  }
  .theme-color .ballot-graphic-row:last-child {
    border-bottom: none;
  }
  .theme-color .ballot-cand-col {
    border-right: 1.5px solid #15803d;
    color: #0f172a;
    background: #f8fafc;
  }
  .theme-color .ballot-cand-col .cand-sub { color: #475569; }
  .theme-color .stamp-svg { color: #1d4ed8; }
  .theme-color .ballot-reason-desc.valid-desc .reason-en { color: #15803d; }
  .theme-color .ballot-reason-desc.valid-desc .reason-ml { color: #166534; }
  .theme-color .ballot-reason-desc.valid-desc .reason-ta { color: #14532d; }

  /* UUC Section in Color */
  .theme-color .uuc-section-wrap {
    background: #f0f7ff;
    border: 2px solid #2563eb;
  }
  .theme-color .uuc-header-badge {
    border-color: #2563eb;
    color: #1d4ed8;
  }
  .theme-color .uuc-title { color: #1e40af; }
  .theme-color .uuc-title-sub { color: #1d4ed8; }
  .theme-color .ballot-example-card.uuc-card {
    background: #ffffff;
    border: 1.5px solid #93c5fd;
  }
  .theme-color .ballot-box-graphic.uuc-graphic {
    border: 1.5px solid #2563eb;
  }
  .theme-color .ballot-box-graphic.uuc-graphic .ballot-graphic-row {
    border-bottom: 1.5px solid #2563eb;
  }
  .theme-color .ballot-box-graphic.uuc-graphic .ballot-graphic-row:last-child {
    border-bottom: none;
  }
  .theme-color .ballot-box-graphic.uuc-graphic .ballot-cand-col {
    border-right: 1.5px solid #2563eb;
    color: #0f172a;
    background: #f8fafc;
  }
  .theme-color .ballot-box-graphic.uuc-graphic .ballot-cand-col .cand-sub { color: #475569; }
  .theme-color .ballot-box-graphic.uuc-graphic.invalid-graphic {
    border: 1.5px solid #dc2626;
  }
  .theme-color .ballot-box-graphic.uuc-graphic.invalid-graphic .ballot-graphic-row {
    border-bottom: 1.5px solid #dc2626;
  }
  .theme-color .ballot-box-graphic.uuc-graphic.invalid-graphic .ballot-cand-col {
    border-right: 1.5px solid #dc2626;
  }
  .theme-color .ballot-reason-desc.uuc-desc .reason-en { color: #1e40af; }
  .theme-color .ballot-reason-desc.uuc-desc .reason-ml { color: #1d4ed8; }
  .theme-color .ballot-reason-desc.uuc-desc .reason-ta { color: #1e3a8a; }
  .theme-color .ballot-reason-desc.uuc-desc.invalid-desc .reason-en { color: #b91c1c; }
  .theme-color .ballot-reason-desc.uuc-desc.invalid-desc .reason-ml { color: #991b1b; }
  .theme-color .ballot-reason-desc.uuc-desc.invalid-desc .reason-ta { color: #7f1d1d; }

  /* Invalid Section in Color */
  .theme-color .invalid-section-wrap {
    background: #fef2f2;
    border: 2px solid #dc2626;
  }
  .theme-color .invalid-header-badge {
    border-color: #dc2626;
    color: #b91c1c;
  }
  .theme-color .invalid-title { color: #b91c1c; }
  .theme-color .invalid-title-sub { color: #991b1b; }
  .theme-color .ballot-example-card.invalid-card {
    background: #ffffff;
    border: 1.5px solid #fca5a5;
  }
  .theme-color .ballot-tag.tag-invalid {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
  }
  .theme-color .ballot-box-graphic.invalid-graphic {
    border: 1.5px solid #dc2626;
  }
  .theme-color .ballot-box-graphic.invalid-graphic .ballot-graphic-row {
    border-bottom: 1.5px solid #dc2626;
  }
  .theme-color .ballot-box-graphic.invalid-graphic .ballot-graphic-row:last-child {
    border-bottom: none;
  }
  .theme-color .ballot-box-graphic.invalid-graphic .ballot-cand-col {
    border-right: 1.5px solid #dc2626;
    color: #0f172a;
    background: #f8fafc;
  }
  .theme-color .thumb-stamp {
    mix-blend-mode: multiply;
  }
  .theme-color .ballot-reason-desc.invalid-desc .reason-en { color: #b91c1c; }
  .theme-color .ballot-reason-desc.invalid-desc .reason-ml { color: #991b1b; }
  .theme-color .ballot-reason-desc.invalid-desc .reason-ta { color: #7f1d1d; }

  .theme-color .golden-rule-card {
    background: #fffbeb;
    border: 1.5px solid #f59e0b;
    color: #78350f;
  }
  .theme-color .golden-rule-head {
    border-color: #f59e0b;
    color: #92400e;
  }
  .theme-color .rule-line strong { color: #92400e; }

  /* ==============================================================
     THEME: PURE BLACK & WHITE (MONOCHROME FOR PHOTOCOPY/DUPLICATOR)
     ============================================================== */
  .theme-bw {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .theme-bw .poster-border {
    border: 3.5px solid #000000 !important;
    outline: 2px solid #000000 !important;
  }
  .theme-bw .poster-header {
    border-bottom-color: #000000 !important;
  }
  .theme-bw .header-logo {
    filter: grayscale(100%) contrast(150%) !important;
  }
  .theme-bw .college-title-en { color: #000000 !important; }
  .theme-bw .college-title-sub { color: #000000 !important; }
  .theme-bw .election-badge-title { color: #000000 !important; }
  .theme-bw .poster-doc-title { color: #000000 !important; }
  .theme-bw .header-badge-box {
    border-color: #000000 !important;
    background: #ffffff !important;
  }
  .theme-bw .header-badge-box .badge-txt { color: #000000 !important; }

  .theme-bw .schedule-banner {
    background: #000000 !important;
    color: #ffffff !important;
  }
  .theme-bw .banner-pill .pill-label { color: #e2e8f0 !important; }
  .theme-bw .banner-pill .pill-val { color: #ffffff !important; text-decoration: underline; }
  .theme-bw .banner-pill .pill-val-alt { color: #ffffff !important; }

  .theme-bw .sec-heading-bar {
    background: #000000 !important;
    color: #ffffff !important;
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .sec-title-main { color: #ffffff !important; }
  .theme-bw .sec-title-sub { color: #ffffff !important; }

  .theme-bw .guide-card {
    background: #ffffff !important;
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .guide-num-badge {
    background: #000000 !important;
    color: #ffffff !important;
  }
  .theme-bw .guide-card-head { border-bottom-color: #000000 !important; }
  .theme-bw .guide-card-title-en { color: #000000 !important; }
  .theme-bw .guide-card-title-sub { color: #000000 !important; }
  .theme-bw .guide-body-en,
  .theme-bw .guide-body-ml,
  .theme-bw .guide-body-ta { color: #000000 !important; }

  /* Valid Section in B&W */
  .theme-bw .valid-section-wrap {
    background: #ffffff !important;
    border: 2.5px solid #000000 !important;
  }
  .theme-bw .valid-header-badge {
    border-bottom: 2px solid #000000 !important;
    color: #000000 !important;
  }
  .theme-bw .valid-title { color: #000000 !important; }
  .theme-bw .valid-title-sub { color: #000000 !important; }
  .theme-bw .ballot-example-card.valid-card {
    background: #ffffff !important;
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-tag.tag-valid {
    background: #000000 !important;
    color: #ffffff !important;
    border: 1px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic {
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-graphic-row {
    border-bottom: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-cand-col {
    border-right: 1.5px solid #000000 !important;
    color: #000000 !important;
    background: #ffffff !important;
  }
  .theme-bw .ballot-cand-col .cand-sub { color: #000000 !important; }
  .theme-bw .stamp-svg { color: #000000 !important; }
  .theme-bw .ballot-reason-desc.valid-desc .reason-en { color: #000000 !important; }
  .theme-bw .ballot-reason-desc.valid-desc .reason-ml { color: #000000 !important; }
  .theme-bw .ballot-reason-desc.valid-desc .reason-ta { color: #000000 !important; }

  /* UUC Section in B&W */
  .theme-bw .uuc-section-wrap {
    background: #ffffff !important;
    border: 2.5px solid #000000 !important;
  }
  .theme-bw .uuc-header-badge {
    border-bottom: 2px solid #000000 !important;
    color: #000000 !important;
  }
  .theme-bw .uuc-title { color: #000000 !important; }
  .theme-bw .uuc-title-sub { color: #000000 !important; }
  .theme-bw .ballot-example-card.uuc-card {
    background: #ffffff !important;
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic {
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic .ballot-graphic-row {
    border-bottom: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic .ballot-graphic-row:last-child {
    border-bottom: none;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic .ballot-cand-col {
    border-right: 1.5px solid #000000 !important;
    color: #000000 !important;
    background: #ffffff !important;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic .ballot-cand-col .cand-sub { color: #000000 !important; }
  .theme-bw .ballot-box-graphic.uuc-graphic.invalid-graphic {
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic.invalid-graphic .ballot-graphic-row {
    border-bottom: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.uuc-graphic.invalid-graphic .ballot-cand-col {
    border-right: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-reason-desc.uuc-desc .reason-en,
  .theme-bw .ballot-reason-desc.uuc-desc .reason-ml,
  .theme-bw .ballot-reason-desc.uuc-desc .reason-ta { color: #000000 !important; }
  .theme-bw .ballot-reason-desc.uuc-desc.invalid-desc .reason-en,
  .theme-bw .ballot-reason-desc.uuc-desc.invalid-desc .reason-ml,
  .theme-bw .ballot-reason-desc.uuc-desc.invalid-desc .reason-ta { color: #000000 !important; }

  /* Invalid Section in B&W */
  .theme-bw .invalid-section-wrap {
    background: #ffffff !important;
    border: 2.5px solid #000000 !important;
  }
  .theme-bw .invalid-header-badge {
    border-bottom: 2px solid #000000 !important;
    color: #000000 !important;
  }
  .theme-bw .invalid-title { color: #000000 !important; }
  .theme-bw .invalid-title-sub { color: #000000 !important; }
  .theme-bw .ballot-example-card.invalid-card {
    background: #ffffff !important;
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-tag.tag-invalid {
    background: #000000 !important;
    color: #ffffff !important;
    border: 1px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.invalid-graphic {
    border: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.invalid-graphic .ballot-graphic-row {
    border-bottom: 1.5px solid #000000 !important;
  }
  .theme-bw .ballot-box-graphic.invalid-graphic .ballot-cand-col {
    border-right: 1.5px solid #000000 !important;
    color: #000000 !important;
    background: #ffffff !important;
  }
  .theme-bw .thumb-stamp {
    filter: grayscale(100%) contrast(250%) !important;
  }
  .theme-bw .ballot-reason-desc.invalid-desc .reason-en { color: #000000 !important; }
  .theme-bw .ballot-reason-desc.invalid-desc .reason-ml { color: #000000 !important; }
  .theme-bw .ballot-reason-desc.invalid-desc .reason-ta { color: #000000 !important; }

  .theme-bw .golden-rule-card {
    background: #ffffff !important;
    border: 2px dashed #000000 !important;
    color: #000000 !important;
  }
  .theme-bw .golden-rule-head {
    border-color: #000000 !important;
    color: #000000 !important;
  }
  .theme-bw .rule-line strong { color: #000000 !important; }

  .theme-bw .poster-footer {
    border-top-color: #000000 !important;
  }
  .theme-bw .footer-authority strong { color: #000000 !important; }
"""

screen_bar_css = """
  .screen-control-bar {
    position: sticky;
    top: 0;
    z-index: 99999;
    background: #0f172a;
    border-bottom: 3px solid #f59e0b;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 15px rgba(0,0,0,0.35);
    color: #ffffff;
    font-family: 'Inter', sans-serif;
  }
  .screen-bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .screen-bar-title {
    font-weight: 800;
    font-size: 13.5px;
    color: #fde047;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .screen-bar-desc {
    font-size: 11px;
    color: #94a3b8;
  }
  .screen-bar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .theme-toggle-btn {
    background: #1e293b;
    color: #f8fafc;
    border: 1.5px solid #475569;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
  }
  .theme-toggle-btn:hover {
    background: #334155;
    border-color: #94a3b8;
  }
  .theme-toggle-btn.active {
    background: #f59e0b;
    color: #000000;
    border-color: #d97706;
  }
  .print-action-btn {
    background: #10b981;
    color: #ffffff;
    border: none;
    padding: 8px 18px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
  }
  .print-action-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }
  .direct-pdf-link {
    color: #38bdf8;
    text-decoration: none;
    font-size: 11.5px;
    font-weight: 700;
    margin-left: 8px;
  }
  .direct-pdf-link:hover { text-decoration: underline; }
"""

def generate_poster_html_content(theme_class="theme-color", is_interactive=True):
    content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GCC Election 2026 - Voter Instructions & Ballot Marking Guide (A3 Portrait)</title>
  <style>
{css_shared}
{screen_bar_css if is_interactive else ""}
  </style>
</head>
<body>
"""

    if is_interactive:
        content += """
  <!-- Interactive Screen Control Bar -->
  <div class="screen-control-bar">
    <div class="screen-bar-left">
      <div class="screen-bar-title">
        <span>🏛️</span>
        <span>GCC Election 2026 &bull; A3 Portrait Voter Instructions &amp; Marking Guide</span>
      </div>
      <div class="screen-bar-desc">Standard Size: 297mm &times; 420mm (Single A3 Sheet)</div>
    </div>
    <div class="screen-bar-actions">
      <button id="btnColor" class="theme-toggle-btn active" onclick="setTheme('color')">
        <span>🎨</span>
        <span>Colorful Option</span>
      </button>
      <button id="btnBW" class="theme-toggle-btn" onclick="setTheme('bw')">
        <span>📄</span>
        <span>Pure Black &amp; White</span>
      </button>
      <button class="print-action-btn" onclick="window.print()">
        <span>🖨️</span>
        <span>Print Poster (A3)</span>
      </button>
      <a href="Voter_Instructions_A3_Poster_Color.pdf" target="_blank" class="direct-pdf-link">📥 Color PDF</a>
      <a href="Voter_Instructions_A3_Poster_BW.pdf" target="_blank" class="direct-pdf-link">📥 B&amp;W PDF</a>
    </div>
  </div>
"""

    content += f"""
  <div class="poster-wrapper {theme_class}" id="posterRoot">
    <div class="poster-border">

      <!-- ================= HEADER ================= -->
      <header class="poster-header">
        <div style="width: 74px; flex-shrink: 0;" aria-hidden="true"></div>
        <div class="header-center">
          <h1 class="college-title-en">GOVERNMENT COLLEGE CHITTUR, PALAKKAD</h1>
          <div class="college-title-sub ml ta">ഗവൺമെന്റ് കോളേജ് ചിറ്റൂർ, പാലക്കാട് &bull; அரசினர் கலைக்கல்லூரி சித்தூர், பாலக்காடு</div>
          <div class="election-badge-title">COLLEGE UNION ELECTION &ndash; 2026</div>
          <div class="poster-doc-title">VOTER INSTRUCTIONS &amp; BALLOT MARKING GUIDE</div>
        </div>
        <div class="header-badge-box">
          <div class="badge-icon">🗳️</div>
          <div class="badge-txt">POLLING DAY GUIDE</div>
        </div>
      </header>

      <!-- ================= KEY DIRECTIVE BANNER ================= -->
      <div class="schedule-banner">
        <div class="banner-pill">
          <span class="pill-icon">📅</span>
          <div class="pill-text">
            <span class="pill-label">Date of Poll</span>
            <span class="pill-val">15-10-2026 (Thursday)</span>
          </div>
        </div>
        <div class="banner-pill">
          <span class="pill-icon">⏰</span>
          <div class="pill-text">
            <span class="pill-label">Polling Hours</span>
            <span class="pill-val">9:30 AM &ndash; 12:30 PM</span>
          </div>
        </div>
        <div class="banner-pill">
          <span class="pill-icon">🪪</span>
          <div class="pill-text">
            <span class="pill-label">Mandatory Requirement</span>
            <span class="pill-val-alt">Valid College Student ID</span>
          </div>
        </div>
        <div class="banner-pill">
          <span class="pill-icon">🏢</span>
          <div class="pill-text">
            <span class="pill-label">Polling Stations</span>
            <span class="pill-val-alt">Designated Class Booths</span>
          </div>
        </div>
      </div>

      <!-- ================= PART 1: 8 ESSENTIAL VOTER GUIDELINES ================= -->
      <section>
        <div class="sec-heading-bar">
          <div class="sec-title-main">
            <span>📌</span>
            <span>Part I: Essential Guidelines for Electors</span>
          </div>
          <div class="sec-title-sub ml ta">വോട്ടർമാർക്കുള്ള പ്രധാന നിർദ്ദേശങ്ങൾ &bull; வாக்காளர்களுக்கான முக்கிய வழிகாட்டுதல்கள்</div>
        </div>

        <div class="guidelines-grid">
          <!-- Card 1 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">1</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">College ID Mandatory</div>
                <div class="guide-card-title-sub ml ta">തിരിച്ചറിയൽ കാർഡ് &bull; அடையாள அட்டை</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Every voter <strong>must carry their valid College Student ID Card</strong>. No student admitted without ID.</div>
              <div class="guide-body-ml ml">സാധുവായ കോളേജ് തിരിച്ചറിയൽ കാർഡ് നിർബന്ധം. ഐഡി ഇല്ലാതെ ബൂത്തിൽ പ്രവേശനമില്ല.</div>
              <div class="guide-body-ta ta">செல்லுபடியாகும் அடையாள அட்டை கட்டாயம். அடையாள அட்டை இன்றி வாக்களிக்க முடியாது.</div>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">2</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">Electoral Roll &amp; Serial #</div>
                <div class="guide-card-title-sub ml ta">ലിസ്റ്റ് പരിശോധന &bull; வாக்காளர் பட்டியல்</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Only students in <strong>Final Electoral Roll</strong> can vote. Verify your <strong>Booth &amp; Serial Number</strong> before entering.</div>
              <div class="guide-body-ml ml">അന്തിമ വോട്ടർപട്ടികയിലുള്ളവർക്ക് മാത്രം വോട്ടവകാശം. മുൻകൂട്ടി ബൂത്ത്, ക്രമനമ്പർ പരിശോധിച്ച് ഉറപ്പാക്കുക.</div>
              <div class="guide-body-ta ta">இறுதி வாக்காளர் பட்டியலில் உள்ளவர்கள் மட்டுமே தகுதியானவர்கள். பூத், வரிசை எண் பார்க்கவும்.</div>
            </div>
          </div>

          <!-- Card 3 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">3</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">Sign Roll &amp; Verify Ballots</div>
                <div class="guide-card-title-sub ml ta">ബാലറ്റ് പരിശോധന &bull; வாக்குச்சீட்டு சரிபார்ப்பு</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Sign roll; officer issues <strong>folded ballots</strong>. <strong>Ensure issued ballots are meant for you</strong> (verify department, class &amp; eligible posts).</div>
              <div class="guide-body-ml ml">റോളിൽ ഒപ്പിട്ട് മടക്കിയ ബാലറ്റ് വാങ്ങുക. തങ്ങൾക്ക് അർഹമായ ശരിയായ ബാലറ്റ് തന്നെയെന്ന് ഉറപ്പാക്കുക.</div>
              <div class="guide-body-ta ta">கையொப்பமிட்டு மடித்த வாக்குச்சீட்டைப் பெறவும். தங்களுக்குரிய சரியான வாக்குச்சீட்டா என உறுதி செய்யவும்.</div>
            </div>
          </div>

          <!-- Card 4 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">4</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">Secret Compartment</div>
                <div class="guide-card-title-sub ml ta">രഹസ്യ അറ &bull; இரகசிய அறை</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Enter voting compartment <strong>strictly one at a time</strong>. Maintain total secrecy (no peeping or disclosing vote).</div>
              <div class="guide-body-ml ml">വോട്ടിംഗ് അറയിൽ ഒരാൾ മാത്രം പ്രവേശിക്കുക. വോട്ടിന്റെ രഹസ്യത കർശനമായി പാലിക്കുക.</div>
              <div class="guide-body-ta ta">இரகசிய அறைக்குள் ஒரு நேரத்தில் ஒருவர் மட்டுமே செல்ல வேண்டும். வாக்களிப்பின் இரகசியத்தை காக்கவும்.</div>
            </div>
          </div>

          <!-- Card 5 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">5</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en" style="display:flex; align-items:center; gap:5px;">
                  <span>Arrow Cross Stamp Only</span>
                  {get_stamp_svg(size=14)}
                </div>
                <div class="guide-card-title-sub ml ta">ആരോ ക്രോസ്സ് മുദ്ര &bull; அம்புக்குறி முத்திரை</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Mark choice using <strong>ONLY the arrow cross stamp</strong> provided. Never use pen, tick mark, thumb, or signature.</div>
              <div class="guide-body-ml ml">അറയിലുള്ള ആരോ ക്രോസ്സ് മുദ്ര മാത്രം ഉപയോഗിക്കുക. പേന, ടിക്ക്, വിരലടയാളം, ഒപ്പ് എന്നിവ പാടില്ല.</div>
              <div class="guide-body-ta ta">அறையில் உள்ள அம்புக்குறி முத்திரையை மட்டுமே பயன்படுத்தவும். பேனா, டிக், விரல்ரேகை, கையொப்பம் கூடாது.</div>
            </div>
          </div>

          <!-- Card 6 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">6</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">Vote Limit Per Post</div>
                <div class="guide-card-title-sub ml ta">വോട്ടിംഗ് പരിധി &bull; வாக்கு வரம்பு</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Vote only for <strong>permitted number of candidates</strong>. Single-seat posts: <strong>1 vote</strong>. UUC: <strong>Up to 2 votes</strong>.</div>
              <div class="guide-body-ml ml">അനുവദിച്ച എണ്ണം സ്ഥാനാർത്ഥികൾക്ക് മാത്രം വോട്ട് ചെയ്യുക. ജനറൽ പോസ്റ്റ്: 1, UUC-ക്ക് പരമാവധി 2.</div>
              <div class="guide-body-ta ta">அனுமதிக்கப்பட்ட எண்ணிக்கையில் மட்டுமே வாக்களிக்கவும். ஒற்றை பதவி: 1 வாக்கு, UUC: அதிகபட்சம் 2.</div>
            </div>
          </div>

          <!-- Card 7 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">7</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">Fold &amp; Deposit in Box</div>
                <div class="guide-card-title-sub ml ta">പെട്ടിയിൽ നിക്ഷേപിക്കുക &bull; பெட்டியில் போடுதல்</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">Fold ballot along fold lines to conceal vote; <strong>personally deposit into ballot box</strong>. Never take outside.</div>
              <div class="guide-body-ml ml">വോട്ട് രഹസ്യമാക്കി ബാലറ്റ് മടക്കി പെട്ടിയിൽ നിക്ഷേപിക്കുക. ബാലറ്റ് പുറത്തേക്ക് കൊണ്ടുപോകരുത്.</div>
              <div class="guide-body-ta ta">வாக்கை மறைத்து மடித்து பெட்டியில் போடவும். வாக்குச்சீட்டை வெளியே கொண்டு செல்லக்கூடாது.</div>
            </div>
          </div>

          <!-- Card 8 -->
          <div class="guide-card">
            <div class="guide-card-head">
              <div class="guide-num-badge">8</div>
              <div class="guide-card-titles">
                <div class="guide-card-title-en">Strict Prohibitions</div>
                <div class="guide-card-title-sub ml ta">കർശന വിലക്കുകൾ &bull; கடுமையான தடைகள்</div>
              </div>
            </div>
            <div class="guide-card-body">
              <div class="guide-body-en">📵 <strong>No mobile phones, smartwatches, or cameras</strong> inside booth. Maintain silence; no campaigning.</div>
              <div class="guide-body-ml ml">മൊബൈൽ, സ്മാർട്ട് വാച്ച്, ക്യാമറ എന്നിവ നിരോധിച്ചിരിക്കുന്നു. ബഹളങ്ങളോ പ്രചാരണങ്ങളോ പാടില്ല.</div>
              <div class="guide-body-ta ta">கைபேசி, ஸ்மார்ட் வாட்ச், கேமரா கொண்டுவர தடை. வாக்குச்சாவடியில் பிரச்சாரம், கோஷங்கள் கூடாது.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= PART 2: BALLOT MARKING GUIDE ================= -->
      <section class="marking-guide-container">
        <div class="sec-heading-bar">
          <div class="sec-title-main">
            <span>🗳️</span>
            <span>Part II: Ballot Paper Marking Guide &ndash; Valid vs. Invalid Votes</span>
          </div>
          <div class="sec-title-sub ml ta">സാധുവായതും അസാധുവായതുമായ വോട്ടുകളുടെ മാതൃക &bull; வாக்குச் சீட்டு குறிக்கும் வழிகாட்டி</div>
        </div>

        <!-- VALID VOTES -->
        <div class="valid-section-wrap">
          <div class="valid-header-badge">
            <div class="valid-title">
              <span>✔</span>
              <span>Examples of Valid Votes (സാധുവായ വോട്ടുകൾ / செல்லுபடியாகும் வாக்குகள்)</span>
            </div>
            <div class="valid-title-sub">Counted towards candidate's tally</div>
          </div>

          <div class="valid-grid">
            <!-- Valid 1 -->
            <div class="ballot-example-card valid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Valid Example 1: Single-Seat Posts &ndash; 1 Candidate Marked</span>
                <span class="ballot-tag tag-valid">✔ VALID VOTE</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col">
                      {get_stamp_svg(size=26)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col"></div>
                  </div>
                </div>
                <div class="ballot-reason-desc valid-desc">
                  <div class="reason-en">The arrow cross stamp is clearly placed against one candidate only for a single-seat post (Chairman, Secretary, etc.).</div>
                  <div class="reason-ml ml">ഒറ്റ സീറ്റ് പോസ്റ്റുകളിൽ (ചെയർമാൻ, സെക്രട്ടറി മുതലായവ) ഒരാൾക്ക് മാത്രം വ്യക്തമായി വോട്ട് രേഖപ്പെടുത്തിയിരിക്കുന്നു.</div>
                  <div class="reason-ta ta">ஒற்றை பதவிக்கு (தலைவர், செயலாளர்) ஒரு வேட்பாளருக்கு எதிராக மட்டுமே முத்திரை தெளிவாக இடப்பட்டுள்ளது.</div>
                </div>
              </div>
            </div>

            <!-- Valid 2 -->
            <div class="ballot-example-card valid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Valid Example 2: Center Point Inside Candidate Box</span>
                <span class="ballot-tag tag-valid">✔ VALID VOTE</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col"></div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col">
                      {get_stamp_svg(size=26, extra_class="center-in-priya")}
                    </div>
                  </div>
                </div>
                <div class="ballot-reason-desc valid-desc">
                  <div class="reason-en">Even though an arm of the stamp extends into the upper box, the center point/intersection is clearly within this candidate's column.</div>
                  <div class="reason-ml ml">മാർക്കിന്റെ കുറച്ചു ഭാഗം അടുത്ത കോളത്തിലേക്ക് പോയിട്ടുണ്ടെങ്കിലും, ക്രോസ്സ് മാർക്കിന്റെ സെന്റർ പോയിന്റ് ഈ സ്ഥാനാർത്ഥിയുടെ കോളത്തിലാണ് ഉള്ളത്.</div>
                  <div class="reason-ta ta">குறுக்கு குறியின் ஒரு பகுதி நீட்டிக்கப்பட்டிருந்தாலும் மையப் புள்ளி இந்த வேட்பாளரின் பெட்டிக்குள் இருப்பதால் செல்லுபடியாகும்.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================= UUC DUAL-VOTE SPECIAL SECTION ================= -->
        <div class="uuc-section-wrap">
          <div class="uuc-header-badge">
            <div class="uuc-title">
              <span>⭐</span>
              <span>University Union Councillor (UUC) &ndash; Dual-Seat Post Rules (പരമാവധി 2 വോട്ടുകൾ &bull; அதிகபட்சம் 2 வாக்குகள்)</span>
            </div>
            <div class="uuc-title-sub">Statutory Quota: Up to 2 votes for distinct candidates &bull; 2 Seats (രണ്ടു സീറ്റുകൾ)</div>
          </div>

          <div class="uuc-grid">
            <!-- UUC Case 1: 2 Votes Marked -->
            <div class="ballot-example-card uuc-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">UUC Case 1: 2 Candidates Marked</span>
                <span class="ballot-tag tag-valid">✔ 2 VALID VOTES</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic uuc-graphic">
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>ANAS</span>
                      <span class="cand-sub ml">അനസ്</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark">
                      {get_stamp_svg(size=20)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>FATHIMA</span>
                      <span class="cand-sub ml">ഫാത്തിമ</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark">
                      {get_stamp_svg(size=20)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>KAVYA</span>
                      <span class="cand-sub ml">കാവ്യ</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark"></div>
                  </div>
                </div>
                <div class="ballot-reason-desc uuc-desc">
                  <div class="reason-en">Voter marked <strong>2 distinct candidates</strong> for UUC. Both votes are <strong>VALID</strong> (1 vote each to Anas &amp; Fathima).</div>
                  <div class="reason-ml ml">UUC-ൽ <strong>2 വ്യത്യസ്ത സ്ഥാനാർത്ഥികൾക്ക്</strong> വോട്ട് ചെയ്യാം. രണ്ടും <strong>സാധുവായ വോട്ടുകൾ</strong> (ഓരോ വോട്ട് വീതം).</div>
                  <div class="reason-ta ta">UUC பதவிக்கு <strong>2 வெவ்வேறு வேட்பாளர்களுக்கு</strong> வாக்களிக்கலாம். இரண்டும் <strong>செல்லுபடியாகும்</strong> (தலா 1 வாக்கு).</div>
                </div>
              </div>
            </div>

            <!-- UUC Case 2: 1 Vote Marked (Single Vote / Undervote) -->
            <div class="ballot-example-card uuc-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">UUC Case 2: 1 Candidate Marked</span>
                <span class="ballot-tag tag-valid">✔ 1 VALID + 1 INVALID</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic uuc-graphic">
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>ANAS</span>
                      <span class="cand-sub ml">അനസ്</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark">
                      {get_stamp_svg(size=20)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>FATHIMA</span>
                      <span class="cand-sub ml">ഫാത്തിമ</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark"></div>
                  </div>
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>KAVYA</span>
                      <span class="cand-sub ml">കാവ്യ</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark"></div>
                  </div>
                </div>
                <div class="ballot-reason-desc uuc-desc">
                  <div class="reason-en">Voting for only 1 candidate in UUC is <strong>VALID</strong> for that candidate (1 Valid + 1 Invalid).</div>
                  <div class="reason-ml ml">UUC-ൽ <strong>ഒരാൾക്ക് മാത്രം</strong> വോട്ട് ചെയ്താലും ആ വോട്ട് <strong>സാധുവാണ്</strong> (1 സാധു + 1 അസാധു).</div>
                  <div class="reason-ta ta">UUC-ல் <strong>ஒருவருக்கு மட்டும்</strong> வாக்களித்தாலும் அது <strong>செல்லும்</strong> (1 செல்லும் + 1 செல்லாது).</div>
                </div>
              </div>
            </div>

            <!-- UUC Case 3: More Than 2 Marked (>2) -->
            <div class="ballot-example-card uuc-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">UUC Case 3: More Than 2 Marked (&gt;2)</span>
                <span class="ballot-tag tag-invalid">✖ REJECTED (&gt;2)</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic uuc-graphic invalid-graphic">
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>ANAS</span>
                      <span class="cand-sub ml">അനസ്</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark">
                      {get_stamp_svg(size=20)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>FATHIMA</span>
                      <span class="cand-sub ml">ഫാത്തിമ</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark">
                      {get_stamp_svg(size=20)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row uuc-row">
                    <div class="ballot-cand-col uuc-cand">
                      <span>KAVYA</span>
                      <span class="cand-sub ml">കാവ്യ</span>
                    </div>
                    <div class="ballot-mark-col uuc-mark">
                      {get_stamp_svg(size=20)}
                    </div>
                  </div>
                </div>
                <div class="ballot-reason-desc uuc-desc invalid-desc">
                  <div class="reason-en">Marking more than 2 candidates (&gt;2) exceeds the legal quota. All votes for UUC are <strong>INVALID &amp; REJECTED</strong>!</div>
                  <div class="reason-ml ml">UUC-ൽ അനുവദിച്ച 2 വോട്ടിൽ കൂടുതൽ <strong>(&gt;2)</strong> സ്ഥാനാർത്ഥികൾക്ക് വോട്ട് ചെയ്താൽ UUC വോട്ടുകൾ <strong>പൂർണ്ണമായി അസാധുവാകും</strong>!</div>
                  <div class="reason-ta ta">UUC பதவிக்கு അനുവദിക്കപ്പെട്ട 2 வாக்குகளுக்கு மேல் <strong>(&gt;2)</strong> வாக்களித்தால் அனைத்து வாக்குகளும் <strong>செல்லாது</strong>!</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- INVALID VOTES -->
        <div class="invalid-section-wrap">
          <div class="invalid-header-badge">
            <div class="invalid-title">
              <span>✖</span>
              <span>Examples of Invalid Votes (അസാധു വോട്ടുകൾ / செல்லாத வாக்குகள்)</span>
            </div>
            <div class="invalid-title-sub">Rejected during counting &bull; Avoid these mistakes!</div>
          </div>

          <div class="invalid-grid">
            <!-- Invalid 1 -->
            <div class="ballot-example-card invalid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Invalid 1: Single-Seat Posts &ndash; Multiple Marked</span>
                <span class="ballot-tag tag-invalid">✖ REJECTED</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic invalid-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col">
                      {get_stamp_svg(size=26)}
                    </div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col">
                      {get_stamp_svg(size=26)}
                    </div>
                  </div>
                </div>
                <div class="ballot-reason-desc invalid-desc">
                  <div class="reason-en">Two candidates for the same single-seat post have been voted for (Exceeds limit).</div>
                  <div class="reason-ml ml">ഒരേ പോസ്റ്റിലേക്ക് മത്സരിക്കുന്ന രണ്ടു സ്ഥാനാർത്ഥികൾക്കും വോട്ട് ചെയ്തിരിക്കുന്നു.</div>
                  <div class="reason-ta ta">ஒரே பதவிக்கு போட்டியிடும் இரு வேட்பாளர்களுக்கு வாக்களித்ததால் செல்லாது.</div>
                </div>
              </div>
            </div>

            <!-- Invalid 2 -->
            <div class="ballot-example-card invalid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Invalid 2: Center on Dividing Line</span>
                <span class="ballot-tag tag-invalid">✖ REJECTED</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic invalid-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col"></div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col">
                      {get_stamp_svg(size=26, extra_class="center-on-border")}
                    </div>
                  </div>
                </div>
                <div class="ballot-reason-desc invalid-desc">
                  <div class="reason-en">The center point of the cross mark is exactly on the dividing line, causing ambiguity.</div>
                  <div class="reason-ml ml">ക്രോസ്സ് മാർക്കിന്റെ സെന്റർ പോയിന്റ് കൃത്യമായി അതിർവരയിലാണ് ഉള്ളത് (അവ്യക്തത).</div>
                  <div class="reason-ta ta">மையப் புள்ளி பிரிக்கும் கோட்டில் சரியாக இருப்பதால் எந்த வேட்பாளருக்கு என்று தெளிவற்றது.</div>
                </div>
              </div>
            </div>

            <!-- Invalid 3 -->
            <div class="ballot-example-card invalid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Invalid 3: Pen Tick Mark / Star</span>
                <span class="ballot-tag tag-invalid">✖ REJECTED</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic invalid-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col"></div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col">
                      <div class="tick-stamp">✓</div>
                    </div>
                  </div>
                </div>
                <div class="ballot-reason-desc invalid-desc">
                  <div class="reason-en">A pen or pencil was used to draw a tick mark (✓) or star instead of the arrow cross stamp.</div>
                  <div class="reason-ml ml">ആരോ ക്രോസ്സ് മുദ്രയ്ക്ക് പകരം പേന ഉപയോഗിച്ച് ടിക്ക് മാർക്ക് / ചിഹ്നങ്ങൾ രേഖപ്പെടുത്തി.</div>
                  <div class="reason-ta ta">முத்திரைக்கு பதிலாக பேனா மூலம் டிக் குறி இட்டதால் செல்லாது.</div>
                </div>
              </div>
            </div>

            <!-- Invalid 4 -->
            <div class="ballot-example-card invalid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Invalid 4: Thumb Impression</span>
                <span class="ballot-tag tag-invalid">✖ REJECTED</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic invalid-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col"></div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col">
                      <div class="thumb-stamp" style="background-image: url('{thumb_b64}');"></div>
                    </div>
                  </div>
                </div>
                <div class="ballot-reason-desc invalid-desc">
                  <div class="reason-en">A thumb impression is recorded on the ballot instead of the arrow cross stamp.</div>
                  <div class="reason-ml ml">ആരോ ക്രോസ്സ് മുദ്രയ്ക്ക് പകരം തമ്പ് ഇമ്പ്രഷൻ (വിരലടയാളം) രേഖപ്പെടുത്തിയിരിക്കുന്നു.</div>
                  <div class="reason-ta ta">முத்திரைக்கு பதிலாக பெருவிரல் ரேகை பதிவு செய்யப்பட்டுள்ளதால் செல்லாது.</div>
                </div>
              </div>
            </div>

            <!-- Invalid 5 -->
            <div class="ballot-example-card invalid-card">
              <div class="ballot-example-head">
                <span class="ballot-id-title">Invalid 5: Signature / Name</span>
                <span class="ballot-tag tag-invalid">✖ REJECTED</span>
              </div>
              <div class="ballot-content-flex">
                <div class="ballot-box-graphic invalid-graphic">
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>RAHUL</span>
                      <span class="cand-sub ml">രാഹുൽ</span>
                    </div>
                    <div class="ballot-mark-col">
                      <div class="sig-stamp">Rahul</div>
                    </div>
                  </div>
                  <div class="ballot-graphic-row">
                    <div class="ballot-cand-col">
                      <span>PRIYA</span>
                      <span class="cand-sub ml">പ്രിയ</span>
                    </div>
                    <div class="ballot-mark-col"></div>
                  </div>
                </div>
                <div class="ballot-reason-desc invalid-desc">
                  <div class="reason-en">The voter has placed a signature, name, or admission number (Identifying mark).</div>
                  <div class="reason-ml ml">ആരോ ക്രോസ്സ് മുദ്രയ്ക്ക് പകരം വോട്ടറുടെ ഒപ്പോ പേരോ നമ്പറോ രേഖപ്പെടുത്തിയിരിക്കുന്നു.</div>
                  <div class="reason-ta ta">வாக்காளர் முத்திரைக்கு பதிலாக தனது கையொப்பத்தை வைத்துள்ளதால் செல்லாது.</div>
                </div>
              </div>
            </div>

            <!-- Golden Rule Card -->
            <div class="golden-rule-card">
              <div class="golden-rule-head">
                <span>⚠️</span>
                <span>Statutory Warnings &bull; നിയമ മുന്നറിയിപ്പുകൾ</span>
              </div>
              <div class="golden-rule-body">
                <div class="rule-line">
                  <span class="rule-bullet">🛑</span>
                  <div><strong>No Erasures / Overwriting:</strong> Do not erase, overwrite, or alter the ballot paper.</div>
                </div>
                <div class="rule-line">
                  <span class="rule-bullet">🛑</span>
                  <div><strong>No Identifying Marks:</strong> Writing your name, sign, or roll number renders ballot <strong>VOID</strong>.</div>
                </div>
                <div class="rule-line">
                  <span class="rule-bullet">🛑</span>
                  <div><strong>Strict Secrecy:</strong> Never disclose or photograph your marked ballot inside the booth.</div>
                </div>
                <div class="rule-line">
                  <span class="rule-bullet">🛑</span>
                  <div><strong>Never Take Ballot Out:</strong> Taking ballots outside the polling booth is a severe legal offense.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= FOOTER ================= -->
      <footer class="poster-footer">
        <div class="footer-authority">
          <strong>Returning Officer</strong><br>
          College Union Election 2026 &bull; Government College Chittur, Palakkad
        </div>
      </footer>

    </div>
  </div>
"""

    if is_interactive:
        content += """
  <script>
    function setTheme(theme) {
      const root = document.getElementById('posterRoot');
      const btnColor = document.getElementById('btnColor');
      const btnBW = document.getElementById('btnBW');
      
      if (theme === 'bw') {
        root.classList.remove('theme-color');
        root.classList.add('theme-bw');
        btnBW.classList.add('active');
        btnColor.classList.remove('active');
      } else {
        root.classList.remove('theme-bw');
        root.classList.add('theme-color');
        btnColor.classList.add('active');
        btnBW.classList.remove('active');
      }
    }
  </script>
"""

    content += """
</body>
</html>
"""
    return content

# 1. Generate Interactive version
with open("Voter_Instructions_A3_Poster.html", "w", encoding="utf-8") as f:
    f.write(generate_poster_html_content("theme-color", is_interactive=True))
print("Created Voter_Instructions_A3_Poster.html")

# 2. Generate Standalone Color version
with open("Voter_Instructions_A3_Poster_Color.html", "w", encoding="utf-8") as f:
    f.write(generate_poster_html_content("theme-color", is_interactive=False))
print("Created Voter_Instructions_A3_Poster_Color.html")

# 3. Generate Standalone Pure B&W version
with open("Voter_Instructions_A3_Poster_BW.html", "w", encoding="utf-8") as f:
    f.write(generate_poster_html_content("theme-bw", is_interactive=False))
print("Created Voter_Instructions_A3_Poster_BW.html")
