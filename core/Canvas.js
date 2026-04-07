/** @import {Transform} from './Transform.js' */
import {build} from './builder.js';
import {result, error} from './utils.js';

export class Canvas {
	/** @type {null | Transform} */
	static #root = null;
	/** @type {null | HTMLCanvasElement} */
	static #canvas = null;
	/** @type {null | CanvasRenderingContext2D} */
	static #ctx = null;

	static #dirty = false;

	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {CanvasRenderingContext2D} ctx
	 */
	static init(canvas, ctx) {
		Canvas.#canvas = canvas;
		Canvas.#ctx = ctx;

		Canvas.#resize();
		canvas.addEventListener('resize', Canvas.#resize);
	}

	/**
	 * @param {string} str
	 * @returns {core.Result<string[], string>}
	 */
	static build(str) {
		if (!Canvas.#ctx) {
			return error('Canvas was not initialized');
		}

		const buildResult = build(Canvas.#ctx, str);
		if (buildResult.success) {
			Canvas.#root = buildResult.v.root;
			Canvas.#resize();
			Canvas.setDirty();
			return result(buildResult.v.warnings);
		}
		return buildResult;
	}

	static run() {
		if (!Canvas.#root) {
			return;
		}

		const root = Canvas.#root;
		root.init();
		function loop() {
			root.render()
			requestAnimationFrame(loop);
		}
		requestAnimationFrame(loop);
	}

	static setDirty() {
		if (!Canvas.#dirty) {
			Canvas.#dirty = true;
			queueMicrotask(Canvas.#layout);
		}
	}

	static #resize() {
		if (!Canvas.#canvas || !Canvas.#ctx) {
			return;
		}

		const {width, height} = Canvas.#canvas.getBoundingClientRect();
		Canvas.#canvas.width = width;
		Canvas.#canvas.height = height;
		
		if (Canvas.#root) {
			Canvas.#root.setPaddingWidth(width);
			Canvas.#root.setPaddingHeight(height);
			Canvas.setDirty();
		}
	}

	static #layout() {
		Canvas.#dirty = false;

		if (!Canvas.#root) {
			return;
		}

		Canvas.#resolveSize(Canvas.#root, Canvas.#root);
		Canvas.#resolveCyclicSize(Canvas.#root, Canvas.#root);
		Canvas.#resolvePosition(Canvas.#root, Canvas.#root);
	}

		/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolveSize(node, parent) {
		if (!node.hasWidth()) {
			if (node.size$width.isFixed()) {
				node.setPaddingWidth(node.size$width.value);
			} else if (node.size$width.isPercent() && parent.hasWidth()) {
				node.setPaddingWidth((parent.getContentSize().x - node.edges$margin.xaxis) * node.size$width.value)
			}
		}
		if (!node.hasHeight()) {
			if (node.size$height.isFixed()) {
				node.setPaddingHeight(node.size$height.value);
			} else if (node.size$height.isPercent() && parent.hasHeight()) {
				node.setPaddingHeight((parent.getContentSize().y - node.edges$margin.yaxis) * node.size$height.value);
			}
		}

		node.layout.resolveSize(node, Canvas.#resolveSize);
	}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolveCyclicSize(node, parent) {
		if (!node.hasWidth()) {
			if (node.size$width.isAuto()) {
				node.setContentWidth(0);
			} else if (node.size$width.isPercent()) {
				node.setPaddingWidth((parent.getContentSize().x - node.edges$margin.xaxis) * node.size$width.value);
			}
		}
		if (!node.hasHeight()) {
			if (node.size$height.isAuto()) {
				node.setContentHeight(0);
			} else if (node.size$height.isPercent()) {
				node.setPaddingHeight((parent.getContentSize().y - node.edges$margin.yaxis) * node.size$height.value);
			}
		}

		for (const child of node.children) {
			Canvas.#resolveCyclicSize(child, node);
		}
	}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	static #resolvePosition(node, parent) {
		node.layout.resolvePosition(node, parent);
		node.computeWorldPosition();
		for (const child of node.children) {
			Canvas.#resolvePosition(child, node);
		}
	}

}