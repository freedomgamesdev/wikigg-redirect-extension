import {
    createDomElement,
    getMessage
} from "../util.js";


export default class RuntimeListUpdates {
    static initialise( container ) {
        createDomElement( 'button', {
            text: '[PH]Update now',
            appendTo: container,
        } );
        createDomElement( 'span', {
            text: 'Last updated: 99 seconds ago',
            appendTo: container,
        } );
    }
}
