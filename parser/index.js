/** @import {Transform} from '../components/Transform.js' */
import {parse} from './parser.js'
import {build} from './builder.js'
import {error} from '../utils.js'

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} str
 * @returns {Result<Transform>}
 */
export function parseAndBuild(ctx, str) {
	const parseResult = parse(str);

	if (!parseResult.success) {
		const lines = str.split('\n');
		let message = '';
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].replaceAll('\t', ' ');
			message += line + '\n';
			if (i + 1 === parseResult.e.line) {
				message += ' '.repeat(parseResult.e.column + lines[i].length - line.length - 1);
				message += '^ ' + parseResult.e.message + '\n';
			}
		}
		return error(message);
	}

	return build(parseResult.v, ctx);
}