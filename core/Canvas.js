/** @import {Transform} from './Transform.js' */
import {build} from './builder.js';
import {result, error, Vector} from './utils.js';

export class Canvas {
	/** @type {null | Transform} */
	static #root = null;
	/** @type {null | HTMLCanvasElement} */
	static #canvas = null;
	/** @type {null | CanvasRenderingContext2D} */
	static #ctx = null;

	static #dirty = false;

	/** @type {null | ResizeObserver} */
	static #resizeObserver = null;
	/** @type {null | Vector} */
	static #newSize = null;

	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {CanvasRenderingContext2D} ctx
	 */
	static init(canvas, ctx) {
		Canvas.#canvas = canvas;
		Canvas.#ctx = ctx;

		const rect = Canvas.#canvas.getBoundingClientRect();
		Canvas.#resize(new Vector(rect.width, rect.height));
		new ResizeObserver(([e]) => {
			Canvas.#newSize = new Vector(e.contentRect.width, e.contentRect.height);
		}).observe(Canvas.#canvas);
	}

	/**
	 * @param {parser_old.Node[]} nodes
	 * @returns {core.Result<string[], string>}
	 */
	static build(nodes) {
		if (!Canvas.#ctx) {
			return error('Canvas was not initialized');
		}

		const buildResult = build(Canvas.#ctx, nodes);
		if (buildResult.success) {
			Canvas.#root = buildResult.v.root;
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
			if (Canvas.#newSize) {
				Canvas.#resize(Canvas.#newSize);
				Canvas.#newSize = null;
			}

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

	/** @param {Vector} size */
	static #resize(size) {
		if (!Canvas.#canvas || !Canvas.#ctx) {
			return;
		}

		Canvas.#canvas.width = size.x;
		Canvas.#canvas.height = size.y;
		
		if (Canvas.#root) {
			Canvas.#root.setPaddingWidth(size.x);
			Canvas.#root.setPaddingHeight(size.y);
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