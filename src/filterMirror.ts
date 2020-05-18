import { FieldMappings } from './FieldMappings';
import { createProxy } from './createProxy';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>
): [TSource, TMirror] {
    type Operation = (dest: TMirror, value: any, source: TSource) => void;

    const setFieldOperations = new Map<keyof TSource, Operation[]>();
    const deleteFields = new Map<keyof TSource, keyof TMirror>();

    const addSetOperation = (property: keyof TSource, operation: Operation) => {
        if (setFieldOperations.has(property)) {
            setFieldOperations.get(property).push(operation);
        }
        else {
            setFieldOperations.set(property, [operation]);
        }
    }

    for (const key of Object.keys(mappings)) {
        let filterValue = mappings[key as keyof FieldMappings<TSource, TMirror>];
        
        if (filterValue === false) {
            continue;
        }

        let setOperation: Operation;
        let deleteField: keyof TMirror | undefined;

        if (filterValue === true) {
            const destField = key as keyof TMirror;
            setOperation = (dest, val) => dest[destField] = val;
            deleteField = destField;
        }
        else if (typeof filterValue === 'string' || typeof filterValue === 'number' || typeof filterValue === 'symbol') {
            const destField = filterValue as keyof TMirror;
            setOperation = (dest, val) => dest[destField] = val;
            deleteField = destField;
        }
        else if (typeof filterValue === 'object') {
            const destField = key as keyof TMirror;
            setOperation = (dest, val, source) => {
                const [childProxy, childMirror] = filterMirror<TSource[keyof TSource], TMirror[keyof TMirror]>(val, filterValue as FieldMappings<TSource[keyof TSource], TMirror[keyof TMirror]>);
                source[key as keyof TSource] = childProxy;
                dest[destField] = childMirror;
            };
            deleteField = destField;
        }
        else if (typeof filterValue === 'function') {
            setOperation = filterValue as Operation;
        }
        else {
            throw new Error(`Filter value has unexpected type: ${filterValue}`);
        }

        addSetOperation(key as keyof TSource, setOperation);
        if (deleteField !== undefined) {
            deleteFields.set(key as keyof TSource, deleteField);
        }
    }

    const mirror: TMirror = {} as unknown as TMirror;
    for (const [key, operations] of setFieldOperations) {
        for (const operation of operations) {
            operation(mirror, source[key], source)
        }
    }

    const setField = (param: keyof TSource, val: TSource[keyof TSource]) => {
        const operations = setFieldOperations.get(param);
        if (operations) {
            for (const operation of operations) {
                operation(mirror, val, source);
            }
        }
    }

    const deleteField = (param: keyof TSource) => {
        if (deleteFields.has(param)) {
            delete mirror[deleteFields.get(param)];
        }
    }
    
    const proxy = createProxy(source, setField, deleteField);

    return [proxy, mirror];
}