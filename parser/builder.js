import {result, Size} from '../utils.js';
import {Transform} from '../components/Transform.js';
import {Canvas} from '../components/Canvas.js';
import {setAttributes} from './attributes.js';
import '../components/index.js';

function createRoot() {
	const root = new Transform();
	root.s$width = Size.fill();
	root.s$height = Size.fill();
	
	const canvasComponent = root.addComponent(Canvas, window.innerWidth, window.innerHeight);
	window.addEventListener('resize', () => {
		canvasComponent.resize(window.innerWidth, window.innerHeight);
	});

	return root;
}

/**
 * @param {UINode} root
 * @param {CanvasRenderingContext2D} ctx
 * @returns {Result<Transform>}
 */
export function build(root, ctx) {
	let currentTransform = createRoot();
	/** @type {null | UINode} */
	let currentNode = root;

	while (currentNode) {
		const index = currentTransform.children.length;
		if (!currentNode.children || index === currentNode.children.length) {
			currentNode = currentNode.parent;
			if (currentNode) {
				currentTransform = /** @type {Transform} */ (currentTransform.parent);
			}
			continue;
		}

		const childNode = currentNode.children[index];
		const childTransform = currentTransform.createTransform();

		if (childNode.attributes) {
			setAttributes(childTransform, childNode.attributes, ctx);
		}

		currentNode = childNode;
		currentTransform = childTransform;
	}

	return result(currentTransform);
}