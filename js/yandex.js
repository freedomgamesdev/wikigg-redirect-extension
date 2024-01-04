'use strict';


import { getWikis, getNativeSettings } from './util.js';
import {
    prepareWikisInfo,
    invokeSearchModule,
    awaitElement
} from './baseSearch.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


// Looks for a search result for a wiki.gg wiki
function findNextOfficialWikiResult( wiki, oldElement, selector ) {
    for ( const node of document.querySelectorAll( wiki.search.goodSelector ) ) {
        if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
            return node.closest( selector );
        }
    }
    return null;
}


// Replaces a Fandom result with an official wiki result or a placeholder
const filter = {
    
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: 'ul#search-result',
    ENGINE_RESULT_CONTAINER_SELECTOR:  '.serp-item_card',
    URL_ELEMENT_SELECTOR: '.Organic-Subtitle  b',
    SPAN_TITLE_ELEMENT_SELECTOR: '.OrganicTitleContentSpan',


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },


    makePlaceholderElement( wiki ) {
        const element = document.createElement( 'span' );
