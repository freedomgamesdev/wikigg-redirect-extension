'use strict';


import { getWikis } from './util.js';
import {
    prepareWikisInfo,
    invokeSearchModule
} from './baseSearch.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


// Replaces a Fandom result with an official wiki result or a placeholder
const filter = {
    run( wiki, linkElement ) {
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch
const rewrite = {
    run( wiki, linkElement ) {
        console.log( linkElement );
    }
};


invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) );
