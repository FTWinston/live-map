export function createProxy<TSource extends {}>(
    source: TSource,
    setOperation: (param: keyof TSource, val: TSource[keyof TSource]) => void,
    deleteOperation: (param: keyof TSource) => void,
): TSource {
    return new Proxy(source, {
        set: (target, param: keyof TSource, val) => {
            target[param] = val;

            setOperation(param, val);
            
            return true;
        },
        deleteProperty: (target, param: keyof TSource) => {
            delete target[param];

            deleteOperation(param);

            return true;
        }
    });
}