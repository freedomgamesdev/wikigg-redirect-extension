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
        // Grab the parent of the result container
        let parentNode = oldElement.parentElement;
        // If the parent's parent has less than two children (so old result is "rich"), grab another parent
        if ( parentNode.parentElement.children.length <= 2 ) {
            oldElement = parentNode;
            parentNode = parentNode.parentElement;
        }

        // Walk siblings until one with an ark.wiki.gg link is found
        let nextSibling = parentNode;
        while ( ( nextSibling = nextSibling.nextElementSibling ) && nextSibling ) {
            if ( nextSibling.querySelectorAll( officialSelector ).length > 0 ) {
                return {
                    container: parentNode,
                    next: nextSibling,
                    previous: oldElement
                };
            }
        }
        return null;
    }


    // Replaces a Fandom result with an official wiki result or a placeholder
    function filterResult( linkElement, maxDepth = 10 ) {
        // If no parent, skip - means we've already processed this
        if ( linkElement.parentElement ) {
            // Find result container
            const oldElement = findRightParent( linkElement, maxDepth );
            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( oldElement );
                if ( officialResult ) {
                    // Move the official result before this one
                    officialResult.container.insertBefore( officialResult.next, officialResult.previous );
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


    const storage = window.storage || chrome.storage;
    storage.local.get( [ 'isSearchFilterDisabled' ], result => {
        if ( !result || !result.isSearchFilterDisabled ) {
            document.querySelectorAll( badSelector ).forEach( element => filterResult( element ) );
        }
    } );
} )();