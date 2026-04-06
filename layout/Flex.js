/** @import {Transform} from '../core/Transform.js' */
/** @import {Edges} from '../core/utils.js' */
import {Layout, registerLayout} from '../core/Layout.js'
import {Vector, error, result} from '../core/utils.js'
import {registerAttributeParser} from '../core/attributeParsers.js'

registerAttributeParser('flexdir', (value) => {
	if (/^row|column$/.test(value)) {
		return result(value);
	}
	return error('flex direction can only be row or column');
});
registerAttributeParser('justify', (value) => {
	if (/^start|center|end|space-between|space-around$/.test(value)) {
		return result(value);
	}
	return error('justify can only be start, center, end, space-between or space-around');
});
registerAttributeParser('align', (value) => {
	if (/^start|center|end$/.test(value)) {
		return result(value);
	}
	return error('align can only be start, center or end');
});


export class Flex extends Layout {
	/** @type {'row' | 'column'} */
	flexdir$dir = 'row';
	n$gap = 0;
	/** @type {'start' | 'center' | 'end' | 'space-between' | 'space-around'} */
	justify$justify = 'start';
	/** @type {'start' | 'center' | 'end'} */
	align$align = 'start';


	/**
	 * @param {Transform} node
	 * @param {(child: Transform, node: Transform) => void} resolveChild
	 */
	resolveSize(node, resolveChild) {
		const hasMainSize = this.#node.hasMain(node);
		const hasCrossSize = this.#node.hasCross(node);
		
		let fillCount = 0;
		let totalMainSize = 0;
		let maxCrossSize = 0;
		const children = node.children;
		for (const child of children) {
			resolveChild(child, node);
			if (child.size$width.isAuto() && !child.hasWidth()) {
				child.setContentWidth(0);
			}
			if (child.size$height.isAuto() && !child.hasHeight()) {
				child.setContentHeight(0);
			}

			if (this.#node.getMain(child).isPercent()) {
				if (hasMainSize) {
					fillCount += this.#node.getMain(child).value;
				} else {
					child.setContentWidth(0);
					child.setContentHeight(0);
				}
				continue;
			}
			
			const marginSize = child.getMarginSize();
			const mainSize = this.#vector.getMain(marginSize);
			const crossSize = this.#vector.getCross(marginSize);
			if (mainSize !== 0) {
				totalMainSize += mainSize;
				maxCrossSize = Math.max(maxCrossSize, crossSize);
			}
		}

		if (!hasCrossSize) {
			this.#node.setCross(node, maxCrossSize + this.#edges.getCross(node.edges$padding));
		}

		if (!hasMainSize) {
			const mainSize = totalMainSize + this.n$gap * (children.length - 1);
			this.#node.setMain(node, mainSize + this.#edges.getMain(node.edges$padding));
		}

		const contentSize = node.getContentSize();
		const totalCrossSize = this.#vector.getCross(contentSize);
		const totalGapSize = this.n$gap * (children.length - 1);

		const remainingSize = this.#vector.getMain(contentSize) - totalMainSize;
		const fillSize = (remainingSize - totalGapSize) * (fillCount > 1 ? 1 : fillCount);
		const fillScale = Math.max(1, fillCount);
		
		const skip = this.#getCursorSkip(remainingSize - fillSize, children.length, fillSize);
		let cursor = this.#getCursorStart(remainingSize - fillSize - totalGapSize, children.length, fillSize);

		for (let i = 0; i < children.length; i++) {
			const child = children[i];

			if (this.#node.getCross(child).isPercent()) {
				this.#node.setCross(child, totalCrossSize * this.#node.getCross(child).value);
			}
			if (this.#node.getMain(child).isPercent()) {
				this.#node.setMain(child, (remainingSize - totalGapSize) * this.#node.getMain(child).value / fillScale);
				if (fillSize === 0) {
					continue;
				}
			}

			const marginSize = child.getMarginSize();
			const mainSize = this.#vector.getMain(marginSize);
			const crossSize = this.#vector.getCross(marginSize);
			
			const crossPos = this.#getCrossPos(totalCrossSize, crossSize)
			const position = this.#vector.create(cursor, crossPos);
			child.overridePosition(position.x, position.y);
			
			cursor += mainSize + skip;
		}
	}


