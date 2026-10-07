import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await fs.readFile(path.join(root,'data/contributions.json'),'utf8'));
const cache=path.join(root,'data/public-languages.json');
const headers={Accept:'application/vnd.github+json','User-Agent':'Balrammmm-profile-snapshot'};
let languages;
if(!process.argv.includes('--offline')){
 try{
  const response=await fetch('https://api.github.com/users/Balrammmm/repos?type=owner&per_page=100',{headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Public repository query failed (${response.status})`);
  const repos=(await response.json()).filter(repo=>!repo.fork&&!repo.private&&repo.name.toLowerCase()!=='balrammmm');
  const sets=await Promise.all(repos.map(async repo=>{const r=await fetch(repo.languages_url,{headers,signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`Language query failed (${r.status})`);return r.json();}));
  const bytes={};for(const set of sets)for(const [name,size]of Object.entries(set))bytes[name]=(bytes[name]||0)+size;
  languages={source:'GitHub public project language bytes',projectCount:repos.length,bytes,updated:data.end};
  await fs.writeFile(cache,JSON.stringify(languages,null,2)+'\n');
 }catch(error){console.error('Language refresh unavailable; keeping previously verified language data.');}
}
if(!languages){try{languages=JSON.parse(await fs.readFile(cache,'utf8'));}catch{languages={projectCount:0,bytes:{},updated:null};}}
let longest=0,run=0;for(const day of data.days){run=day.count>0?run+1:0;longest=Math.max(longest,run);}
let index=data.days.length-1;if(data.days[index].count===0)index--;let current=0;for(;index>=0&&data.days[index].count>0;index--)current++;
const active=data.days.filter(day=>day.count>0).length;
const entries=Object.entries(languages.bytes).sort((a,b)=>b[1]-a[1]);
const sum=entries.reduce((total,[,size])=>total+size,0);
const colors={TypeScript:'#3178c6',JavaScript:'#d9c45b',CSS:'#8870b8',HTML:'#df6a4b',Python:'#4d8bbf'};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const mix=entries.slice(0,4).map(([name,size])=>({name,size,pct:sum?size/sum*100:0,color:colors[name]||'#8b949e'}));
for(const mobile of [false,true]){
 const width=mobile?480:860,height=mobile?370+Math.max(0,mix.length-3)*23:214,languageX=mobile?28:505,languageY=mobile?215:51,barWidth=mobile?424:327;
 const radius=mobile?31:30,cx=mobile?240:230,cy=mobile?102:106,circ=2*Math.PI*radius,offset=longest?circ*(1-current/longest):circ;
 const statY=mobile?108:111;
 const left=mobile?81:89,right=mobile?399:379;
 let x=languageX;
 const segments=mix.map(item=>{const w=barWidth*item.pct/100;const svg=`<rect x="${x.toFixed(2)}" y="${languageY+22}" width="${w.toFixed(2)}" height="8" fill="${item.color}"/>`;x+=w;return svg;}).join('');
 const legends=mix.map((item,i)=>`<circle cx="${languageX+5}" cy="${languageY+53+i*23}" r="4" fill="${item.color}"/><text x="${languageX+16}" y="${languageY+57+i*23}" font-size="${mobile?18:13}">${esc(item.name)} <tspan fill="#8b949e">${item.pct.toFixed(1)}%</tspan></text>`).join('');
 const missing=mix.length?'':`<text x="${languageX}" y="${languageY+55}" font-size="13" fill="#8b949e">Language data unavailable</text>`;
 const stats=`<text x="${left}" y="${statY}" text-anchor="middle" class="number">${data.total.toLocaleString('en-US')}</text><text x="${left}" y="${statY+30}" text-anchor="middle" class="label">Contributions</text><text x="${left}" y="${statY+49}" text-anchor="middle" class="detail">last 365 days</text><circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#21262d" stroke-width="3"/><circle class="ring" cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#3fb950" stroke-width="3" stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/><text x="${cx}" y="${cy+9}" text-anchor="middle" class="number">${current}</text><text x="${cx}" y="${cy+60}" text-anchor="middle" class="label">Current streak</text><text x="${right}" y="${statY}" text-anchor="middle" class="number">${longest}</text><text x="${right}" y="${statY+30}" text-anchor="middle" class="label">Longest streak</text><text x="${right}" y="${statY+49}" text-anchor="middle" class="detail">in this year window</text>`;
 const divider=mobile?`<path d="M28 184H452" stroke="#21262d"/>`:`<path d="M475 42V185" stroke="#21262d"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">GitHub activity and public project code</title><desc id="description">${data.total} GitHub-reported contributions and ${active} active days in the last 365 days. Current streak ${current} days. Longest streak in this window ${longest} days. Language percentages measure bytes in ${languages.projectCount} public project repositories, not expertise.</desc><style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:#c9d1d9}.number{font-family:Consolas,'Liberation Mono',monospace;font-size:30px;font-weight:600;fill:#7ee787}.label{font-size:${mobile?18:12}px}.detail{font-size:${mobile?14:10}px;fill:#8b949e}.bar{transform-box:fill-box;transform-origin:left center;animation:grow .7s cubic-bezier(.23,1,.32,1) both}.ring{animation:show .7s ease-out both}@keyframes grow{from{transform:scaleX(.05)}to{transform:scaleX(1)}}@keyframes show{from{opacity:.25}to{opacity:1}}@media(prefers-reduced-motion:reduce){.bar,.ring{animation:none;transform:none;opacity:1}}</style><rect x=".5" y=".5" width="${width-1}" height="${height-1}" rx="8" fill="#0d1117" stroke="#30363d"/><text x="28" y="26" font-size="${mobile?16:12}" fill="#8b949e">GitHub snapshot · ${data.end}</text>${stats}${divider}<text x="${languageX}" y="${languageY}" font-size="${mobile?20:16}" font-weight="600">Public project code</text><g class="bar">${segments}</g>${legends}${missing}<text x="${languageX}" y="${height-17}" class="detail">Repository bytes · ${languages.projectCount} public project${languages.projectCount===1?'':'s'}</text></svg>\n`;
 await fs.writeFile(path.join(root,'assets',mobile?'snapshot-mobile.svg':'snapshot.svg'),svg);
}
console.log(JSON.stringify({total:data.total,currentStreak:current,longestStreak:longest,activeDays:active,publicProjects:languages.projectCount,languages:mix}));
