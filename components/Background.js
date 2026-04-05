import {Component, registerComponent} from './Component.js';

export class Background extends Component {
	bg = 'white';

	/** @param {CanvasRenderingContext2D} ctx */
	render(ctx) {
		const rect = this.transform.getWorldPaddingRect();
		ctx.fillStyle = this.bg;
		ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
	}
}
Background.order = 1000;
registerComponent(Background);