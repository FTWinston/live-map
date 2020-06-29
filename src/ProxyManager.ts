import { ISourceHandler } from './SourceHandler';

interface ProxyInfo<TKey, TSource> {
    proxy: TSource;
    handlers: Map<TKey, ISourceHandler<TSource>>;
    parentInfo?: ProxyInfo<TKey, any>;
}

export class ProxyManager<TKey> {
    private readonly proxyData = new Map<any, ProxyInfo<TKey, any>>();

    private createProxy<TSource extends {}>(
        source: TSource
    ): ProxyInfo<TKey, TSource> {
        const sourceHandlers = new Map<TKey, ISourceHandler<any>>();

        const proxy = new Proxy(source, {
            get: (target, field: keyof TSource) => {
                const val = target[field];
                let fieldProxyInfo: ProxyInfo<TKey, any> | undefined;

                if (field !== 'prototype') {
                    fieldProxyInfo = this.proxyData.get(val);

                    if (!fieldProxyInfo && this.canProxy(val)) {
                        fieldProxyInfo = this.createProxy(val);
                        fieldProxyInfo.parentInfo = proxyInfo;
                    }
                }

                return fieldProxyInfo ? fieldProxyInfo.proxy : val;
            },
            set: (target, field: keyof TSource, val) => {
                this.removeProxy(target[field] as any);

                target[field] = val;

                if (sourceHandlers.size === 0) {
                    const fieldProxyInfo = this.proxyData.get(target);
                    this.updateClosestAncestorSourceHandlers(fieldProxyInfo);
                } else {
                    for (const [, sourceHandler] of sourceHandlers) {
                        sourceHandler.setField(field, val);
                    }
                }

                return true;
            },
            deleteProperty: (target, field: keyof TSource) => {
                const val = target[field];
                this.removeProxy(val as any);

                delete target[field];

                if (sourceHandlers.size === 0) {
                    const fieldProxyInfo = this.proxyData.get(target);
                    this.updateClosestAncestorSourceHandlers(fieldProxyInfo);
                } else {
                    for (const [, sourceHandler] of sourceHandlers) {
                        sourceHandler.deleteField(field);
                    }
                }

                return true;
            },
        });

        const proxyInfo: ProxyInfo<TKey, TSource> = {
            proxy,
            handlers: sourceHandlers,
        };

        this.proxyData.set(source, proxyInfo);

        return proxyInfo;
    }

    public getProxy<TSource extends {}>(
        key: TKey | undefined,
        handler: ISourceHandler<TSource>
    ): TSource {
        // If source already has a managed proxy, record the new operations and return it.
        const proxyInfo =
            this.proxyData.get(handler.source) ??
            this.createProxy(handler.source);

        proxyInfo.handlers.set(key, handler);

        return proxyInfo.proxy;
    }

    private updateClosestAncestorSourceHandlers(
        proxyInfo: ProxyInfo<TKey, any>
    ) {
        while (true) {
            if (proxyInfo.handlers.size !== 0) {
                break;
            }

            proxyInfo = proxyInfo.parentInfo;

            if (!proxyInfo) {
                return;
            }
        }

        for (const [, handler] of proxyInfo.handlers) {
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

    public removeProxy(object: object) {
        const proxyInfo = this.proxyData.get(object);

        if (!proxyInfo || !this.proxyData.delete(object)) {
            return;
        }

        // We need to also remove any proxies that were below this one in the hierarchy,
        // because this manager stores data for ALL proxies.
        for (const key in object) {
            const val = (object as any)[key];
            this.removeProxy(val);
        }
    }

    public removeKey(key: TKey) {
        for (const [, proxyInfo] of this.proxyData) {
            proxyInfo.handlers.delete(key);
        }
    }
}
