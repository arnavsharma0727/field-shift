import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePower,assessPathways,evidencePacket} from '../dist/analytics.js';

function fixture(){
  const keys=['PRECTOTCORR','T2M_MAX','GWETROOT','EVPTRNS'];
  const parameter=Object.fromEntries(keys.map(k=>[k,{}]));
  for(let year=2018;year<=2022;year++){
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
