
export const getBallotMasterPlan = (posts, candidates, booths, students) => {
  const isYear = (p) => p.post.toLowerCase().includes('representative') || p.post.toLowerCase().includes('year');
  const isAssoc = (p) => p.post.toLowerCase().includes('association') || p.post.toLowerCase().includes('assoc');
  const isGeneral = (p) => !isYear(p) && !isAssoc(p);

  const sortedBooths = [...booths].sort((a, b) => a.boothNumber - b.boothNumber);
  const contestablePosts = posts.filter(p => {
    const pCands = candidates.filter(c => c.post === p.post);
    return pCands.length > 1;
  });

  // Master counters
  let genSl = 1, repSl = 1, assocSl = 1;
  let gbCount = 0, rbCount = 0, abCount = 0;

  const standard = 50;
  const threshold = 15;

  const calcBooks = (count, start, prefix, currentGlobalBookCount) => {
    if (!count || count <= 0) return { html: '-', ids: '-', count: 0 };
    let current = start;
    let books = [];
    const idPrefix = prefix === 'G' ? 'GB' : (prefix === 'R' ? 'RB' : 'AB');
    let counter = currentGlobalBookCount;
    let ids = [];

    const createRange = (size) => {
      counter++;
      const id = idPrefix + counter;
      ids.push(id);
      const range = `${prefix}${current}-${current + size - 1}`;
      current += size;
      return { id, range };
    };

    if (count <= (standard + threshold)) {
      books.push({ qty: 1, size: count, items: [createRange(count)] });
    } else {
      const fullBooks = Math.floor(count / standard);
      const remainder = count % standard;
      if (remainder === 0) {
        let items = [];
        for (let i = 0; i < fullBooks; i++) items.push(createRange(standard));
        books.push({ qty: fullBooks, size: standard, items });
      } else if (remainder <= threshold) {
        let items = [];
        for (let i = 0; i < fullBooks - 1; i++) items.push(createRange(standard));
        if (items.length > 0) books.push({ qty: fullBooks - 1, size: standard, items });
        const lastSize = standard + remainder;
        books.push({ qty: 1, size: lastSize, items: [createRange(lastSize)] });
      } else {
        let items = [];
        for (let i = 0; i < fullBooks; i++) items.push(createRange(standard));
        books.push({ qty: fullBooks, size: standard, items });
        books.push({ qty: 1, size: remainder, items: [createRange(remainder)] });
      }
    }

    const html = `
      <table style="width:100%; border-collapse:collapse; font-size:10px; background:rgba(0,0,0,0.02);">
        ${books.map(b => `
          <tr>
            <td style="padding:4px; border:1px solid #eee; font-weight:bold; width:45px;">${b.qty} x ${b.size}</td>
            <td style="padding:4px; border:1px solid #eee; line-height:1.4;">
              ${b.items.map(it => `<span style="display:inline-block; margin-right:8px;"><strong style="color:#4f46e5;">${it.id}:</strong> ${it.range}</span>`).join(' ')}
            </td>
          </tr>
        `).join('')}
      </table>
    `;

    return { 
      html, 
      ids: ids.length === 1 ? ids[0] : `${ids[0]} to ${ids[ids.length - 1]}`, 
      nextCounter: counter 
    };
  };

  const boothMap = {};
  sortedBooths.forEach(b => {
    boothMap[b.boothNumber] = { general: null, reps: [], assocs: [] };
  });

  // 1. General
  const genResults = [];
  sortedBooths.forEach(b => {
    const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
    const count = boothStudents.length;
    const start = genSl;
    const end = start + count - 1;
    const bookData = calcBooks(count, start, 'G', gbCount);
    gbCount = bookData.nextCounter;

    const data = { booth: b.boothNumber, count, start, end, bookHtml: bookData.html, bookIds: bookData.ids };
    genResults.push(data);
    boothMap[b.boothNumber].general = data;
    genSl += count;
  });

  // 2. Reps
  const repResults = [];
  const yrPosts = contestablePosts.filter(isYear);
  yrPosts.forEach(p => {
    const yr = String(p.yearRestriction || '').trim().toUpperCase();
    sortedBooths.forEach(b => {
      const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
      const targetStudents = boothStudents.filter(s => {
        const cls = String(s.CLASS || '').toUpperCase();
        if (cls.includes('PH D') || cls.includes('PH.D')) return false; 
        const isPG = /\b(MA|MSC|MCOM|M\.SC|M\.COM|M\.A)\b/i.test(cls);
        if (yr === 'PG') return isPG;
        if (isPG) return false; 
        if (yr === '1') return cls.startsWith('1ST YEAR');
        if (yr === '2') return cls.startsWith('2ND YEAR');
        if (yr === '3') return cls.startsWith('3RD YEAR');
        return false;
      });

      if (targetStudents.length > 0) {
        const count = targetStudents.length;
        const start = repSl;
        const end = start + count - 1;
        const bookData = calcBooks(count, start, 'R', rbCount);
        rbCount = bookData.nextCounter;

        const data = { post: p.post, booth: b.boothNumber, count, start, end, bookHtml: bookData.html, bookIds: bookData.ids };
        repResults.push(data);
        boothMap[b.boothNumber].reps.push(data);
        repSl += count;
      }
    });
  });

  // 3. Assocs
  const assocResults = [];
  const aPosts = contestablePosts.filter(isAssoc);
  aPosts.forEach(p => {
    const prefix = 'Association Secretary';
    let dept = p.post.toUpperCase();
    if (dept.includes(prefix.toUpperCase())) dept = dept.split(prefix.toUpperCase())[1].trim();
    dept = dept.replace(/[-\s]/g, ' ');

    sortedBooths.forEach(b => {
      const boothStudents = students.filter(s => b.classes.includes(String(s.CLASS).trim()));
      const targetStudents = boothStudents.filter(s => {
        const sDept = String(s.Dept || '').trim().toUpperCase().replace(/[-\s]/g, ' ');
        const sCls  = String(s.CLASS || '').trim().toUpperCase().replace(/[-\s]/g, ' ');
        return sDept === dept || sDept.includes(dept) || sCls.includes(dept);
      });

      if (targetStudents.length > 0) {
        const count = targetStudents.length;
        const start = assocSl;
        const end = start + count - 1;
        const bookData = calcBooks(count, start, 'A', abCount);
        abCount = bookData.nextCounter;

        const data = { post: p.post, booth: b.boothNumber, count, start, end, bookHtml: bookData.html, bookIds: bookData.ids };
        assocResults.push(data);
        boothMap[b.boothNumber].assocs.push(data);
        assocSl += count;
      }
    });
  });

  return {
    general: { results: genResults, total: genSl - 1 },
    reps: { results: repResults, total: repSl - 1 },
    assocs: { results: assocResults, total: assocSl - 1 },
    boothAssignments: boothMap
  };
};
