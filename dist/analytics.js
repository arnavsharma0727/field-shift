export const RESEARCH = {
  power: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/',
  harvest: 'https://science.nasa.gov/earth/earth-observatory/how-to-rotate-crops-154601/',
  phenology: 'https://science.nasa.gov/mission/landsat/separating-wheat-from-chaff-from-space/',
  acres: 'https://www.nasaacres.org/news/helping-states-and-farmers-measure-conservation-practices-at-scale-with-nasa-remote-sensing'
};

const median = values => {
  const sorted = [...values].sort((a,b)=>a-b);
  const middle = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
};
const mean = values => values.reduce((a,b)=>a+b,0)/values.length;
const validNumber = (value,min,max) => Number.isFinite(Number(value)) && Number(value)>=min && Number(value)<=max;

export function summarizePower(raw, latitude=38.45){
  const p=raw?.properties?.parameter;
  const keys=['PRECTOTCORR','T2M_MAX','GWETROOT','EVPTRNS'];
  if(!keys.every(key=>p?.[key]))throw new Error('Required NASA POWER series are missing');
  const warmMonths=latitude>=0 ? new Set([5,6,7,8,9]) : new Set([11,12,1,2,3]);
  const years=new Map();
  for(const day of Object.keys(p.PRECTOTCORR).sort()){
    const rain=Number(p.PRECTOTCORR[day]), heat=Number(p.T2M_MAX[day]);
    const wet=Number(p.GWETROOT[day]), et=Number(p.EVPTRNS[day]);
    if(!/^\d{8}$/.test(day)||!validNumber(rain,0,500)||!validNumber(heat,-80,80)||!validNumber(wet,0,1)||!validNumber(et,0,50))continue;
    const year=Number(day.slice(0,4)),month=Number(day.slice(4,6));
    if(month<1||month>12)continue;
    if(!years.has(year))years.set(year,{year,days:0,rain:0,hot:0,maxDry:0,dryRun:0,seasonDays:0,seasonRain:0,seasonHot:0,wet:[],et:[],monthly:Array(12).fill(0)});
    const row=years.get(year);row.days++;row.rain+=rain;row.hot+=heat>=32?1:0;
    row.dryRun=rain<1?row.dryRun+1:0;row.maxDry=Math.max(row.maxDry,row.dryRun);row.monthly[month-1]+=rain;
    if(warmMonths.has(month)){row.seasonDays++;row.seasonRain+=rain;row.seasonHot+=heat>=32?1:0;row.wet.push(wet);row.et.push(et);}
  }
  const complete=[...years.values()].filter(y=>y.days>=300&&y.seasonDays>=110).map(y=>({
    year:y.year,days:y.days,annualRain:Math.round(y.rain),seasonRain:Math.round(y.seasonRain),hotDays:y.hot,seasonHot:y.seasonHot,
    maxDry:y.maxDry,rootWetness:+mean(y.wet).toFixed(3),etFlux:+mean(y.et).toFixed(2),monthly:y.monthly.map(Math.round)
  })).sort((a,b)=>a.year-b.year);
  if(complete.length<5)throw new Error('At least five complete years are required');
  const driest=[...complete].sort((a,b)=>a.seasonRain-b.seasonRain || b.seasonHot-a.seasonHot)[0];
  return {
    years:complete,
    period:`${complete[0].year}–${complete.at(-1).year}`,
    medianSeasonRain:Math.round(median(complete.map(y=>y.seasonRain))),
    medianRootWetness:+median(complete.map(y=>y.rootWetness)).toFixed(3),
    medianSeasonHot:Math.round(median(complete.map(y=>y.seasonHot))),
    meanAnnualRain:Math.round(mean(complete.map(y=>y.annualRain))),
    driest,
    seasonLabel:latitude>=0?'May–September':'November–March (calendar-year grouping)',
    source:raw.header?.sources?.join(', ')||'NASA POWER',
    queryMetadata:{start:raw.header?.start,end:raw.header?.end,timeStandard:raw.header?.time_standard||'LST'}
  };
}

