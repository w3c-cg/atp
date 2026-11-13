import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, hkdfSync, sign, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';

const vectors = JSON.parse(readFileSync(new URL('../did-atp/test-vectors.json', import.meta.url)));
const checks = [];
const sha = data => createHash('sha256').update(data).digest('base64url');
const e1 = x => 'e1_' + sha(JSON.stringify({crv:'Ed25519',kty:'OKP',x}));
const pq1 = pub => 'pq1_' + sha(JSON.stringify({alg:'ML-DSA-65',kty:'AKP',pub}));
const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const domain = new RegExp('^'+label+'(?:\\.'+label+')*$');
const path = /^[a-z0-9._~%-]+$/;
const thumb = /^[A-Za-z0-9_-]{43}$/;
function syntax(value) {
  const [did, method, host, ...parts] = value.split(':');
  if (did !== 'did' || method !== 'atp' || !domain.test(host ?? '')) return false;
  if (!parts.length) return true;
  const [ed,pq] = parts.slice(-2);
  return parts.length >= 3 && parts.slice(0,-2).every(p => path.test(p)) &&
    ed.startsWith('e1_') && thumb.test(ed.slice(3)) &&
    pq.startsWith('pq1_') && thumb.test(pq.slice(4));
}
function pairKeys(vector) {
  const {masterSecretHex, saltHex, peerId} = vector;
  const derive = (label, bytes) => Buffer.from(hkdfSync('sha256',Buffer.from(masterSecretHex,'hex'),
    Buffer.from(saltHex ?? '', 'hex'),Buffer.from(`atp-pairwise:v1:${label}:${peerId}`),bytes));
  // RFC 8410 Ed25519 and seed-only ML-DSA-65 PKCS#8, used solely by this runner.
  const privateKey = (prefix, seed) => createPrivateKey({
    key: Buffer.concat([Buffer.from(prefix,'hex'),seed]), format:'der',type:'pkcs8'});
  const ed = privateKey('302e020100300506032b657004220420',derive('ed25519',32));
  const pq = privateKey('3034020100300b060960864801650304031204228020',derive('ml-dsa-65',32));
  const edPublic = createPublicKey(ed);
  const pqPublic = createPublicKey(pq);
  const pqDer = pqPublic.export({format:'der',type:'spki'});
  assert.equal(pqDer.subarray(0,-1952).toString('hex'),'308207b2300b0609608648016503040312038207a100');
  const parts = ['p_'+derive('path',16).toString('hex'),e1(edPublic.export({format:'jwk'}).x),
    pq1(pqDer.subarray(-1952).toString('base64url'))];
  return {ed,pq,edPublic,pqPublic,parts};
}
for (const v of vectors.rootIdentifiers) {
  assert.equal('did:atp:'+v.domain,v.did); assert(syntax(v.did)); checks.push(v.description);
}
for (const v of vectors.pathIdentifiers) {
  const ed = Buffer.from(v.ed25519PublicKeyHex,'hex');
  const pq = Buffer.from(v.mlDsa65PublicKeyHex,'hex');
  assert.equal(ed.length,32); assert.equal(pq.length,1952);
  assert.equal(ed.toString('base64url'),v.ed25519Jwk.x);
  assert.equal(pq.toString('base64url'),v.mlDsa65Jwk.pub);
  const parts = [e1(v.ed25519Jwk.x),pq1(v.mlDsa65Jwk.pub)];
  assert.deepEqual(parts,[v.e1,v.pq1]);
  assert.equal(['did','atp',v.domain,...v.path,...parts].join(':'),v.did);
  assert(syntax(v.did)); checks.push(v.description);
}
const pairs = vectors.pairwiseIdentifiers.map(v => {
  const keys = pairKeys(v);
  assert.equal(keys.parts[0],v.peerSegment);
  assert.equal(['did','atp',v.domain,...keys.parts].join(':'),v.did);
  assert.deepEqual(pairKeys(v).parts,keys.parts);
  assert(syntax(v.did)); checks.push(v.description);
  return keys;
});
for (const [i, left] of pairs.entries()) for (const right of pairs.slice(i+1))
  assert(left.parts.every((part,j)=>part!==right.parts[j]));
for (const v of vectors.invalidIdentifiers) { assert(!syntax(v.value)); checks.push(v.description); }
const [a,b] = pairs;
const challenge = Buffer.from('ATP fixture only: nonce=0001; audience=peer-a; action=read');
const edProof = sign(null,challenge,a.ed);
const pqProof = sign(null,challenge,a.pq);
const corrupt = proof => { const bad = Buffer.from(proof); bad[0] ^= 1; return bad; };
const proofChecks = [
  ['dual-valid',a.edPublic,a.pqPublic,challenge,edProof,pqProof,true],
  ['missing-classical',a.edPublic,a.pqPublic,challenge,null,pqProof,false],
  ['missing-pq',a.edPublic,a.pqPublic,challenge,edProof,null,false],
  ['bad-classical',a.edPublic,a.pqPublic,challenge,corrupt(edProof),pqProof,false],
  ['bad-pq',a.edPublic,a.pqPublic,challenge,edProof,corrupt(pqProof),false],
  ['wrong-classical-key',b.edPublic,a.pqPublic,challenge,edProof,pqProof,false],
  ['wrong-pq-key',a.edPublic,b.pqPublic,challenge,edProof,pqProof,false],
  ['changed-challenge',a.edPublic,a.pqPublic,Buffer.from('changed'),edProof,pqProof,false],
];
for (const [id,ed,pq,msg,es,ps,expected] of proofChecks)
  assert.equal(Boolean(es && ps && verify(null,msg,ed,es) && verify(null,msg,pq,ps)),expected,id);
console.log(JSON.stringify({node:process.version, publishedVectors:checks, primitiveProofControls:proofChecks.map(v=>v[0])},null,2));
