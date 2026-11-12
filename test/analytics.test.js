import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePower,assessPathways,evidencePacket,auditPower} from '../dist/analytics.js';

function fixture(start=2018,end=2022){
  const keys=['PRECTOTCORR','T2M_MAX','GWETROOT','EVPTRNS'];
  const parameter=Object.fromEntries(keys.map(k=>[k,{}]));
  for(let year=start;year<=end;year++){
    for(let date=new Date(Date.UTC(year,0,1));date.getUTCFullYear()===year;date.setUTCDate(date.getUTCDate()+1)){
      const day=date.toISOString().slice(0,10).replaceAll('-','');
      const warm=date.getUTCMonth()>=4&&date.getUTCMonth()<=8;
      const drought=year===2020&&warm;
      parameter.PRECTOTCORR[day]=drought?.5:2;
      parameter.T2M_MAX[day]=drought?34:27;
      parameter.GWETROOT[day]=drought?.2:.5;
      parameter.EVPTRNS[day]=drought?1.8:2.4;
    }
  }
  return {properties:{parameter},header:{start:'20180101',end:'20221231',sources:['MERRA2'],time_standard:'LST'}};
}
const context={rotation:'corn-soy',water:'rainfed',soil:'loam',bareMonths:3,soilTest:false,calendar:false,rainReduction:0};

test('selects an observed dry analog and keeps modeled wetness separate',()=>{
  const data=summarizePower(fixture(),38);
  assert.equal(data.years.length,5);
  assert.equal(data.driest.year,2020);
  assert.equal(data.driest.rootWetness,.2);
  assert.equal(data.medianRootWetness,.5);
  assert.ok(data.driest.seasonRain<data.medianSeasonRain);
});

test('withholds a rotation trial until field checks are supplied',()=>{
  const data=summarizePower(fixture(),38);
  assert.equal(assessPathways(data,context)[1].gate,'Measure first');
  assert.equal(assessPathways(data,{...context,soilTest:true})[1].gate,'Confirm planting window');
  const assessed=assessPathways(data,{...context,soilTest:true,calendar:true});
  assert.equal(assessed[1].gate,'Water-limited trial only');
  assert.match(assessed[2].reasons.join(' '),/soybean directly before winter wheat/i);
});

test('packet exposes input, observed record, and interpretation limits',()=>{
  const data=summarizePower(fixture(),38);
  const packet=evidencePacket(data,context,assessPathways(data,context));
  assert.equal(packet.data.driestAnalog.year,2020);
  assert.equal(packet.pathways.length,3);
  assert.match(packet.limitations.join(' '),/does not ingest HLS/i);
});

test('Southern Hemisphere season joins November–December to the following January–March',()=>{
  const raw=fixture(2017,2023);
  for(const day of Object.keys(raw.properties.parameter.PRECTOTCORR)){
    if((day>='20191101'&&day<='20191231')||(day>='20200101'&&day<='20200331')){
      raw.properties.parameter.PRECTOTCORR[day]=.2;
      raw.properties.parameter.GWETROOT[day]=.15;
    }
  }
  const data=summarizePower(raw,-35);
  assert.equal(data.driest.year,2020);
  assert.equal(data.driest.rootWetness,.15);
  assert.equal(data.driest.seasonRain,30);
  assert.match(data.seasonLabel,/season ending year/);
});

test('assumption audit reports observed window medians and withholds short windows',()=>{
  assert.equal(auditPower(summarizePower(fixture(),38)),null);
  const raw=fixture(2016,2025);
  for(const day of Object.keys(raw.properties.parameter.PRECTOTCORR)){
    if(day>='20210101'&&Number(day.slice(4,6))>=5&&Number(day.slice(4,6))<=9){
      raw.properties.parameter.PRECTOTCORR[day]=.4;
      raw.properties.parameter.T2M_MAX[day]=35;
      raw.properties.parameter.GWETROOT[day]=.22;
    }
  }
  const audit=auditPower(summarizePower(raw,38));
  assert.equal(audit.baselinePeriod,'2016–2020');
  assert.equal(audit.recentPeriod,'2021–2025');
  assert.ok(audit.rainPercent<0);
  assert.ok(audit.delta.hot>0);
  assert.equal(audit.evidence,'5 baseline years · 5 recent years');
});
