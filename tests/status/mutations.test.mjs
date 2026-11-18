import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const source=readFileSync(new URL('./profile.mjs',import.meta.url),'utf8');
const mutations=[
 ['substring list type',"(!Array.isArray(list.type)||!list.type.includes('VerifiableCredential')||!list.type.includes('BitstringStatusListCredential'))","!list.type?.includes('BitstringStatusListCredential')"],
 ['missing trust level',"!['PRIVILEGED','TRUSTED','VERIFIED','BASIC','UNKNOWN'].includes(credential.credentialSubject?.trustLevel)",'false'],
 ['reversed bit order','(7-i%8)','(i%8)'],
 ['skip signature verification',"if(!verify(null,","if(false && !verify(null,"],
 ['skip suspension read','for(const entry of entries)',"for(const entry of entries.filter(e=>e.statusPurpose==='revocation'))"],
 ['ignore configured remembered revocation',"if(history.has(credential.id) && input.rememberRevocation)","if(false && history.has(credential.id) && input.rememberRevocation)"],
 ['ignore expiry','time>=until','false'],
 ['accept short list','bytes.length<16384','bytes.length<1'],
];
for(const [label,before,after] of mutations)test(`detects mutation: ${label}`,()=>{
 assert.ok(source.includes(before));const dir=mkdtempSync(join(tmpdir(),'atp-status-mutation-'));
 try{const path=join(dir,'adapter.mjs');writeFileSync(path,source.replace(before,after));
 const r=spawnSync(process.execPath,[new URL('./run.mjs',import.meta.url).pathname],{env:{...process.env,ATP_STATUS_ADAPTER:path},encoding:'utf8'});
 assert.equal(r.status,1,r.stderr);const report=JSON.parse(r.stdout);assert.ok(report.passed<report.total);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
