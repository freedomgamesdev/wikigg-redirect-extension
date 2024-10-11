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
    ENGINE_LAYOUT_SELECTOR = '.w-gl--desktop, .w-gl';
    RESULT_CONTAINER_SELECTOR = '.w-gl__result, .result';
    SPAN_TITLE_ELEMENT_SELECTOR = '.w-gl__result-title > h3, .result-title > h2';
    BADGE_ELEMENT_SELECTOR = this.SPAN_TITLE_ELEMENT_SELECTOR;
    // Element that will hold the badge.
    ANCHOR_ELEMENT_SELECTOR = '.w-gl__result-url, .css-1su0nhd > span, .css-1qvmgy0 > span';
    // URL breadcumb
    DARK_THEMES = [ 'startpage-html--dark', 'startpage-html--night' ];
    
    /**
     * @protected
     * @return {string}
     */
    getId() {
        return 'startpage';
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
            if ( node.compareDocumentPosition( boundaryElement ) & 0x02 ) {
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
        super.hideResult( wikiInfo, containerElement, _foundLinkElement );
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
                fontSize: '80%',
                color: Array.from( document.documentElement.classList ).some( _class => this.DARK_THEMES.includes( _class ) ) ? '#a7b1fc' : '#000000',
                marginBottom: '1%',
                display: 'inline-block'
            }
        } );
        containerElement.querySelector( this.BADGE_ELEMENT_SELECTOR ).appendChild( badgeElement );

        // Rewrite URL breadcrumb
        for ( const url of containerElement.querySelectorAll( this.ANCHOR_ELEMENT_SELECTOR ) ) {
            RewriteUtil.doUrlSpan( wikiInfo, url );
        }
    }
}


document.addEventListener( 'readystatechange', event => {
    if ( event.target.readyState === 'complete' ) {
        DdgSearchModule.invoke( wikis );
    }
    
} );
