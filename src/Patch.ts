export type PatchOperation =
    | AddOperation
    | RemoveOperation
    | ReplaceOperation
    | MoveOperation
    | CopyOperation
    | TestOperation;

interface BaseOperation {
    path: string;
}

interface AddOperation extends BaseOperation {
    op: 'add';
    value: any;
}

interface RemoveOperation extends BaseOperation {
    op: 'remove';
}

interface ReplaceOperation extends BaseOperation {
    op: 'replace';
    value: any;
}

interface MoveOperation extends BaseOperation {
    op: 'move';
    from: string;
}

interface CopyOperation extends BaseOperation {
    op: 'copy';
    from: string;
}

interface TestOperation extends BaseOperation {
    op: 'test';
    value: any;
}
