#!/usr/bin/env python3

import json

from stops import stops

with open('stops.json', 'w', encoding='utf-8') as stops_file:
    json.dump(
        stops, stops_file,
        ensure_ascii=False,
        separators=(',',':'))
