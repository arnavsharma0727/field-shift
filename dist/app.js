const $ = id => document.getElementById(id);
const presets = {
  virginia: {name:'Shenandoah Valley, Virginia',lat:38.45,lon:-78.87,rotation:'corn-soy',soil:'loam',water:'rainfed'},
  nevada: {name:'Fallon, Nevada',lat:39.47,lon:-118.78,rotation:'alfalfa',soil:'sandy',water:'limited'},
  iowa: {name:'Ames, Iowa',lat:42.03,lon:-93.63,rotation:'corn-soy',soil:'loam',water:'rainfed'}
};
const names = {'corn-soy':'Corn → soybean','alfalfa':'Alfalfa → alfalfa','corn-wheat':'Corn → winter wheat','wheat-fallow':'Wheat → fallow'};
const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let priority='water', climate=null, activeRequest=0;
const sourceLink='https://power.larc.nasa.gov/docs/services/api/temporal/daily/';

function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function context(){return {region:$('region').value,lat:Number($('lat').value),lon:Number($('lon').value),rotation:$('rotation').value,soil:$('soil').value,water:$('water').value,priority};}
function placeName(c){return c.region==='custom'?`${Math.abs(c.lat).toFixed(2)}°${c.lat>=0?'N':'S'}, ${Math.abs(c.lon).toFixed(2)}°${c.lon>=0?'E':'W'}`:presets[c.region].name;}
function valid(c){return Number.isFinite(c.lat)&&c.lat>=-90&&c.lat<=90&&Number.isFinite(c.lon)&&c.lon>=-180&&c.lon<=180;}
function setStatus(label,kind=''){$('status').textContent=label;$('status').className='data-badge '+kind;}
function climateSummary(data){
  const p=data?.properties?.parameter;
  if(!p?.PRECTOTCORR||!p?.T2M_MAX)throw new Error('Missing NASA POWER parameters');
  const rain=p.PRECTOTCORR,temps=p.T2M_MAX;
  const months=Array(12).fill(0), counts=Array(12).fill(0);
  const years={}; let total=0,hot=0,validDays=0;
  Object.keys(rain).sort().forEach(key=>{
    const r=Number(rain[key]), t=Number(temps[key]);
    if(!Number.isFinite(r)||r<0||r>500||!Number.isFinite(t)||t< -80||t>80)return;
    const y=key.slice(0,4),m=Number(key.slice(4,6))-1;
    if(m<0||m>11)return;
    if(!years[y])years[y]={rain:0,hot:0,maxDry:0,run:0,days:0};
    const yr=years[y]; yr.rain+=r;yr.hot+=t>=32?1:0;yr.days++;total+=r;hot+=t>=32?1:0;validDays++;
    months[m]+=r;counts[m]++;
    yr.run=r<1?yr.run+1:0;yr.maxDry=Math.max(yr.maxDry,yr.run);
  });
  const list=Object.values(years).filter(y=>y.days>=300);
  if(list.length<3)throw new Error('Insufficient complete years');
  const n=list.length;
  return {rain:Math.round(list.reduce((a,b)=>a+b.rain,0)/n),heat:Math.round(list.reduce((a,b)=>a+b.hot,0)/n),dry:Math.round(list.reduce((a,b)=>a+b.maxDry,0)/n),monthly:months.map((sum,i)=>Math.round(sum/n)),years:n,validDays};
}
function renderClimate(){
  $('rain').textContent=climate?`${climate.rain.toLocaleString()} mm`:'—';
  $('heat').textContent=climate?`${climate.heat} days`:'—';
  $('dry').textContent=climate?`${climate.dry} days`:'—';
  const chart=$('chart');chart.replaceChildren();
  if(climate){
    const max=Math.max(...climate.monthly,1);
    climate.monthly.forEach((v,i)=>{
      const col=document.createElement('div');col.className='bar-col';
      col.title=`${monthNames[i]}: ${v} mm`;
      const bar=document.createElement('div');bar.className='bar'+(v<max*.5?' hot':'');bar.style.height=`${Math.max(4,v/max*100)}%`;
      const name=document.createElement('span');name.textContent=monthNames[i];col.append(bar,name);chart.append(col);
    });
    chart.setAttribute('aria-label',`Mean monthly rainfall in millimeters: ${climate.monthly.map((v,i)=>monthNames[i]+' '+v).join(', ')}`);
    const wet=climate.monthly.indexOf(Math.max(...climate.monthly));
    let observation=`Rainfall peaks around ${monthNames[wet]}. The historical record averages ${climate.heat} days above 32°C and a longest annual dry spell of ${climate.dry} days.`;
    if(climate.rain<400)observation+=' Water availability deserves particular attention before adding a thirsty crop.';
    else if(climate.heat>=30)observation+=' Consider heat and moisture stress when timing a new crop.';
    else observation+=' Compare the calendar of each proposed crop with local planting windows.';
    $('insight-copy').textContent=observation;
  }else{
    chart.setAttribute('aria-label','Rainfall chart waiting for NASA data');
    $('insight-copy').textContent='Rotation ideas are available below. Climate-specific evidence appears when NASA POWER data loads.';
  }
}
function makeStrategies(c){
  const dryPlace=climate?.rain<500 || c.region==='nevada';
  const drought=climate?.dry>=25;
  const current={id:'current',title:'Keep the current rotation',sequence:names[c.rotation],water:2,soil:1,income:3,
    reason:'Preserve a familiar system while tracking where the field is exposed between crops.',
    benefit:'Known equipment, labor needs, and market channels.',
    risk:'Existing bare-soil periods and water demand may persist. Check field records for the actual gap.'};
  let cover,alternative;
  if(c.rotation==='alfalfa'){
    cover={id:'cover',title:'Add a cool-season cover phase',sequence:'Alfalfa → cereal rye → spring crop',water:2,soil:4,income:1,
      reason:'A cover phase may protect soil after stand termination and before the next cash crop.',
      benefit:'Potential ground cover and organic matter contribution.',
      risk:'Termination timing, seed cost, and water use need local review; rye can compete for scarce moisture.'};
    alternative={id:'alternative',title:'Trial a lower-water annual',sequence:'Alfalfa → sorghum-sudangrass → winter cover',water:4,soil:3,income:2,
      reason:'A short trial may reveal whether a summer forage option fits water limits better than continuing the same stand.',
      benefit:'Potential forage diversity and a break in crop sequence.',
      risk:'Forage markets, irrigation allotments, establishment, and livestock safety require local validation.'};
  }else if(c.rotation==='wheat-fallow'){
    cover={id:'cover',title:'Cover a portion of fallow',sequence:'Wheat → short-season cover → wheat',water:1,soil:4,income:1,
      reason:'A limited cover-crop trial can test erosion control without changing the whole farm.',
      benefit:'Potential soil cover and residue in a bare period.',
      risk:'Cover crops can deplete stored soil water; test a small area and measure moisture before planting wheat.'};
    alternative={id:'alternative',title:'Trial a pulse crop',sequence:'Wheat → chickpea or lentil → wheat',water:3,soil:3,income:3,
      reason:'A pulse may diversify the sequence and add a marketable crop where the growing season allows.',
      benefit:'Potential nitrogen contribution and a different pest cycle.',
      risk:'Market access, disease pressure, water budget, and planting windows vary locally.'};
  }else{
    cover={id:'cover',title:'Keep cash crops, add a cover',sequence:`${names[c.rotation]} → cereal rye cover`,water:2,soil:4,income:2,
      reason:'Use the interval after harvest to protect soil without replacing the main cash crop sequence.',
      benefit:'Potential erosion reduction, residue, and organic matter input.',
      risk:'Seed and termination costs, spring moisture competition, and planting delays need field review.'};
    alternative={id:'alternative',title:'Add a small-grain phase',sequence:'Corn → winter wheat → clover → soybean',water:3,soil:4,income:3,
      reason:'A small-grain phase can lengthen the rotation and create a window for a legume cover. Sequence matters: NASA Harvest-supported research found poorer outcomes for winter wheat planted directly after soybean in its study regions.',
      benefit:'Potential pest-cycle disruption, ground cover, and another marketable crop.',
      risk:'Check grain buyer access, equipment, planting dates, and the fit of clover with herbicide history. Research findings do not estimate yields for this field.'};
  }
  const all=[current,cover,alternative];
  all.forEach(s=>{
    let fit=s[c.priority];
    if(c.priority==='water'&&c.water==='rainfed'&&s.id==='cover'&&drought)fit-=1;
    if(c.priority==='water'&&dryPlace&&s.id==='alternative')fit=Math.min(5,fit+1);
    if(c.priority==='soil'&&c.soil==='sandy'&&s.id==='cover')fit=Math.min(5,fit+1);
    s.fit=Math.max(1,Math.min(5,fit));
  });
  const best=[...all].sort((a,b)=>b.fit-a.fit || (a.id==='current'?1:-1))[0];
  best.best=true;
  return all;
}
function renderStrategies(c){
  const list=makeStrategies(c), evidence=climate?`NASA POWER: ${climate.rain.toLocaleString()} mm mean annual rain; ${climate.heat} hot days/year; ${climate.dry}-day mean annual longest dry spell.`:'NASA POWER climate history is pending; evaluate this idea with local records.';
  $('strategies').innerHTML=list.map(s=>`<article class="card strategy ${s.best?'best':''}"><div class="strategy-top"><span class="tag ${s.best?'recommended':''}">${s.id==='current'?'Current practice':s.best?'Best fit for selected priority':'Alternative pathway'}</span><span class="score">Fit ${s.fit}/5</span></div><h4>${escapeHTML(s.title)}</h4><div class="sequence">${escapeHTML(s.sequence)}</div><p class="reason">${escapeHTML(s.reason)}</p><div class="divider"></div><p class="detail"><b>Possible benefit</b><br>${escapeHTML(s.benefit)}</p><p class="detail"><b>Evidence to review</b><br>${escapeHTML(evidence)}</p><div class="risk"><b>Check locally</b> · ${escapeHTML(s.risk)}</div></article>`).join('');
  return list;
}
function render(c){$('place').textContent=placeName(c);$('period').textContent=`2021–2025 climate history · ${Math.abs(c.lat).toFixed(2)}°${c.lat>=0?'N':'S'}, ${Math.abs(c.lon).toFixed(2)}°${c.lon>=0?'E':'W'}`;renderClimate();renderStrategies(c);}
async function explore(){
  const c=context();if(!valid(c)){setStatus('Check coordinates','error');$('data-notice').textContent='Enter a latitude between −90 and 90 and a longitude between −180 and 180.';return;}
  const request=++activeRequest;climate=null;render(c);setStatus('Loading NASA data…');$('run').disabled=true;
  $('data-notice').textContent='NASA POWER provides climate history for an area around the selected point, not a field measurement. Strategy fit scores are exploratory rules, not predicted yields.';
  const key=`fieldshift:power:v1:${c.lat.toFixed(2)}:${c.lon.toFixed(2)}`;
  try{
    const cached=JSON.parse(localStorage.getItem(key)||'null');let raw;
    if(cached&&Date.now()-cached.time<86400000)raw=cached.data;
    else{
      const params=new URLSearchParams({parameters:'PRECTOTCORR,T2M_MAX',community:'AG',longitude:String(c.lon),latitude:String(c.lat),start:'20210101',end:'20251231',format:'JSON'});
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
      try{const response=await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`,{signal:controller.signal});if(!response.ok)throw new Error(`NASA API returned ${response.status}`);raw=await response.json();}finally{clearTimeout(timer);}
      try{localStorage.setItem(key,JSON.stringify({time:Date.now(),data:raw}));}catch(e){}
    }
    const summary=climateSummary(raw);if(request!==activeRequest)return;
    climate=summary;render(c);setStatus(cached?'NASA data · cached':'NASA data · live','live');
    $('data-notice').textContent=`Based on ${summary.years} complete years of NASA POWER daily data. These area-scale climate indicators do not measure soil health, crop yield, or weather at an individual field.`;
  }catch(err){if(request!==activeRequest)return;climate=null;render(c);setStatus('NASA data unavailable','error');$('data-notice').textContent='NASA POWER could not be reached. Rotation pathways remain illustrative; climate indicators are hidden until a successful load. Try again later.';}
  finally{if(request===activeRequest)$('run').disabled=false;}
}
function exportSummary(){
  const c=context(),list=makeStrategies(c),lines=[`FIELD SHIFT — ROTATION EXPLORER`,`Location: ${placeName(c)} (${c.lat}, ${c.lon})`,`Current rotation: ${names[c.rotation]}`,`Soil texture (farmer input): ${c.soil}`,`Water access: ${c.water}`,`Priority: ${c.priority}`,`Climate history: NASA POWER daily, 2021–2025`,climate?`Annual rainfall: ${climate.rain} mm; hot days >=32°C/year: ${climate.heat}; mean longest annual dry spell: ${climate.dry} days`:'NASA climate data unavailable at time of export','',...list.flatMap(s=>[`${s.title} — fit ${s.fit}/5`,s.sequence,`Why explore: ${s.reason}`,`Potential benefit: ${s.benefit}`,`Local checks: ${s.risk}`,'']),`These are illustrative comparisons, not field-validated agronomic recommendations or yield forecasts. Consult local extension expertise.`,`Source: ${sourceLink}`];
  const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='field-shift-rotation-summary.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('region').addEventListener('change',()=>{const p=presets[$('region').value];if(p){$('lat').value=p.lat;$('lon').value=p.lon;$('rotation').value=p.rotation;$('soil').value=p.soil;$('water').value=p.water;}explore();});
['lat','lon'].forEach(id=>$(id).addEventListener('input',()=>{$('region').value='custom';}));
['rotation','soil','water'].forEach(id=>$(id).addEventListener('change',()=>{const c=context();if(valid(c))render(c);}));
document.querySelectorAll('[data-priority]').forEach(button=>button.addEventListener('click',()=>{priority=button.dataset.priority;document.querySelectorAll('[data-priority]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button?'true':'false')});const c=context();if(valid(c))renderStrategies(c);}));
$('run').addEventListener('click',explore);$('download').addEventListener('click',exportSummary);
explore();
