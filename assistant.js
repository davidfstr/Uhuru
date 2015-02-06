// -----------------------------------------------------------------
// Data

var _data = {};

function loadDataAsync(varName, url, description) {
    console.log('Loading ' + description + '...');
    $.ajax({
        url: url,
        dataType: 'json'
    }).done(function(data, textStatus, jqXHR) {
        console.log('Loaded ' + description + '.');
        _data[varName] = data;
    });
}

function getData(varName) {
    return _data[varName];
}

loadDataAsync('rtkDb', 'data/rtk_db.json', 'RTK database');
loadDataAsync('prefixTreeRoot', 'data/prefix_tree.json', 'prefix tree');
loadDataAsync('edictEntries', 'data/edict_entries.json', 'EDICT entries');
loadDataAsync('stops', 'data/stops.json', 'stops');

// -----------------------------------------------------------------

$(function() {
    function setDialogueText(dialogueText) {
        // Wrap all dialogue characters in spans to make them hoverable
        var dialogueHtml = dialogueText
            // TODO: Disallow HTML injection
            .replace(/([^\n])/g, '<span>$1</span>')
            .replace(/\n/g, '<br/>');
        $('#dialogue').html(dialogueHtml);
        
        // Detect interactions with dialogue spans
        $('#dialogue span').on('mouseenter', onDialogueSpanMouseenter);
        $('#dialogue span').on('click', onDialogueSpanClick);
        
        $('#dialogue-editor').val(dialogueText);
        
        window.localStorage['dialogue'] = dialogueText;
    }
    
    // -----------------------------------------------------------------
    // Event: Dialogue Span Hover
    
    var lastSelectedSpans = [];
    
    function onDialogueSpanMouseenter(e) {
        var dialogueSpan = e.target;
        
        // Lookup the associated kanji.
        var character = $(dialogueSpan).text();
        displayKanjiInfo(character);
        
        // Lookup the associated word.
        var matchingWord = findMatchingWord(dialogueSpan);
        displayMatchingWordInfo(matchingWord);
        
        // Find new spans to select
        var selectedSpans = getSpanSequenceStartingAt(
            dialogueSpan,
            matchingWord.word.length);
        
        // Update selected spans
        _.each(lastSelectedSpans, function(s) {
            s.removeClass('hover-selected');
        });
        _.each(selectedSpans, function(s) {
            s.addClass('hover-selected');
        });
        lastSelectedSpans = selectedSpans;
    }
    
    // -----------------------------------------------------------------
    // Event: Dialogue Span Click
    
    function onDialogueSpanClick(e) {
        var dialogueSpan = e.target;
        
        var matchingWord = findMatchingWord(dialogueSpan);
        var selectedSpans = getSpanSequenceStartingAt(
            dialogueSpan,
            matchingWord.word.length);
        
        if (selectedSpans[0].hasClass('click-selected')) {
            _.each(selectedSpans, function(s) {
                s.removeClass('click-selected');
                s.removeClass('click-selected-last');
            });
        } else {
            _.each(selectedSpans, function(s) {
                s.addClass('click-selected');
            });
            var lastS = selectedSpans[selectedSpans.length - 1];
            lastS.addClass('click-selected-last');
        }
        
        window.localStorage['selectedRanges'] = 
            JSON.stringify(getRangesSelectedByClick());
    }
    
    function getRangesSelectedByClick() {
        var ranges = [];
        var lastRangeStart = -1;
        
        var spans = $('#dialogue span');
        for (var i = 0; i < spans.length; i++) {
            if ($(spans[i]).hasClass('click-selected') && 
                lastRangeStart === -1)
            {
                lastRangeStart = i;
            }
            if ($(spans[i]).hasClass('click-selected-last')) {
                ranges.push([lastRangeStart, i - lastRangeStart + 1]);
                lastRangeStart = -1;
            }
        }
        
        return ranges;
    }
    
    function setRangesSelectedByClick(ranges) {
        var spans = $('#dialogue span');
        
        _.each(ranges, function(range) {
            var start = range[0];
            var length = range[1];
            for (var i = start, n = length; n > 0; i++, n--) {
                $(spans[i]).addClass('click-selected');
                if (n == 1) {
                    $(spans[i]).addClass('click-selected-last');
                }
            }
        });
        
        window.localStorage['selectedRanges'] = 
            JSON.stringify(getRangesSelectedByClick());
    }
    
    // -----------------------------------------------------------------
    // Utility
    
    function getSpanSequenceStartingAt(firstSpan, numSpans) {
        var selectedSpans = [];
        var curSpan = $(firstSpan);
        for (var i = 0; i < numSpans; i++) {
            selectedSpans.push(curSpan);
            curSpan = curSpan.next();
        }
        
        return selectedSpans;
    }
    
    // -----------------------------------------------------------------
    // Side Panel Updates
    
    function displayKanjiInfo(c) {
        var info = getKanjiInfo(c);
        
        $('#kanji-info #keyword').text(info['k']);
        $('#kanji-info #kanji').text(info['c']);
        $('#kanji-info #nr').text(info['hn']);
    }
    
    function getKanjiInfo(c) {
        var info;
        if (getData('stops').indexOf(c) !== -1) {
            info = {'k': '\u3000', 'c': '\u3000', 'hn': 0};
        } else {
            info = getData('rtkDb')[c];
            if (!info) {
                info = {'k': '?', 'c': c, 'hn': 0}
            }
        }
        return info;
    }
    
    function findMatchingWord(dialogueSpan) {
        // Find the character, and all characters after it
        var characters = [];
        var curSpan = $(dialogueSpan);
        while (curSpan.length > 0) {
            characters.push(curSpan.text());
            curSpan = curSpan.next();
        }
        
        // Find longest prefix of 'characters' that is a word
        var matchWord = '';
        var matchEntryIds = ['0'];
        var parent = getData('prefixTreeRoot');
        for (var i = 0; i<characters.length; i++) {
            var c = characters[i];
            var child = parent[c];
            if (child) {
                parent = child;
                if (parent['@']) {
                    matchWord = characters.slice(0, i + 1).join('');
                    matchEntryIds = parent['@'];
                }
            } else {
                break;
            }
        }
        
        // Lookup entries
        var matchEntries = _.map(matchEntryIds, function(entryId) {
            return getData('edictEntries')[entryId] || {
                'kanjis': [],
                'kanas': [],
                'glosses': [],
                'id': '0'
            };
        });
        
        return {
            word: matchWord,
            entries: matchEntries
        };
    }
    
    function displayMatchingWordInfo(matchingWord) {
        var matchWord = matchingWord.word;
        var matchEntries = matchingWord.entries;
        
        // Update word info box with entry data
        $('#word-info #word').text(matchWord);
        // TODO: Disallow HTML injection
        $('#word-info #furigana').html(formatFuriganaForEntries(matchEntries));
        // TODO: Disallow HTML injection
        $('#word-info #definition').html(_.map(matchEntries, function(entry) {
            return formatDefinitionForEntry(entry);
        }).join('<hr/>'));
    }
    
    function formatFuriganaForEntries(entries) {
        // Gather all unique kana
        var allKanas = [];
        _.each(entries, function(entry) {
            _.each(entry.kanas, function(kana) {
                if (allKanas.indexOf(kana) === -1) {
                    allKanas.push(kana);
                }
            });
        });
        
        return allKanas.join('、');
    }
    
    function formatDefinitionForEntry(entry) {
        var hasBullets = false;
        _.each(entry.glosses, function(gloss) {
            if (gloss.indexOf('(1)') !== -1) {
                hasBullets = true;
            }
        });
        
        var firstGloss = true;
        var insideBullets = false;
        var outputParts = _.map(entry.glosses, function(gloss) {
            var groups = gloss.match(/^(.*?)\(([0-9]+)\) (.*)$/);
            if (groups) {
                // Found a bullet
                result = '<b>' + groups[2] + '.</b> ' + groups[1] + groups[3];
                if (insideBullets) {
                    result = '<br/>' + result; // close previous bullet
                }
                
                insideBullets = true;
            } else {
                if (insideBullets) {
                    // Bullet continuation
                    result = '; ' + gloss; 
                } else {
                    // Before the first bullet
                    if (firstGloss) {
                        result = gloss;
                    } else {
                        result = '; ' + gloss;
                    }
                }
            }
            
            firstGloss = false;
            return result;
        });
        return outputParts.join('');
    }
    
    // -----------------------------------------------------------------
    // Main
    
    // Start with saved dialogue
    setDialogueText(
        window.localStorage['dialogue'] || '');
    setRangesSelectedByClick(
        window.localStorage['selectedRanges']
            ? JSON.parse(window.localStorage['selectedRanges'])
            : []);
    
    // Click the dialogue edit button?
    $('#dialogue-edit-btn').click(function() {
        if ($('#dialogue-editor').is(':visible')) {
            // Editor -> Dialogue
            setDialogueText($('#dialogue-editor').val());
            setRangesSelectedByClick([]);
        } else {
            // Dialogue -> Editor
        }
        
        // Togger editor vs. dialogue
        $('#dialogue').toggle();
        $('#dialogue-editor').toggle();
    });
    
    $('#kr-slider').slider({
        min: 0,
        max: 2042,
        value: 0
    });
    $('#kr-slider').on('slide', function(e, ui) {
        var value = ui.value;
        
        // Update slider text
        var strValue = value;
        strValue = '' + strValue;
        while (strValue.length < 4) {
            strValue = '0' + strValue;
        }
        $('#kr-slider-value').text(strValue);
        
        // Update highlighted kanji. Collect unhighlighted ones.
        var highlightedOffKanji = []
        if (value === 0) {
            $('#dialogue span').removeClass('highlight-on').removeClass('highlight-off');
        } else {
            _.each($('#dialogue span'), function(span) {
                span = $(span);
                
                var info = getKanjiInfo(span.text());
                if (info['hn'] !== 0) {
                    if (info['hn'] <= value) {
                        span.addClass('highlight-on');
                        span.removeClass('highlight-off');
                    } else {
                        span.addClass('highlight-off');
                        span.removeClass('highlight-on');
                        
                        if (highlightedOffKanji.indexOf(info['c']) === -1) {
                            highlightedOffKanji.push(info['c']);
                        }
                    }
                }
            });
        }
        
        // Sort unhighlighted kanji in Heisig order
        function sortOrderForKanji(c) {
            var info = getKanjiInfo(c);
            return info['hn'];
        }
        highlightedOffKanji.sort(function(a, b) {
            return -(sortOrderForKanji(a) - sortOrderForKanji(b));
        });
        
        // Display unhighlighted kanji
        // TODO: Always display all kanji (in increasing Heisig order) and just
        //       change the ones which are highlighted.
        $('#furigana').text(highlightedOffKanji.join(''));
    });
});