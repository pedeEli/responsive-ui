/** @type {Map<string, core.AttributeParser>} */
const parsers = new Map();
/**
 * @param {string} type
 * @param {core.AttributeParser} parser
 */
export function registerAttributeParser(type, parser) {
	if (parsers.has(type)) {
		console.warn('parser type already exists:', type);
	} else {
		parsers.set(type, parser);
	}
}

/** @param {string} type */
export function getAttributeParser(type) {
	return parsers.get(type) ?? null;
}