import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildSync} from 'esbuild';

const appDir = new URL('./', import.meta.url);
const buildDir = new URL('./build/', import.meta.url);
function resolveApp(path = '') {
	return fileURLToPath(new URL(path, appDir));
}
function resolveBuild(path = '') {
	return fileURLToPath(new URL(path, buildDir));
}

try {
	fs.mkdirSync(resolveBuild());
} catch {}
fs.copyFileSync(resolveApp('index.html'), resolveBuild('index.html'));
fs.copyFileSync(resolveApp('index.css'), resolveBuild('index.css'));
buildSync({
	bundle: true,
	format: 'esm',
	logLevel: 'error',
	entryPoints: [resolveApp('index.js')],
	outdir: resolveBuild(),
	legalComments: 'none',
	minifyWhitespace: true
});