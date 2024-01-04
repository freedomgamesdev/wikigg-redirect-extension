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
    ENGINE_RESULT_CONTAINER_SELECTOR: '.serp-item_card',
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
        element.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
        element.style.color = '#5f6368';
        element.classList.add( 'filter_badge' );
        element.style.padding = '0px 0px 1em 10px';
        element.style.display = 'block';
        return element;
    },


    run( wiki, linkElement ) {
        if ( linkElement.parentElement && document.querySelector( this.ENGINE_LAYOUT_SELECTOR ).contains( linkElement ) ) {
            // Find result container
            const oldElement = linkElement.closest( this.ENGINE_RESULT_CONTAINER_SELECTOR );
            // If we're hidden - skip, we were already here
            if ( oldElement.style.display === 'none' ) {
                return;
            }

            // Verify that the top-level result is a link to the same wiki
            const topLevelLinkElement = oldElement.querySelector( this.ANCHOR_ELEMENT_SELECTOR );
            if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                return;
            }

            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, this.ENGINE_RESULT_CONTAINER_SELECTOR );
                if ( officialResult ) {
                    // Move the official result before this one
                    const resultContainer = document.querySelector( this.ENGINE_LAYOUT_SELECTOR );
                    resultContainer.insertBefore( officialResult, oldElement );
                }
            } else {
                // Insert a placeholder before this result
                const resultContainer = document.querySelector( this.ENGINE_LAYOUT_SELECTOR );
                resultContainer.insertBefore( this.makePlaceholderElement( wiki ), oldElement );
            }

            // Hides the main result element
            oldElement.style.display = 'none';
            // Creates a placeholder indicating the user that we removed the result
            oldElement.parentElement.prepend( this.makePlaceholderElement( wiki ), oldElement );
            this.lock( linkElement );
        }
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: '.serp-list_left_yes',
    ENGINE_RESULT_CONTAINER_SELECTOR: '.serp-item_card',
    URL_ELEMENT_SELECTOR: '.Organic-Subtitle  b',
    TITLE_ELEMENT_SELECTOR: '.OrganicTitleContentSpan',
    BADGE_ELEMENT_SELECTOR: '.organic__title-wrapper',
    ANCHOR_ELEMENT_SELECTOR: '.organic__url',


    makeBadgeElement( isTopLevel ) {
        const out = document.createElement( 'span' );
        out.innerText = isTopLevel ? 'redirected' : 'some redirected';
        out.style.backgroundColor = document.querySelector( "meta[name='color-scheme'" ).content === 'dark'
            ? '#ffffff'
            : '#0002';
        out.style.color = '#232323';
        out.style.fontSize = '70%';
        out.style.borderRadius = '4px';
        out.style.padding = '1px 6px';
        out.style.marginLeft = '4px';
        out.style.opacity = '0.6';
        out.style.textDecoration = 'none';
        out.style.verticalAlign = 'middle';
        out.classList.add( 'rewrite_badge' );
        return out;
    },


    rewriteLink( wiki, link ) {
        if ( link.href.startsWith( '/url?' ) ) {
            link.href = ( new URLSearchParams( link.href ) ).get( 'url' );
        } else {
            link.href = link.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
        }
    },


    rewriteText( wiki, text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
    },


    rewriteTitle( wiki, node ) {
	               node.textContent = this.rewriteText( wiki, node.textContent );
    },

    rewriteURLElement( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( /(?<=.+):\/\//.test( child.textContent ) ) {
                continue;
            }
            child.textContent = child.textContent.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
        }
    },


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },

    isLocalized( networkElement, languageCode ) {
        return networkElement.textContent.includes( languageCode );
    },

    run( wiki, linkElement ) {
        if ( linkElement !== null && !this.isLocked( linkElement ) ) {
            // Find result container
            const element = linkElement.closest( this.ENGINE_RESULT_CONTAINER_SELECTOR );

            const isTopLevel = a => {
                return a.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` );
            };

            if ( element !== null && !this.isLocked( element ) ) {
                // Rewrite anchor href links
                for ( const a of element.getElementsByTagName( 'a' ) ) {
                    this.rewriteLink( wiki, a );
                }

                // Rewrite title and append a badge
                for ( const titleElement of element.querySelectorAll( this.TITLE_ELEMENT_SELECTOR ) ) {
                    if ( !wiki.search.titlePattern.test( titleElement.textContent ) ) {
                        continue;
                    }

                    element.querySelectorAll( this.BADGE_ELEMENT_SELECTOR )[ 0 ].appendChild( this.makeBadgeElement( isTopLevel ) );
                    this.lock( titleElement.parentElement );

		    if ( !this.isLocalized( 'ru' ) ) {
                        this.rewriteTitle( wiki, titleElement );
		    }

                    this.lock( titleElement );
                }

                // Rewrite URL element
                for ( const url of element.querySelectorAll( this.URL_ELEMENT_SELECTOR ) ) {
                    this.rewriteURLElement( wiki, url );
                }

                this.lock( element );
            }
        }
    }
};

document.addEventListener('readystatechange', (event) => {
    invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) );
} );