	/**
	 * @param {number} remainingSize
	 * @param {number} childCount
	 * @param {number} fillSize
	 */
	#getCursorSkip(remainingSize, childCount, fillSize) {
		if (fillSize !== 0 || /^start|center|end$/.test(this.justify$justify)) {
			return this.n$gap;
		}

		if (this.justify$justify === 'space-around') {
			return remainingSize / childCount;
		}

		if (childCount > 1) {
			return remainingSize / (childCount - 1);
		}

		return remainingSize;
	}

	/**
	 * @param {number} remainingSize
	 * @param {number} childCount
	 * @param {number} fillSize
	 */
	#getCursorStart(remainingSize, childCount, fillSize) {
		if (
			fillSize !== 0 ||
			this.justify$justify === 'start' ||
			(this.justify$justify === 'space-between' && childCount > 1)
		) {
			return 0;
		}

		if (this.justify$justify === 'center' || this.justify$justify === 'space-between') {
			return remainingSize * 0.5;
		}

		if (this.justify$justify === 'end') {
			return remainingSize;
		}

		return remainingSize / childCount * 0.5;
	}

	/**
	 * @param {number} totalCrossSize
	 * @param {number} childCrossSize
	 */
	#getCrossPos(totalCrossSize, childCrossSize) {
		if (this.align$align === 'start') {
			return 0;
		}
		if (this.align$align === 'center') {
			return (totalCrossSize - childCrossSize) * 0.5;
		}
		return totalCrossSize - childCrossSize;
	}

	#node = new NodeHelper(this);
	#vector = new VectorHelper(this);
	#edges = new EdgesHelper(this);
}


class FlexHelper {
	/** @type {Flex} */
	flex;
	/** @param {Flex} flex */
	constructor(flex) {
		this.flex = flex;
	}
}

class NodeHelper extends FlexHelper {
	/** @param {Transform} node */
	getMain(node) {
		return this.flex.flexdir$dir === 'row' ? node.size$width : node.size$height;
	}
	/** @param {Transform} node */
	getCross(node) {
		return this.flex.flexdir$dir !== 'row' ? node.size$width : node.size$height;
	}
	/**
	 * @param {Transform} node
	 * @param {number} value
	 */
	setMain(node, value) {
		if (this.flex.flexdir$dir === 'row') {
			node.setPaddingWidth(value);
		} else {
			node.setPaddingHeight(value);
		}
	}
	/**
	 * @param {Transform} node
	 * @param {number} value
	 */
	setCross(node, value) {
		if (this.flex.flexdir$dir !== 'row') {
			node.setPaddingWidth(value);
		} else {
			node.setPaddingHeight(value);
		}
	}
	/** @param {Transform} node */
	hasMain(node) {
		return this.flex.flexdir$dir === 'row' ? node.hasWidth() : node.hasHeight();
	}
	/** @param {Transform} node */
	hasCross(node) {
		return this.flex.flexdir$dir !== 'row' ? node.hasWidth() : node.hasHeight();
	}
}
class VectorHelper extends FlexHelper {
	/** @param {Vector} vec */
	getMain(vec) {
		return this.flex.flexdir$dir === 'row' ? vec.x : vec.y;
	}
	/** @param {Vector} vec */
	getCross(vec) {
		return this.flex.flexdir$dir !== 'row' ? vec.x : vec.y;
	}
	/**
	 * @param {Vector} vec
	 * @param {number} value
	 */
	setMain(vec, value) {
		if (this.flex.flexdir$dir === 'row') {
			vec.x = value;
		} else {
			vec.y = value;
		}
	}
	/**
	 * @param {Vector} vec
	 * @param {number} value
	 */
	setCross(vec, value) {
		if (this.flex.flexdir$dir !== 'row') {
			vec.x = value;
		} else {
			vec.y = value;
		}
	}
	/**
	 * @param {number} main
	 * @param {number} cross
	 */
	create(main, cross) {
		if (this.flex.flexdir$dir !== 'row') {
			[main, cross] = [cross, main];
		}
		return new Vector(main, cross);
	}
}
class EdgesHelper extends FlexHelper {
	/** @param {Edges} edges */
	getMain(edges) {
		return this.flex.flexdir$dir === 'row' ? edges.xaxis : edges.yaxis;
	}
	/** @param {Edges} edges */
	getCross(edges) {
		return this.flex.flexdir$dir !== 'row' ? edges.xaxis : edges.yaxis;
	}
}

registerLayout('flex', Flex);