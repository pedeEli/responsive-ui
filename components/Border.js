import {Component, registerComponent} from './Component.js';

export class Border extends Component {
	border = 'white';

	/** @param {CanvasRenderingContext2D} ctx */
	render(ctx) {
		const rect = this.transform.worldPaddingRect;
		const rect2 = this.transform.worldMarginRect;
		const rect3 = this.transform.worldContentRect;
		ctx.strokeStyle = this.border;
		ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
		ctx.strokeRect(rect2.x, rect2.y, rect2.width, rect2.height);
		ctx.strokeRect(rect3.x, rect3.y, rect3.width, rect3.height);
	}
}
registerComponent(Border);