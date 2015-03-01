#!/usr/bin/env python3

import json
import re
import sys

edict = open('contrib/edict2', 'r', encoding='euc_jp')

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

print('Reading EDICT database...')
edict.readline() # skip header
entries = []
for line in edict:
    entries.append(parse_edict2_line(line))

# ------------------------------------------------------------------------------
# Inflection

from nhconj import nhconj

VERB_TYPE_RE = re.compile(r'^\((v[^)]*)\)')

# Yields inflected forms for the specified entry.
def inflect(entry):
    # If a verb, inflect it as a verb
    m = VERB_TYPE_RE.search(entry['glosses'][0])
    if m:
        verb_types = m.group(1).split(',')
        
        skip = False
        for vt in verb_types:
            if vt.startswith('vs'):
                # Ignore suru verbs and nouns that can be used with suru
                skip = True
            if vt.startswith('v2') or vt.startswith('v4') or vt.startswith('vr'):
                # Ignore archaic verb types
                skip = True
            if vt.startswith('vz'):
                # Ignore zuru verbs
                skip = True
        if skip:
            return
        
        is_ru_verb = (
            'v1' in verb_types or   # Ichidan verb
            'vz' in verb_types      # Ichidan verb - zuru verb
        )
        
        try:
            for kanji in entry['kanjis']:
                yield from inflect_verb({
                    'dict_verb': kanji,
                    'is_ru_verb': is_ru_verb
                })
            for kana in entry['kanas']:
                yield from inflect_verb({
                    'dict_verb': kana,
                    'is_ru_verb': is_ru_verb
                })
        except:
            print('Verb: %s' % entry['kanas'])
            print('Verb types: ' + ','.join(verb_types))
            raise

def inflect_verb(verb_entry):
    # Eventually we may omit the stem if all other in-the-wild
    # conjugations are identified and implemented.
    yield nhconj.stem(verb_entry)
    
    yield nhconj.long_present_aff(verb_entry)
    yield nhconj.long_present_neg(verb_entry)
    yield nhconj.long_past_aff(verb_entry)
    yield nhconj.long_past_neg(verb_entry)
    
    yield nhconj.short_present_aff(verb_entry)
    yield nhconj.short_present_neg(verb_entry)
    yield nhconj.short_past_aff(verb_entry)
    yield nhconj.short_past_neg(verb_entry)
    
    yield nhconj.potential(verb_entry)
    yield nhconj.volitional(verb_entry)
    yield nhconj.passive(verb_entry)
    
    yield nhconj.te(verb_entry)
    yield nhconj.te_neg(verb_entry)
    
    yield nhconj.tai(verb_entry)
    yield nhconj.tari(verb_entry)
    
    yield nhconj.chau(verb_entry)
    #yield nhconj.chimau(verb_entry)


# Try to inflect everything
#for entry in entries:
#    inflect(entry)

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

print('Constructing prefix tree...')
for entry in entries:
    # 12.2 MB by itself
    for kanji in entry['kanjis']:
        add_to_prefix_tree(kanji, entry['id'])
    for kana in entry['kanas']:
        add_to_prefix_tree(kana, entry['id'])
    
    # 12.7 MB with inflected forms
    for inflected_form in inflect(entry):
        add_to_prefix_tree(inflected_form, entry['id'])

print('Writing prefix tree...')
with open('data/prefix_tree.json', 'w', encoding='utf-8') as prefix_tree_file:
    json.dump(
        prefix_tree_root, prefix_tree_file,
        ensure_ascii=False,    # minify
        separators=(',',':'),  # minify
        check_circular=False)  # performance

# ------------------------------------------------------------------------------
# Entry List

if '--skip-entries' not in sys.argv:
    print('Writing EDICT entries...')
    edict_entries = {entry['id'] : entry for entry in entries}
    with open('data/edict_entries.json', 'w', encoding='utf-8') as edict_entries_file:
        json.dump(
            edict_entries, edict_entries_file,
            ensure_ascii=False,    # minify
            separators=(',',':'),  # minify
            check_circular=False)  # performance
