type FieldMappingFunction<TSource, TMirror> = (dest: TMirror, value: any, source: TSource) => void;

type FieldMappings<TSource, TMirror> = {
    // Allow boolean, string remapping, nested mirroring and mapping functions for keys present in both types.
    [P in Extract<keyof TSource, keyof TMirror>]?:
        boolean
        | keyof TMirror
        | FieldMappings<TSource[P], TMirror[P]>
        | FieldMappingFunction<TSource, TMirror>;
} & {
    // Allow only string remapping and mapping functions for keys present only in source type.
    [P in Exclude<keyof TSource, keyof TMirror>]?:
        keyof TMirror | FieldMappingFunction<TSource, TMirror>;
}

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
        else if (typeof filterValue === 'function') {
            setOperation = filterValue as Operation;
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

    const proxy = new Proxy(source, {
        set: (target, param: keyof TSource, val) => {
            target[param] = val;

            const operations = setFieldOperations.get(param);
            if (operations) {
                for (const operation of operations) {
                    operation(mirror, val, source);
                }
            }
            
            return true;
        },
        deleteProperty: (target, param: keyof TSource) => {
            delete target[param];

            if (deleteFields.has(param)) {
                delete mirror[deleteFields.get(param)];
            }

            return true;
        }
    });

    return [proxy, mirror];
}