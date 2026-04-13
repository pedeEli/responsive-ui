/** @import {RenderComponent} from './RenderComponent.js' */
import {Transform} from './Transform.js';
import {error, result} from './utils.js';
import {getDefaultLayout, getLayout} from './Layout.js';
import {getAttributeInfos, getRenderComponent} from './RenderComponent.js';
import {getAttributeParser} from './attributeParsers.js';
import {transformAttributeInfos} from './Transform.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {parser.Node[]} nodes
 * @returns {core.Result<{root: Transform, warnings: string[]}>}
 */
export function build(ctx, nodes) {
	const defaultLayout = getDefaultLayout();
	if (!defaultLayout) {
		return error('no default layout was registered');
	}
	const root = new Transform(new defaultLayout.Layout());

	const warnings = constructTree(root, nodes, ctx);
	return result({root, warnings});
}

/**
 * @param {Transform} parent
 * @param {parser.Node[]} children
 * @param {CanvasRenderingContext2D} ctx
 * @returns {string[]}
 */
function constructTree(parent, children, ctx) {
	/** @type {string[]} */
	const warnings = [];

	for (const child of children) {
		const layoutName = child.attributes.find(attr => attr.name.value === 'layout');
		const layoutInfo = layoutName?.value ? getLayout(layoutName.value.value) : getDefaultLayout();
		if (!layoutInfo) {
			warnings.push(`no '${layoutName ?? 'default'}' layout was registered`);
			return warnings;
		}

		const layout = new layoutInfo.Layout();
		const childTransform = parent.addChild(layout);
		/** @type {Map<number, RenderComponent>} */
		const addedComponents = new Map();
		
		for (const attr of child.attributes) {
			if (attr.name.value === 'layout') {
				continue;
			}
			let keyWasUsed = false;
			if (applyAttrUsingInfos(transformAttributeInfos, childTransform, attr, warnings)) {
				keyWasUsed = true;
			}

			if (applyAttrUsingInfos(layoutInfo.attributeInfos, layout, attr, warnings)) {
				keyWasUsed = true;
			}

			const attributeInfos = getAttributeInfos(attr.name.value);
			if (!attributeInfos) {
				if (!keyWasUsed) {
					warnings.push(`unrecognized attribute name '${attr.name.value}'`);
				}
				continue;
			}

			for (const {attributeInfo, index} of attributeInfos) {
				let component = addedComponents.get(index);
				if (!component) {
					const RenderComponent = getRenderComponent(index)
					component = childTransform.addComponent(RenderComponent, ctx);
					addedComponents.set(index, component);
				}
				applyAttrUsingInfo(attributeInfo, component, attr, warnings);
			}
		}

		if (!child.children) {
			continue;
		}

		const result = constructTree(childTransform, /** @type {any} */ (child.children), ctx);
		warnings.push(...result);
	}

	return warnings;
}


/**
 * @param {ReturnType<import('./RenderComponent.js').extractAttributeInfos>} attrInfos
 * @param {object} obj
 * @param {parser.Attribute} attr
 * @param {string[]} warnings
 * @returns {boolean}
 */
function applyAttrUsingInfos(attrInfos, obj, attr, warnings) {
	const index = attrInfos.lookupTable.get(attr.name.value);
	if (index === undefined) {
		return false;
	}
	
	const attrInfo = attrInfos.infos[index];
	
	return applyAttrUsingInfo(attrInfo, obj, attr, warnings);
}

/**
 * @param {core.AttributeInfo} attrInfo
 * @param {object} obj
 * @param {parser.Attribute} attr
 * @param {string[]} warnings
 * @returns {boolean}
 */
function applyAttrUsingInfo(attrInfo, obj, attr, warnings) {
	if (attrInfo.type === 'b') {
		if (attr.value) {
			warnings.push(`expected boolean value`);
			return true;
		}
		/** @type {any} */ (obj)[attrInfo.fieldName] = true;
		return true;
	}
	if (!attr.value) {
		warnings.push(`unexpected boolean value`);
		return true;
	}

	const parser = getAttributeParser(attrInfo.type);
	if (!parser) {
		warnings.push(`unknown parser type '${attrInfo.type}'`);
		return true;
	}

	const parseResult = parser(attr.value.value);
	if (parseResult.success) {
		/** @type {any} */ (obj)[attrInfo.fieldName] = parseResult.v;
		return true;
	}

	warnings.push(parseResult.e);
	return true;
}