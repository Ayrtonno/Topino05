const esbuild = require('esbuild');
const path = require('path');

const buildMain = async () => {
    try {
        // Build main process
        await esbuild.build({
            entryPoints: [path.join(__dirname, '../src/main/index.ts')],
            outfile: path.join(__dirname, '../dist-ts/main.js'),
            bundle: true,
            platform: 'node',
            target: 'node18',
            external: ['electron', 'electron-is-dev'],
            minify: false,
            sourcemap: true,
            define: {
                'process.env.NODE_ENV': '"production"',
            },
        });
        console.log('✅ Main process compiled to dist-ts/main.js');

        // Build preload script separately
        await esbuild.build({
            entryPoints: [path.join(__dirname, '../src/main/preload.ts')],
            outfile: path.join(__dirname, '../dist-ts/preload.js'),
            bundle: true,
            platform: 'node',
            target: 'node18',
            external: ['electron'],
            minify: false,
            sourcemap: true,
        });
        console.log('✅ Preload script compiled to dist-ts/preload.js');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
};

buildMain();
