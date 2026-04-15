declare namespace parser {
	type Parser<V = void, Args extends ReadonlyArray<any> = []> = (...args: Args) => Generator<V>;

	type Generator<V> = globalThis.Generator<ParseStatus, V, ParserState> 

	type ParseStatus = undefined | {
		type: 'warn';
		warning: Warning;
	} | {
		type: 'error';
		error: Error;
	};

	type ParserState = {
		str: string;
		index: number;
		ranges: Range[];
		stack: Node[];
		nodes: Node[];
	};

	type Node = {
		parent: null | Node;
		children: Node[];
		attributes: Array<Attribute>;
		name: SourceRegion<string>;
		selfClosing: boolean;
		closingTag: null | SourceRegion<string>;
	};

	type Attribute = {
		name: SourceRegion<string>;
		value: null | SourceRegion<string>;
	};

	type Range = {
		line: number;
		start: number;
		end: number;
	};

	type SourcePosition = {
		index: number;
		line: number;
		column: number;
	};

	type SourceRegion<V> = {
		start: SourcePosition;
		value: V;
		end: SourcePosition;
	}

	type Warning = {
		message: string;
		pos: SourcePosition;
	}

	type Error = EofError | ExpectedError | UserError;

	type EofError = {
		type: 'eof';
		expected: string[];
		pos: SourcePosition;
	};
	type ExpectedError = {
		type: 'expected';
		unexpected: string;
		expected: string[];
		pos: SourcePosition;
	}
	type UserError = {
		type: 'user';
		message: string;
		pos: SourcePosition;
		end?: SourcePosition;
	}
}