import { writeFileSync, existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Voting Marking Guide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #ffffff;
    }

    .page {
      page-break-after: always;
      position: relative;
    }

    .malayalam { font-family: 'Noto Sans Malayalam', sans-serif; }
    .tamil { font-family: 'Noto Sans Tamil', sans-serif; }

    h2 {
      text-align: center;
      margin-bottom: 20px;
      font-size: 16pt;
      text-decoration: underline;
    }

    .section-valid h2 { color: #000; }
    .section-invalid h2 { color: #d32f2f; margin-top: 40px; }

    .example-row {
      display: flex;
      margin-bottom: 25px;
      align-items: center;
    }

    .ballot-box {
      border: 1px solid #000;
      width: 250px;
      margin-right: 20px;
      flex-shrink: 0;
    }

    .ballot-row {
      display: flex;
      border-bottom: 1px solid #000;
      height: 40px;
      align-items: center;
    }
    .ballot-row:last-child {
      border-bottom: none;
    }

    .cand-name {
      width: 60%;
      padding-left: 10px;
      font-weight: bold;
      border-right: 1px solid #000;
      height: 100%;
      display: flex;
      align-items: center;
    }
    
    .cand-mark {
      width: 40%;
      position: relative;
      height: 100%;
    }

    .reason-box {
      flex-grow: 1;
      font-size: 9.5pt;
      color: #1b5e20;
    }
    .invalid-reason { color: #b71c1c; }

    /* Drawing the marks */
    .cross-mark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24pt;
      color: #1976d2;
      font-weight: bold;
      font-family: Arial, sans-serif !important;
      line-height: 1;
    }

    .tick-mark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24pt;
      color: #000;
      font-weight: bold;
      line-height: 1;
    }

    .thumb-mark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 52px;
      height: 27px;
      background-image: url('data:image/png;base64,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');
      background-repeat: no-repeat;
      background-size: contain;
      background-position: center;
      mix-blend-mode: multiply;
      opacity: 0.85;
    }

    .signature-mark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Brush Script MT', cursive;
      font-size: 14pt;
      color: #000;
    }

    /* specific offsets for examples */
    .border-cross {
      top: calc(100% + 2px) !important; /* visually exactly on border */
      z-index: 10;
    }
    .slight-border-cross {
      top: 80% !important; /* mostly in bottom box, slightly crossing top */
      z-index: 10;
    }

  </style>
