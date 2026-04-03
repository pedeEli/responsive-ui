type Transform = import('./components/Transform.js').Transform;
type Component = import('./components/Component.js').Component;

declare type ParseError = {
	line: number;
	column: number;
	message: string;
};
declare type UINode = {
	type: string;
	attributes: null | Map<string, string>;
	children: null | UINode[];
	parent: null | UINode;
};


declare type Result<V, E = string> = {
	success: true;
	v: V;
} | {
	success: false;
	e: E;
};

declare interface Layout {
	resolveSize(node: Transform, resolveChild: (child: Transform, node: Transform) => void): void;
}


declare interface ComponentConstructor {
	new(transform: Transform): Component
}

declare type AttributeInfo = {
	fieldName: string;
	parser: (value: string) => Result<any>;
};

declare type ComponentInfo = {
	nameToAttributeInfoMap: Map<string, AttributeInfo>;
	Component: ComponentConstructor;
}

declare type RegisteredComponentsInfo = {
	transform: {
		nameToAttributeInfoMap: Map<string, AttributeInfo>;
	};
	componentInfos: ComponentInfo[];
	nameToComponentInfoIndicesMap: Map<string, number[]>;
};