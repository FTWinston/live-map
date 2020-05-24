type SetOperation = (param: string | number | symbol, val: any) => void;

type DeleteOperation = (param: string | number | symbol) => void;

interface ProxyData {
    // TODO: do these need to be grouped by key, so we can remove them when a multiFilter entry is no longer required?
    setOperations: SetOperation[];
    deleteOperations: DeleteOperation[];
}

export class ProxyManager {
    private readonly proxyData = new Map<object, ProxyData>();

    public getProxy<TSource extends {}>(
        source: TSource,
        setOperation: (
            param: keyof TSource,
            val: TSource[keyof TSource]
        ) => void,
        deleteOperation: (param: keyof TSource) => void
    ): TSource {
        // If source is already a managed proxy, record the new operations and return it.
        let proxyData = this.proxyData.get(source);
        if (proxyData !== undefined) {
            proxyData.setOperations = [
                ...proxyData.setOperations,
                setOperation as SetOperation,
            ];

            proxyData.deleteOperations = [
                ...proxyData.deleteOperations,
                deleteOperation as DeleteOperation,
            ];

            return source;
        }

        const removeProxy = (proxy: object) => this.removeProxy(proxy);

        proxyData = {
            setOperations: [setOperation as SetOperation],
            deleteOperations: [deleteOperation as DeleteOperation],
        };

        const proxy = new Proxy(source, {
            set: (target, field: keyof TSource, val) => {
                removeProxy(target[field] as any);

                target[field] = val;

                for (const operation of proxyData.setOperations) {
                    operation(field, val);
                }

                return true;
            },
            deleteProperty: (target, field: keyof TSource) => {
                removeProxy(target[field] as any);

                delete target[field];

                for (const operation of proxyData.deleteOperations) {
                    operation(field);
                }

                return true;
            },
        });

        this.proxyData.set(proxy, proxyData);

        return proxy;
    }

    public removeProxy(proxy: object) {
        this.proxyData.delete(proxy);
    }
}
