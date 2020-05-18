import { FieldMappings } from './FieldMappings';
import { filterMirror } from './filterMirror';

type SetOperation<TSource, TMirror> = (
    dest: TMirror,
    value: any,
    source: TSource
) => void;

interface MirrorData<TSource, TMirror> {
    mirror: TMirror;
    setFieldOperations: Map<keyof TSource, SetOperation<TSource, TMirror>[]>;
    deleteFields: Map<keyof TSource, keyof TMirror>;
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
        const setFieldOperations = new Map<
            keyof TSource,
            SetOperation<TSource, TMirror>[]
        >();

        const deleteFields = new Map<keyof TSource, keyof TMirror>();

        const mappings = this.getMappings(key);

        for (const key of Object.keys(mappings)) {
            let filterValue =
                mappings[key as keyof FieldMappings<TSource, TMirror>];

            if (filterValue === false) {
                continue;
            }

            let setOperation: SetOperation<TSource, TMirror>;
            let deleteField: keyof TMirror | undefined;

            if (filterValue === true) {
                const destField = key as keyof TMirror;
                setOperation = (dest, val) => (dest[destField] = val);
                deleteField = destField;
            } else if (
                typeof filterValue === 'string' ||
                typeof filterValue === 'number' ||
                typeof filterValue === 'symbol'
            ) {
                const destField = filterValue as keyof TMirror;
                setOperation = (dest, val) => (dest[destField] = val);
                deleteField = destField;
            } else if (typeof filterValue === 'object') {
                const destField = key as keyof TMirror;
                setOperation = (dest, val, source) => {
                    const [childProxy, childMirror] = filterMirror<
                        TSource[keyof TSource],
                        TMirror[keyof TMirror]
                    >(
                        val,
                        filterValue as FieldMappings<
                            TSource[keyof TSource],
                            TMirror[keyof TMirror]
                        >
                    );
                    source[key as keyof TSource] = childProxy;
                    dest[destField] = childMirror;
                };
                deleteField = destField;
            } else if (typeof filterValue === 'function') {
                setOperation = filterValue as SetOperation<TSource, TMirror>;
            } else {
                throw new Error(
                    `Filter value has unexpected type: ${filterValue}`
                );
            }

            const existing = setFieldOperations.get(key as keyof TSource);

            if (existing) {
                existing.push(setOperation);
            } else {
                setFieldOperations.set(key as keyof TSource, [setOperation]);
            }

            if (deleteField !== undefined) {
                deleteFields.set(key as keyof TSource, deleteField);
            }
        }

        const mirror: TMirror = ({} as unknown) as TMirror;

        for (const [param, operations] of setFieldOperations) {
            for (const operation of operations) {
                operation(mirror, this.source[param], this.source);
            }
        }

        this.mirrorData.set(key, {
            mirror,
            setFieldOperations,
            deleteFields,
        });

        return mirror;
    }

    public deleteMirror(key: TKey) {
        this.mirrorData.delete(key);
    }

    public setField(param: keyof TSource, val: TSource[keyof TSource]) {
        for (const [, { mirror, setFieldOperations }] of this.mirrorData) {
            const operations = setFieldOperations.get(param);
            if (operations) {
                for (const operation of operations) {
                    operation(mirror, val, this.source);
                }
            }
        }
    }

    public deleteField(param: keyof TSource) {
        for (const [, { mirror, deleteFields }] of this.mirrorData) {
            const field = deleteFields.get(param);
            if (field !== undefined) {
                delete mirror[field];
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
