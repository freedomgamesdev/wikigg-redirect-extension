/** @typedef {import( '../util.js' ).SiteRecord} SiteRecord */
'use strict';


import { getWikis } from '../util.js';
import {
    GenericSearchModule,
    prepareWikisInfo,
    crawlUntilParentFound,
    awaitElement,
    RewriteUtil
} from './baseSearch.js';
import { constructRedirectBadge } from './components.js';


const TRY_DEFUSE_CLICK_TRACKING = true;


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


class GoogleSearchModule extends GenericSearchModule {
    RESULTS_CONTAINER_CLASS = 'div.g';
    SITE_NETWORK_TITLE_SELECTOR = 'span.VuuXrf';
    EXTERNAL_LINK_SELECTOR = 'h3 > a.l, span > a[data-ved]';
    TRANSLATE_SELECTOR = '.fl.iUh30';
    RESULT_SIDEPANEL_SELECTOR = 'div[jsslot] > div[jsname="I3kE2c"]';
    MORE_FROM_NETWORK_SELECTOR = 'a.fl[href*="site:fandom.com"]';


    /**
     * @protected
     * @return {string}
     */
    getId() {
        return 'google';
    }


    /**
     * Finds a general result container for a given element, if any.
     *
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        const result = crawlUntilParentFound( element, '.g, .xpd' );
        // We might be in another result container, and if so, there's a table with more results
        const upperContainer = crawlUntilParentFound( result, this.RESULTS_CONTAINER_CLASS, 3 );
        return upperContainer ?? result;
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
                return crawlUntilParentFound( node, this.RESULTS_CONTAINER_CLASS );
            }
        }
        return null;
    }

    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async hideResult( wikiInfo, containerElement, _foundLinkElement ) {
        super.hideResult( wikiInfo, containerElement, _foundLinkElement );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async replaceResult( wikiInfo, containerElement, _foundLinkElement ) {
        const oldDomain = `${wikiInfo.oldId || wikiInfo.id}.fandom.com`,
            newDomain = `${wikiInfo.id}.wiki.gg`;
        const isMobile = containerElement.classList.contains( 'xpd' );

        const badgeElement = constructRedirectBadge( {
            isGoogleMobile: isMobile,
            allMoved: true
        } );

        // Rewrite the network header
        const networkHeader = containerElement.querySelector( this.SITE_NETWORK_TITLE_SELECTOR );
        if ( networkHeader ) {
            networkHeader.textContent = 'wiki.gg';
            networkHeader.appendChild( badgeElement );
        }
        // Rewrite links
        for ( const subLinkElement of containerElement.querySelectorAll( this.EXTERNAL_LINK_SELECTOR ) ) {
            RewriteUtil.doLink( wikiInfo, subLinkElement );
        }
        // Rewrite title
        for ( const h3 of containerElement.getElementsByTagName( 'h3' ) ) {
            RewriteUtil.doH3( wikiInfo, h3 );
            // Insert a badge indicating the result was modified if we haven't done that already (check heading and
            // result group)
            if ( !badgeElement.parentElement ) {
                h3.parentNode.parentNode.insertBefore( badgeElement, h3.parentNode.nextSibling );
            }
        }
        // Rewrite translate link
        for ( const translate of containerElement.querySelectorAll( this.TRANSLATE_SELECTOR ) ) {
            RewriteUtil.doLink( wikiInfo, translate );
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
        // Hide the side-panel button - there's no point in attempting to rewrite it
        const sidePanelButton = containerElement.querySelector( this.RESULT_SIDEPANEL_SELECTOR );
        if ( sidePanelButton ) {
            sidePanelButton.style.display = 'none';
        }

        if ( TRY_DEFUSE_CLICK_TRACKING ) {
            containerElement.addEventListener( 'click', event => event.stopPropagation() );
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
GoogleSearchModule.invoke( wikis );
