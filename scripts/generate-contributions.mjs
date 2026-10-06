import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const owner='Balrammmm';
const attr=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function parse(html){
 const tips=new Map([...html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)].map(m=>[attr(m[1]).for,Number(m[2].replace(/<[^>]+>/g,'').trim().match(/^([\d,]+) contribution/)?.[1]?.replaceAll(',','')||0)]));
 return [...html.matchAll(/<td\b[^>]*data-date="[^"]+"[^>]*>/g)].map(m=>{const a=attr(m[0]),count=a['data-count']!==undefined?Number(a['data-count']):tips.get(a.id);if(!Number.isFinite(count))throw new Error(`Missing count for ${a['data-date']}`);return {date:a['data-date'],count,level:Number(a['data-level']||0)};});
}
async function fetchCalendar(){
 const end=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const first=new Date(`${end}T00:00:00Z`);first.setUTCDate(first.getUTCDate()-364);const start=first.toISOString().slice(0,10);
 const years=[...new Set([start.slice(0,4),end.slice(0,4)])];
 const calendars=await Promise.all(years.map(async year=>{const r=await fetch(`https://github.com/users/${owner}/contributions?from=${year}-01-01&to=${year}-12-31&v=${Date.now()}`,{headers:{'User-Agent':'Balrammmm-profile-calendar'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`Calendar request failed (${r.status})`);return parse(await r.text());}));
 const byDate=new Map(calendars.flat().map(day=>[day.date,day]));const days=[];
 for(let day=new Date(first);day<=new Date(`${end}T00:00:00Z`);day.setUTCDate(day.getUTCDate()+1)){const date=day.toISOString().slice(0,10);if(!byDate.has(date))throw new Error(`Missing date ${date}`);days.push(byDate.get(date));}
 return {username:owner,start,end,total:days.reduce((sum,day)=>sum+day.count,0),days};
}
const data=process.argv.includes('--offline')?JSON.parse(await fs.readFile(path.join(root,'data/contributions.json'),'utf8')):await fetchCalendar();
if(data.days.length!==365||new Set(data.days.map(day=>day.date)).size!==365||data.days.some(day=>day.date>data.end))throw new Error('Invalid calendar coverage');
await fs.writeFile(path.join(root,'data/contributions.json'),JSON.stringify(data,null,2)+'\n');
const palette=['#161b22','#0e4429','#006d32','#238636','#39d353'];
for(const mobile of [false,true]){
 const width=mobile?480:860,height=mobile?164:208,left=mobile?35:48,step=mobile?7.8:14.7,cell=mobile?6:11.5,rowStep=mobile?10:15.5,top=mobile?48:55;
 const origin=new Date(`${data.start}T00:00:00Z`);origin.setUTCDate(origin.getUTCDate()-origin.getUTCDay());
 const weeks=new Map();let months='',lastMonth='',monthIndex=0;
 for(const day of data.days){const date=new Date(`${day.date}T00:00:00Z`),offset=Math.round((date-origin)/86400000),column=Math.floor(offset/7),row=date.getUTCDay();if(!weeks.has(column))weeks.set(column,[]);weeks.get(column).push(`<rect x="${(left+column*step).toFixed(1)}" y="${top+row*rowStep}" width="${cell}" height="${cell}" rx="1.7" fill="${palette[Math.min(day.level,4)]}"><title>${day.date}: ${day.count} contributions</title></rect>`);if(day.date.slice(0,7)!==lastMonth){if(!mobile||monthIndex%2===0)months+=`<text x="${(left+column*step).toFixed(1)}" y="${top-12}" font-size="${mobile?12:13}" fill="#8b949e">${date.toLocaleString('en-US',{month:'short',timeZone:'UTC'})}</text>`;lastMonth=day.date.slice(0,7);monthIndex++;}}
 const marks=[['Mon',1],['Wed',3],['Fri',5]].map(([name,row])=>`<text x="${mobile?3:5}" y="${top+row*rowStep+cell-1}" font-size="${mobile?10:11}" fill="#8b949e">${name}</text>`).join('');
 const squares=[...weeks].map(([column,items])=>`<g class="week" style="animation-delay:${(column*.018).toFixed(3)}s">${items.join('')}</g>`).join('');
 const footer=height-15;
 const legend=palette.map((color,i)=>`<rect x="${width-104+i*13}" y="${footer-10}" width="9" height="9" rx="1.5" fill="${color}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">GitHub activity for Balrammmm</title><desc id="description">GitHub-reported contribution data from ${data.start} to ${data.end}: ${data.total} contributions. Includes anonymous private contributions where enabled.</desc><style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}.week{animation:arrive .28s cubic-bezier(.23,1,.32,1) both}@keyframes arrive{from{opacity:.72;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.week{animation:none;transform:none;opacity:1}}</style><rect width="${width}" height="${height}" rx="8" fill="#0d1117"/><text x="${left}" y="19" font-size="${mobile?11:12}" fill="#8b949e">${data.start} — ${data.end}</text>${months}${marks}${squares}<text x="${left}" y="${footer}" font-size="${mobile?13:15}" fill="#c9d1d9">${data.total.toLocaleString('en-US')} GitHub-reported contributions</text>${legend}<text x="${width-33}" y="${footer}" font-size="11" fill="#8b949e">More</text></svg>\n`;
 await fs.writeFile(path.join(root,'assets',mobile?'contribution-graph-mobile.svg':'contribution-graph.svg'),svg);
}
console.log(JSON.stringify({source:'GitHub public contribution calendar',days:data.days.length,total:data.total,start:data.start,end:data.end}));
