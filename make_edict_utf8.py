#!/usr/bin/env python3

edict = open('contrib/edict2', 'r', encoding='euc_jp')

with open('data/edict2-utf8.txt', 'w', encoding='utf-8') as edict_utf8:
    for line in edict:
        edict_utf8.write(line)
