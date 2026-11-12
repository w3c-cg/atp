import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {evaluate} from './profile.mjs';
const root=new URL('./fixtures/',import.meta.url);
for(const line of readFileSync(new URL('SHA256SUMS',root),'utf8').trim().split('\n')) {
 const [hash,name]=line.split('  ');
 if(!['vectors.json','public-key.json'].includes(name))throw Error('Unexpected checksum path');
 if(createHash('sha256').update(readFileSync(new URL(name,root))).digest('hex')!==hash)throw Error(`Checksum mismatch: ${name}`);
}
const {cases,profile}=JSON.parse(readFileSync(new URL('vectors.json',root)));
const key=JSON.parse(readFileSync(new URL('public-key.json',root)));
// An external adapter receives no expected answers. Its module exports evaluate(input,key,history).
const adapter=process.env.ATP_STATUS_ADAPTER ? await import(new URL(process.env.ATP_STATUS_ADAPTER,`file://${process.cwd()}/`).href) : {evaluate};
let passed=0; const results=[];
const fields=['statusConformant','credentialValid','effectiveTrustLevel','trustCredit','policyUseAllowed','reason','errorType'];
for(const c of cases){const history=new Set();for(let i=0;i<c.steps.length;i++){
 let actual,error;try{actual=await adapter.evaluate(structuredClone(c.steps[i]),structuredClone(key),history);}catch(e){error=String(e);}
 const observed=Object.fromEntries(fields.map(f=>[f,actual?.[f]]));
 const ok=!error&&isDeepStrictEqual(observed,c.expected[i]);passed+=Number(ok);results.push({id:c.id,step:i+1,ok,observed,...(error?{error}:{})});
}}
console.log(JSON.stringify({profile,adapter:process.env.ATP_STATUS_ADAPTER??'author-reference',independentReproduction:false,passed,total:results.length,results},null,2));
if(passed!==results.length)process.exitCode=1;
