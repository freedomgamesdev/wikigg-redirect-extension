/** @typedef {import( '../util.js' ).SiteRecord} SiteRecord */
'use strict';


import { getWikis } from '../util.js';
import {
    GenericSearchModule,
    prepareWikisInfo,
    invokeSearchModule,
    crawlUntilParentFound,
    awaitElement
} from './baseSearch.js';
import { constructRedirectBadge } from './components.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


const rewriteUtil = {
    MARKER_ATTRIBUTE: 'data-ggr-processed',


    doLink( wiki, link ) {
        if ( link.tagName.toLowerCase() === 'a' ) {
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


    doTitleText( wiki, text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
    },


    doH3( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent ) {
                child.textContent = this.doTitleText( wiki, child.textContent );
            } else {
                this.doH3( wiki, child );
            }
        }
    },


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    }
};


class GoogleSearchModule extends GenericSearchModule {
    SITE_NETWORK_TITLE_SELECTOR = 'span.VuuXrf';
    TRANSLATE_SELECTOR = '.fl.iUh30';
    MORE_FROM_NETWORK_SELECTOR = 'a.fl[href*="site:fandom.com"]';


    /**
     * Finds a general result container for a given element, if any.
     *
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        return crawlUntilParentFound( element, '.g, .xpd' );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} boundaryElement
     * @return {HTMLElement?}
     */
    findNearestGgResult( wikiInfo, boundaryElement ) {
        for ( const node of document.querySelectorAll( wikiInfo.search.goodSelector ) ) {
            if ( node.compareDocumentPosition( boundaryElement ) & 0x02 ) {
                return crawlUntilParentFound( node, '.g' );
            }
        }
        return null;
    }


    /**
     * @private
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} elementToCheck
     * @return {boolean}
     */
    _isTopLevelResult( wikiInfo, elementToCheck ) {
        const
            oldUrl = `https://${wikiInfo.oldId || wikiInfo.id}.fandom.com`,
            topLevelLinkElement = elementToCheck.querySelector( 'a[data-jsarwt="1"], a[ping]' );
        return topLevelLinkElement && !topLevelLinkElement.href.startsWith( oldUrl );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async hideResult( wikiInfo, containerElement, _foundLinkElement ) {
        if ( this._isTopLevelResult( wikiInfo, containerElement ) ) {
            super.hideResult( wikiInfo, containerElement, _foundLinkElement );
        }
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async replaceResult( wikiInfo, containerElement, foundLinkElement ) {
        const oldDomain = `${wikiInfo.oldId || wikiInfo.id}.fandom.com`,
            newDomain = `${wikiInfo.id}.wiki.gg`;
        const isMobile = containerElement.classList.contains( 'xpd' ),
            isTopLevel = isMobile || this._isTopLevelResult( wikiInfo, containerElement );

        // Rewrite title
        for ( const h3 of containerElement.getElementsByTagName( 'h3' ) ) {
            rewriteUtil.doH3( wikiInfo, h3 );
            // Insert a badge indicating the result was modified if we haven't done that already (check heading and
            // result group)
            if ( !networkHeader && !rewriteUtil.isLocked( containerElement ) && !rewriteUtil.isLocked( h3 ) ) {
                const badgeElement = constructRedirectBadge( {
                    isGoogleMobile: isMobile,
                    allMoved: isTopLevel
                } );
                h3.parentNode.parentNode.insertBefore( badgeElement, h3.parentNode.nextSibling );
            }
            // Tag heading and result group as ones we badged
            rewriteUtil.lock( containerElement );
            rewriteUtil.lock( h3 );
        }
        // Rewrite the main link
        rewriteUtil.doLink( wikiInfo, linkElement );
        // Rewrite the network header
        const networkHeader = containerElement.querySelector( this.SITE_NETWORK_TITLE_SELECTOR );
        if ( networkHeader ) {
            const badgeElement = constructRedirectBadge( {
                isGoogleMobile: isMobile,
                allMoved: isTopLevel
            } );
            networkHeader.textContent = 'wiki.gg';
            networkHeader.appendChild( badgeElement );
            rewriteUtil.lock( networkHeader );
        }
        // Rewrite translate link
        for ( const translate of containerElement.querySelectorAll( this.TRANSLATE_SELECTOR ) ) {
            rewriteUtil.doLink( wikiInfo, translate );
        }
        // Rewrite URL element
        if ( !isMobile ) {
            for ( const cite of containerElement.getElementsByTagName( 'cite' ) ) {
                if ( cite.firstChild.textContent ) {
                    cite.firstChild.textContent = cite.firstChild.textContent.replace( oldDomain, newDomain );
                }
            }
        } else {
            const mobileBreadcrumb = containerElement.querySelector( '.sCuL3 > div' );
            if ( mobileBreadcrumb ) {
                mobileBreadcrumb.textContent = mobileBreadcrumb.textContent.replace( oldDomain, newDomain );
            }
        }

        // Look for "More results from" in this result group and switch them onto wiki.gg
        for ( const moreResults of containerElement.querySelectorAll( this.MORE_FROM_NETWORK_SELECTOR ) ) {
            moreResults.href = moreResults.href.replace( 'site:fandom.com', 'site:wiki.gg' )
                .replace( `site:${wikiInfo.oldId || wikiInfo.id}.fandom.com`, `site:${wikiInfo.id}.wiki.gg` );
            moreResults.innerText = moreResults.innerText.replace( 'fandom.com', 'wiki.gg' );
        }
    }
}


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
                                results => GoogleSearchModule.invoke( wikis, results )
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
GoogleSearchModule.invoke( wikis, results );
