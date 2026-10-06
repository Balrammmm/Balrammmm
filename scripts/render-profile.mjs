import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=path.join(root,'assets');
const owner='Balrammmm';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const display=(await fs.readFile(path.join(assets,'display.woff2'))).toString('base64');
const body=(await fs.readFile(path.join(assets,'body.woff2'))).toString('base64');
const mono="'SFMono-Regular',Consolas,'Liberation Mono',monospace";
const themes={dark:{bg:'#101216',panel:'#14171c',ink:'#f0ede6',muted:'#a8aeb8',gold:'#d5b992',line:'#343a43',green:['#20262e','#153e30','#236b49','#37a36b','#77d5a1']},light:{bg:'#f5f4f0',panel:'#eeece6',ink:'#22252b',muted:'#545c68',gold:'#795c34',line:'#cacbd0',green:['#e1e4df','#c0dec9','#76b790','#3b8a5c','#165d36']}};
function svg(width,height,title,description,inside,theme,extra='') {
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">${escape(title)}</title><desc id="description">${escape(description)}</desc><style>@font-face{font-family:Display;src:url(data:font/woff2;base64,${display}) format('woff2')}@font-face{font-family:Body;src:url(data:font/woff2;base64,${body}) format('woff2')}text{font-family:Body,Arial,sans-serif;fill:${theme.ink}}.mono{font-family:${mono}}.muted{fill:${theme.muted}}.gold{fill:${theme.gold}}.arrive{animation:arrive .55s cubic-bezier(.23,1,.32,1) both}@keyframes arrive{from{opacity:.85;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.arrive,.print,.cell{animation:none!important;opacity:1!important;clip-path:none!important;transform:none!important}.scan{display:none}}${extra}</style><rect width="${width}" height="${height}" rx="12" fill="${theme.bg}"/>${inside}</svg>\n`;
}
async function write(name,value){await fs.writeFile(path.join(assets,name),value);}
function attributes(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));}
function parseCalendar(html) {
 const tips=new Map([...html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)].map(match=>{const attr=attributes(match[1]);const text=match[2].replace(/<[^>]+>/g,'').trim();return [attr.for,Number(text.match(/^([\d,]+) contribution/)?.[1]?.replaceAll(',','') || 0)];}));
 return [...html.matchAll(/<td\b[^>]*data-date="[^"]+"[^>]*>/g)].map(match=>{const attr=attributes(match[0]);const count=attr['data-count']!==undefined?Number(attr['data-count']):tips.get(attr.id);if(count===undefined || !Number.isFinite(count)) throw new Error(`Missing contribution count for ${attr['data-date']}`);return {date:attr['data-date'],count,level:Number(attr['data-level'] || 0)};});
}
async function refresh() {
 const end=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const startDate=new Date(`${end}T00:00:00Z`);startDate.setUTCDate(startDate.getUTCDate()-364);
 const start=startDate.toISOString().slice(0,10);
 const years=[...new Set([start.slice(0,4),end.slice(0,4)])];
 const parts=await Promise.all(years.map(async year=>{const response=await fetch(`https://github.com/users/${owner}/contributions?from=${year}-01-01&to=${year}-12-31`,{headers:{'User-Agent':'Balrammmm-profile-art','Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(`Contribution fetch failed: ${response.status}`);return parseCalendar(await response.text());}));
 const merged=new Map(parts.flat().map(day=>[day.date,day]));
 const days=[];
 for(let day=new Date(`${start}T00:00:00Z`);day<=new Date(`${end}T00:00:00Z`);day.setUTCDate(day.getUTCDate()+1)){const key=day.toISOString().slice(0,10);if(!merged.has(key))throw new Error(`Calendar is missing ${key}`);days.push(merged.get(key));}
 const data={username:owner,start,end,days,total:days.reduce((sum,day)=>sum+day.count,0)};
 await fs.writeFile(path.join(root,'data/contributions.json'),JSON.stringify(data,null,2)+'\n');
 return data;
}
const data=process.argv.includes('--refresh')?await refresh():JSON.parse(await fs.readFile(path.join(root,'data/contributions.json'),'utf8'));
const portrait=JSON.parse(await fs.readFile(path.join(root,'data/portrait-grid.json'),'utf8'));
for(const [mode,t] of Object.entries(themes)) {
 const suffix=mode==='dark'?'':'-light';
 const hero=`<path d="M34 26h22m-11-11v22" stroke="${t.gold}" stroke-width="1.5"/><text class="mono muted" x="74" y="31" font-size="12">balram@github:~ $ build --across-disciplines</text><g class="arrive"><text x="32" y="139" font-family="Display,Impact,sans-serif" style="font-family:Display,Impact,sans-serif" font-size="91" letter-spacing="-.6">BALRAM MAURYA</text><text class="mono gold" x="35" y="184" font-size="15" letter-spacing="1.3">AI PRODUCTS / DATA / HARDWARE</text></g><path d="M33 204H867" stroke="${t.line}"/><text class="mono muted" x="866" y="183" text-anchor="end" font-size="12">ECE @ THAPAR · 2027</text>`;
 await write(`header${suffix}.svg`,svg(900,230,'Balram Maurya — AI products, data and hardware','Electronics and Communication Engineering student at Thapar. Expected graduation in 2027.',hero,t));
 let rows='';
 portrait.lines.forEach((line,i)=>{rows+=`<text class="mono" xml:space="preserve" x="23" y="${66+i*6.7}" font-size="8.4" textLength="334" lengthAdjust="spacingAndGlyphs">${escape(line)}</text>`;});
 const scan=`<rect class="scan" x="23" y="54" width="334" height="1.5" fill="${t.gold}" opacity=".5"><animate attributeName="y" values="54;380" dur="1.6s" repeatCount="1" fill="freeze"/><animate attributeName="opacity" values=".5;.5;0" keyTimes="0;.96;1" dur="1.6s" repeatCount="1" fill="freeze"/></rect>`;
 const portraitInside=`<text class="mono muted" x="22" y="28" font-size="11">$ portrait --ascii</text><path d="M22 41H358" stroke="${t.line}"/>${rows}${scan}<path d="M22 397H358" stroke="${t.line}"/><text class="mono gold" x="22" y="420" font-size="11">same curiosity. different angles.</text>`;
 await write(`portrait${suffix}.svg`,svg(380,440,'Animated ASCII portrait of Balram Maurya','The supplied portfolio photograph converted into a monochrome character portrait. A single scan line traverses it while the portrait stays visible.',portraitInside,t));
 const items=[['BUILD','AI products, analytics & hardware'],['STUDY','Electronics & Communication'],['COLLEGE','Thapar Institute · Class of 2027'],['SOFTWARE','Next.js · TypeScript · Python'],['HARDWARE','ESP32 · sensors · audio · motors'],['BASE','Patiala, India']];
 const lines=items.map(([label,value],i)=>`<g class="arrive" style="animation-delay:${.1+i*.065}s"><text class="mono gold" x="30" y="${144+i*39}" font-size="11">${label}</text><text x="138" y="${144+i*39}" font-size="15">${escape(value)}</text></g>`).join('');
 const identity=`<text class="mono muted" x="30" y="28" font-size="11">$ whoami</text><path d="M30 41H486" stroke="${t.line}"/><text x="29" y="91" font-size="31" font-weight="650">Beyond one discipline.</text>${lines}<path d="M30 397H486" stroke="${t.line}"/><text class="mono muted" x="30" y="420" font-size="11">software. machines. decisions.</text>`;
 await write(`identity${suffix}.svg`,svg(520,440,'Balram Maurya — identity and technical interests','Build: AI products, analytics and hardware. Study: ECE at Thapar, expected graduation 2027. Software: Next.js, TypeScript and Python. Hardware: ESP32, sensors, audio and motors. Based in Patiala, India.',identity,t));
 const printStyle='';
 const aboutDescription='Animated ASCII portrait of Balram Maurya beside his background: ECE at Thapar, class of 2027; AI products, analytics and hardware; Next.js, TypeScript, Python and ESP32; Patiala, India.';
 await write(`about-desktop${suffix}.svg`,svg(900,440,'Balram Maurya — portrait and background',aboutDescription,portraitInside+`<path d="M380 25V415" stroke="${t.line}"/><g transform="translate(380 0)">${identity}</g>`,t,printStyle));
 const mobileFacts=[['BUILD','AI products, data & hardware'],['STUDY','ECE @ Thapar · Class of 2027'],['SOFTWARE','Next.js · TypeScript · Python'],['HARDWARE','ESP32 · sensors · audio · motors']];
 const mobileLines=mobileFacts.map(([label,value],i)=>`<text class="mono gold" x="29" y="${550+i*74}" font-size="15">${label}</text><text x="29" y="${581+i*74}" font-size="23">${escape(value)}</text>`).join('');
 const mobileAbout=`<g transform="translate(70 0)">${portraitInside}</g><path d="M28 459H492" stroke="${t.line}"/><text x="28" y="506" font-size="32" font-weight="650">Beyond one discipline.</text>${mobileLines}<text class="mono muted" x="29" y="866" font-size="18">Patiala, India.</text>`;
 await write(`about-phone${suffix}.svg`,svg(520,900,'Balram Maurya — portrait and background',aboutDescription,mobileAbout,t,printStyle));
 const startDate=new Date(`${data.start}T00:00:00Z`);
 const gridStart=new Date(startDate);gridStart.setUTCDate(gridStart.getUTCDate()-gridStart.getUTCDay());
 let grid='';let previousMonth='';
 const cellSize=11,step=15;
 for(const day of data.days) {
  const date=new Date(`${day.date}T00:00:00Z`);
  const offset=Math.round((date-gridStart)/86400000),column=Math.floor(offset/7),row=date.getUTCDay();
  const month=day.date.slice(0,7);
  if(month!==previousMonth){const label=date.toLocaleString('en-US',{month:'short',timeZone:'UTC'});grid+=`<text class="mono muted" x="${68+column*step}" y="65" font-size="10">${label}</text>`;previousMonth=month;}
  grid+=`<rect class="cell" x="${68+column*step}" y="${80+row*step}" width="${cellSize}" height="${cellSize}" rx="2" fill="${t.green[Math.min(4,day.level)]}" style="animation-delay:${(column*.012+row*.008).toFixed(3)}s"><title>${escape(`${day.date}: ${day.count} contributions`)}</title></rect>`;
 }
 const legend=t.green.map((color,i)=>`<rect x="${773+i*15}" y="205" width="11" height="11" rx="2" fill="${color}"/>`).join('');
  const calendar=`<text class="mono" x="30" y="30" font-size="13">$ activity --last-year</text><text class="mono muted" x="865" y="30" text-anchor="end" font-size="11">${data.end}</text><path d="M30 42H870" stroke="${t.line}"/><text class="mono muted" x="28" y="104" font-size="10">Mon</text><text class="mono muted" x="28" y="134" font-size="10">Wed</text><text class="mono muted" x="28" y="164" font-size="10">Fri</text>${grid}<text class="mono muted" x="30" y="215" font-size="11">${data.total.toLocaleString('en-US')} GitHub contributions · ${escape(data.start)} — ${escape(data.end)}</text><text class="mono muted" x="744" y="214" font-size="10">Less</text>${legend}<text class="mono muted" x="858" y="214" font-size="10">More</text>`;
 await write(`contributions${suffix}.svg`,svg(900,240,'Balrammmm — GitHub contribution calendar',`Public GitHub calendar for ${data.start} through ${data.end}. ${data.total} recorded contributions. This represents activity, not a measure of project quality.`,calendar,t,'.cell{animation:arrive .4s cubic-bezier(.23,1,.32,1) both}'));
}
console.log(JSON.stringify({username:owner,days:data.days.length,total:data.total,start:data.start,end:data.end,assets:12}));
