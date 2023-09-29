import { supportsDNR } from './js/util.js';


export default function () {
    return {
        isRedirectDisabled: false,
        searchMode: 'rewrite',
        ddgEnable: true,
        disabledWikis: [],
        useTabRedirect: !supportsDNR()
    };
}
