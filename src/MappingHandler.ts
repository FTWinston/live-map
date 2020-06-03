import { JSONPatcherProxy } from 'jsonpatcherproxy';
import { deepClone } from 'fast-json-patch';
import {
    FieldMapping,
    FieldMappings,
    anyOtherFields,
    AnyOtherMapping,
} from './FieldMappings';
import { filterMirrorInternal } from './filterMirrorInternal';
import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';

type FieldOperation<TSource, TMirror> = (
    source: TSource,
    field: keyof TSource,
    dest: TMirror
) => void;

interface MirrorData<TSource, TMirror> {
    mirror: TMirror;
    setOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>;
    deleteOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>;
    anyOtherSet?: FieldOperation<TSource, TMirror>;
    anyOtherDelete?: FieldOperation<TSource, TMirror>;
}

export interface OperationHandler<TSource> {
    setField(field: keyof TSource, val: TSource[keyof TSource]): void;
    deleteField(field: keyof TSource): void;
}

export class MappingHandler<TSource, TMirror, TKey>
    implements OperationHandler<TSource> {
    private readonly mirrorData = new Map<TKey, MirrorData<TSource, TMirror>>();

    constructor(
        private readonly source: TSource,
        private readonly getMappings: (
            key: TKey
        ) => FieldMappings<TSource, TMirror>,
        private readonly proxyManager: ProxyManager<TKey>
    ) {}

    public createMirror(
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating?: boolean
    ) {
        const setOperations = new Map<
            keyof TSource,
            FieldOperation<TSource, TMirror>
        >();

        const deleteOperations = new Map<
            keyof TSource,
            FieldOperation<TSource, TMirror>
        >();

        const mappings = this.getMappings(key);

        for (const field in mappings) {
            const filterValue =
                mappings[field as keyof FieldMappings<TSource, TMirror>];
            const sourceKey = field as keyof TSource;

            const [setOperation, deleteOperation] = this.parseFieldMapping(
                key,
                filterValue as any // "Type instantiation is excessively deep and possibly infinite"
            );

            setOperations.set(sourceKey, setOperation);

            if (deleteOperation !== undefined) {
                deleteOperations.set(sourceKey, deleteOperation);
            }
        }

        const anyOtherValue: AnyOtherMapping<
            TSource,
            TMirror
        > = (mappings as any)[anyOtherFields];

        let anyOtherSet: FieldOperation<TSource, TMirror> | undefined;
        let anyOtherDelete: FieldOperation<TSource, TMirror> | undefined;

        if (anyOtherValue !== undefined && anyOtherValue !== false) {
            [anyOtherSet, anyOtherDelete] = this.parseFieldMapping(
                key,
                anyOtherValue
            );
        }

        let mirror = this.createNewMirror(
            setOperations,
            anyOtherSet,
            patchCallback,
            assignMirror,
            assignBeforePopulating
        );

        this.mirrorData.set(key, {
            mirror,
            setOperations,
            deleteOperations,
            anyOtherSet,
            anyOtherDelete,
        });

        return mirror;
    }

    private initialAssignment = false;

    private createNewMirror(
        setOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>,
        anyOtherSet: FieldOperation<TSource, TMirror>,
        patchCallback?: (patch: PatchOperation) => void,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating?: boolean
    ) {
        let mirror = Array.isArray(this.source)
            ? (([] as unknown) as TMirror)
            : (({} as unknown) as TMirror);

        let patcher: JSONPatcherProxy<TMirror> | undefined;

        if (patchCallback) {
            patcher = new JSONPatcherProxy<TMirror>(mirror, false);

            mirror = (patcher.observe(false, (patch: PatchOperation) =>
                patchCallback(this.tidyPatch(patch))
            ) as unknown) as TMirror;

            patcher.pause();
        }

        if (assignMirror && assignBeforePopulating) {
            mirror = assignMirror(mirror);
        }

        this.initialAssignment = true;
        for (const field in this.source) {
            this.runOperation(field, mirror, setOperations, anyOtherSet);
        }
        this.initialAssignment = false;

        if (assignMirror && !assignBeforePopulating) {
            mirror = assignMirror(mirror);
        }

        if (patcher) {
            patcher.resume();
        }

        return mirror;
    }

    private tidyPatch(operation: PatchOperation) {
        switch (operation.op) {
            case 'add':
            case 'replace':
                operation.value = deepClone(operation.value);
                break;
        }

        return operation;
    }

    private parseFieldMapping(
        mirrorKey: TKey,
        filterValue: FieldMapping<TSource, TMirror>
    ): [
        FieldOperation<TSource, TMirror>,
        FieldOperation<TSource, TMirror> | undefined
    ] {
        let setOperation: FieldOperation<TSource, TMirror>;
        let deleteOperation: FieldOperation<TSource, TMirror> | undefined;

        if (filterValue === false) {
            setOperation = deleteOperation = () => {};
        } else if (filterValue === true) {
            setOperation = (source, field, dest) => {
                const destField = (field as unknown) as keyof TMirror;
                dest[destField] = source[field] as any;
            };
            deleteOperation = (_source, field, dest) => {
                const destField = (field as unknown) as keyof TMirror;
                delete dest[destField];
            };
        } else if (typeof filterValue === 'object') {
            setOperation = (source, field, dest) => {
                const sourceValue = source[field];
                const destField = (field as unknown) as keyof TMirror;

                const substituteMirror = (mirror: TMirror[keyof TMirror]) => {
                    dest[destField] = mirror;
                    return dest[destField];
                };

                const {
                    proxy: childProxy,
                    mirror: childMirror,
                    mapping: childMapping,
                } = filterMirrorInternal<
                    TSource[keyof TSource],
                    TMirror[keyof TMirror],
                    TKey
                >(
                    sourceValue,
                    filterValue as FieldMappings<
                        TSource[keyof TSource],
                        TMirror[keyof TMirror]
                    >,
                    mirrorKey,
                    this.proxyManager,
                    undefined,
                    substituteMirror,
                    this.initialAssignment
                );

                if (sourceValue !== childProxy) {
                    source[field] = childProxy;
                }
            };
            deleteOperation = (_source, key, dest) => {
                const destField = (key as unknown) as keyof TMirror;
                delete dest[destField];
            };
        } else if (
            typeof filterValue === 'string' ||
            typeof filterValue === 'number' ||
            typeof filterValue === 'symbol'
        ) {
            const destField = filterValue as keyof TMirror;
            setOperation = (source, field, dest) => {
                dest[destField] = source[field] as any;
            };
            deleteOperation = (_source, _field, dest) => {
                delete dest[destField];
            };
        } else if (typeof filterValue === 'function') {
            setOperation = (source, field, dest) =>
                filterValue(dest, source, field);
        } else {
            throw new Error(`Filter value has unexpected type: ${filterValue}`);
        }

        return [setOperation, deleteOperation];
    }

    public removeMirror(key: TKey) {
        this.mirrorData.delete(key);
        this.proxyManager.removeKey(key);
    }

    public setField(field: keyof TSource, val: TSource[keyof TSource]) {
        for (const [, { mirror, setOperations, anyOtherSet }] of this
            .mirrorData) {
            this.runOperation(field, mirror, setOperations, anyOtherSet);
        }
    }

    public deleteField(field: keyof TSource) {
        for (const [, { mirror, deleteOperations, anyOtherDelete }] of this
            .mirrorData) {
            this.runOperation(field, mirror, deleteOperations, anyOtherDelete);
        }
    }

    private runOperation(
        field: keyof TSource,
        mirror: TMirror,
        operations: Map<keyof TSource, FieldOperation<TSource, TMirror>>,
        fallback?: FieldOperation<TSource, TMirror>
    ) {
        const operation = operations.get(field);
        if (operation) {
            operation(this.source, field, mirror);
        } else if (fallback) {
            fallback(this.source, field, mirror);
        }
    }
}
