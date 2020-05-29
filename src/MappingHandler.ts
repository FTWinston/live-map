import { JSONPatcherProxy } from 'jsonpatcherproxy';
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
        patchCallback?: (operation: PatchOperation) => void
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

        let mirror = this.populateNewMirror(
            setOperations,
            anyOtherSet,
            patchCallback
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

    private populateNewMirror(
        setOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>,
        anyOtherSet: FieldOperation<TSource, TMirror>,
        patchCallback?: (patch: PatchOperation) => void
    ) {
        let mirror = Array.isArray(this.source)
            ? (([] as unknown) as TMirror)
            : (({} as unknown) as TMirror);

        let patcher: JSONPatcherProxy<TMirror> | undefined;

        if (patchCallback) {
            patcher = new JSONPatcherProxy<TMirror>(mirror, false);

            mirror = (patcher.observe(
                false,
                patchCallback
            ) as unknown) as TMirror;

            patcher.pause();
        }

        for (const field in this.source) {
            this.runOperation(field, mirror, setOperations, anyOtherSet);
        }

        if (patcher) {
            patcher.resume();
        }

        return mirror;
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
            setOperation = (source, key, dest) => {
                const destField = (key as unknown) as keyof TMirror;
                dest[destField] = source[key] as any;
            };
            deleteOperation = (_source, key, dest) => {
                const destField = (key as unknown) as keyof TMirror;
                delete dest[destField];
            };
        } else if (typeof filterValue === 'object') {
            setOperation = (source, key, dest) => {
                const sourceValue = source[key];
                const destField = (key as unknown) as keyof TMirror;
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
                    this.proxyManager
                );

                if (sourceValue !== childProxy) {
                    source[key] = childProxy;
                }
                dest[destField] = childMirror;

                // If outputting patches, dest will be a proxy, and so the child mapping needs to use the proxied child mirror.
                childMapping.substituteMirror(mirrorKey, dest[destField]);
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
            setOperation = (source, key, dest) => {
                dest[destField] = source[key] as any;
            };
            deleteOperation = (_source, _key, dest) => {
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

    public substituteMirror(key: TKey, mirror: TMirror) {
        const data = this.mirrorData.get(key);

        if (data) {
            data.mirror = mirror;
        }
    }
}
