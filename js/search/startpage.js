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
    ENGINE_LAYOUT_SELECTOR = '.w-gl--desktop';
    RESULT_CONTAINER_SELECTOR = '.w-gl__result';
    URL_ELEMENT_SELECTOR = '.w-gl__result-url';
    SPAN_TITLE_ELEMENT_SELECTOR = '.w-gl__result-title > h3';
    BADGE_ELEMENT_SELECTOR = '.w-gl__result-title';
    ANCHOR_ELEMENT_SELECTOR = '.w-gl__result-url'; // URL breadcumb
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
		color: document.documentElement.classList.contains("startpage-html--dark" || "startpage-html--night") ? '#a7b1fc' : '#000000',
		marginBottom: '1%',
		display: 'inline-block'
            }
        } );
        containerElement.querySelector( this.BADGE_ELEMENT_SELECTOR ).appendChild( badgeElement );

        //Rewrite URL breadcrumb
        for ( const url of containerElement.querySelectorAll( this.ANCHOR_ELEMENT_SELECTOR ) ) {
            RewriteUtil.doUrlSpan( wikiInfo, url );
        }
    }
}

debugger;
document.onreadystatechange = () => {
  if (document.readyState === "complete") {
      DdgSearchModule.invoke( wikis );

  }
};
