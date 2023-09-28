'use strict';


import { getWikis } from './util.js';
import {
    prepareWikisInfo,
    invokeSearchModule,
    crawlUntilParentFound,
    awaitElement
} from './baseSearch.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


// Looks for a search result for a wiki.gg wiki
function findNextOfficialWikiResult( wiki, oldElement ) {
    for ( const node of document.querySelectorAll( wiki.search.goodSelector ) ) {
        if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
            return crawlUntilParentFound( node, '.g' );
        }
    }
    return null;
}


// Replaces a Fandom result with an official wiki result or a placeholder
const filter = {
    makePlaceholderElement( wiki ) {
        const element = document.createElement( 'span' );
        element.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
        element.style.paddingBottom = '1em';
        element.style.display = 'inline-block';
        element.style.color = '#5f6368';
        return element;
    },


    run( wiki, linkElement ) {
        // If no parent, skip - means we've already processed this
        if ( linkElement.parentElement ) {
            // Find result container
            const oldElement = crawlUntilParentFound( linkElement, '.g' );

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
                    oldElement.parentNode.insertBefore( this.makePlaceholderElement( wiki ), oldElement );
                }
                // Delete this result
                oldElement.remove();
            }
        }
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch
const rewrite = {
    MARKER_ATTRIBUTE: 'data-ark',
    // TODO: do not hardcode any selectors!
    SITE_NETWORK_TITLE_SELECTOR: 'span.VuuXrf',
    TRANSLATE_SELECTOR: '.fl.iUh30',
    MORE_FROM_NETWORK_SELECTOR: 'a.fl[href*="site:fandom.com"]',



    makeBadgeElement( isMobile, isTopLevel ) {
        const out = document.createElement( 'span' );
        out.textContent = isTopLevel ? 'redirected' : 'some redirected';
        out.style.backgroundColor = '#0002';
        out.style.fontSize = '90%';
        out.style.borderRadius = '4px';
        out.style.padding = '1px 6px';
        if ( !isMobile ) {
            out.style.marginLeft = '4px';
        }
        out.style.opacity = '0.6';
        return out;
    },


    rewriteLink( wiki, link ) {
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
    },


    rewriteText( wiki, text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
    },


    rewriteH3( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent ) {
                child.textContent = this.rewriteText( wiki, child.textContent );
            } else {
                this.rewriteH3( wiki, child );
            }
        }
    },

    
    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },


    run( wiki, linkElement ) {
        if ( linkElement.parentElement ) {
            // Find result container
            const element = crawlUntilParentFound( linkElement, '.g, .xpd' );
            if ( element === null ) {
                return;
            }

            const oldDomain = `${wiki.oldId || wiki.id}.fandom.com`,
                newDomain = `${wiki.id}.wiki.gg`;

            // Verify that the top-level result is a link the same wiki
            const isMobile = element.classList.contains( 'xpd' ),
                topLevelLinkElement = !isMobile && element.querySelector( 'a[data-jsarwt="1"], a[ping]' ),
                isTopLevel = isMobile || topLevelLinkElement && topLevelLinkElement.href.startsWith( `https://${oldDomain}` );

            if ( element !== null ) {
                const networkHeader = element.querySelector( this.SITE_NETWORK_TITLE_SELECTOR );
                if ( networkHeader ) {
                    networkHeader.innerText = 'wiki.gg';
                    networkHeader.appendChild( this.makeBadgeElement( isMobile, isTopLevel ) );
                    this.lock( networkHeader );
                }

                this.rewriteLink( wiki, linkElement );
                // Rewrite title
                for ( const h3 of element.getElementsByTagName( 'h3' ) ) {
                    this.rewriteH3( wiki, h3 );
                    // Insert a badge indicating the result was modified if we haven't done that already (check heading and
                    // result group)
                    if ( !networkHeader && !this.isLocked( element ) && !this.isLocked( h3 ) ) {
                        h3.parentNode.parentNode.insertBefore( this.makeBadgeElement( isMobile, isTopLevel ), h3.parentNode.nextSibling );
                    }
                    // Tag heading and result group as ones we badged
                    this.lock( element );
                    this.lock( h3 );
                }
                // Rewrite URL element
                if ( !isMobile ) {
                    for ( const cite of element.getElementsByTagName( 'cite' ) ) {
                        if ( cite.firstChild.textContent ) {
                            cite.firstChild.textContent = cite.firstChild.textContent.replace( oldDomain, newDomain );
                        }
                    }
                } else {
                    const mobileBreadcrumb = element.querySelector( '.sCuL3 > div' );
                    if ( mobileBreadcrumb ) {
                        mobileBreadcrumb.textContent = mobileBreadcrumb.textContent.replace( oldDomain, newDomain );
                    }
                }
                // Rewrite translate link
                for ( const translate of element.querySelectorAll( this.TRANSLATE_SELECTOR ) ) {
                    this.rewriteLink( wiki, translate );
                }

                // Look for "More results from" in this result group and switch them onto wiki.gg
                for ( const moreResults of element.querySelectorAll( this.MORE_FROM_NETWORK_SELECTOR ) ) {
                    moreResults.href = moreResults.href.replace( 'site:fandom.com', 'site:wiki.gg' )
                        .replace( `site:${wiki.oldId || wiki.id}.fandom.com`, `site:${wiki.id}.wiki.gg` );
                    moreResults.innerText = moreResults.innerText.replace( 'fandom.com', 'wiki.gg' );
                }
            }
        }
    }
};


// Set up an observer for dynamically loaded results
const bottomStuff = document.querySelector( '#botstuff > div' );
if ( bottomStuff ) {
    awaitElement(
        bottomStuff,
        '[jscontroller="ogmBcd"] > [data-async-rclass="search"] + div',
        dynContainer => {
            const dynamicObserver = new MutationObserver( updates => {
                for ( const update of updates ) {
                    if ( update.addedNodes && update.addedNodes.length > 0 ) {
                        for ( const addedNode of update.addedNodes ) {
                            // This container shows up before the results are built/added to the DOM
                            awaitElement(
                                addedNode,
                                'div',
                                results => invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ), results )
                            );
                        }
                    }
                }
            } );
            dynamicObserver.observe( dynContainer, {
                childList: true
            } );
        }
    );
}
// Run the initial filtering
invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) );
