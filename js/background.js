'use strict';

import { getNativeSettings, getWikis } from './util.js';
import defaultSettingsFactory from '../defaults.js';


const storage = getNativeSettings(),
    wikis = getWikis( false );


function _buildDomainRegex( template ) {
    return new RegExp( template.replace( '$domains', wikis.map( item => item.oldId || item.id ).join( '|' ) ), 'i' );
}


const RTW = {
    DNR_RULE_ID: 1,

    settings: defaultSettingsFactory(),
    domainRegex: _buildDomainRegex( `^($domains)\\.(?:fandom|gamepedia)\\.com$` ),
    intlDomainRegex: _buildDomainRegex( `^($domains)-([a-z]+)\\.(?:gamepedia)\\.com$` ),
    oldToNumIdMap: ( () => {
        const out = {};
        for ( const [ index, wiki ] of Object.entries( wikis ) ) {
            out[ wiki.oldId || wiki.id ] = index;
        }
        return out;
    } )(),


    updateIcon() {
        const icon = {
            path: ( this.settings.isRedirectDisabled ? '/icons/32_black.png' : '/icons/128.png' )
        };
        if ( chrome && chrome.action && chrome.action.setIcon ) {
            chrome.action.setIcon( icon );
        } else {
            chrome.browserAction.setIcon( icon );
        }
    },

    
    decideRedirect( info ) {
        if ( this.settings.isRedirectDisabled ) {
            return;
        }

        const url = new URL( info.url );

        // Check if the URL matches our regex
        // [0]: full host, [1]: old wiki ID, [2]?: language
        const match = this.domainRegex.exec( url.host ) || this.intlDomainRegex.exec( url.host );
        if ( !match ) {
            return;
        }

        const oldWikiId = match[1];

        // Map the old ID to an internal numeric one
        const internalWikiId = this.oldToNumIdMap[oldWikiId];
        if ( internalWikiId === undefined ) {
            return;
        }

        // Retrieve new wiki ID
        const newWikiId = wikis[ internalWikiId ].id;
        if ( this.settings.disabledWikis.indexOf( newWikiId ) >= 0 ) {
            return;
        }

        // Copy path
        let newPath = url.pathname;

        // Convert international Gamepedia URL format
        if ( match.length >= 3 ) {
            let languageCode = match[2];
            if ( languageCode == 'ptbr' ) {
                languageCode = 'pt-br';
            }
            newPath = `/${ languageCode }${ newPath }`;
        }
    
        // Redirect
        chrome.tabs.update( info.tabId, {
            url: `https://${ newWikiId }.wiki.gg${ newPath }`
        } );
    },


    _onBeforeNavigate( info ) {
        RTW.decideRedirect( info );
    },


    updateMV3DynamicRuleSets() {
        // TODO: unused for now
        if ( !this.settings.useTabRedirect ) {
            chrome.declarativeNetRequest.updateDynamicRules( {
                addRules: [ {
                    id: RTW.DNR_RULE_ID,
                    action: {
                        type: 'redirect',
                        redirect: {
                            regexSubstition: ''
                        }
                    },
                    condition: {
                        regexFilter: '',
                        resourceTypes: [ 'main_frame' ]
                    }
                } ]
            } );
        } else {

        }
    },

    
    updateEventHandlers() {
        this.settings.useTabRedirect = true;

        if ( this.settings.useTabRedirect ) {
            chrome.webNavigation.onBeforeNavigate.addListener( this._onBeforeNavigate );
            this._isTabRedirectInstalled = true;
        } else if ( this._isTabRedirectInstalled ) {
            chrome.webNavigation.onBeforeNavigate.removeListener( this._onBeforeNavigate );
            this._isTabRedirectInstalled = false;
        }

        if ( !this.settings.useTabRedirect ) {

        }
    },

    
    mergeStorageChunk( chunk ) {
        const oldIRD = this.settings.isRedirectDisabled;
        for ( const key in chunk ) {
            this.settings[key] = chunk[key];
        }
        if ( this.settings.isRedirectDisabled !== oldIRD ) {
            this.updateIcon();
        }

        this.updateEventHandlers();
    },

    
    mergeStorageDiffChunk( chunk ) {
        let obj = {};
        for ( const key in chunk ) {
            obj[key] = chunk[key].newValue;
        }
        this.mergeStorageChunk( obj );
    }
};


storage.onChanged.addListener( ( changes, _ ) => RTW.mergeStorageDiffChunk( changes ) );
storage.local.get( Object.keys( RTW.settings ), result => RTW.mergeStorageChunk( result ) )
