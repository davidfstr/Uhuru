console.log('Loading RTK database...');
$.ajax({
    url: 'rtk_db.json',
    dataType: 'json'
}).done(function(data, textStatus, jqXHR) {
    console.log('RTK database loaded.');
    window.rtkDb = data;
});

console.log('Loading prefix tree...');
$.ajax({
    url: 'prefix_tree.json',
    dataType: 'json'
}).done(function(data, textStatus, jqXHR) {
    console.log('Prefix tree loaded.');
    window.prefixTreeRoot = data;
});

console.log('Loading EDICT entries...');
$.ajax({
    url: 'edict_entries.json',
    dataType: 'json'
}).done(function(data, textStatus, jqXHR) {
    console.log('EDICT entries loaded.');
    window.edictEntries = data;
});

console.log('Loading stops...');
$.ajax({
    url: 'stops.json',
    dataType: 'json'
}).done(function(data, textStatus, jqXHR) {
    console.log('Stops loaded.');
    window.stops = data;
});

$(function() {
    function setDialogueText(dialogueText) {
        // Wrap all dialogue characters in spans to make them hoverable
        var dialogueHtml = dialogueText
            // TODO: Disallow HTML injection
            .replace(/([^\n])/g, '<span>$1</span>')
            .replace(/\n/g, '<br/>');
        $('#dialogue').html(dialogueHtml);
        
        // Detect hover
        $('#dialogue span').on('mouseenter', onDialogueSpanMouseenter);
        
        window.localStorage['dialogue'] = dialogueText;
    }
    
    // -----------------------------------------------------------------
    // Event: Dialogue Span Hovers
    
    var lastSelectedSpans = [];
    
    function onDialogueSpanMouseenter(e) {
        // Lookup the associated kanji.
        lookupKanjiForDialogueSpan(e.target);
        // Lookup the associated word.
        var word = lookupWordForDialogueSpan(e.target);
        
        // Find new spans to select
        var selectedSpans = [];
        var curSpan = $(e.target);
        for (var i = 0; i < word.length; i++) {
            selectedSpans.push(curSpan);
            curSpan = curSpan.next();
        }
        
        // Update selected spans
        _.each(lastSelectedSpans, function(s) {
            s.removeClass('selected');
        });
        _.each(selectedSpans, function(s) {
            s.addClass('selected');
        });
        lastSelectedSpans = selectedSpans;
    };
    
    // -----------------------------------------------------------------
    // Side Panel Updates
    
    function lookupKanjiForDialogueSpan(target) {
        var c = $(target).text();
        
        var info;
        if (window.stops.indexOf(c) !== -1) {
            info = {'k': '\u3000', 'c': '\u3000', 'hn': 0};
        } else {
            info = window.rtkDb && window.rtkDb[c];
            if (!info) {
                info = {'k': '?', 'c': c, 'hn': 0}
            }
        }
        
        $('#kanji-info #keyword').text(info['k']);
        $('#kanji-info #kanji').text(info['c']);
        $('#kanji-info #nr').text(info['hn']);
        
        return c;
    }
    
    function lookupWordForDialogueSpan(target) {
        // Find the character, and all characters after it
        var characters = [];
        var curSpan = $(target);
        while (curSpan.length > 0) {
            characters.push(curSpan.text());
            curSpan = curSpan.next();
        }
        
        // Find longest prefix of 'characters' that is a word
        var matchWord = '';
        var matchEntryIds = ['0'];
        var parent = window.prefixTreeRoot;
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
            return window.edictEntries[entryId] || {
                'kanjis': [],
                'kanas': [],
                'glosses': [],
                'id': '0'
            };
        });
        
        // Update word info box with entry data
        $('#word-info #word').text(matchWord);
        // TODO: Disallow HTML injection
        $('#word-info #furigana').html(formatFuriganaForEntries(matchEntries));
        // TODO: Disallow HTML injection
        $('#word-info #definition').html(_.map(matchEntries, function(entry) {
            return formatDefinitionForEntry(entry);
        }).join('<hr/>'));
        
        return matchWord;
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
    setDialogueText(window.localStorage['dialogue'] || '');
    
    // Click the dialogue edit button?
    $('#dialogue-edit-btn').click(function() {
        if ($('#dialogue-editor').is(':visible')) {
            // Editor -> Dialogue
            setDialogueText($('#dialogue-editor').val());
        } else {
            // Dialogue -> Editor
        }
        
        // Togger editor vs. dialogue
        $('#dialogue').toggle();
        $('#dialogue-editor').toggle();
    });
});