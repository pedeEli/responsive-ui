/** @import {RenderComponent} from './RenderComponent.js' */
import {Transform} from './Transform.js';
import {parse} from './xmlParser.js';
import {error, result} from './utils.js';
import {getDefaultLayout, getLayout} from './Layout.js';
import {getAttributeInfos, getRenderComponent} from './RenderComponent.js';
import {getAttributeParser} from './attributeParsers.js';
import {transformAttributeInfos} from './Transform.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} str
 * @returns {core.Result<{root: Transform, warnings: string[]}>}
 */
export function build(ctx, str) {
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

	const defaultLayout = getDefaultLayout();
	if (!defaultLayout) {
		return error('no default layout was registered');
	}
	const root = new Transform(new defaultLayout.Layout());

	const construction = constructTree(root, parseResult.v, ctx);
	if (!construction.success) {
		return construction;
	}

	return result({root, warnings: construction.v.warnings});
}

/**
 * @param {Transform} parent
 * @param {core.XMLNode[]} children
 * @param {CanvasRenderingContext2D} ctx
 * @returns {core.Result<{warnings: string[]}>}
 */
function constructTree(parent, children, ctx) {
	/** @type {string[]} */
	const warnings = [];

	for (const child of children) {
		const layoutName = child.attributes.get('layout');
		const layoutInfo = layoutName ? getLayout(layoutName) : getDefaultLayout();
		if (!layoutInfo) {
			return error(`no '${layoutName ?? 'default'}' layout was registered`)
		}

		const layout = new layoutInfo.Layout();
		const childTransform = parent.addChild(layout);
		/** @type {Map<number, RenderComponent>} */
		const addedComponents = new Map();
		
		for (const [key, value] of child.attributes) {
			if (key === 'layout') {
				continue;
			}
			let keyWasUsed = false;
			{
				const index = transformAttributeInfos.lookupTable.get(key);
				if (index !== undefined) {
					const attrInfo = transformAttributeInfos.infos[index];
					const parser = getAttributeParser(attrInfo.type);
					if (parser) {
						const parseResult = parser(value);
						if (parseResult.success) {
							/** @type {any} */ (childTransform)[attrInfo.fieldName] = parseResult.v;
						} else {
							warnings.push(parseResult.e);
						}
					} else {
						warnings.push(`unknown parser type '${attrInfo.type}'`);
					}
					keyWasUsed = true;
				}
			}

			{
				const index = layoutInfo.attributeInfos.lookupTable.get(key);
				if (index !== undefined) {
					const attrInfo = layoutInfo.attributeInfos.infos[index];
					const parser = getAttributeParser(attrInfo.type);
					if (parser) {
						const parseResult = parser(value);
						if (parseResult.success) {
							/** @type {any} */ (layout)[attrInfo.fieldName] = parseResult.v;
						} else {
							warnings.push(parseResult.e);
						}
					} else {
						warnings.push(`unknown parser type '${attrInfo.type}'`);
					}
					keyWasUsed = true;
				}
			}

			const attributeInfos = getAttributeInfos(key);
			if (!attributeInfos) {
				if (!keyWasUsed) {
					warnings.push(`unrecognized attribute name '${key}'`);
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
				const parser = getAttributeParser(attributeInfo.type);
				if (parser) {
					const parseResult = parser(value);
					if (parseResult.success) {
						/** @type {any} */(component)[attributeInfo.fieldName] = parseResult.v;
					} else {
						warnings.push(parseResult.e);
					}
				} else {
					warnings.push(`unknown parser type '${attributeInfo.type}'`);
				}
			}
		}

		const result = constructTree(childTransform, child.children, ctx);
		if (result.success) {
			warnings.push(...result.v.warnings);
		} else {
			return result;
		}
	}

	return result({warnings});
}