</head>
<body>

  <!-- PAGE 1: ENGLISH -->
  <div class="page">
    <div class="section-valid">
      <h2>Examples of Valid Votes</h2>
      
      <!-- Valid 1 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box">
          Reason for valid vote: The cross mark is clearly marked against one candidate only.
        </div>
      </div>

      <!-- Valid 2 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark"></div>
            <!-- The mark goes across the border but center is in Priya's box -->
          </div>
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark">
               <div class="cross-mark" style="top: 20%; transform: translate(-50%, -50%);">X</div>
            </div>
            <!-- adjusting slightly down so center is clearly in Priya's -->
          </div>
        </div>
        <div class="reason-box">
          Reason for valid vote: Even though a part of the cross mark extends into the upper box, the center point of the mark is within this candidate's column.
        </div>
      </div>
    </div>

    <div class="section-invalid">
      <h2 style="color:red;">Examples of Invalid Votes</h2>

      <!-- Invalid 1 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          Reason for invalid vote: Two candidates for the same post have been voted for.
        </div>
      </div>

      <!-- Invalid 2 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark">
               <div class="cross-mark border-cross">X</div>
            </div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          Reason for invalid vote: The center point of the cross mark is exactly on the dividing line, causing ambiguity.
        </div>
      </div>

      <!-- Invalid 3 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark"><div class="tick-mark">✓</div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          Reason for invalid vote: A pen has been used to draw a tick mark instead of the official arrow cross mark.
        </div>
      </div>

      <!-- Invalid 4 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark"><div class="thumb-mark"></div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          Reason for invalid vote: A thumb impression is recorded instead of the arrow cross mark.
        </div>
      </div>

      <!-- Invalid 5 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">RAHUL</div>
            <div class="cand-mark"><div class="signature-mark">Rahul</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">PRIYA</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          Reason for invalid vote: The voter has placed a signature instead of the arrow cross mark.
        </div>
      </div>
    </div>
  </div>


  <!-- PAGE 2: MALAYALAM -->
  <div class="page malayalam">
    <div class="section-valid">
      <h2>സാധുവായ വോട്ടുകളുടെ മാതൃക</h2>
      
      <!-- Valid 1 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box">
          സാധു വോട്ട് ആയതിനു കാരണം: ഒരേ പോസ്റ്റിലേക്ക് മത്സരിക്കുന്ന രണ്ടു സ്ഥാനാർത്ഥികളിൽ ഒരാൾക്ക് മാത്രം വോട്ട് ചെയ്തിരിക്കുന്നു.
        </div>
      </div>

      <!-- Valid 2 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark">
               <div class="cross-mark" style="top: 20%; transform: translate(-50%, -50%);">X</div>
            </div>
          </div>
        </div>
        <div class="reason-box">
          സാധു വോട്ട് ആയതിനു കാരണം: ആരോ ക്രോസ്സ് മാർക്കിന്റെ കുറച്ചു ഭാഗം അടുത്ത സ്ഥാനാർത്ഥിയുടെ കോളത്തിലേക്ക് പോയിട്ടുണ്ടെങ്കിലും, ക്രോസ്സ് മാർക്കിന്റെ സെൻ്റർ പോയിൻ്റ് സ്ഥാനാർത്ഥിയുടെ കോളത്തിലാണ് ഉള്ളത്.
        </div>
      </div>
    </div>

    <div class="section-invalid">
      <h2 style="color:red;">അസാധു വോട്ടുകളുടെ മാതൃക</h2>

      <!-- Invalid 1 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          അസാധു വോട്ട് ആയതിനു കാരണം: ഒരേ പോസ്റ്റിലേക്ക് മത്സരിക്കുന്ന രണ്ടു സ്ഥാനാർത്ഥികൾക്ക് വോട്ട് ചെയ്തിരിക്കുന്നു.
        </div>
      </div>

      <!-- Invalid 2 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark">
               <div class="cross-mark border-cross">X</div>
            </div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          അസാധു വോട്ട് ആയതിനു കാരണം: ആരോ ക്രോസ്സ് മാർക്കിന്റെ സെന്റർ പോയിൻ്റ് ഏതു സ്ഥാനാർത്ഥിയുടെ കോളത്തിലാണ് ഉള്ളത് എന്നതിലുള്ള അവ്യക്തത.
        </div>
      </div>

      <!-- Invalid 3 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark"><div class="tick-mark">✓</div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          അസാധു വോട്ട് ആയതിനു കാരണം: ആരോ ക്രോസ്സ് മാർക്കിന് പകരം പേന ഉപയോഗിച്ച് ടിക്ക് മാർക്ക്, സ്റ്റാർ തുടങ്ങിയവ രേഖപ്പെടുത്തൽ.
        </div>
      </div>

      <!-- Invalid 4 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark"><div class="thumb-mark"></div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          അസാധു വോട്ട് ആയതിനു കാരണം: ആരോ ക്രോസ്സ് മാർക്കിന് പകരം തമ്പ് ഇമ്പ്രഷൻ രേഖപ്പെടുത്തിയിരിക്കുന്നു.
        </div>
      </div>

      <!-- Invalid 5 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">രാഹുൽ</div>
            <div class="cand-mark"><div class="signature-mark">Rhl</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">പ്രിയ</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          അസാധു വോട്ട് ആയതിനു കാരണം: ആരോ ക്രോസ്സ് മാർക്കിന് പകരം ഇലക്ടർ ഒപ്പ് വച്ചിരിക്കുന്നു.
        </div>
      </div>
    </div>
  </div>


  <!-- PAGE 3: TAMIL -->
  <div class="page tamil">
    <div class="section-valid">
      <h2>செல்லுபடியாகும் வாக்குகளின் மாதிரிகள்</h2>
      
      <!-- Valid 1 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box">
          காரணம்: ஒரு வேட்பாளருக்கு எதிராக மட்டுமே குறுக்கு குறி தெளிவாக குறிக்கப்பட்டுள்ளதால் செல்லுபடியாகும் வாக்கு.
        </div>
      </div>

      <!-- Valid 2 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark">
               <div class="cross-mark" style="top: 20%; transform: translate(-50%, -50%);">X</div>
            </div>
          </div>
        </div>
        <div class="reason-box">
          காரணம்: குறுக்கு குறியின் ஒரு பகுதி மற்ற வேட்பாளரின் பெட்டியில் நீட்டிக்கப்பட்டிருந்தாலும், குறுக்கு குறியின் மையப் புள்ளி இந்த வேட்பாளரின் நெடுவரிசைக்குள் இருப்பதால் செல்லுபடியாகும் வாக்கு.
        </div>
      </div>
    </div>

    <div class="section-invalid">
      <h2 style="color:red;">செல்லாத வாக்குகளின் மாதிரிகள்</h2>

      <!-- Invalid 1 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark"><div class="cross-mark">X</div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          காரணம்: ஒரே பதவிக்கு போட்டியிடும் இரு வேட்பாளர்களுக்கு வாக்களித்ததால் வாக்கு செல்லாது.
        </div>
      </div>

      <!-- Invalid 2 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row" style="position:relative;">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark">
               <div class="cross-mark border-cross">X</div>
            </div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          காரணம்: குறுக்கு குறியின் மையப் புள்ளி பிரிக்கும் கோட்டில் சரியாக இருப்பதால் எந்த வேட்பாளருக்கு என்று தெளிவற்றதாக இருப்பதால் செல்லாத வாக்கு.
        </div>
      </div>

      <!-- Invalid 3 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark"><div class="tick-mark">✓</div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          காரணம்: உத்தியோகபூர்வ அம்புக்குறி குறுக்கு குறிக்கு பதிலாக பேனா மூலம் டிக் அல்லது நட்சத்திர குறி பயன்படுத்தப்பட்டதால் செல்லாத வாக்கு.
        </div>
      </div>

      <!-- Invalid 4 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark"></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark"><div class="thumb-mark"></div></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          காரணம்: அம்புக்குறி குறுக்கு குறிக்கு பதிலாக பெருவிரல் ரேகை பதிவு செய்யப்பட்டுள்ளதால் செல்லாத வாக்கு.
        </div>
      </div>

      <!-- Invalid 5 -->
      <div class="example-row">
        <div class="ballot-box">
          <div class="ballot-row">
            <div class="cand-name">ராகுல்</div>
            <div class="cand-mark"><div class="signature-mark">Rhl</div></div>
          </div>
          <div class="ballot-row">
            <div class="cand-name">பிரியா</div>
            <div class="cand-mark"></div>
          </div>
        </div>
        <div class="reason-box invalid-reason">
          காரணம்: வாக்காளர் அம்புக்குறி குறுக்கு குறிக்கு பதிலாக தனது கையொப்பத்தை வைத்துள்ளதால் செல்லாத வாக்கு.
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;

writeFileSync('Voting_Guide.html', htmlContent);
console.log('Written HTML to Voting_Guide.html');

try {
  console.log('Running Chrome Headless PDF generator...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const outPath = resolve('Voting_Marking_Guide.pdf');
  const cmd = `"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outPath}" --no-pdf-header-footer "file:///${resolve('Voting_Guide.html').replace(/\\\\/g, '/')}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('Successfully created PDF');
} catch (error) {
  console.log('PDF generation error code:', error.status);
}
