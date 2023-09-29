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
            background-color: #fe1984;
            color: #000;
            padding: 0.8rem 1rem;
            width: 100%;
            font-size: 1.2rem;
            font-weight: 600;
            box-shadow: 0 0 12px 13px #0006;
            z-index: 20000000;
        ` );

        const newDomain = `${wiki.id}.wiki.gg`;

        const exitNode = document.createElement( 'div' );
        exitNode.innerText = '✕';
        exitNode.title = 'Hide this banner for this visit';
        exitNode.setAttribute( 'style', `
            float: right;
            font-size: 18px;
            cursor: pointer;
            color: #000538;
        ` );
        exitNode.addEventListener( 'click', () => {
            bannerElement.remove();
        } );

        const textNodePre = document.createTextNode( 'This wiki has moved to a new address: ' ),
            linkNode = document.createElement( 'a' ),
            textNodePost = document.createTextNode( '.' );
        linkNode.href = location.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, newDomain );
        linkNode.innerText = newDomain;
        linkNode.setAttribute( 'style', `
            color: #000080;
            cursor: pointer;
        ` );

        bannerElement.appendChild( exitNode );
        bannerElement.appendChild( textNodePre );
        bannerElement.appendChild( linkNode );
        bannerElement.appendChild( textNodePost );

        document.body.prepend( bannerElement );
    }
} );
