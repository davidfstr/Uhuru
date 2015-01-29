#!/usr/bin/env python3

import json
import re

edict = open('../src/edict2', 'r', encoding='euc_jp')

_EDICT_LINE_RE = re.compile(r'^([^\[]+)(?: \[([^\]]+)])? $')
_ENTRY_ID_RE = re.compile(r'^EntL([0-9]+)X?$')
_PARENS_RE = re.compile(r'\([^)]+\)')

def parse_edict2_line(line):
    segments = line.split('/')
    header = segments[0]
    entry_id = segments[-2]
    
    glosses = segments[1:-2]
    
    m = _EDICT_LINE_RE.search(header)
    if m is None:
        raise ValueError('Could not parse header of ' + entry_id + ': ' + header)
    (kanji_list, kana_list) = m.groups()
    
    kanji_list = kanji_list.split(';')
    if kana_list:
        kana_list = kana_list.split(';')
    else:
        kana_list = []
    
    # Remove "(P)" and other pollutants
    kanji_list = [_PARENS_RE.sub('', k) for k in kanji_list]
    kana_list = [_PARENS_RE.sub('', k) for k in kana_list]
    
    m = _ENTRY_ID_RE.search(entry_id)
    entry_id = m.group(1)
    
    return {
        'kanjis': kanji_list,
        'kanas': kana_list,
        'glosses': glosses,
        'id': entry_id
    }

# Can we parse everything?
edict.readline() # skip header
entries = []
for line in edict:
    entries.append(parse_edict2_line(line))

"""
from pprint import pprint
line = '座 [ざ] /(n,n-suf) (1) seat/place/position/(2) status/(3) gathering/group/(4) stand/pedestal/platform/(5) (historical) trade guild/(suf) (6) attaches to the names of theatres, theatrical troupes, and constellations/(suf,ctr) (7) (See 里神楽) counter for theatres, deities, Buddhist images, tall mountains, and satokagura songs/(P)/EntL1291770X/\n'
pprint(parse_edict2_line(line))
"""

# ------------------------------------------------------------------------------
# Prefix Tree

prefix_tree_root = {}

def add_to_prefix_tree(kanji, entry_id):
    parent = prefix_tree_root
    for c in kanji:
        child = parent.get(c)
        if child is None:
            child = {}
            parent[c] = child
        parent = child
    
    matches = parent.get('@', [])
    matches.append(entry_id)
    parent['@'] = matches

for entry in entries:
    for kanji in entry['kanjis']:
        add_to_prefix_tree(kanji, entry['id'])
    for kana in entry['kanas']:
        add_to_prefix_tree(kana, entry['id'])

with open('prefix_tree.json', 'w', encoding='utf-8') as prefix_tree_file:
    json.dump(
        prefix_tree_root, prefix_tree_file,
        ensure_ascii=False,
        separators=(',',':'))

# ------------------------------------------------------------------------------
# Entry List

edict_entries = {entry['id'] : entry for entry in entries}
with open('edict_entries.json', 'w', encoding='utf-8') as edict_entries_file:
    json.dump(
        edict_entries, edict_entries_file,
        ensure_ascii=False,
        separators=(',',':'))
