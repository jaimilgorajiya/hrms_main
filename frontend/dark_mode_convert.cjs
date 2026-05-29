const fs = require('fs');
let css = fs.readFileSync('c:/IIPL/hrms/frontend/src/index.css', 'utf-8');

// 1. Replace :root
const rootRegex = /:root\s*\{[\s\S]*?\n\}/;
const newRoot = `:root {
  --primary-blue: #F59E0B;
  --primary-gradient: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  --primary-light: rgba(245, 158, 11, 0.1);
  --primary-dark: #B45309;
  
  --accent-primary: #F59E0B;
  --accent-primary-glow: rgba(245, 158, 11, 0.1);
  --accent-red: #EF4444;
  
  --bg-main: #0A0A0A;
  --bg-base: #1A1A1A;
  --bg-elevated: #111111;
  --bg-gradient: linear-gradient(180deg, #0A0A0A 0%, #111111 100%);
  
  --sidebar-width: 270px;
  --sidebar-collapsed-width: 80px;
  --header-height: 68px;
  
  --text-primary: #FFFFFF;
  --text-secondary: #D1D5DB;
  --text-muted: #9CA3AF;
  --text-dark: #FFFFFF;
  --text-main: #F3F4F6;
  --text-light: #9CA3AF;
  
  --card-bg: #1A1A1A;
  --success: #10B981;
  --success-gradient: linear-gradient(135deg, #10B981 0%, #34D399 100%);
  --danger: #EF4444;
  --danger-gradient: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
  --warning: #F59E0B;
  --warning-gradient: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
  
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.5);
  --shadow: 0 4px 6px -1px rgba(0,0,0,0.5), 0 2px 4px -2px rgba(0,0,0,0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
  
  --border: #2A2A2A;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  
  --glass-bg: rgba(26, 26, 26, 0.8);
  --glass-border: rgba(255, 255, 255, 0.1);
  --accent: #F59E0B;
  --accent-light: rgba(245, 158, 11, 0.08);
}`;
css = css.replace(rootRegex, newRoot);

// 2. Replace Sidebar hardcoded colors
css = css.replace(/background: #f8fafc;/g, 'background: var(--bg-elevated);');
css = css.replace(/border-right: 1px solid #e2e8f0;/g, 'border-right: 1px solid var(--border);');
css = css.replace(/background: #f1f5f9;/g, 'background: var(--bg-main);');
css = css.replace(/border-top: 1px solid #e2e8f0;/g, 'border-top: 1px solid var(--border);');
css = css.replace(/border-bottom: 1px solid #e2e8f0;/g, 'border-bottom: 1px solid var(--border);');

// 3. Menu items
css = css.replace(/\.menu-item \{\s*([^}]+)\s*\}/, (match, p1) => {
  return `.menu-item { ${p1.replace('color: #64748b;', 'color: var(--text-muted);')} }`;
});
css = css.replace(/\.menu-item:hover \{\s*([^}]+)\s*\}/, (match, p1) => {
  let content = p1.replace(/background: #f1f5f9;/g, 'background: var(--bg-base);').replace(/color: #1e293b;/g, 'color: var(--text-dark);');
  return `.menu-item:hover { ${content} }`;
});
css = css.replace(/\.menu-item\.active \{\s*([^}]+)\s*\}/, (match, p1) => {
  let content = p1.replace(/background: #ffffff;/g, 'background: var(--bg-base);').replace(/color: #1e293b;/g, 'color: var(--accent);');
  return `.menu-item.active { ${content} }`;
});
css = css.replace(/\.menu-item\.active::before \{\s*([^}]+)\s*\}/, (match, p1) => {
  let content = p1.replace(/background: #1e293b;/g, 'background: var(--accent);');
  return `.menu-item.active::before { ${content} }`;
});

// 4. Admin Header
css = css.replace(/background: rgba\(241, 245, 249, 0\.9\);/g, 'background: rgba(10, 10, 10, 0.9);');
css = css.replace(/border-bottom: 1px solid rgba\(226, 232, 240, 0\.6\);/g, 'border-bottom: 1px solid var(--border);');

// 5. Input search wrapper
css = css.replace(/\.search-wrapper \{\s*([^}]+)\s*\}/, (match, p1) => {
  return `.search-wrapper { ${p1.replace(/background: #F0F4F8;/g, 'background: var(--bg-base);')} }`;
});
css = css.replace(/\.search-wrapper:focus-within \{\s*([^}]+)\s*\}/, (match, p1) => {
  return `.search-wrapper:focus-within { ${p1.replace(/background: #fff;/g, 'background: var(--bg-elevated);')} }`;
});

// Write it out
fs.writeFileSync('c:/IIPL/hrms/frontend/src/index.css', css);
console.log('CSS modified');
