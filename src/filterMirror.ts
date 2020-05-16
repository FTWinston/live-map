type Filter<TSource, TMirror> = {
    // Allow boolean and string remapping for keys present in both types.
    [P in Extract<keyof TSource, keyof TMirror>]?:
        boolean | keyof TMirror;
} & {
    // Allow string remapping, and mapping functions for keys present only in source type.
    [P in Exclude<keyof TSource, keyof TMirror>]?:
        keyof TMirror | ((dest: TMirror, value: any, source: TSource) => void);
}

export function filterMirror<TSource extends {}, TMirror extends {}>(source: TSource, filter: Filter<TSource, TMirror>): [TSource, TMirror] {
    type Operation = (dest: TMirror, value: any, source: TSource) => void;

    // TODO: need to store in here the destination properties to delete, too
    const fieldOperations = new Map<keyof TSource, Operation>();

    for (const key of Object.keys(filter)) {
        let filterValue = filter[key as keyof Filter<TSource, TMirror>];
        
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
        else {
            throw new Error(`Filter value has unexpected type: ${filterValue}`);
        }

        fieldOperations.set(key as keyof TSource, operation);
    }

    const mirror: TMirror = {} as unknown as TMirror;
    for (const [key, operation] of fieldOperations) {
        operation(mirror, source[key], source)
    }

    const proxy = new Proxy(source, {
        set: (target, param: keyof TSource, val) => {
            target[param] = val;

            const operation = fieldOperations.get(param);
            if (operation) {
                operation(mirror, val, source);
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