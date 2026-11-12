import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {open,evaluate} from './profile.mjs';
const root=new URL('./fixtures/',import.meta.url);
const {cases}=JSON.parse(readFileSync(new URL('vectors.json',root)));
const key=JSON.parse(readFileSync(new URL('public-key.json',root)));
const active=cases[0].steps[0];
test('signed payload alteration and foreign key are rejected',()=>{
 const parts=active.credential.split('.');const doc=JSON.parse(Buffer.from(parts[1],'base64url'));doc.credentialSubject.trustLevel='ADMIN';parts[1]=Buffer.from(JSON.stringify(doc)).toString('base64url');
 assert.throws(()=>open(parts.join('.'),key));
 const wrong={...key,x:Buffer.alloc(32,1).toString('base64url')};assert.throws(()=>open(active.credential,wrong));
});
test('no implicit network fallback; missing second resource fails closed',()=>{
 const input=structuredClone(active);delete input.resources['https://authority.example/status/suspension/4'];assert.equal(evaluate(input,key).policyUseAllowed,false);
});
test('fixed validity boundaries reject malformed time and expired trust credential',()=>{
 for(const evaluationTime of ['invalid','2026-09-29T13:00:00Z','2026-09-29T10:59:59Z'])assert.equal(evaluate({...active,evaluationTime},key).policyUseAllowed,false);
});
test('runner succeeds for checked-in cases',()=>{
 const result=spawnSync(process.execPath,[new URL('./run.mjs',import.meta.url).pathname],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.passed,report.total);assert.ok(report.total>36);
});
