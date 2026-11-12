import {summarizePower,assessPathways,evidencePacket,auditPower} from './analytics.js?v=3';
const $=id=>document.getElementById(id);
const places={virginia:{name:'Shenandoah Valley, VA',lat:38.45,lon:-78.87,rotation:'corn-soy',water:'rainfed'},nevada:{name:'Fallon, NV',lat:39.47,lon:-118.78,rotation:'alfalfa',water:'limited'},iowa:{name:'Ames, IA',lat:42.03,lon:-93.63,rotation:'corn-soy',water:'rainfed'}};
let record=null,map=null,marker=null,requestId=0,chartVariable='rain',overlay=false;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sign=n=>n>0?`+${n}`:String(n);
const fmt=n=>Math.round(n).toLocaleString();
function inputs(){return {region:$('region').value,lat:Number($('lat').value),lon:Number($('lon').value),rotation:$('rotation').value,soil:$('soil').value,water:$('water').value,bareMonths:Number($('bare').value),soilTest:$('soil-test').checked,calendar:$('calendar').checked,rainReduction:Number($('rain-adjust').value)};}
function valid(c){return Number.isFinite(c.lat)&&c.lat>=-85&&c.lat<=85&&Number.isFinite(c.lon)&&c.lon>=-180&&c.lon<=180&&Number.isInteger(c.bareMonths)&&c.bareMonths>=0&&c.bareMonths<=12;}
function coordinates(c){return `${Math.abs(c.lat).toFixed(2)}° ${c.lat>=0?'N':'S'} / ${Math.abs(c.lon).toFixed(2)}° ${c.lon>=0?'E':'W'}`;}
function place(c){return places[c.region]?.name||`Custom point · ${coordinates(c)}`;}
function status(value,kind=''){$('status').textContent=value;$('status-light').className=`pulse ${kind}`;$('power-state').textContent=kind==='live'?`Available · ${record?.years.length||0} complete years · 2016–2025`:kind==='error'?'Unavailable · check request or connection':'Loading · 2016–2025 · point/grid scale';}
function renderChart(){
 const root=$('chart');root.replaceChildren();
 const config={rain:{key:'seasonRain',unit:'SEASONAL PRECIPITATION · mm'},hot:{key:'seasonHot',unit:'HOT DAYS ≥32°C · count'},wet:{key:'rootWetness',unit:'MODELED ROOT-ZONE WETNESS · fraction'}}[chartVariable];
 $('chart-unit').textContent=config.unit;
 if(!record){root.textContent='Waiting for NASA POWER observations.';root.className='chart chart-empty';root.setAttribute('aria-label','Waiting for NASA data');return;}
 root.className='chart';const max=Math.max(...record.years.map(y=>y[config.key]),.01);
 for(const y of record.years){const bar=document.createElement('div');bar.className='bar';bar.tabIndex=0;const value=y[config.key];bar.title=`${y.year}: ${value} ${chartVariable==='rain'?'mm':chartVariable==='hot'?'days':'fraction'}${y.year===record.driest.year?' · selected dry analog':''}`;
 const fill=document.createElement('i');fill.className=`fill${y.year===record.driest.year?' dry':''}`;fill.style.height=`${Math.max(3,value/max*100)}%`;
 const year=document.createElement('span');year.className='label';year.textContent=String(y.year).slice(2);bar.append(fill,year);root.append(bar);}
 root.setAttribute('aria-label',`${config.unit}: ${record.years.map(y=>`${y.year} ${y[config.key]}`).join(', ')}. Amber bar is observed dry year ${record.driest.year}.`);
 $('chart-period').textContent=`NASA POWER / ${record.period}`;
}
function renderAudit(){
 const audit=auditPower(record);const root=$('audit-body');
 if(!audit){root.innerHTML='<p>At least three complete years are required in each comparison window. The audit is withheld.</p>';return;}
 const rows=[['HISTORICAL BASELINE',`${audit.baselinePeriod} · ${audit.baseline.rain} mm rain / ${audit.baseline.hot} hot days`],['RECENT OBSERVATIONS',`${audit.recentPeriod} · ${audit.recent.rain} mm / ${audit.recent.hot} days`],['OBSERVED DEVIATION',`${sign(audit.rainPercent)}% rain · ${sign(audit.delta.hot)} hot days · ${sign(audit.delta.wet)} wetness`],['LARGEST RELATIVE ADVERSE SHIFT',audit.primary?`${audit.primary.label} · ${Math.round(audit.primary.magnitude)}% relative change`:'None among screened indicators'],['EVIDENCE QUALITY',`${audit.evidence}; area-scale descriptive comparison`]];
 root.innerHTML=rows.map(([label,value],i)=>`<div class="audit-row"><span>${label}</span><b class="${i===2&&audit.primary?'warn':''}">${escapeHTML(value)}</b></div>`).join('')+`<p class="audit-conclusion">${escapeHTML(audit.interpretation)} Relative shifts rank exposure indicators, not causal drivers or crop suitability.</p>`;
}
function renderPathways(){const c=inputs();const paths=assessPathways(record,c);$('pathways').innerHTML=paths.map((s,i)=>`<article class="path"><div class="number">0${i+1} / ${i?'CHANGE HYPOTHESIS':'EXISTING BENCHMARK'}</div><h3>${escapeHTML(s.title)}</h3><div class="sequence">${escapeHTML(s.sequence)}</div><p>${escapeHTML(s.hypothesis)}</p><span class="gate ${escapeHTML(s.severity)}">${escapeHTML(s.gate)}</span><ul>${s.reasons.map(r=>`<li>${escapeHTML(r)}</li>`).join('')}</ul><div class="measure"><strong>MEASURE IN A TRIAL</strong><br>${escapeHTML(s.measurement)}</div></article>`).join('');}
function render(){const c=inputs();$('rain-value').textContent=`−${c.rainReduction}%`;$('place').textContent=place(c);$('active-region').textContent=coordinates(c);$('map-coordinate').textContent=coordinates(c);
 $('period').textContent=record?`${record.period} · ${record.seasonLabel} · ${record.years.length} complete years`:'Ten years of daily NASA POWER records requested.';
 $('median-rain').textContent=record?fmt(record.medianSeasonRain):'—';$('analog-year').textContent=record?record.driest.year:'—';$('analog-rain').textContent=record?`${fmt(record.driest.seasonRain*(1-c.rainReduction/100))} mm ${c.rainReduction?'tested':'observed'} rain`:'— mm seasonal rain';$('root-wet').textContent=record?record.driest.rootWetness.toFixed(2):'—';$('hot-days').textContent=record?record.driest.seasonHot:'—';
 renderChart();renderAudit();renderPathways();
 if(marker)marker.setLngLat([c.lon,c.lat]);
}
async function loadNASA(){const c=inputs();if(!valid(c)){status('INVALID INPUT','error');$('notice').textContent='Enter latitude between −85° and 85°, longitude between −180° and 180°, and bare months from 0 to 12.';return;}
 const mine=++requestId;record=null;render();status('LOADING');$('notice').textContent='Fetching NASA POWER daily data. Map imagery is independent of this request.';$('run').disabled=true;
 const params=new URLSearchParams({parameters:'PRECTOTCORR,T2M_MAX,GWETROOT,EVPTRNS',community:'AG',longitude:String(c.lon),latitude:String(c.lat),start:'20160101',end:'20251231',format:'JSON'});
 const key=`fieldshift:power:v2:${c.lat.toFixed(2)}:${c.lon.toFixed(2)}`;
 try{let raw,cached=false,retrieved=Date.now();try{const entry=JSON.parse(localStorage.getItem(key)||'null');if(entry&&Date.now()-entry.time<86400000){raw=entry.data;cached=true;retrieved=entry.time;}}catch(e){}
 if(!raw){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);try{const response=await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`,{signal:controller.signal});if(!response.ok)throw new Error(`NASA POWER HTTP ${response.status}`);raw=await response.json();}finally{clearTimeout(timeout)}retrieved=Date.now();try{localStorage.setItem(key,JSON.stringify({time:retrieved,data:raw}));}catch(e){}}
 const result=summarizePower(raw,c.lat);if(mine!==requestId)return;record=result;render();status(cached?'NASA / CACHE':'NASA / LIVE','live');$('updated').textContent=new Date(retrieved).toISOString().slice(0,16).replace('T',' ')+'Z';$('notice').textContent=`${result.years.length} complete years. Root-zone wetness is modeled. Click a map point to request a different coordinate.`;
 }catch(e){if(mine!==requestId)return;record=null;render();status('UNAVAILABLE','error');$('notice').textContent=`NASA data could not be analyzed (${e.name==='AbortError'?'request timed out':'request or data unavailable'}). Climate-dependent gates remain withheld; no sample values are substituted.`;}
 finally{if(mine===requestId)$('run').disabled=false;}}
function exportPacket(){const c=inputs();const packet=evidencePacket(record,c,assessPathways(record,c));packet.audit=auditPower(record);packet.mapContext={layer:overlay?'MODIS Terra NDVI 8-day via NASA GIBS':'OpenStreetMap reference',imageryDate:overlay?'2025-08-15':null,note:'Map imagery is context only; no pixel values enter the audit.'};const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='field-shift-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function setPoint(lat,lon){$('region').value='custom';$('lat').value=lat.toFixed(2);$('lon').value=lon.toFixed(2);map?.easeTo({center:[lon,lat],duration:350});loadNASA();}
async function initMap(){try{const maplibregl=await import('https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs');
 map=new maplibregl.Map({container:'map',style:{version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]},center:[-78.87,38.45],zoom:8});
 map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');map.addControl(new maplibregl.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-right');
 const el=document.createElement('div');el.className='point-marker';el.style.cssText='width:16px;height:16px;border:3px solid #e6edf2;border-radius:50%;background:#58b8c7;box-shadow:0 0 0 5px #0b111878';marker=new maplibregl.Marker({element:el}).setLngLat([-78.87,38.45]).addTo(map);
 map.on('click',e=>setPoint(e.lngLat.lat,e.lngLat.lng));map.on('mousemove',e=>{$('map-coordinate').textContent=coordinates({lat:e.lngLat.lat,lon:e.lngLat.lng})});map.on('mouseout',()=>{$('map-coordinate').textContent=coordinates(inputs())});
 map.on('error',e=>{if(overlay&&/modis|gibs/i.test(String(e.error?.message||''))){$('layer-state').textContent='MODIS imagery unavailable for selected date';$('modis-state').textContent='Unavailable · tile request failed';}});
 map.on('load',()=>{map.addSource('modis',{type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/2025-08-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png'],tileSize:256,maxzoom:9,attribution:'NASA GIBS / MODIS Terra'});map.addLayer({id:'modis',type:'raster',source:'modis',paint:{'raster-opacity':0.82},layout:{visibility:'none'}});});
 }catch(e){$('map-fallback').hidden=false;$('layer-state').textContent='Map library unavailable';$('modis-state').textContent='Unavailable · map library did not load';}}
function setOverlay(enabled){if(!map?.getLayer('modis')){$('layer-state').textContent='NASA layer loading or unavailable';return;}overlay=enabled;map.setLayoutProperty('modis','visibility',enabled?'visible':'none');$('base-streets').classList.toggle('selected',!enabled);$('base-imagery').classList.toggle('selected',enabled);$('layer-state').textContent=enabled?'NASA MODIS Terra NDVI · 2025-08-15 · context only':'OpenStreetMap reference · NASA overlay off';$('modis-state').textContent=enabled?'Layer requested · imagery is not measured for this point':'Optional imagery layer · not sampled for the audit';}
$('region').addEventListener('change',()=>{const p=places[$('region').value];if(p){$('lat').value=p.lat;$('lon').value=p.lon;$('rotation').value=p.rotation;$('water').value=p.water;map?.easeTo({center:[p.lon,p.lat],zoom:8,duration:500});}loadNASA();});
for(const id of ['lat','lon'])$(id).addEventListener('change',()=>{const c=inputs();$('region').value='custom';if(valid(c))map?.easeTo({center:[c.lon,c.lat],duration:450});loadNASA();});
for(const id of ['rotation','soil','water','bare','soil-test','calendar','rain-adjust'])$(id).addEventListener('input',render);
for(const b of document.querySelectorAll('[data-chart]'))b.addEventListener('click',()=>{chartVariable=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(x=>x.classList.toggle('active',x===b));renderChart();});
$('run').addEventListener('click',loadNASA);$('download').addEventListener('click',exportPacket);$('base-streets').addEventListener('click',()=>setOverlay(false));$('base-imagery').addEventListener('click',()=>setOverlay(true));
render();initMap();loadNASA();
