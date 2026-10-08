const fs = require('fs');
const b = fs.readFileSync('C:/Users/sures/.gemini/antigravity-ide/brain/2deabfa3-64cf-40c0-9566-66c04df04f89/scratch/thumb_final_b64.txt', 'utf8').trim();
let c = fs.readFileSync('generate_voting_guide.mjs', 'utf8');
c = c.replace(/background-image: url\('data:image\/png;base64,[^']+'\);/g, `background-image: url('data:image/png;base64,${b}');`);
fs.writeFileSync('generate_voting_guide.mjs', c);
