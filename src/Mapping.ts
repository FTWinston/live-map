import { FieldMappings } from './FieldMappings';
import { filterMirror } from './filterMirror';

type Operation<TSource, TMirror> = (
    dest: TMirror,
    value: any,
    source: TSource
) => void;

export class Mapping<TSource, TMirror> {
    private readonly setFieldOperations = new Map<
        keyof TSource,
        Operation<TSource, TMirror>[]
    >();
    private readonly deleteFields = new Map<keyof TSource, keyof TMirror>();

    constructor(mappings: FieldMappings<TSource, TMirror>) {
        for (const key of Object.keys(mappings)) {
            let filterValue =
                mappings[key as keyof FieldMappings<TSource, TMirror>];

            if (filterValue === false) {
                continue;
            }

            let setOperation: Operation<TSource, TMirror>;
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
                setOperation = filterValue as Operation<TSource, TMirror>;
            } else {
                throw new Error(
                    `Filter value has unexpected type: ${filterValue}`
                );
            }

            this.addSetOperation(key as keyof TSource, setOperation);
            if (deleteField !== undefined) {
                this.deleteFields.set(key as keyof TSource, deleteField);
            }
        }
    }

    public createMirror(source: TSource) {
        const mirror: TMirror = ({} as unknown) as TMirror;

        for (const [key, operations] of this.setFieldOperations) {
            for (const operation of operations) {
                operation(mirror, source[key], source);
            }
        }

        const setField = (
            param: keyof TSource,
            val: TSource[keyof TSource]
        ) => {
            const operations = this.setFieldOperations.get(param);
            if (operations) {
                for (const operation of operations) {
                    operation(mirror, val, source);
                }
            }
        };

        const deleteField = (param: keyof TSource) => {
            const field = this.deleteFields.get(param);
            if (field !== undefined) {
                delete mirror[field];
            }
        };

        return {
            mirror,
            setField,
            deleteField,
        };
    }

    private addSetOperation(
        property: keyof TSource,
        operation: Operation<TSource, TMirror>
    ) {
        const existing = this.setFieldOperations.get(property);

        if (existing) {
            existing.push(operation);
        } else {
            this.setFieldOperations.set(property, [operation]);
        }
    }
}
