const fs = require('fs');
let css = fs.readFileSync('src/style.css', 'utf-8');

// 1. Root variables (Light theme colors)
css = css.replace(/:root\s*\{[\s\S]*?\}/, `:root {
  --bg-main: #f0f4f8;
  --bg-sub: #e6ebf1;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --bg-hover: #eaf1f8;
  --line: #cdd5df;
  --line-strong: #8da4b7;
  --text-main: #1a2530;
  --text-sub: #3d4f61;
  --text-muted: #6b8095;
  --accent: #1976d2;
  --accent-strong: #1565c0;
  --ok: #2e7d32;
  --warn: #f57c00;
  --danger: #d32f2f;
  --font: 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif;
}`);

// 2. Body background (remove radial gradients)
css = css.replace(/body\s*\{[\s\S]*?line-height:\s*1\.5;\s*\}/, `body {
  background: var(--bg-main);
  color: var(--text-main);
  font-family: var(--font);
  line-height: 1.5;
}`);

// 3. Exam Header & Nav
css = css.replace(/background:\s*rgba\(8,\s*27,\s*46,\s*0\.95\);/, 'background: var(--bg-card);');
css = css.replace(/backdrop-filter:\s*blur\(6px\);/, '');

css = css.replace(/background:\s*rgba\(8,\s*30,\s*52,\s*0\.9\);/, 'background: var(--bg-card);');
css = css.replace(/background:\s*rgba\(34,\s*90,\s*137,\s*0\.55\);/, 'background: var(--bg-hover);');
css = css.replace(/border-color:\s*rgba\(78,\s*178,\s*255,\s*0\.75\);/, 'border-color: var(--accent);');

// 4. Cards and panels backgrounds
css = css.replace(/background:\s*rgba\(12,\s*39,\s*66,\s*0\.92\);/g, 'background: var(--bg-card);');
css = css.replace(/background:\s*rgba\(9,\s*31,\s*52,\s*0\.94\);/g, 'background: var(--bg-sub);');
css = css.replace(/background:\s*rgba\(12,\s*40,\s*66,\s*0\.85\);/g, 'background: var(--bg-card);');
css = css.replace(/background:\s*rgba\(4,\s*24,\s*41,\s*0\.7\);/g, 'background: var(--bg-sub);');
css = css.replace(/background:\s*rgba\(8,\s*32,\s*53,\s*0\.86\);/g, 'background: var(--bg-card);');
css = css.replace(/background:\s*rgba\(8,\s*28,\s*45,\s*0\.85\);/g, 'background: var(--bg-card);');

// 5. Borders and border-radius (make it flatter)
css = css.replace(/border-radius:\s*18px;/g, 'border-radius: 4px;');
css = css.replace(/border-radius:\s*12px;/g, 'border-radius: 4px;');
css = css.replace(/border-radius:\s*10px;/g, 'border-radius: 4px;');
css = css.replace(/border-radius:\s*9px;/g, 'border-radius: 4px;');
css = css.replace(/border-radius:\s*8px;/g, 'border-radius: 4px;');
css = css.replace(/border-radius:\s*7px;/g, 'border-radius: 2px;');

// 6. Tables
css = css.replace(/background:\s*rgba\(5,\s*24,\s*39,\s*0\.92\);/g, 'background: var(--bg-sub); color: var(--text-main);');
css = css.replace(/color:\s*#75c3ff;/g, 'color: var(--text-main);');
css = css.replace(/color:\s*#ffacac;/g, 'color: var(--text-main);');
css = css.replace(/background:\s*rgba\(10,\s*31,\s*50,\s*0\.82\);/g, 'background: #f8f9fa;');

// Table Borders formatting for CBT
css = css.replace(/\.journal-table\s*th,\s*\n?\.journal-table\s*td,\s*\n?\.t-account\s*th,\s*\n?\.t-account\s*td,\s*\n?\.trial-balance\s*th,\s*\n?\.trial-balance\s*td,\s*\n?\.answer-table\s*th,\s*\n?\.answer-table\s*td\s*\{[\s\S]*?\}/, `.journal-table th,
.journal-table td,
.t-account th,
.t-account td,
.trial-balance th,
.trial-balance td,
.answer-table th,
.answer-table td {
  border: 1px solid var(--line);
  padding: 8px;
  font-size: 13px;
  background: var(--bg-card);
}`);

// Q3 Specific updates layout inside style.css
css = css.replace(/\.q3-workspace\s*\{[\s\S]*?\}/, `.q3-workspace {
  display: flex;
  gap: 14px;
  height: calc(100vh - 160px);
  align-items: stretch;
}`);

css = css.replace(/\.q3-page\s*\{[\s\S]*?\}/, `.q3-page {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 14px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}`);

fs.writeFileSync('src/style.css', css);
console.log('Updated style.css');
