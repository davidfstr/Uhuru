#!/usr/bin/env python3

import json

rtk_path = '../src/RTK.tsv'
rtk_content = open(rtk_path, 'r', encoding='utf-8').read()

rtk_lines = rtk_content.strip().split('\n')
rtk_lines = [line.split('\t') for line in rtk_lines]
kanji_infos = [{'c': line[0], 'k': line[1], 'hn': int(line[4])} for line in rtk_lines] # kanji, keyword, heisig_number
info_for_c = {info['c'] : info for info in kanji_infos}

rtk_db_path = './rtk_db.json'
with open(rtk_db_path, 'w', encoding='utf-8') as rtk_db:
    json.dump(
        info_for_c, rtk_db,
        ensure_ascii=False,
        separators=(',',':'))
