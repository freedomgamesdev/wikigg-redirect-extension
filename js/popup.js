import {
    getWikis,
    isDevelopmentBuild
} from './util.js';
import defaultSettingsFactory from '../defaults.js';


const storage = window.storage || chrome.storage,
    userDefaults = defaultSettingsFactory(),
    wikis = getWikis( true, false );


const RTW = {
    $container: document.getElementById( 'wikis' ),
    settingsIds: [],
    updateCallbacks: [
        ( settings => {
            RTW.settingsCache = settings;
            RTW.disabledWikis = RTW.getCurrentSettingValue( 'disabledWikis' );
        } )
    ],
    disabledWikis: [],
    settingsCache: {},


    getCurrentSettingValue( key ) {
        return ( this.settingsCache && this.settingsCache[ key ] ) ?? userDefaults[ key ];
    },


    _normaliseOptionValue( v ) {
        return v === 'true' ? true : ( v === 'false' ? false : v );
    },


    bindCheckboxToOption( checkbox ) {
        const settingId = checkbox.getAttribute( 'data-setting-id' ),
            arrayValue = checkbox.getAttribute( 'data-array-value' ),
            valueOn = this._normaliseOptionValue( checkbox.getAttribute( 'data-on' ) ),
            valueOff = this._normaliseOptionValue( checkbox.getAttribute( 'data-off' ) );

        this.settingsIds.push( settingId );
        this.updateCallbacks.push( () => {
            let rawValue = this.getCurrentSettingValue( settingId );
            if ( settingId === 'disabledWikis' && arrayValue ) {
                rawValue = rawValue.includes( arrayValue );
            }
            checkbox.checked = rawValue === valueOn;
        } );

        checkbox.addEventListener( 'change', () => {
            const obj = {};
            let value = null;

            if ( settingId === 'disabledWikis' && arrayValue ) {
                const add = checkbox.checked ? valueOn : valueOff;
                if ( add ) {
                    this.disabledWikis.push( arrayValue );
                } else {
                    this.disabledWikis = this.disabledWikis.filter( x => x !== arrayValue );
                }
                value = this.disabledWikis;
            } else {
                value = checkbox.checked ? valueOn : valueOff;
            }

            obj[ settingId ] = value;
            storage.local.set( obj );
            this.update();
        } );
    },


    bindRadioToOption( radio ) {
        const settingId = radio.getAttribute( 'data-setting-id' ),
            value = this._normaliseOptionValue( radio.getAttribute( 'data-value' ) );
        this.settingsIds.push( settingId );
        this.updateCallbacks.push( () => {
            radio.checked = value == this.getCurrentSettingValue( settingId );
        } );
        radio.addEventListener( 'change', () => {
            if ( radio.checked ) {
                const obj = {};
                obj[ settingId ] = value;
                storage.local.set( obj );
                this.update();
            }
        } );
    },


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
            $checkbox.setAttribute( 'data-setting-id', 'disabledWikis' );
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


    update() {
        storage.local.get( this.settingsIds, result => {
            for ( const callback of this.updateCallbacks ) {
                callback( result );
            }
        } );
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


    getMessageFallback( key, ...params ) {
        const msg = chrome.i18n.getMessage( key, ...params );
        return msg || key;
    },


    /**
     * Replaces `<i18n>key</i18n>` tags in the document with appropriate localised message.
     */
    processMessageTags() {
        for ( const node of document.querySelectorAll( 'i18n' ) ) {
            node.replaceWith( this.getMessageFallback( node.textContent ) );
        }
    },


    initialiseTabbers() {
        for ( const tabberElement of document.getElementsByClassName( 'tabber' ) ) {
            const tabs = [],
                headerElement = document.createElement( 'div' );
            headerElement.className = 'tabber-header';

            for ( const tabElement of tabberElement.querySelectorAll( ':scope > section[data-tab-msg]' ) ) {
                const msg = this.getMessageFallback( tabElement.getAttribute( 'data-tab-msg' ) ),
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

    for ( const checkbox of document.querySelectorAll( 'input[type=checkbox][data-setting-id]' ) ) {
        RTW.bindCheckboxToOption( checkbox );
    }
    for ( const radio of document.querySelectorAll( 'input[type=radio][data-setting-id]' ) ) {
        RTW.bindRadioToOption( radio );
    }

    RTW.update();
}() );
