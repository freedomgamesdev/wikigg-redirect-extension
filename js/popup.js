import {
    isDevelopmentBuild,
    getMessage
} from './util.js';
import SearchFilterSettings from './popup/SearchFilterSettings.js';
import WikiList from './popup/WikiList.js';
import * as DeclarativeSettings from './popup/DeclarativeSettings.js';


const RTW = {
    $container: document.getElementById( 'wikis' ),


    updateVersion() {
        document.getElementById( 'version-string' ).innerText = `v${chrome.runtime.getManifest().version}`;
    },


    initialiseDynamic() {
        if ( !isDevelopmentBuild() ) {
            for ( const toRemove of document.querySelectorAll( '[data-hide-in-stable]' ) ) {
                toRemove.remove();
            }
        }
    },


    /**
     * Replaces `<i18n>key</i18n>` tags in the document with appropriate localised message.
     */
    processMessageTags() {
        for ( const node of document.querySelectorAll( 'i18n' ) ) {
            node.replaceWith( getMessage( node.textContent ) );
        }
    },


    initialiseTabbers() {
        for ( const tabberElement of document.getElementsByClassName( 'tabber' ) ) {
            const tabs = [],
                headerElement = document.createElement( 'div' );
            headerElement.className = 'tabber-header';

            for ( const tabElement of tabberElement.querySelectorAll( ':scope > section[data-tab-msg]' ) ) {
                const msg = getMessage( tabElement.getAttribute( 'data-tab-msg' ) ),
                    buttonElement = document.createElement( 'button' );
                buttonElement.textContent = msg;

                buttonElement.addEventListener( 'click', () => {
                    for ( const tab of tabs ) {
                        tab.buttonElement.classList.remove( 'selected' );
                        tab.tabElement.classList.remove( 'selected' );
                    }

                    buttonElement.classList.add( 'selected' );
                    tabElement.classList.add( 'selected' );
                } );

                headerElement.appendChild( buttonElement );

                tabs.push( {
                    buttonElement,
                    tabElement
                } );
            }

            headerElement.children[ 0 ].click();

            tabberElement.prepend( headerElement );
        }
    },


    initialiseComponents() {
        const registry = {
            SearchFilterSettings,
            WikiList
        };
        for ( const element of document.querySelectorAll( '[data-component]' ) ) {
            const compId = element.getAttribute( 'data-component' );
            if ( registry[ compId ] ) {
                registry[ compId ].initialise( element );
            }
        }

        for ( const element of document.querySelectorAll( '[data-component="DeclarativeSettings"]' ) ) {
            DeclarativeSettings.Control.initialise( element );
        }
    }
};


( function _initialiseUI() {
    RTW.updateVersion();
    RTW.initialiseDynamic();
    RTW.processMessageTags();
    RTW.initialiseTabbers();
    RTW.initialiseComponents();

    DeclarativeSettings.updateCache();
}() );
