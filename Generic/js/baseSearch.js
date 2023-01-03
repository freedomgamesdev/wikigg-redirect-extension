import defaultSettingsFactory from '../defaults.js';


export function invokeSearchModule( wikis, rewriteRoutine, filterRoutine ) {
    const defaults = defaultSettingsFactory();
    storage.local.get( [ 'searchMode', 'disabledWikis' ], result => {
        const mode = ( result || defaults ).searchMode || 'rewrite';

        for ( const wiki of wikis ) {
            if ( ( result && result.disabledWikis || defaults.disabledWikis ).indexOf( wiki.id ) >= 0 ) {
                continue;
            }

            switch ( mode ) {
                case 'filter':
                    document.querySelectorAll( wiki.search.badSelector ).forEach( element => filterRoutine( wiki, element ) );
                    break;
                case 'rewrite':
                    document.querySelectorAll( wiki.search.badSelector ).forEach( element => rewriteRoutine( wiki, element ) );
                    break;
            }
        }
    } );
};
