declare namespace core {
	type Result<V, E = string> = {
		success: true;
		v: V;
	} | {
		success: false;
		e: E;
	};
	
	interface RenderComponentConstructor {
		new(transform: import('./Transform.js').Transform, ctx: CanvasRenderingContext2D): import('./RenderComponent.js').RenderComponent;
		order: number;
	}

	interface LayoutConstructor {
		new(): import('./Layout.js').Layout;
	}

	type AttributeParser = (value: string) => Result<any>;

	type AttributeInfo = {
		name: string;
		fieldName: string;
		type: string;
	};
}