export function assessPathways(data, inputs){
  const options=rotationOptions(inputs.rotation);
  if(!data)return options.map((option,i)=>({...option,gate:i===0?'Existing practice':'Await NASA data',severity:i===0?'neutral':'hold',reasons:['Climate data has not loaded. No climate-based screening is available.']}));
  const analog=data.driest;
  const adjusted=Math.round(analog.seasonRain*(1-inputs.rainReduction/100));
  const rainRatio=adjusted/Math.max(data.medianSeasonRain,1);
  const lowWet=analog.rootWetness<data.medianRootWetness*0.85;
  const stressed=rainRatio<0.7||lowWet;
  const dryland=inputs.water==='rainfed'||inputs.water==='limited';
  return options.map((option,i)=>{
    const reasons=[];let gate,severity;
    if(i===0){gate='Keep as benchmark';severity='neutral';reasons.push('Existing practice is the comparison, not an automatic endorsement.');}
    else if(!inputs.soilTest){gate='Measure first';severity='hold';reasons.push('A recent field soil test is needed before changing the rotation.');}
    else if(!inputs.calendar){gate='Confirm planting window';severity='hold';reasons.push('Confirm actual harvest and planting dates before a field trial.');}
    else if(option.id==='cover'&&dryland&&stressed){gate='Water-limited trial only';severity='caution';reasons.push('The dry-year analog and limited water access make cover-crop moisture competition a priority to measure.');}
    else if(option.id==='diversify'&&dryland&&rainRatio<0.6){gate='Hold broad rollout';severity='hold';reasons.push('The stress test leaves less than 60% of the median growing-season rainfall; validate water supply before scaling.');}
    else{gate='Eligible for small trial';severity='trial';reasons.push('Screening gates passed; trial a limited area and compare it with the existing rotation.');}
    if(i>0&&inputs.bareMonths>=3)reasons.push(`${inputs.bareMonths} months of reported bare ground create a potential cover window, subject to field verification.`);
    if(i>0&&inputs.bareMonths<2)reasons.push('The reported bare period is short; verify that establishment and termination are practical.');
    if(i>0&&option.id==='diversify'&&inputs.rotation==='corn-soy')reasons.push('Avoid soybean directly before winter wheat: a NASA Harvest-supported study found a negative effect in its studied fields.');
    return {...option,gate,severity,reasons};
  });
}

export function rotationOptions(rotation){
  const current={id:'current',title:'Keep the baseline',sequence:({'corn-soy':'Corn → soybean','alfalfa':'Alfalfa stand','corn-wheat':'Corn → winter wheat','wheat-fallow':'Wheat → fallow'})[rotation]||'Current rotation',
    hypothesis:'Preserve a known production system while measuring its exposed-soil and water-stress periods.',
    measurement:'Record yield, irrigation, soil cover, and costs on a comparable field.'};
  if(rotation==='alfalfa')return [current,{id:'cover',title:'Cover the transition',sequence:'Alfalfa termination → short cover → spring crop',hypothesis:'Protect soil during stand replacement; termination timing and moisture use are the central risks.',measurement:'Track soil moisture before and after cover termination.'},{id:'diversify',title:'Trial forage diversity',sequence:'Alfalfa → sorghum-sudangrass trial → next crop',hypothesis:'Test a different forage and water schedule on a small area, without assuming lower total water use.',measurement:'Compare irrigation, forage value, establishment, and livestock safety.'}];
  if(rotation==='wheat-fallow')return [current,{id:'cover',title:'Test a partial fallow cover',sequence:'Wheat → short cover on a small strip → wheat',hypothesis:'Ground cover may protect soil but can consume stored water needed by the next crop.',measurement:'Measure preplant soil water against an uncovered control strip.'},{id:'diversify',title:'Test a pulse phase',sequence:'Wheat → chickpea or lentil trial → wheat',hypothesis:'A pulse may alter the pest and nutrient cycle if the water budget and market fit.',measurement:'Compare water use, disease, yield, and buyer access.'}];
  return [current,{id:'cover',title:'Cover the off-season',sequence:'Cash crop → cereal rye strip → next cash crop',hypothesis:'A small cover strip tests soil protection without committing the entire farm.',measurement:'Compare soil cover, soil water, establishment, and termination cost.'},{id:'diversify',title:'Change the sequence',sequence:'Corn → winter wheat → clover → soybean',hypothesis:'A small-grain phase changes timing and may create a cover window; avoid soy immediately before winter wheat.',measurement:'Check planting dates, buyer access, soil water, and yield against the baseline.'}];
}

export function evidencePacket(data,inputs,pathways){
  return {title:'Field Shift evidence packet',generatedAt:new Date().toISOString(),status:data?'Observed NASA data loaded':'NASA data unavailable',
    inputs,method:'Driest analog is the observed year with lowest growing-season precipitation. Slider scales only its rain total; it is a sensitivity test, not a forecast. Gates are screening rules, not yield predictions.',
    data:data?{period:data.period,season:data.seasonLabel,medianSeasonRainMm:data.medianSeasonRain,medianRootWetness:data.medianRootWetness,driestAnalog:data.driest,annualSeries:data.years,source:data.source,queryMetadata:data.queryMetadata}:null,
    pathways:pathways.map(({id,title,sequence,gate,reasons,measurement})=>({id,title,sequence,gate,reasons,measurement})),
    research:RESEARCH,limitations:['NASA POWER root-zone wetness is a modeled, area-scale product; it is not a field soil test or direct SMAP observation.','HLS cover-crop research informs verification design; this app does not ingest HLS imagery or classify cover crops.','No causal yield or income effect is estimated for the selected field.']};
}
