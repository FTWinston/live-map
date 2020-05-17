type FieldMappings<TSource, TMirror> = {
    // Allow boolean, string remapping and nested mirroring for keys present in both types.
    [P in Extract<keyof TSource, keyof TMirror>]?:
        boolean
        | keyof TMirror
        | FieldMappings<TSource[P], TMirror[P]>;
} & {
    // Allow string remapping, and mapping functions for keys present only in source type.
    [P in Exclude<keyof TSource, keyof TMirror>]?:
        keyof TMirror | ((dest: TMirror, value: any, source: TSource) => void);
}

type CalculatedField<TSource, TMirror> = [
    (source: TSource, dest: TMirror) => void,
    Array<keyof TSource>
]

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>,
    calculations?: CalculatedField<TSource, TMirror>[]
): [TSource, TMirror] {
    type Operation = (dest: TMirror, value: any, source: TSource) => void;

    // TODO: need to store in here the destination properties to delete, too
    const fieldOperations = new Map<keyof TSource, Operation[]>();

    const addOperation = (property: keyof TSource, operation: Operation) => {
        if (fieldOperations.has(property)) {
            fieldOperations.get(property).push(operation);
        }
        else {
            fieldOperations.set(property, [operation]);
        }
    }

    for (const key of Object.keys(mappings)) {
        let filterValue = mappings[key as keyof FieldMappings<TSource, TMirror>];
        
        if (filterValue === false) {
            continue;
        }

        let operation: Operation;

        if (filterValue === true) {
            operation = (dest, val) => dest[key as keyof TMirror] = val;
        }
        else if (typeof filterValue === 'function') {
            operation = filterValue as Operation;
        }
        else if (typeof filterValue === 'string' || typeof filterValue === 'number' || typeof filterValue === 'symbol') {
            const destParam = filterValue as keyof TMirror;
            operation = (dest, val) => dest[destParam] = val;
        }
        else if (typeof filterValue === 'object') {
            operation = (dest, val, source) => {
                const [childProxy, childMirror] = filterMirror<TSource[keyof TSource], TMirror[keyof TMirror]>(val, filterValue as FieldMappings<TSource[keyof TSource], TMirror[keyof TMirror]>);
                source[key as keyof TSource] = childProxy;
                dest[key as keyof TMirror] = childMirror;
            };
        }
        else {
            throw new Error(`Filter value has unexpected type: ${filterValue}`);
        }

        addOperation(key as keyof TSource, operation);
    }

    if (calculations) {
        for (const [operation, dependencies] of calculations) {
            for (const dependency of dependencies) {
                addOperation(dependency, (dest, _, source) => operation(source, dest));
            }
        }
    }

    const mirror: TMirror = {} as unknown as TMirror;
    for (const [key, operations] of fieldOperations) {
        for (const operation of operations) {
            operation(mirror, source[key], source)
        }
    }

    const proxy = new Proxy(source, {
        set: (target, param: keyof TSource, val) => {
            target[param] = val;

            const operations = fieldOperations.get(param);
            if (operations) {
                for (const operation of operations) {
                    operation(mirror, val, source);
                }
            }
            
            return true;
        },
        deleteProperty: (target, param: keyof TSource) => {
            delete target[param];

            if (fieldOperations.has(param)) {
                //delete mirror[param];
            }

            return true;
        }
    });

    return [proxy, mirror];
}