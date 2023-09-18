'use strict';


import { getWikis } from './util.js';
import {
    prepareWikisInfo,
    invokeSearchModule,
    crawlUntilParentFound
} from './baseSearch.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


// Looks for a search result for a wiki.gg wiki
function findNextOfficialWikiResult( wiki, oldElement, selector ) {
    for ( const node of document.querySelectorAll( wiki.search.goodSelector ) ) {
        if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
            return node.closest(selector)
        }
    }
    return null;
}

function assembleMutationObserver( callback, config ) {
    config = config || { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver( callback );
    observer.observe( document, config );
    return observer;

}
// Replaces a Fandom result with an official wiki result or a placeholder
const filter = {
    
    ENGINE_RESULT_SELECTOR: '.yQDlj3B5DI5YO8c8Ulio',
    ENGINE_RESULT_LIST_CONTAINER: '.react-results--main',
    URL_ELEMENT_SELECTOR: '.Wo6ZAEmESLNUuWBkbMxx',
    ANCHOR_ELEMENT_SELECTOR: '.Rn_JXVtoPVAFyGkcaXyK',
    SPAN_TITLE_ELEMENT_SELECTOR: '.EKtkFWMYpwzMKOYr0GYm',
    
    makePlaceholderElement( wiki ) {
        const element = document.createElement( 'span' );
        element.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
        element.style.paddingBottom = '1em';
        element.style.display = 'inline-block';
        element.style.color = '#5f6368';
	element.classList.add('filter_badge');
        return element;
    },


    run( wiki, linkElement ) {
            // Find result container
	const oldElement = linkElement.closest('article');

            // Verify that the top-level result is a link to the same wiki
            const topLevelLinkElement = oldElement.querySelector( this.ANCHOR_ELEMENT_SELECTOR );
            if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                return;
            }

            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, 'article' );
                if ( officialResult ) {
                    // Move the official result before this one
		    debugger;
                   document.querySelector(this.ENGINE_RESULT_LIST_CONTAINER).insertBefore( officialResult.parentNode, oldElement.parentElement );
                } else {
                    // Insert a placeholder before this result
                    oldElement.parentNode.insertBefore( this.makePlaceholderElement( wiki ), oldElement.parentNode );
                }
                // Delete this result
                oldElement.parentElement.remove();
            }
        }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: '#react-layout',
    ENGINE_RESULT_SELECTOR: 'yQDlj3B5DI5YO8c8Ulio',
    URL_ELEMENT_SELECTOR: '.Wo6ZAEmESLNUuWBkbMxx',
    SPAN_TITLE_PARENT_ELEMENT_SELECTOR: '.eVNpHGjtxRBq_gLOfGDr',
    ANCHOR_PARENT_ELEMENT_SELECTOR: '.Rn_JXVtoPVAFyGkcaXyK',
    
    makeBadgeElement( isTopLevel ) {
	console.log('Badge')
        const out = document.createElement( 'span' );
        out.innerText = isTopLevel ? 'redirected' : 'some redirected';
        out.style.backgroundColor = document.getElementsByTagName('html')[0].classList.contains('dark-bg')   ?
	    '#a7a7a7' :
	    '#0002';
	out.style.color = 'black';
        out.style.fontSize = '70%';
        out.style.borderRadius = '4px';
        out.style.padding = '1px 6px';
        out.style.marginLeft = '4px';
        out.style.opacity = '0.6';
	out.style.textDecoration = 'none';
	out.style.css = 'vertical-align: middle';
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


    rewriteSpan( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent ) {
                child.textContent = this.rewriteText( wiki, child.textContent );
            } else {
                this.rewriteSpan( wiki, child );
            }
        }
    },

    
    rewriteURLElement( wiki, node ) {
	const oldUrlRegex = new RegExp( `${wiki.oldId || wiki.id}.(:?miraheze|fandom).(:?com|org)` );

	for (const child of node.childNodes) {
	  if ( /(?<=.+):\/\//.test( child.textContent ) ) {
	      continue;
	  }
	  child.textContent = child.textContent.replace(oldUrlRegex, `${wiki.id}.wiki.gg` );
      }
    },

    fallbackRetriveURLSelector() {
	
    },
    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },
    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },

    run( wiki, linkElement ) {
        if ( linkElement !== null && !this.isLocked( linkElement ) ) {
		// Find result container
		const element =	linkElement.closest( 'article' );
		const isTopLevel = (a) => {
		    return a.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` );
		};
	
            if ( element !== null ) {
		// Check all a relements in the result and verify that it's a link to the same wiki
		for ( const a of element.getElementsByTagName( 'a' )) {
		    if(isTopLevel( a ))
			break;
		}
		// Rewrite anchor href links
		for ( const a of element.getElementsByTagName( "a" ) ) {
		    this.rewriteLink( wiki, a );
		}
                // Rewrite title and append a badge
                for ( const span of element.querySelector( this.SPAN_TITLE_PARENT_ELEMENT_SELECTOR ).getElementsByTagName( 'span' ) ) {
		    if( !wiki.search.titlePattern.test(span.textContent) ) {
			continue;
		    }
		    
                    span.parentElement.appendChild( this.makeBadgeElement( isTopLevel ) );
		    
                    this.lock( span.parentElement );
                    this.rewriteSpan( wiki, span );
                    this.lock( span );
		}
                // Rewrite URL element
                for ( const url of element.querySelector(this.ANCHOR_PARENT_ELEMENT_SELECTOR)
			    .getElementsByTagName( 'span' ) ) {
			this.rewriteURLElement( wiki, url ) 
                }
		this.lock( linkElement );
	    }
	}
    }
};


function observedRun() {
    if ( document.querySelector( '#react-layout' ) && document.querySelector( '.react-results--main' ) )
	if ( ( document.querySelectorAll( '.filter_badge , .rewrite_badge' ).length === 0) ) {
	    invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) );
	}
}

document.onreadystatechange = (event) => { assembleMutationObserver( observedRun ); };
