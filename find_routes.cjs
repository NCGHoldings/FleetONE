const fs = require('fs');
const lines = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8').split('\n');
const results = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('referencedRelation: "routes"')) {
     let j = i;
     while (j > 0 && !lines[j].includes('foreignKeyName')) j--;
     let colLine = j + 1;
     let col = lines[colLine].trim().match(/"([^"]+)"/)[1];
     let t = j;
     while (t > 0 && !(lines[t].match(/^      [a-zA-Z0-9_]+: \{$/))) t--;
     let table = lines[t].trim().split(':')[0];
     results.push(`${table}.${col} -> routes.id`);
  }
}
console.log(results.join('\n'));
