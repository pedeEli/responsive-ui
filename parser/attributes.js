/** @import {Component} from '../components/Component.js' */
import {Transform} from '../components/Transform.js';

/**
 * @param {string} value
 * @returns {Result<string>}
 */
function defaultParser(value) {
	return {
		success: true,
		v: value
	};
}


/** @type {Record<string, (value: string) => Result<any>>} */
const parsers = {};
/**
 * @param {string} type
 * @param {(value: string) => Result<any>} parser
 */
export function registerParser(type, parser) {
	if (type in parsers) {
		console.warn('parser type already exists:', type);
	} else {
		parsers[type] = parser;
	}
}

/** @type {ComponentConstructor[]} */
const components = [];
/** @param {ComponentConstructor} component */
export function registerComponent(component) {
	components.push(component);
}


/**
 * @param {object} obj
 * @returns {Map<string, AttributeInfo>}
 */
function getNameToAttributeInfoMap(obj) {
	/** @type {Map<string, AttributeInfo>} */
	const map = new Map();

	for (const key of Object.keys(obj)) {
		const index = key.indexOf('$');
		if (index === -1) {
			map.set(key, {fieldName: key, parser: defaultParser});
		} else {
			const type = key.substring(0, index);
			const name = key.substring(index + 1);
			if (type in parsers) {
				map.set(name, {fieldName: key, parser: parsers[/** @type {keyof typeof parsers} */ (type)]});
			} else {
				console.warn('unknown attribute type: ', type);
				map.set(name, {fieldName: key, parser: defaultParser});
			}
		}
	}

	return map;
}

/** @returns {RegisteredComponentsInfo} */
function getRegisteredComponentsInfo() {
	const transform = new Transform();
	const nameToAttributeInfoMap = getNameToAttributeInfoMap(transform);

	/** @type {RegisteredComponentsInfo['componentInfos']} }>} */
	const componentInfos = [];
	/** @type {Map<string, number[]>} */
	const nameToComponentInfoIndicesMap = new Map();

	for (const Component of components) {
		const nameToAttributeInfoMap = getNameToAttributeInfoMap(new Component(transform));
		componentInfos.push({nameToAttributeInfoMap, Component})
		const index = componentInfos.length - 1;

		for (const [name, attributeInfo] of nameToAttributeInfoMap) {
			const componentInfoIndices = nameToComponentInfoIndicesMap.get(name);
			if (componentInfoIndices === undefined) {
				nameToComponentInfoIndicesMap.set(name, [index]);
			} else {
				componentInfoIndices.push(index);
			}
		}
	}

	return {
		transform: {
			nameToAttributeInfoMap,
		},
		componentInfos,
		nameToComponentInfoIndicesMap
	};
}



/** @type {null | RegisteredComponentsInfo} */
let registeredComponentsInfo = null;

/**
 * @param {Transform} transform
 * @param {Map<string, string>} attributes
 * @param {CanvasRenderingContext2D} ctx
 */
export function setAttributes(transform, attributes, ctx) {
	if (!registeredComponentsInfo) {
		registeredComponentsInfo = getRegisteredComponentsInfo();
	}

	/** @type {Map<number, Component>} */
	const addedComponents = new Map();

	for (const [name, value] of attributes) {
		const attributeInfo = registeredComponentsInfo.transform.nameToAttributeInfoMap.get(name);

		if (attributeInfo) {
			const result = attributeInfo.parser(value);
			if (result.success) {
				/** @type {any} */ (transform)[attributeInfo.fieldName] = result.v;
			} else {
				console.warn(`error on parsing '${name}' with value '${value}':`, result.e);
			}
		}

		const componentInfoIndices = registeredComponentsInfo.nameToComponentInfoIndicesMap.get(name);
		if (!componentInfoIndices && !attributeInfo) {
			console.warn('unknown attribute:', name);
			continue;
		}

		if (componentInfoIndices) {
			for (const index of componentInfoIndices) {
				const componentInfo = registeredComponentsInfo.componentInfos[index];
				const attributeInfo = componentInfo.nameToAttributeInfoMap.get(name);

				if (!attributeInfo) {
					console.warn('this should never be hit');
					continue;
				}

				let component = addedComponents.get(index);
				if (component === undefined) {
					component = transform.addComponent(componentInfo.Component);
					component.init(ctx);
					addedComponents.set(index, component);
				}

				const result = attributeInfo.parser(value);
				if (result.success) {
					/** @type {any} */ (component)[attributeInfo.fieldName] = result.v;
				} else {
					console.warn(`error on parsing ${name} with value ${value}:`, result.e);
				}
			}
		}
	}
}
