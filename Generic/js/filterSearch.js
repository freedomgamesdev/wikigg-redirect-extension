( function () {
    'use strict';

    const wikis = [
        // TODO: share this list with other parts of the extension
        { id: 'ark', name: 'ARK: Survival Evolved', int: {
            newTitle: 'ARK Official Community Wiki'
        } },
        { id: 'aether', name: 'Aether Mod', int: { } },
        { id: 'astroneer', name: 'Astroneer', int: { } },
        { id: 'beforedarknessfalls', name: 'Before Darkness Falls', int: { } },
        { id: 'coromon', name: 'Coromon', int: { } },
        { id: 'cosmoteer', name: 'Cosmoteer', int: { } },
        { id: 'cuphead', name: 'Cuphead', int: { } },
        { id: 'darkdeity', name: 'Dark Deity', int: { } },
        { id: 'deeprockgalactic', name: 'Deep Rock Galactic', int: { } },
        { id: 'dreamscaper', name: 'Dreamscaper', int: { } },
        { id: 'fiendfolio', name: 'Fiend Folio', int: { } },
        { id: 'foxhole', name: 'Foxhole', int: { } },
        { id: 'haveanicedeath', name: 'Have a Nice Death', int: { } },
        { id: 'legiontd2', name: 'Legion TD2', int: { } },
        { id: 'noita', name: 'Noita', unofficial: true, int: { } },
        { id: 'projectarrhythmia', name: 'Project Arrhythmia', int: { } },
        { id: 'sandsofaura', name: 'Sands of Aura', int: { } },
        { id: 'seaofthieves', name: 'Sea of Thieves', int: { } },
        { id: 'sonsoftheforest', name: 'Sons of the Forest', int: { } },
        { id: 'steamworld', name: 'Steamworld', int: { } },
        { id: 'temtem', name: 'Temtem', int: { } },
        { id: 'terraria', name: 'Terraria', int: { } },
        { id: 'calamitymod', name: 'Calamity Mod', int: { } },
        { id: 'thoriummod', name: 'Thorium Mod', int: { } },
        { id: 'tboiepiphany', name: 'TBOI: Epiphany', int: { } },
        { id: 'forgottenfables', name: 'TBOI: Forgotten Fables', int: { } },
        { id: 'tboirevelations', name: 'TBOI: Revelations', int: { } },
        { id: 'totherescue', name: 'To The Rescue', int: { } },
        { id: 'undermine', name: 'UnderMine', int: { } },
        { id: 'loathing', name: 'Wiki of Loathing', int: {
            oldName: 'West of Loathing'
        } },
        { id: 'willyousnail', name: 'Will You Snail?', int: { } },

    ];


    // Build title patterns if not already given
    for ( const wiki of wikis ) {
        if ( !wiki.int.titlePattern ) {
            wiki.int.titlePattern = new RegExp( `${wiki.int.oldName || wiki.name} (Wiki|Fandom) (-|\\|) Fandom`, 'i' );
        }
        if ( !wiki.int.placeholderTitle ) {
            wiki.int.placeholderTitle = `${wiki.int.oldName || wiki.name} Fandom`;
        }
        if ( !wiki.int.newTitle ) {
            wiki.int.newTitle = ( wiki.unofficial ? '' : 'Official ' ) + `${wiki.name} Wiki`;
        }
    }


    // Build selectors
    for ( const wiki of wikis ) {
        wiki.int.goodSelector = 'a[href*="://' + wiki.id + '.wiki.gg"]';
        wiki.int.badSelector = [
            'a[href*="://' + wiki.id + '.fandom.com"]',
            'a[href*="://' + wiki.id + '.gamepedia.com"]'
        ].join( ', ' );
    }


    // Looks for a search result container by walking an element's parents
    function findRightParent( element, maxDepth = 10 ) {
        if ( maxDepth > 0 && element.parentElement ) {
            if ( element.classList.contains( 'g' ) ) {
                return element;
            }
            return findRightParent( element.parentElement, maxDepth - 1 );
        }
        return null;
    }


    // Looks for a search result for a wiki.gg wiki
    function findNextOfficialWikiResult( wiki, oldElement ) {
        for ( const node of document.querySelectorAll( wiki.int.goodSelector ) ) {
            if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
                return findRightParent( node );
            }
        }
        return null;
    }


    // Replaces a Fandom result with an official wiki result or a placeholder
    function filterResult( wiki, linkElement ) {
        // If no parent, skip - means we've already processed this
        if ( linkElement.parentElement ) {
            // Find result container
            const oldElement = findRightParent( linkElement );
            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement );
                if ( officialResult ) {
                    // Move the official result before this one
                    oldElement.parentNode.insertBefore( officialResult, oldElement );
                } else {
                    // Insert a placeholder before this result
                    const newElement = document.createElement( 'span' );
                    newElement.innerHTML = 'Result from ' + wiki.int.placeholderTitle + ' hidden by wiki.gg redirector';
                    newElement.style.paddingBottom = '1em';
                    newElement.style.display = 'inline-block';
                    newElement.style.color = '#5f6368';
                    oldElement.parentNode.insertBefore( newElement, oldElement );
                }
                // Delete this result
                oldElement.remove();
            }
        }
    }


    // Rewrites a Fandom result to an official wiki link to help users switch
    function rewriteResult( wiki, linkElement ) {
        function rewriteLink( link ) {
            if ( link.tagName.toLowerCase() == 'a' ) {
                if ( link.href.startsWith( '/url?' ) ) {
                    link.href = ( new URLSearchParams( link.href ) ).get( 'url' );
                } else {
                    link.href = link.href.replace( wiki.id + '.fandom.com', wiki.id + '.wiki.gg' );
                }
                if ( link.getAttribute( 'data-jsarwt' ) ) {
                    link.setAttribute( 'data-jsarwt', '0' );
                }
            }
        }


        function rewriteText( text ) {
            return text.replace( wiki.int.titlePattern, wiki.int.newTitle );
        }


        function rewriteH3( node ) {
            for ( const child of node.childNodes ) {
                if ( child.textContent ) {
                    child.textContent = rewriteText( child.textContent );
                } else {
                    rewriteH3( child );
                }
            }
        }


        if ( linkElement.parentElement ) {
            // Find result container
            const element = findRightParent( linkElement );
            if ( element !== null ) {
                rewriteLink( linkElement );
                // Rewrite title
                for ( const h3 of element.querySelectorAll( 'h3' ) ) {
                    rewriteH3( h3 );
                    // Insert a badge indicating the result was modified if we haven't done that already (check heading and
                    // result group)
                    if ( !element.getAttribute( 'data-ark' ) && !h3.getAttribute( 'data-ark' ) ) {
                        const badge = document.createElement( 'span' );
                        badge.innerText = 'redirected';
                        badge.style.backgroundColor = '#0002';
                        badge.style.fontSize = '90%';
                        badge.style.borderRadius = '4px';
                        badge.style.padding = '1px 6px';
                        badge.style.marginLeft = '4px';
                        badge.style.opacity = '0.6';
                        h3.parentNode.parentNode.insertBefore( badge, h3.parentNode.nextSibling );
                    }
                    // Tag heading and result group as ones we badged
                    element.setAttribute( 'data-ark', '1' );
                    h3.setAttribute( 'data-ark', '1' );
                }
                // Rewrite URL element
                for ( const cite of element.querySelectorAll( 'cite' ) ) {
                    if ( cite.firstChild.textContent ) {
                        cite.firstChild.textContent = cite.firstChild.textContent.replace( wiki.id + '.fandom.com',
                            wiki.id + '.wiki.gg' );
                    }
                }
                // Rewrite translate link
                // TODO: don't hardcode any selectors
                for ( const translate of element.querySelectorAll( '.fl.iUh30' ) ) {
                    rewriteLink( translate );
                }

                // Look for "More results from" in this result group and switch them onto wiki.gg
                for ( const moreResults of element.querySelectorAll( 'a.fl[href*="site:fandom.com"]' ) ) {
                    moreResults.href = moreResults.href.replace( 'site:fandom.com', 'site:wiki.gg' )
                        .replace( 'site:'+wiki.id+'.fandom.com', 'site:'+wiki.id+'.wiki.gg' );
                    moreResults.innerText = moreResults.innerText.replace( 'fandom.com', 'wiki.gg' );
                }
            }
        }
    }


    const storage = chrome && chrome.storage || window.storage,
        defaults = {
            searchMode: 'rewrite',
            disabledWikis: []
        };
    storage.local.get( [ 'searchMode', 'disabledWikis' ], result => {
        for ( const wiki of wikis ) {
            if ( ( result && result.disabledWikis || defaults.disabledWikis ).indexOf( wiki.id ) >= 0 ) {
                continue;
            }

            switch ( ( result || defaults ).searchMode || 'rewrite' ) {
                case 'filter':
                    document.querySelectorAll( wiki.int.badSelector ).forEach( element => filterResult( wiki, element ) );
                    break;
                case 'rewrite':
                    document.querySelectorAll( wiki.int.badSelector ).forEach( element => rewriteResult( wiki, element ) );
                    break;
            }
        }
    } );
} )();