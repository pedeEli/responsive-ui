/** @import {Transform} from '../core/Transform.js' */
import {Layout, registerLayout} from '../core/Layout.js'
import {Anchor} from '../core/utils.js'

export class Stack extends Layout {
	anchor$anchor = Anchor.center();
	anchor$pivot = Anchor.center();
	
	/**
	 * @param {Transform} node
	 * @param {(child: Transform, node: Transform) => void} resolveChild
	 */
	resolveSize(node, resolveChild) {
		let width = 0;
		let height = 0;
		let hasWidth = false;
		let hasHeight = false;

		for (const child of node.children) {
			child.reset();
			resolveChild(child, node);

			const marginSize = child.getMarginSize();
			width = Math.max(width, child.hasWidth() ? marginSize.x : child.n$minWidth);
			height = Math.max(height, child.hasHeight() ? marginSize.y : child.n$minHeight);
			if (child.hasWidth()) {
				hasWidth = true;
			}
			if (child.hasHeight()) {
				hasHeight = true;
			}
		}

		if (node.size$width.isAuto() && hasWidth) {
			node.setContentWidth(width);
		}
		if (node.size$height.isAuto() && hasHeight) {
			node.setContentHeight(height);
		}
	}
	/**
	 * @param {Transform} node
	 * @param {Transform} parent
	 */
	resolvePosition(node, parent) {
		const parentSize = parent.getContentSize();
		const anchorX = this.anchor$anchor.x * parentSize.x;
		const anchorY = this.anchor$anchor.y * parentSize.y;

		const marginSize = node.getMarginSize();
		const pivotX = this.anchor$pivot.x * marginSize.x;
		const pivotY = this.anchor$pivot.y * marginSize.y;

		node.setPosition(anchorX - pivotX, anchorY - pivotY);
	}
}
registerLayout('stack', Stack, true);