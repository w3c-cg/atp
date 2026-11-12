// Experimental fixture envelope; NOT an adopted ATP/VC securing profile.
import {createPublicKey, sign, verify} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
export const issuer = 'https://issuer.example';
export const keyId = `${issuer}/keys/fixture-ed25519`;
export function seal(document, privateKey) {
  const payload = Buffer.from(JSON.stringify(document)).toString('base64url');
  const protectedHeader = Buffer.from(JSON.stringify({alg:'EdDSA',kid:keyId,typ:'atp-status-fixture+jws'})).toString('base64url');
  const input = `${protectedHeader}.${payload}`;
  return `${input}.${sign(null, Buffer.from(input), privateKey).toString('base64url')}`;
}
export function open(envelope, publicJwk) {
  const parts = envelope.split('.');
  if(parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) throw Error('proof');
  const [header,payload,signature] = parts;
  if(parts.some(p=>Buffer.from(p,'base64url').toString('base64url')!==p)) throw Error('proof');
  const h = JSON.parse(Buffer.from(header,'base64url'));
  if(h.alg !== 'EdDSA' || h.kid !== keyId || h.typ !== 'atp-status-fixture+jws') throw Error('proof');
  if(!verify(null,Buffer.from(`${header}.${payload}`),createPublicKey({key:publicJwk,format:'jwk'}),Buffer.from(signature,'base64url'))) throw Error('proof');
  const doc=JSON.parse(Buffer.from(payload,'base64url'));
  if(doc.issuer !== issuer) throw Error('issuer');
  return doc;
}
// Symbolic error labels used in this fixture mapping. ATP-only preflight
// failures retain their diagnostic reason and have no VC-BSL error.
const errorTypes = {
  retrieval:'STATUS_RETRIEVAL_ERROR', 'retrieval-timeout':'STATUS_RETRIEVAL_ERROR',
  'list-proof':'STATUS_VERIFICATION_ERROR', 'list-validity':'STATUS_VERIFICATION_ERROR',
  list:'STATUS_VERIFICATION_ERROR', purpose:'STATUS_VERIFICATION_ERROR',
  freshness:'STATUS_VERIFICATION_ERROR', encoding:'STATUS_VERIFICATION_ERROR',
  length:'STATUS_LIST_LENGTH_ERROR', range:'RANGE_ERROR',
};
const fail = reason => ({statusConformant:false,credentialValid:false,effectiveTrustLevel:'UNKNOWN',trustCredit:0,policyUseAllowed:false,reason,errorType:errorTypes[reason]??null});
const deny = (reason,valid=true) => ({statusConformant:true,credentialValid:valid,effectiveTrustLevel:'UNKNOWN',trustCredit:0,policyUseAllowed:false,reason,errorType:null});
export function evaluate(input, publicJwk, history=new Set()) {
  try {
    const time=Date.parse(input.evaluationTime);
    if(!Number.isFinite(time)) throw Error('time');
    const credential=open(input.credential,publicJwk);
    if(!Array.isArray(credential.type)||!credential.type.includes('VerifiableCredential')||!credential.type.includes('AtpTrustCredential')||typeof credential.id!=='string'||!credential.id||typeof credential.credentialSubject?.id!=='string'||!['PRIVILEGED','TRUSTED','VERIFIED','BASIC','UNKNOWN'].includes(credential.credentialSubject?.trustLevel)) throw Error('credential-structure');
    checkTime(credential,time);
    const entries=credential.credentialStatus;
    if(!Array.isArray(entries)||entries.length!==2 || entries.filter(e=>e.statusPurpose==='revocation').length!==1 || entries.filter(e=>e.statusPurpose==='suspension').length!==1) throw Error('structure');
    const bits={};
    for(const entry of entries) {
      if(entry.type!=='BitstringStatusListEntry'||typeof entry.statusListIndex!=='string'|| !/^[0-9]+$/.test(entry.statusListIndex)) throw Error('entry');
      let url; try { url=new URL(entry.statusListCredential); } catch { throw Error('url'); }
      if(url.protocol!=='https:') throw Error('url');
      if(input.retrievalTimeout===entry.statusListCredential) throw Error('retrieval-timeout');
      const envelope=input.resources[entry.statusListCredential];
      if(typeof envelope!=='string') throw Error('retrieval');
      let list;
      try { list=open(envelope,publicJwk); } catch { throw Error('list-proof'); }
      try { checkTime(list,time); } catch { throw Error('list-validity'); }
      if(list.id!==entry.statusListCredential || (!Array.isArray(list.type)||!list.type.includes('VerifiableCredential')||!list.type.includes('BitstringStatusListCredential')) || list.credentialSubject?.type!=='BitstringStatusList') throw Error('list');
      const subject=list.credentialSubject;
      const purposes=Array.isArray(subject.statusPurpose)?subject.statusPurpose:[subject.statusPurpose];
      if(!purposes.includes(entry.statusPurpose)||(subject.statusSize!==undefined&&subject.statusSize!==1)) throw Error('purpose');
      if(input.holderProvided && (time-Date.parse(list.validFrom)>input.maxAgeMs || !Number.isFinite(input.maxAgeMs)||input.maxAgeMs<0)) throw Error('freshness');
      const encoded=subject.encodedList;
      if(typeof encoded!=='string'||!/^u[A-Za-z0-9_-]+$/.test(encoded)) throw Error('encoding');
      const compressed=Buffer.from(encoded.slice(1),'base64url');
      if(compressed.toString('base64url')!==encoded.slice(1)) throw Error('encoding');
      let bytes; try { bytes=gunzipSync(compressed,{maxOutputLength:1024*1024}); } catch { throw Error('encoding'); }
      const index=BigInt(entry.statusListIndex);
      if(bytes.length<16384) throw Error('length');
      if(index>=BigInt(bytes.length)*8n) throw Error('range');
      const i=Number(index);
      bits[entry.statusPurpose]=(bytes[Math.floor(i/8)]>>(7-i%8))&1;
    }
    if(bits.revocation) {if(input.rememberRevocation) history.add(credential.id); return deny('revoked',false);}
    if(history.has(credential.id) && input.rememberRevocation) return deny('revoked',false);
    if(bits.suspension) return deny('suspended');
    return {statusConformant:true,credentialValid:true,effectiveTrustLevel:credential.credentialSubject.trustLevel,trustCredit:1,policyUseAllowed:true,reason:'active',errorType:null};
  } catch(error) {
    const known=['proof','issuer','credential-structure','time','validity','structure','entry','url','retrieval','retrieval-timeout','list-proof','list-validity','list','purpose','freshness','encoding','length','range'];
    return fail(known.includes(error.message)?error.message:'processing');
  }
}
function checkTime(doc,time) {
  const from=Date.parse(doc.validFrom), until=Date.parse(doc.validUntil);
  if(!Number.isFinite(from)||!Number.isFinite(until)||from>=until||time<from||time>=until) throw Error('validity');
}
