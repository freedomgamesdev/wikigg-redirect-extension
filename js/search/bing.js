'use strict';


import { getWikis } from '../util.js';
import {
    GenericSearchModule,
    prepareWikisInfo,
    crawlUntilParentFound,
    awaitElement,
    RewriteUtil
} from './baseSearch.js';
import { constructRedirectBadge, constructReplacementMarker } from './components.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


class DdgSearchModule extends GenericSearchModule {
    ENGINE_LAYOUT_SELECTOR = '#b_results';
    RESULT_CONTAINER_SELECTOR = 'li.b_algo, div.slide';
    ORDINARY_RESULT_CLASS_NAME = 'b_algo';
    URL_ELEMENT_SELECTOR = 'h2#b_topTitle';
    SPAN_TITLE_ELEMENT_SELECTOR = 'h2 > a';
    ANCHOR_ELEMENT_SELECTOR = 'div > cite';
    NETWORK_NAME_ELEMENT_SELECTOR = '.tptt';
    BLACKLIST = 'slide'; // TODO: This should be a list
    /**
     * @protected
     * @return {string}
     */
    getId() {
        return 'ddg';
    }


    /**
     * Finds a general result container for a given element, if any.
     *
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        return crawlUntilParentFound( element, this.RESULT_CONTAINER_SELECTOR );
    }

    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} boundaryElement
     * @return {HTMLElement?}
     */

    findNearestGgResult( wikiInfo, boundaryElement ) {
        for ( const node of document.querySelectorAll( wikiInfo.search.goodSelector ) ) {
            if ( this.isBlacklisted( node ) && ( node.compareDocumentPosition( boundaryElement ) & 0x02 ) ) {
                return crawlUntilParentFound( node, this.RESULT_CONTAINER_SELECTOR );
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
        // This is just a placeholder, what if we had different elements?
        if ( containerElement.classList.contains( this.ORDINARY_RESULT_CLASS_NAME ) ) {

            // Try to find the first wiki.gg result after this one
            const ggResult = this.findNearestGgResult( wikiInfo, containerElement );

            let replacement;
            if ( ggResult ) {
                replacement = ggResult;
            } else {
                replacement = constructReplacementMarker( wikiInfo );
            }
	    containerElement.textContent = '';
            containerElement.append( replacement );
        } else {
	    containerElement.style.display = 'none';
        }

    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async replaceResult( wikiInfo, containerElement, _foundLinkElement ) {
        // Rewrite anchor href links
        for ( const a of containerElement.getElementsByTagName( 'a' ) ) {
            RewriteUtil.doLink( wikiInfo, a );
        }

        // Rewrite title and append a badge
        // TODO: Maybe use All just incase that we get more elements
        const titleSpan = containerElement.querySelector( this.SPAN_TITLE_ELEMENT_SELECTOR );
        if ( wikiInfo.search.titlePattern.test( titleSpan.textContent ) ) {
            RewriteUtil.doH3( wikiInfo, titleSpan );
        }

        // Insert our badge
        const badgeElement = constructRedirectBadge( {
            allMoved: true,
            theme: {
                fontSize: '60%',
                color: '#222'
            }
        } );
        titleSpan.appendChild( badgeElement );

        // Rewrite URL breadcrumb
        for ( const url of containerElement.querySelectorAll( this.ANCHOR_ELEMENT_SELECTOR ) ) {
            RewriteUtil.doUrlSpan( wikiInfo, url );
        }

        // Rewrite network name
        containerElement.querySelector( this.NETWORK_NAME_ELEMENT_SELECTOR ).textContent = 'wiki.gg';
    }
}

DdgSearchModule.invoke( wikis );
