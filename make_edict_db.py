#!/usr/bin/env python3

import json
import re
import sys

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

print('Reading EDICT database...')
edict.readline() # skip header
entries = []
for line in edict:
    entries.append(parse_edict2_line(line))

# ------------------------------------------------------------------------------
# Inflection

VERB_TYPE_RE = re.compile(r'^\((v[^)]*)\)')

# Yields inflected forms for the specified entry.
def inflect(entry):
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
            # Yield the て-forms
            for kanji in entry['kanjis']:
                yield te_form(kanji, is_ru_verb)
            for kana in entry['kanas']:
                yield te_form(kana, is_ru_verb)
        except:
            print('Verb types: ' + ','.join(verb_types))
            raise


# Given a verb in dictionary form, returns its possible て-forms.
# Rules are based on Genki I, 2nd Ed, §6.1.
def te_form(dict_verb, is_ru_verb):
    if dict_verb[-2:] in ['する']:
        return dict_verb[:-2] + 'して'
    if dict_verb[-2:] in ['くる']:
        return dict_verb[:-2] + 'きて'
    
    if dict_verb in ['いく', '行く']:
        return dict_verb[:-1] + 'って'
    
    if dict_verb[-1] in ['る']:
        if is_ru_verb:
            return dict_verb[:-1] + 'て'
        else:
            return dict_verb[:-1] + 'って'
    
    if dict_verb[-1] in ['う', 'つ', 'る']:
        return dict_verb[:-1] + 'って'
    if dict_verb[-1] in ['む', 'ぶ', 'ぬ']:
        return dict_verb[:-1] + 'んで'
    if dict_verb[-1] in ['く']:
        return dict_verb[:-1] + 'いて'
    if dict_verb[-1] in ['ぐ']:
        return dict_verb[:-1] + 'いで'
    if dict_verb[-1] in ['す']:
        return dict_verb[:-1] + 'して'
    
    raise ValueError(
        'Expected verb in dictionary form: ' + dict_verb)


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
