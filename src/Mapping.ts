import {
    FieldMapping,
    FieldMappings,
    anyOtherFields,
    AnyOtherMapping,
} from './FieldMappings';
import { filterMirror } from './filterMirror';

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
        ) => FieldMappings<TSource, TMirror>
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

            if (filterValue === false) {
                continue;
            }

            const [setOperation, deleteOperation] = this.parseFieldMapping(
                filterValue as any // "Type instantiation is excessively deep and possibly infinite"
            );

            setOperations.set(sourceKey, setOperation);

            if (deleteOperation !== undefined) {
                deleteOperations.set(sourceKey, deleteOperation);
            }
        }

        const mirror: TMirror = ({} as unknown) as TMirror;

        let anyOtherSet: FieldOperation<TSource, TMirror> | undefined;
        let anyOtherDelete: FieldOperation<TSource, TMirror> | undefined;

        const anyOtherValue: AnyOtherMapping<
            TSource,
            TMirror
        > = (mappings as any)[anyOtherFields];
        if (anyOtherValue !== undefined && anyOtherValue !== false) {
            [anyOtherSet] = this.parseFieldMapping(anyOtherValue);

            // Fields mapped via anyOtherField can only go to a destination field with the same name, so deleting is straightforward.
            anyOtherDelete = (_source, key, dest) => {
                const destKey = (key as unknown) as keyof TMirror;
                delete dest[destKey];
            };
        }

        for (const [field, operation] of setOperations) {
            operation(this.source, field, mirror);
        }

        this.mirrorData.set(key, {
            mirror,
            setOperations,
            deleteOperations,
            anyOtherSet,
            anyOtherDelete,
        });

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

        if (filterValue === true) {
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
                const destField = (key as unknown) as keyof TMirror;
                const { proxy: childProxy, mirror: childMirror } = filterMirror<
                    TSource[keyof TSource],
                    TMirror[keyof TMirror]
                >(
                    source[key],
                    filterValue as FieldMappings<
                        TSource[keyof TSource],
                        TMirror[keyof TMirror]
                    >
                );
                source[key] = childProxy;
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
                filterValue(source[field], dest, source);
        } else {
            throw new Error(`Filter value has unexpected type: ${filterValue}`);
        }

        return [setOperation, deleteOperation];
    }

    public removeMirror(key: TKey) {
        this.mirrorData.delete(key);
    }

    public setField(field: keyof TSource, val: TSource[keyof TSource]) {
        for (const [, { mirror, setOperations }] of this.mirrorData) {
            const operation = setOperations.get(field);
            if (operation) {
                operation(this.source, field, mirror);
            }
        }
    }

    public deleteField(field: keyof TSource) {
        for (const [, { mirror, deleteOperations }] of this.mirrorData) {
            const operation = deleteOperations.get(field);
            if (operation !== undefined) {
                operation(this.source, field, mirror);
            }
        }
    }

    public substituteMirror(key: TKey, mirror: TMirror) {
        const data = this.mirrorData.get(key);

        if (data) {
            data.mirror = mirror;
        }
    }
}
