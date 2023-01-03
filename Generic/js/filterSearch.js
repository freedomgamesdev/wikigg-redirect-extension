'use strict';


import { getWikis } from './util.js';
import { invokeSearchModule } from './baseSearch.js';


const wikis = getWikis( false );


// Build title patterns if not already given
for ( const wiki of wikis ) {
    if ( !wiki.search.titlePattern ) {
        const escapedName = ( wiki.search.oldName || wiki.name ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
        wiki.search.titlePattern = new RegExp( `(Official )?${escapedName} (Wiki|Fandom)( (-|\\|) Fandom)?$`, 'i' );
    }
    if ( !wiki.search.placeholderTitle ) {
        wiki.search.placeholderTitle = `${wiki.search.oldName || wiki.name} Fandom`;
    }
    if ( !wiki.search.newTitle ) {
        wiki.search.newTitle = ( wiki.search.official ? 'Official ' : '' ) + `${wiki.name} Wiki`;
    }
}


// Build selectors
for ( const wiki of wikis ) {
    wiki.search.goodSelector = 'a[href*="://' + wiki.id + '.wiki.gg"]';
    wiki.search.badSelector = [
        'a[href*="://' + ( wiki.oldId || wiki.id ) + '.fandom.com"]',
        'a[href*="://' + ( wiki.oldId || wiki.id ) + '.gamepedia.com"]'
    ].join( ', ' );
}


// Looks for a search result container by walking an element's parents
function findRightParent( element, cssClass, maxDepth = 10 ) {
    if ( maxDepth > 0 && element.parentElement ) {
        if ( element.classList.contains( cssClass ) ) {
            return element;
        }
        return findRightParent( element.parentElement, cssClass, maxDepth - 1 );
    }
    return null;
}


// Looks for a search result for a wiki.gg wiki
function findNextOfficialWikiResult( wiki, oldElement ) {
    for ( const node of document.querySelectorAll( wiki.search.goodSelector ) ) {
        if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
            return findRightParent( node, 'g' );
        }
    }
    return null;
}


// Replaces a Fandom result with an official wiki result or a placeholder
function filterResult( wiki, linkElement ) {
    // If no parent, skip - means we've already processed this
    if ( linkElement.parentElement ) {
        // Find result container
        const oldElement = findRightParent( linkElement, 'g' );
        
        // Verify that the top-level result is a link the same wiki
        const topLevelLinkElement = oldElement.querySelector( 'a[data-jsarwt="1"], a[ping]' );
        if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
            return;
        }

        if ( oldElement !== null ) {
            // Find an official wiki result after this one
            const officialResult = findNextOfficialWikiResult( wiki, oldElement );
            if ( officialResult ) {
                // Move the official result before this one
                oldElement.parentNode.insertBefore( officialResult, oldElement );
            } else {
                // Insert a placeholder before this result
                const newElement = document.createElement( 'span' );
                newElement.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
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
                link.href = link.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
            }
            if ( link.getAttribute( 'data-jsarwt' ) ) {
                link.setAttribute( 'data-jsarwt', '0' );
            }
            if ( link.getAttribute( 'ping' ) ) {
                link.setAttribute( 'ping', null );
            }
        }
    }


    function rewriteText( text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
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
        const element = findRightParent( linkElement, 'g' );

        // Verify that the top-level result is a link the same wiki
        const topLevelLinkElement = element.querySelector( 'a[data-jsarwt="1"], a[ping]' );
        console.log(wiki.id, element, topLevelLinkElement, topLevelLinkElement.href);
        const isTopLevel = topLevelLinkElement && topLevelLinkElement.href.startsWith(
            `https://${wiki.oldId || wiki.id}.fandom.com` );

        if ( element !== null ) {
            rewriteLink( linkElement );
            // Rewrite title
            for ( const h3 of element.querySelectorAll( 'h3' ) ) {
                rewriteH3( h3 );
                // Insert a badge indicating the result was modified if we haven't done that already (check heading and
                // result group)
                if ( !element.getAttribute( 'data-ark' ) && !h3.getAttribute( 'data-ark' ) ) {
                    const badge = document.createElement( 'span' );
                    badge.innerText = isTopLevel ? 'redirected' : 'some redirected';
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
                    cite.firstChild.textContent = cite.firstChild.textContent.replace( `${wiki.oldId || wiki.id}.fandom.com`,
                        `${wiki.id}.wiki.gg` );
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
                    .replace( `site:${wiki.oldId || wiki.id}.fandom.com`, `site:${wiki.id}.wiki.gg` );
                moreResults.innerText = moreResults.innerText.replace( 'fandom.com', 'wiki.gg' );
            }
        }
    }
}


invokeSearchModule( wikis, rewriteResult, filterResult );
