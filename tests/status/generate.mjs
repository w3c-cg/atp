import {createPrivateKey,createPublicKey,createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {seal,issuer} from './profile.mjs';
// Public, deterministic TEST ONLY seed. Never use this fixture key for real credentials.
const seed=Buffer.from('a7'.repeat(32),'hex');
const privateKey=createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]),format:'der',type:'pkcs8'});
const jwk=createPublicKey(privateKey).export({format:'jwk'});
const root=fileURLToPath(new URL('./fixtures/',import.meta.url)); mkdirSync(root,{recursive:true});
const from='2026-09-29T11:00:00Z', until='2026-09-29T13:00:00Z', time='2026-09-29T12:00:00Z';
const urls={revocation:'https://authority.example/status/revocation/3',suspension:'https://authority.example/status/suspension/4'};
function list(purpose,set=false,length=16384,index=94567) {
 const b=Buffer.alloc(length); if(set && index<b.length*8)b[Math.floor(index/8)]|=1<<(7-index%8);
 return {'@context':['https://www.w3.org/ns/credentials/v2'],id:urls[purpose],type:['VerifiableCredential','BitstringStatusListCredential'],issuer,validFrom:from,validUntil:until,credentialSubject:{id:`${urls[purpose]}#list`,type:'BitstringStatusList',statusPurpose:purpose,encodedList:`u${gzipSync(b,{level:9}).toString('base64url')}`}};
}
function base(){return {credential:{'@context':['https://www.w3.org/ns/credentials/v2'],id:'urn:uuid:00000000-0000-4000-8000-000000000001',type:['VerifiableCredential','AtpTrustCredential'],issuer,validFrom:from,validUntil:until,credentialSubject:{id:'https://agent.example',trustLevel:'TRUSTED'},credentialStatus:['revocation','suspension'].map(p=>({id:`${urls[p]}#94567`,type:'BitstringStatusListEntry',statusPurpose:p,statusListIndex:'94567',statusListCredential:urls[p]}))},resources:Object.fromEntries(Object.keys(urls).map(p=>[urls[p],list(p)])),evaluationTime:time};}
const active={statusConformant:true,credentialValid:true,effectiveTrustLevel:'TRUSTED',trustCredit:1,policyUseAllowed:true};
const unknown={statusConformant:false,credentialValid:false,effectiveTrustLevel:'UNKNOWN',trustCredit:0,policyUseAllowed:false};
const suspended={...unknown,statusConformant:true,credentialValid:true}; const revoked={...unknown,statusConformant:true};
const cases=[];
function add(id,mutate=()=>{},expected=unknown){const b=base();mutate(b);const c={id,steps:[pack(b)],expected:[expected]};cases.push(c);return c;}
function pack(b){return {...b,credential:seal(b.credential,privateKey),resources:Object.fromEntries(Object.entries(b.resources).map(([u,d])=>[u,typeof d==='object'&&d!==null?seal(d,privateKey):d]))};}
add('status-01-valid-active',()=>{},active);
add('status-02-revoked',b=>b.resources[urls.revocation]=list('revocation',true),revoked);
add('status-03-suspended',b=>b.resources[urls.suspension]=list('suspension',true),suspended);
add('status-04-both-set',b=>{b.resources[urls.revocation]=list('revocation',true);b.resources[urls.suspension]=list('suspension',true);},revoked);
const restore=add('status-05-suspension-cleared',b=>b.resources[urls.suspension]=list('suspension',true),suspended);
const restored=base(); restored.evaluationTime='2026-09-29T12:01:00Z'; restored.resources[urls.suspension].validFrom='2026-09-29T11:30:00Z'; restore.steps.push(pack(restored));restore.expected.push(active);
add('status-06-missing-status',b=>delete b.credential.credentialStatus);
add('status-07-not-array',b=>b.credential.credentialStatus=b.credential.credentialStatus[0]);
add('status-08-missing-suspension',b=>b.credential.credentialStatus.pop());
add('status-08-missing-revocation',b=>b.credential.credentialStatus.shift());
add('status-09-duplicate-revocation',b=>b.credential.credentialStatus[1]=b.credential.credentialStatus[0]);
add('status-09-duplicate-suspension',b=>b.credential.credentialStatus[0]=b.credential.credentialStatus[1]);
add('status-10-wrong-entry-type',b=>b.credential.credentialStatus[0].type='Other');
for(const [label,index] of [['negative','-1'],['number',1],['non-decimal','1e2'],['range','131072'],['huge','9'.repeat(50)]])add(`status-11-bad-index-${label}`,b=>b.credential.credentialStatus[0].statusListIndex=index);
add('status-12-bad-list-url',b=>b.credential.credentialStatus[0].statusListCredential='not a URL');
add('status-13-retrieval-error',b=>b.resources[urls.suspension]=null);
add('status-13-retrieval-timeout',b=>b.retrievalTimeout=urls.suspension);
const badProof=add('status-14-proof-error'); const parts=badProof.steps[0].resources[urls.revocation].split('.');const sig=Buffer.from(parts[2],'base64url');sig[0]^=1;parts[2]=sig.toString('base64url');badProof.steps[0].resources[urls.revocation]=parts.join('.');
add('status-15-purpose-mismatch',b=>b.resources[urls.suspension].credentialSubject.statusPurpose='revocation');
add('status-16-wrong-list-type',b=>b.resources[urls.revocation].type=['VerifiableCredential']);
add('status-17-short-list',b=>b.resources[urls.revocation]=list('revocation',false,16383));
add('status-18-corrupt-encoded-list',b=>b.resources[urls.revocation].credentialSubject.encodedList='uAAAA');
add('status-19-expired-list',b=>b.resources[urls.suspension].validUntil='2026-09-29T11:59:00Z');
add('status-20-stapled-valid-list',b=>{b.holderProvided=true;b.maxAgeMs=3600000;},active);
add('extra-stapled-stale',b=>{b.holderProvided=true;b.maxAgeMs=1000;});
add('extra-stapled-wrong-list',b=>{b.holderProvided=true;b.maxAgeMs=3600000;b.resources[urls.suspension].id=urls.revocation;});
const stapledProof=add('extra-stapled-invalid-proof',b=>{b.holderProvided=true;b.maxAgeMs=3600000;});
stapledProof.steps[0].resources[urls.revocation]=badProof.steps[0].resources[urls.revocation];
const permanent=add('extra-revocation-cleared',b=>{b.rememberRevocation=true;b.resources[urls.revocation]=list('revocation',true);},revoked);
permanent.steps.push(pack({...base(),rememberRevocation:true,evaluationTime:'2026-09-29T12:01:00Z'}));
permanent.expected.push(revoked);
for(const index of [0,7,8,131071])add(`extra-bit-order-${index}`,b=>{b.credential.credentialStatus[0].statusListIndex=String(index);b.resources[urls.revocation]=list('revocation',true,16384,index);},revoked);
const badTrust=add('extra-invalid-trust-signature');const trustParts=badTrust.steps[0].credential.split('.');const trustSig=Buffer.from(trustParts[2],'base64url');trustSig[0]^=1;trustParts[2]=trustSig.toString('base64url');badTrust.steps[0].credential=trustParts.join('.');
add('extra-list-type-substring',b=>b.resources[urls.revocation].type='NotBitstringStatusListCredential');
add('extra-missing-trust-level',b=>delete b.credential.credentialSubject.trustLevel);
add('extra-unsupported-trust-level',b=>b.credential.credentialSubject.trustLevel='ADMIN');
// Expectations are explicit, not generated by the evaluator under test.
const reasons={
 'status-01':'active','status-02':'revoked','status-03':'suspended','status-04':'revoked',
 'status-05':'suspended','status-06':'structure','status-07':'structure','status-08':'structure',
 'status-09':'structure','status-10':'entry','status-12':'url','status-13':'retrieval',
 'status-14':'list-proof','status-15':'purpose','status-16':'list','status-17':'length',
 'status-18':'encoding','status-19':'list-validity','status-20':'active',
 'extra-stapled-stale':'freshness','extra-revocation-cleared':'revoked',
 'extra-stapled-wrong-list':'list','extra-stapled-invalid-proof':'list-proof',
 'status-13-retrieval-timeout':'retrieval-timeout',
 'extra-invalid-trust-signature':'proof','extra-list-type-substring':'list',
 'extra-missing-trust-level':'credential-structure','extra-unsupported-trust-level':'credential-structure'
};
for(const c of cases)for(let i=0;i<c.expected.length;i++){
 let reason=reasons[c.id]??reasons[c.id.slice(0,9)];
 if(c.id.startsWith('status-11'))reason=/-(range|huge)$/.test(c.id)?'range':'entry';
 if(c.id.startsWith('extra-bit-order-'))reason='revoked';
 if(c.id==='status-05-suspension-cleared'&&i===1)reason='active';
 if(!reason)throw Error(`Missing expectation: ${c.id}`);
 const expectedError = {
  retrieval:'STATUS_RETRIEVAL_ERROR', 'retrieval-timeout':'STATUS_RETRIEVAL_ERROR',
  'list-proof':'STATUS_VERIFICATION_ERROR', 'list-validity':'STATUS_VERIFICATION_ERROR',
  list:'STATUS_VERIFICATION_ERROR', purpose:'STATUS_VERIFICATION_ERROR',
  freshness:'STATUS_VERIFICATION_ERROR', encoding:'STATUS_VERIFICATION_ERROR',
  length:'STATUS_LIST_LENGTH_ERROR', range:'RANGE_ERROR',
 };
 c.expected[i]={...c.expected[i],reason,errorType:expectedError[reason]??null};
}
const files={'public-key.json':jwk,'vectors.json':{profile:'experimental-ed25519-fixture-jws-v3',sourceCommit:'7e3a990c58c980ccb016ebaf6ce0b5163151881f',cases}};
for(const [name,data] of Object.entries(files))writeFileSync(`${root}${name}`,JSON.stringify(data,null,2)+'\n');
writeFileSync(`${root}SHA256SUMS`,Object.entries(files).map(([name,data])=>`${createHash('sha256').update(JSON.stringify(data,null,2)+'\n').digest('hex')}  ${name}`).join('\n')+'\n');
console.log(`Generated ${cases.length} cases`);
