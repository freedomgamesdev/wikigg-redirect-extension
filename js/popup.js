import {
    getWikis,
    isDevelopmentBuild,
    getMessage
} from './util.js';
import SearchFilterSettings from './popup/SearchFilterSettings.js';
import WikiList from './popup/WikiList.js';
import * as DeclarativeSettings from './popup/DeclarativeSettings.js';


const wikis = getWikis( true, false );


const RTW = {
    $container: document.getElementById( 'wikis' ),


    addWikiEntry( info ) {
        const $out = document.createElement( 'li' );
        if ( info.uiClass ) {
            $out.classList.add( info.uiClass );
        }

        if ( info.spacer ) {
            $out.classList.add( 'pseudo' );
            $out.innerText = info.spacer;
        } else {
            $out.setAttribute( 'data-wiki-id', info.id );

            const $checkbox = document.createElement( 'input' );
            $checkbox.setAttribute( 'id', 'wiki-cb-' + info.id );
            $checkbox.setAttribute( 'type', 'checkbox' );
            $checkbox.setAttribute( 'data-component', 'DeclarativeSettings' );
            $checkbox.setAttribute( 'data-key', 'disabledWikis' );
            $checkbox.setAttribute( 'data-array-value', info.id );
            $checkbox.setAttribute( 'data-on', 'false' );
            $checkbox.setAttribute( 'data-off', 'true' );
            $out.appendChild( $checkbox );

            const $label = document.createElement( 'label' );
            $label.setAttribute( 'for', 'wiki-cb-' + info.id );
            $label.innerText = info.name;
            $out.appendChild( $label );

            const $link = document.createElement( 'a' );
            $link.setAttribute( 'href', `https://${info.id}.wiki.gg` );
            $link.setAttribute( 'target', '_blank' );
            $out.appendChild( $link );
        }

        this.$container.appendChild( $out );
    },


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
    for ( const wiki of wikis ) {
        RTW.addWikiEntry( wiki );
    }
    RTW.initialiseComponents();

    DeclarativeSettings.updateCache();
}() );
