( function () {
    'use strict';

    const officialSelector = 'a[href*="://ark.wiki.gg/"]';
    const badSelector = [
        'a[href*="://ark.fandom.com"]',
        'a[href*="://ark.gamepedia.com"]'
    ].join( ', ' );


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


    // Looks for a search result for the official ARK Wiki at ark.wiki.gg
    function findNextOfficialWikiResult( oldElement ) {
        for ( const node of document.querySelectorAll( officialSelector ) ) {
            if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
                return findRightParent( node );
            }
        }
        return null;
    }


    // Replaces a Fandom result with an official wiki result or a placeholder
    function filterResult( linkElement ) {
        // If no parent, skip - means we've already processed this
        if ( linkElement.parentElement ) {
            // Find result container
            const oldElement = findRightParent( linkElement );
            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( oldElement );
                if ( officialResult ) {
                    // Move the official result before this one
                    //officialResult.container.insertBefore( officialResult.next, officialResult.previous );
                    oldElement.parentNode.insertBefore( officialResult, oldElement );
                } else {
                    // Insert a placeholder before this result
                    const newElement = document.createElement( 'span' );
                    newElement.innerHTML = 'Result from ARK Fandom hidden by ARK Wiki Redirection';
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
    function rewriteResult( linkElement ) {
        function rewriteLink( link ) {
            if ( link.tagName.toLowerCase() == 'a' ) {
                if ( link.href.startsWith( '/url?' ) ) {
                    link.href = ( new URLSearchParams( link.href ) ).get( 'url' );
                } else {
                    link.href = link.href.replace( 'ark.fandom.com', 'ark.wiki.gg' );
                }
                if ( link.getAttribute( 'data-jsarwt' ) ) {
                    link.setAttribute( 'data-jsarwt', '0' );
                }
            }
        }


        function rewriteText( text ) {
            return text.replace( /ARK: Survival Evolved Wiki (-|\|) Fandom/i, 'ARK Official Community Wiki' );
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
                        cite.firstChild.textContent = cite.firstChild.textContent.replace( 'ark.fandom.com', 'ark.wiki.gg' );
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
                        .replace( 'site:ark.fandom.com', 'site:ark.wiki.gg' );
                    moreResults.innerText = moreResults.innerText.replace( 'fandom.com', 'wiki.gg' );
                }
            }
        }
    }


    const storage = chrome && chrome.storage || window.storage,
        defaults = {
            searchMode: 'rewrite'
        };
    storage.local.get( [ 'searchMode' ], result => {
        switch ( ( result || defaults ).searchMode || 'rewrite' ) {
            case 'filter':
                document.querySelectorAll( badSelector ).forEach( element => filterResult( element ) );
                break;
            case 'rewrite':
                document.querySelectorAll( badSelector ).forEach( element => rewriteResult( element ) );
                break;
        }
    } );
} )();