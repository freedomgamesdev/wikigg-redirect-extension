'use strict';

import { getNativeSettings } from './util.js';
import defaultSettingsFactory from '../defaults.js';
import { getWikis } from './util.js';
import {
    prepareWikisInfo
} from './baseSearch.js';


getNativeSettings().local.get( [ 'isRedirectDisabled', 'disabledWikis' ], result => {
    result = result || defaultSettingsFactory();

    const mode = result.isRedirectDisabled || false;
    if ( mode !== 'banner' ) {
        return;
    }

    const hostId = location.host.split( '.' )[ 0 ],
        wiki = prepareWikisInfo( getWikis( false, true ), {
            titles: true
        } ).find( x => {
            return !( result.disabledWikis && result.disabledWikis.includes( x.id ) )
                && ( ( x.oldId || x.id ) === hostId );
        } );

    if ( wiki ) {
        const bannerElement = document.createElement( 'div' );
        bannerElement.setAttribute( 'style', `
            font-family: sans-serif;
            position: sticky;
            top: 0;
            text-align: center;
            background-color: #e348bb;
            padding: 0.8rem 1rem;
            width: 100%;
            font-size: 1.2rem;
            z-index: 20000000;
        ` );
        bannerElement.textContent = '[PH] RTW_FANDOM_MIGRATED_BANNER_TEXT';
        document.body.prepend( bannerElement );
    }
} );
