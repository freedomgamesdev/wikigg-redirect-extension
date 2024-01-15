import json from '@rollup/plugin-json';


const scripts = [
    { script: 'background' },
    { script: 'popup' },
    { script: 'search/google', output: 'google', isContentScript: true },
    { script: 'search/ddg', output: 'ddg', isContentScript: true },
    { script: 'fandom', isContentScript: true },
];

/** @type {import('rollup').RollupOptions[]} */
export default scripts.map( params => {
    return {
        input: `js/${params.script}.js`,
        output: [
            {
                file: `built/${params.output || params.script}.js`,
                format: params.isContentScript ? 'iife' : 'umd',
                name: params.output,
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
