import {summarizePower,assessPathways,evidencePacket} from './analytics.js';

const $=id=>document.getElementById(id);
const presets={
  virginia:{name:'Shenandoah Valley, Virginia',lat:38.45,lon:-78.87,rotation:'corn-soy',soil:'unknown',water:'rainfed'},
  nevada:{name:'Fallon, Nevada',lat:39.47,lon:-118.78,rotation:'alfalfa',soil:'unknown',water:'limited'},
  iowa:{name:'Ames, Iowa',lat:42.03,lon:-93.63,rotation:'corn-soy',soil:'unknown',water:'rainfed'}
};
let record=null,requestId=0;
const fmt=n=>Math.round(n).toLocaleString();
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inputs(){return {region:$('region').value,lat:Number($('lat').value),lon:Number($('lon').value),rotation:$('rotation').value,soil:$('soil').value,water:$('water').value,bareMonths:Number($('bare').value),soilTest:$('soil-test').checked,calendar:$('calendar').checked,rainReduction:Number($('rain-adjust').value)};}
function valid(c){return Number.isFinite(c.lat)&&c.lat>=-90&&c.lat<=90&&Number.isFinite(c.lon)&&c.lon>=-180&&c.lon<=180&&Number.isInteger(c.bareMonths)&&c.bareMonths>=0&&c.bareMonths<=12;}
function place(c){return c.region==='custom'?`${Math.abs(c.lat).toFixed(2)}°${c.lat>=0?'N':'S'}, ${Math.abs(c.lon).toFixed(2)}°${c.lon>=0?'E':'W'}`:presets[c.region].name;}
function status(label,kind=''){$('status').textContent=label;$('status').className='badge '+kind;}
function renderChart(){
  const chart=$('year-chart');chart.replaceChildren();
  if(!record){chart.setAttribute('aria-label','Historical rainfall chart waiting for NASA data');return;}
  const max=Math.max(...record.years.map(y=>y.seasonRain),1);
  record.years.forEach(y=>{
    const col=document.createElement('div');col.className='year-bar'+(y.year===record.driest.year?' worst':'');
    col.title=`${y.year}: ${y.seasonRain} mm of growing-season rain${y.year===record.driest.year?' · driest analog':''}`;
    const bar=document.createElement('i');bar.style.height=`${Math.max(4,y.seasonRain/max*100)}%`;
    const label=document.createElement('span');label.textContent=String(y.year).slice(2);
    col.append(bar,label);chart.append(col);
  });
  chart.setAttribute('aria-label',`Growing-season rain by year in millimeters: ${record.years.map(y=>y.year+' '+y.seasonRain).join(', ')}. Driest year ${record.driest.year}.`);
}
function render(){
  const c=inputs();$('rain-value').textContent=`−${c.rainReduction}%`;
  $('place').textContent=place(c);
  $('period').textContent=record?`${record.period} · ${record.seasonLabel} growing-season window`:'2016–2025 · growing-season window';
  $('median-rain').textContent=record?`${fmt(record.medianSeasonRain)} mm`:'—';
  $('analog-year').textContent=record?record.driest.year:'—';
  $('analog-rain').textContent=record?`${fmt(record.driest.seasonRain*(1-c.rainReduction/100))} mm`:'—';
  $('analog-explain').textContent=c.rainReduction?'Adjusted from observed analog · not a forecast':'Observed driest growing season';
  $('root-wet').textContent=record?record.driest.rootWetness.toFixed(2):'—';
  $('chart-sub').textContent=record?`${record.seasonLabel} rain · mm · driest year in rust`:'Growing-season rain by year · NASA POWER';
  renderChart();
  if(record){
    const ratio=record.driest.seasonRain/Math.max(record.medianSeasonRain,1);
    $('analog-percent').textContent=`${Math.round((1-ratio)*100)}% less rain`;
    $('analog-copy').textContent=`In ${record.driest.year}, growing-season rainfall was ${record.driest.seasonRain} mm versus a ${record.medianSeasonRain} mm median. This is an observed year, selected by rainfall only.`;
    const wetDelta=Math.round((record.driest.rootWetness/Math.max(record.medianRootWetness,.001)-1)*100);
    $('water-signal').innerHTML=`<b>Independent water check</b><br>Modeled root-zone wetness was ${Math.abs(wetDelta)}% ${wetDelta<0?'below':'above'} the historical median (${record.medianRootWetness.toFixed(2)}). Evapotranspiration energy flux averaged ${record.driest.etFlux.toFixed(2)} MJ/m²/day in this growing season.`;
  }else{
    $('analog-percent').textContent='—';$('analog-copy').textContent='Loading the record. The app selects the driest observed growing season and compares it with the median.';
    $('water-signal').textContent='Root-zone wetness and evapotranspiration energy are checked separately from rainfall.';
  }
  const paths=assessPathways(record,c);
  $('pathways').innerHTML=paths.map((s,i)=>`<article class="card path"><div class="number">0${i+1} / ${i?'CHANGE HYPOTHESIS':'BASELINE'}</div><h4>${escapeHTML(s.title)}</h4><div class="sequence">${escapeHTML(s.sequence)}</div><p>${escapeHTML(s.hypothesis)}</p><span class="gate ${escapeHTML(s.severity)}">${escapeHTML(s.gate)}</span><ul>${s.reasons.map(r=>`<li>${escapeHTML(r)}</li>`).join('')}</ul><div class="measure"><strong>Measure in a trial</strong><br>${escapeHTML(s.measurement)}</div></article>`).join('');
}
async function loadNASA(){
  const c=inputs();if(!valid(c)){status('Check farm inputs','error');$('notice').textContent='Enter valid coordinates and a bare-ground count from 0 to 12 months.';return;}
  const mine=++requestId;record=null;render();status('Loading NASA data…');$('run').disabled=true;
  $('notice').textContent='NASA POWER provides area-scale meteorology and modeled root-zone wetness. Neither is a measurement of your field.';
  const params=new URLSearchParams({parameters:'PRECTOTCORR,T2M_MAX,GWETROOT,EVPTRNS',community:'AG',longitude:String(c.lon),latitude:String(c.lat),start:'20160101',end:'20251231',format:'JSON'});
  const key=`fieldshift:power:v2:${c.lat.toFixed(2)}:${c.lon.toFixed(2)}`;
  try{
    let raw,cached=false;
    try{const entry=JSON.parse(localStorage.getItem(key)||'null');if(entry&&Date.now()-entry.time<86400000){raw=entry.data;cached=true;}}catch(e){}
    if(!raw){
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
      try{const response=await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`,{signal:controller.signal});if(!response.ok)throw new Error(`NASA POWER HTTP ${response.status}`);raw=await response.json();}finally{clearTimeout(timeout);}
      try{localStorage.setItem(key,JSON.stringify({time:Date.now(),data:raw}));}catch(e){}
    }
    const result=summarizePower(raw,c.lat);if(mine!==requestId)return;
    record=result;render();status(cached?'NASA data · cached':'NASA data · live','live');
    $('notice').textContent=`${result.years.length} complete years of NASA POWER daily records. Root-zone wetness is a model product, not a soil test or direct SMAP field reading. A dry year is a historical analog, not a prediction.`;
  }catch(e){if(mine!==requestId)return;record=null;render();status('NASA data unavailable','error');$('notice').textContent=`The NASA request could not be completed. Climate-based gates are withheld. Try again later; no example values are substituted. (${e.name==='AbortError'?'Request timed out':'Data unavailable'})`;}
  finally{if(mine===requestId)$('run').disabled=false;}
}
function exportPacket(){const packet=evidencePacket(record,inputs(),assessPathways(record,inputs()));const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='field-shift-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('region').addEventListener('change',()=>{const p=presets[$('region').value];if(p){$('lat').value=p.lat;$('lon').value=p.lon;$('rotation').value=p.rotation;$('soil').value=p.soil;$('water').value=p.water;}loadNASA();});
['lat','lon'].forEach(id=>$(id).addEventListener('input',()=>{$('region').value='custom';requestId++;record=null;render();status('Load new location');$('notice').textContent='Coordinates changed. Load NASA evidence to assess this location.';}));
['rotation','soil','water','bare','soil-test','calendar','rain-adjust'].forEach(id=>$(id).addEventListener('input',render));
$('run').addEventListener('click',loadNASA);$('download').addEventListener('click',exportPacket);
loadNASA();
