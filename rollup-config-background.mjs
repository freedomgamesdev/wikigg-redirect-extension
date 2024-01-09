import json from '@rollup/plugin-json';


const scripts = {
    background: {},
    popup: {},
    google: { isContentScript: true },
    ddg: { isContentScript: true },
    fandom: { isContentScript: true },
    bing: { isContentScript: true }

};
const release = process.env.NODE_ENV === 'release';


/** @type {import('rollup').RollupOptions[]} */
export default Object.entries( scripts ).map( ( [ script, params ] ) => {
    return {
        input: `js/${script}.js`,
        output: [
            {
                file: `built/${script}.js`,
                format: params.isContentScript ? 'iife' : 'umd',
                name: script,
                sourcemap: false,
                freeze: false,
                esModule: false
            }
        ],
        plugins: [
            json()
        ]
    };
} );
