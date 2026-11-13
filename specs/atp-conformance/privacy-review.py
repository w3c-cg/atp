"""Proposed ASCII-key scalar Merkle fixture, separate from the published root."""
from copy import deepcopy
from hashlib import sha256
import json

ATTRIBUTES = {
    'id': 'urn:cred:atp:conformance:1', 'name': 'Ada Lovelace',
    'role': 'engineer', 'clearance': 'secret', 'org': 'did:atp:agents.example.com',
}
def digest(data):
    return sha256(data).digest()

EMPTY = digest(b'ATP-merkle-empty')

def leaf(name, value):
    assert name.isascii() and type(value) in (str, int, bool)
    assert type(value) is not int or abs(value) <= 9007199254740991
    return digest(b'\x00' + json.dumps([name, value], ensure_ascii=False,
                                        separators=(',', ':')).encode('utf-8'))

def branch(left, right):
    return digest(b'\x01' + left + right)

def tree(attrs):
    levels = [[leaf(name, attrs[name]) for name in sorted(attrs)]]
    while len(levels[-1]) > 1:
        row = levels[-1]
        levels.append([branch(row[i], row[i+1] if i+1 < len(row) else EMPTY)
                       for i in range(0, len(row), 2)])
    return levels

def opening(attrs, name):
    index = sorted(attrs).index(name)
    path, cursor = [], index
    for row in tree(attrs)[:-1]:
        sibling = cursor ^ 1
        path.append((row[sibling] if sibling < len(row) else EMPTY).hex())
        cursor //= 2
    return {'name':name, 'value':attrs[name], 'index':index, 'path':path}

def verify_opening(proof, trusted_root, leaf_count):
    pos, width = proof['index'], leaf_count
    if not 0 <= pos < width or len(proof['path']) != (width - 1).bit_length():
        return False
    value = leaf(proof['name'], proof['value'])
    for item in proof['path']:
        other = bytes.fromhex(item)
        if len(other) != 32 or (pos ^ 1) >= width and other != EMPTY:
            return False
        value = branch(other,value) if pos & 1 else branch(value,other)
        pos, width = pos//2, (width+1)//2
    return value == trusted_root

root = tree(ATTRIBUTES)[-1][0]
name, org, role = (opening(ATTRIBUTES,k) for k in ['name','org','role'])
assert all(verify_opening(p,root,len(ATTRIBUTES)) for p in [name,org,role])
checks = {'name opening':True, 'org opening':True, 'odd node opening':True}
for field, value in [('value','Mallory'),('value',True),('name','alias'),('index',3),('path',org['path'])]:
    altered = dict(name, **{field:value})
    assert not verify_opening(altered,root,len(ATTRIBUTES))
    checks[f'tampered {field}: {type(value).__name__}'] = False
odd = deepcopy(role)
odd['path'][0] = '00'*32
assert not verify_opening(odd,root,len(ATTRIBUTES))
checks['wrong odd-node placeholder'] = False
substitute = {**ATTRIBUTES,'name':'Mallory'}
assert not verify_opening(opening(substitute,'name'),root,len(ATTRIBUTES))
checks['substituted root/opening against pinned root'] = False
print(json.dumps({'profile':'proposal-ascii-key-scalars-v0',
                  'sorted_keys':sorted(ATTRIBUTES),
                  'draft_example_indices':[1,4],
                  'sorted_zero_based_indices':[name['index'],org['index']],
                  'candidate_root':root.hex(),
                  'expected_outcomes':checks},indent=2))
