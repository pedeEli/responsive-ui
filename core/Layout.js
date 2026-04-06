/** @import {Transform} from './Transform.js' */
import {extractAttributeInfos} from './RenderComponent.js';

export class Layout {
	/**
	 * @param {Transform} node
	 * @param {(child: Transform, node: Transform) => void} resolveChild
	 */
	resolveSize(node, resolveChild) {}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	resolvePosition(node, parent) {}
}


const defaultLayout = Symbol('default layout component');
/** @type {Map<string | typeof defaultLayout, {Layout: core.LayoutConstructor, attributeInfos: ReturnType<typeof extractAttributeInfos>}>} */
const layouts = new Map();

/**
 * @param {string} name
 * @param {core.LayoutConstructor} Layout
 * @param {boolean} [isDefault=false]
 */
export function registerLayout(name, Layout, isDefault = false) {
	name = name.toLowerCase();
	if (layouts.has(name)) {
		console.warn(`layout with name '${name}' was already registered`);
		return;
	}
	if (isDefault && layouts.has(defaultLayout)) {
		console.warn('another layout is already registered as default');
		return;
	}
	const attributeInfos = extractAttributeInfos(new Layout());
	layouts.set(name, {Layout, attributeInfos});
	if (isDefault) {
		layouts.set(defaultLayout, {Layout, attributeInfos});
	}
}


export function getDefaultLayout() {
	return layouts.get(defaultLayout) ?? null;
}

/** @param {string} name */
export function getLayout(name) {
	return layouts.get(name) ?? null;
}