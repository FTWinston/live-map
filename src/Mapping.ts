import {
    FieldMapping,
    FieldMappings,
    anyOtherFields,
    AnyOtherMapping,
} from './FieldMappings';
import { filterMirrorInternal } from './filterMirrorInternal';
import { ProxyManager } from './ProxyManager';

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

export class Mapping<TSource, TMirror, TKey> {
    private readonly mirrorData = new Map<TKey, MirrorData<TSource, TMirror>>();

    constructor(
        private readonly source: TSource,
        private readonly getMappings: (
            key: TKey
        ) => FieldMappings<TSource, TMirror>,
        private readonly proxyManager: ProxyManager
    ) {}

    public createMirror(key: TKey) {
        const setOperations = new Map<
            keyof TSource,
            FieldOperation<TSource, TMirror>
        >();

        const deleteOperations = new Map<
            keyof TSource,
            FieldOperation<TSource, TMirror>
        >();

        const mappings = this.getMappings(key);

        for (const key in mappings) {
            const filterValue =
                mappings[key as keyof FieldMappings<TSource, TMirror>];
            const sourceKey = key as keyof TSource;

            const [setOperation, deleteOperation] = this.parseFieldMapping(
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
                anyOtherValue
            );
        }

        const mirror = this.populateNewMirror(setOperations, anyOtherSet);

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
        anyOtherSet: FieldOperation<TSource, TMirror>
    ) {
        const mirror = Array.isArray(this.source)
            ? (([] as unknown) as TMirror)
            : (({} as unknown) as TMirror);

        for (const field in this.source) {
            this.runOperation(field, mirror, setOperations, anyOtherSet);
        }

        return mirror;
    }

    private parseFieldMapping(
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
                } = filterMirrorInternal<
                    TSource[keyof TSource],
                    TMirror[keyof TMirror]
                >(
                    sourceValue,
                    filterValue as FieldMappings<
                        TSource[keyof TSource],
                        TMirror[keyof TMirror]
                    >,
                    this.proxyManager
                );

                if (sourceValue !== childProxy) {
                    source[key] = childProxy;
                }
                dest[destField] = childMirror;
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
