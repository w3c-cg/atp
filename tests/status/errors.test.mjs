import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPrivateKey} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {evaluate,open,seal} from './profile.mjs';
const root=new URL('./fixtures/',import.meta.url);
const key=JSON.parse(readFileSync(new URL('public-key.json',root)));
const active=JSON.parse(readFileSync(new URL('vectors.json',root))).cases[0].steps[0];
// Published fixture key only; never use for production.
const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),Buffer.from('a7'.repeat(32),'hex')]),format:'der',type:'pkcs8'});
function changedList(encodedList){const input=structuredClone(active);const url=Object.keys(input.resources)[0];const list=open(input.resources[url],key);list.credentialSubject.encodedList=encodedList;input.resources[url]=seal(list,privateKey);return input;}
test('separate malformed encoding from malformed GZIP with the same error type',()=>{
 for(const [value,reason] of [['u!','encoding'],['uAAAA','decompression']]){
  const out=evaluate(changedList(value),key);assert.equal(out.reason,reason);assert.equal(out.errorType,'MALFORMED_VALUE_ERROR');assert.equal(out.policyUseAllowed,false);
 }
});
test('expanded-size guard is a local limit, not an invalid-signature error',()=>{
 const value='u'+gzipSync(Buffer.alloc(1024*1024+1)).toString('base64url');
 const out=evaluate(changedList(value),key);assert.equal(out.reason,'list-size-limit');assert.equal(out.errorType,null);assert.equal(out.policyUseAllowed,false);assert.equal(out.statusConformant,false);assert.equal(out.credentialValid,false);assert.equal(out.effectiveTrustLevel,'UNKNOWN');assert.equal(out.trustCredit,0);
});
test('exact experimental expanded-size maximum remains usable',()=>{
 const out=evaluate(changedList('u'+gzipSync(Buffer.alloc(1024*1024)).toString('base64url')),key);assert.equal(out.policyUseAllowed,true);
});
test('ATP-only structure and freshness remain distinct from malformed VC-BSL values',()=>{
 const {cases}=JSON.parse(readFileSync(new URL('vectors.json',root)));
 for(const id of ['status-06-missing-status','extra-stapled-stale']) assert.equal(evaluate(cases.find(c=>c.id===id).steps[0],key).errorType,null);
 for(const id of ['status-10-wrong-entry-type','status-12-bad-list-url']) assert.equal(evaluate(cases.find(c=>c.id===id).steps[0],key).errorType,'MALFORMED_VALUE_ERROR');
});

test('signed validUntil boundary applies independently to credential and status lists',()=>{
 const at=Date.parse(active.evaluationTime);
 for(const target of ['credential','list']) {
  for(const [offset,allowed] of [[1,true],[0,false],[-1,false]]) {
   const input=structuredClone(active);
   const url=Object.keys(input.resources)[0];
   const doc=open(target==='credential'?input.credential:input.resources[url],key);
   doc.validUntil=new Date(at+offset).toISOString();
   const signed=seal(doc,privateKey);
   if(target==='credential')input.credential=signed;else input.resources[url]=signed;
   const out=evaluate(input,key);
   assert.equal(out.policyUseAllowed,allowed,`${target}: expiry offset ${offset}`);
   if(!allowed){assert.equal(out.effectiveTrustLevel,'UNKNOWN');assert.equal(out.trustCredit,0);}
  }
 }
});
test('expirationDate alone cannot replace required validUntil in the experimental profile',()=>{
 const input=structuredClone(active);const doc=open(input.credential,key);
 doc.expirationDate=doc.validUntil;delete doc.validUntil;input.credential=seal(doc,privateKey);
 const out=evaluate(input,key);assert.equal(out.policyUseAllowed,false);assert.equal(out.trustCredit,0);
});
