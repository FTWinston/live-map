import { ISourceHandler } from './SourceHandler';

export class ProxyManager<TKey> {
    private readonly proxyData = new Map<
        object,
        Map<TKey, ISourceHandler<any>>
    >();

    private readonly proxyParents = new Map<object, object>();

    private createProxy<TSource extends {}>(
        source: TSource
    ): [TSource, Map<TKey, ISourceHandler<any>>] {
        const sourceHandlers = new Map<TKey, ISourceHandler<any>>();

        const proxy = new Proxy(source, {
            set: (target, field: keyof TSource, val) => {
                this.removeProxy(target[field] as any);

                // Before assigning, replace val (and its descendents) with a proxy, so we can detect any changes.
                if (this.canProxy(val)) {
                    [val] = this.createProxy(val);
                    this.proxyParents.set(val, proxy);
                }

                target[field] = val;

                for (const [, sourceHandler] of sourceHandlers) {
                    sourceHandler.setField(field, val);
                }

                if (sourceHandlers.size === 0) {
                    this.updateClosestAncestorSourceHandlers(proxy);
                }

                return true;
            },
            deleteProperty: (target, field: keyof TSource) => {
                this.removeProxy(target[field] as any);

                delete target[field];

                for (const [, sourceHandler] of sourceHandlers) {
                    sourceHandler.deleteField(field);
                }

                if (sourceHandlers.size === 0) {
                    this.updateClosestAncestorSourceHandlers(proxy);
                }

                return true;
            },
        });

        this.proxyData.set(proxy, sourceHandlers);

        // Recursively call createProxy for all proxiable fields of source, and substitute them.
        for (const key in source) {
            let val = source[key];

            if (this.canProxy(val)) {
                [val] = this.createProxy(val);
                this.proxyParents.set(val as any, proxy);
                source[key] = val;
            }
        }

        return [proxy, sourceHandlers];
    }

    public getProxy<TSource extends {}>(
        key: TKey | undefined,
        handler: ISourceHandler<TSource>
    ): TSource {
        // If source is already a managed proxy, record the new operations and return it.

        let proxy: TSource;
        let sourceHandlers = this.proxyData.get(handler.source);

        if (sourceHandlers !== undefined) {
            proxy = handler.source;
        } else {
            [proxy, sourceHandlers] = this.createProxy(handler.source);
        }

        sourceHandlers.set(key, handler);

        return proxy;
    }

    private updateClosestAncestorSourceHandlers(proxy: object) {
        let handlers: Map<TKey, ISourceHandler<any>>;

        do {
            proxy = this.proxyParents.get(proxy);
            if (!proxy) {
                return;
            }

            handlers = this.proxyData.get(proxy);
        } while (handlers.size === 0);

        for (const [, handler] of handlers) {
            handler.unmappedDescendantChanged();
        }
    }

    private canProxy(object: any) {
        if (this.proxyData.has(object)) {
            return false;
        }

        const type = typeof object;
        return type === 'function' || (type === 'object' && !!object);
    }

    public removeProxy(proxy: object) {
        if (!this.proxyData.delete(proxy)) {
            return;
        }

        this.proxyParents.delete(proxy);

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
