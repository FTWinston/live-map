type Filter<TSource, TMirror> = {
    //[P in keyof TSource]?: true;
    [P in Extract<keyof TSource, keyof TMirror>]?: true;
}

export function filterMirror<TSource extends {}, TMirror extends {}>(source: TSource, filter: Filter<TSource, TMirror>): [TSource, TMirror] {
    type CombinedKeys = keyof TSource & keyof TMirror;
    
    const keysToMirror = new Set<CombinedKeys>(Object.keys(filter) as [CombinedKeys]);

    const mirror: TMirror = {} as unknown as TMirror;
    for (const key of keysToMirror) {
        mirror[key] = source[key] as any;
    }

    const proxy = new Proxy(source, {
        set: (target, param: CombinedKeys, val) => {
            target[param] = val;

            if (keysToMirror.has(param)) {
                mirror[param] = val;
            }

            return true;
        },
        deleteProperty: (target, param: CombinedKeys) => {
            delete target[param];

            if (keysToMirror.has(param)) {
                delete mirror[param];
            }

            return true;
        }
    });

    return [proxy, mirror];
}