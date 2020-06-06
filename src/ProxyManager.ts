import { ISourceHandler } from './SourceHandler';

export class ProxyManager<TKey> {
    private readonly proxyData = new Map<
        object,
        Map<TKey, ISourceHandler<any>>
    >();

    private createProxy<TSource extends {}>(
        source: TSource
    ): [TSource, Map<TKey, ISourceHandler<any>>] {
        const proxyData = new Map<TKey, ISourceHandler<any>>();

        const proxy = new Proxy(source, {
            set: (target, field: keyof TSource, val) => {
                this.removeProxy(target[field] as any);

                target[field] = val;

                for (const [, keyOperations] of proxyData) {
                    keyOperations.setField(field, val);
                }

                return true;
            },
            deleteProperty: (target, field: keyof TSource) => {
                this.removeProxy(target[field] as any);

                delete target[field];

                for (const [, keyOperations] of proxyData) {
                    keyOperations.deleteField(field);
                }

                return true;
            },
        });

        this.proxyData.set(proxy, proxyData);

        return [proxy, proxyData];
    }

    public getProxy<TSource extends {}>(
        key: TKey | undefined,
        handler: ISourceHandler<TSource>
    ): TSource {
        // If source is already a managed proxy, record the new operations and return it.

        let proxy: TSource;
        let proxyData = this.proxyData.get(handler.source);
        if (proxyData !== undefined) {
            proxy = handler.source;
        } else {
            [proxy, proxyData] = this.createProxy(handler.source);
        }

        proxyData.set(key, handler);

        return proxy;
    }

    public removeProxy(proxy: object) {
        if (!this.proxyData.delete(proxy)) {
            return;
        }

        // We need to also remove any proxies that were below this one in the hierarchy,
        // because this manager stores data for ALL proxies.
        for (const key in proxy) {
            const val = (proxy as any)[key];
            this.removeProxy(val);
        }
    }

    public removeKey(key: TKey) {
        for (const [, handlersByKey] of this.proxyData) {
            handlersByKey.delete(key);
        }
    }
}
