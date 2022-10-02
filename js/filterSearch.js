( function () {
    'use strict';

    const officialSelector = 'a[href*="://ark.wiki.gg/"]';
    const badSelector = [
        'a[href*="ark.fandom.com"]',
        'a[href*="ark.gamepedia.com"]'
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


    const storage = chrome && chrome.storage || window.storage;
    storage.local.get( [ 'isSearchFilterDisabled' ], result => {
        if ( !result || !result.isSearchFilterDisabled ) {
            document.querySelectorAll( badSelector ).forEach( element => filterResult( element ) );
        }
    } );
} )();