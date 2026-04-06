/** @import {Transform} from './Transform.js' */
import {Component} from './Component.js';

export class RenderComponent extends Component {
	/** @type {CanvasRenderingContext2D} */
	#ctx;

	/**
	 * @param {Transform} transform
	 * @param {CanvasRenderingContext2D} ctx
	 */
	constructor(transform, ctx) {
		super(transform);
		this.#ctx = ctx;
	}

	get ctx() {
		return this.#ctx;
	}

	render() {}
	init() {}
}

/** @type {core.RenderComponentConstructor[]} */
const renderComponents = [];
/** @type {Map<string, Array<{index: number, attributeInfo: core.AttributeInfo}>>} */
const registeredAttributeInfos = new Map();

/** @param {core.RenderComponentConstructor} Component */
export function registerRenderComponent(Component) {
	renderComponents.push(Component);
	const componentIndex = renderComponents.length - 1;

	const attributeInfos = extractAttributeInfos(new Component(/** @type {any} */ (null), /** @type {any} */ (null)));
	for (const [name, attrIndex] of attributeInfos.lookupTable) {
		const infos = registeredAttributeInfos.get(name);
		const info = {index: componentIndex, attributeInfo: attributeInfos.infos[attrIndex]};
		if (infos) {
			infos.push(info);
		} else {
			registeredAttributeInfos.set(name, [info]);
		}
	}
}

/** @param {object} obj */
export function extractAttributeInfos(obj) {
	/** @type {core.AttributeInfo[]} */
	const infos = [];
	/** @type {Map<string, number>} */
	const lookupTable = new Map();

	for (const key of Object.keys(obj)) {
		const dollar = key.indexOf('$');
		if (dollar === -1) {
			continue;
		}

		const attrType = key.substring(0, dollar);
		const attrName = key.substring(dollar + 1);

		infos.push({
			name: attrName,
			fieldName: key,
			type: attrType
		});
		lookupTable.set(attrName, infos.length - 1);
	}

	return {
		infos,
		lookupTable
	};
}

/** @param {number} index */
export function getRenderComponent(index) {
	return renderComponents[index];
}

/** @param {string} name */
export function getAttributeInfos(name) {
	return registeredAttributeInfos.get(name) ?? null;
}