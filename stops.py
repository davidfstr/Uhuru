#!/usr/bin/env python3

__all__ = ['stops']

hiragana_basic = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐをん'
hiragana_diacritic = 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゔ'
hiragana_tiny = 'っゃゅょぁぇぃぉぅ'
katakana_basic = 'アイウエオカキクケコガギグゲゴサシスセソザジズゼゾタチツテトダヂヅデドナニヌネノハヒフヘホバビブベボパピプペポマミムメモヤユヨラリルレロワヰヱヲン'
katakana_tiny = 'ッャァュェィョ一ー―ヽ'
other_tiny = '々'
fullwidth_numerals = '０１２３４５６７８９'
japanese_punct = '「」『』、…？。！～・”“♪\u3000'
control_chars = '\r\n'

# Defines known non-kanji characters
stops = hiragana_basic + hiragana_diacritic + hiragana_tiny + \
    katakana_basic + katakana_tiny + other_tiny + \
    fullwidth_numerals + japanese_punct + control_chars
