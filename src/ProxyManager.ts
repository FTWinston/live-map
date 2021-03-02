import { IInputHandler } from './InputHandler';
import { BaseInput } from './MappingFunction';

interface ProxyInfo<TKey, TInput> {
    proxy: TInput;
    inputHandlers: Map<TKey | undefined, IInputHandler<TInput>>;
    parentInfo?: ProxyInfo<TKey, any>;
}

export class ProxyManager<TKey> {
    private readonly proxyData = new Map<any, ProxyInfo<TKey, any>>();

    private createProxy<TInput extends BaseInput>(
        input: TInput
    ): ProxyInfo<TKey, TInput> {
        const inputHandlers = new Map<TKey, IInputHandler<any>>();

        const proxy = new Proxy(input, {
            get: (target, field: keyof TInput) => {
                const val = target[field];
                let fieldProxyInfo: ProxyInfo<TKey, any> | undefined;

                if (field !== 'prototype') {
                    fieldProxyInfo = this.proxyData.get(val);

                    if (!fieldProxyInfo && this.canProxy(val)) {
                        fieldProxyInfo = this.createProxy(val);
                        fieldProxyInfo.parentInfo = proxyInfo;
                    }
                }

                return fieldProxyInfo === undefined
                    ? val
                    : fieldProxyInfo.proxy;
            },
            set: (target, field: keyof TInput, val) => {
                this.removeProxy(target[field] as any);

                target[field] = val;

                this.updateHandlers(inputHandlers, target);

                return true;
            },
            deleteProperty: (target, field: keyof TInput) => {
                const val = target[field];

                this.removeProxy(val as any);

                delete target[field];

                this.updateHandlers(inputHandlers, target);

                return true;
            },
        });

        const proxyInfo: ProxyInfo<TKey, TInput> = {
            proxy,
            inputHandlers: inputHandlers,
        };

        this.proxyData.set(input, proxyInfo);

        return proxyInfo;
    }

    private updateHandlers<TInput>(
        inputHandlers: Map<TKey, IInputHandler<any>>,
        target: TInput
    ) {
        if (inputHandlers.size === 0) {
            const fieldProxyInfo = this.proxyData.get(target);
            if (fieldProxyInfo) {
                this.updateClosestAncestorInputHandlers(fieldProxyInfo);
            }
        } else {
            for (const inputHandler of inputHandlers.values()) {
                inputHandler.update();
            }
        }
    }

    public getProxy<TInput extends BaseInput>(
        key: TKey | undefined,
        inputHandler: IInputHandler<TInput>
    ): TInput {
        // If input already has a managed proxy, record the new operations and return it.
        const proxyInfo =
            this.proxyData.get(inputHandler.input) ??
            this.createProxy(inputHandler.input);

        proxyInfo.inputHandlers.set(key, inputHandler);

        return proxyInfo.proxy;
    }

    // TODO: do we need to keep this?
    private updateClosestAncestorInputHandlers(info: ProxyInfo<TKey, any>) {
        let proxyInfo: ProxyInfo<TKey, any> | undefined = info;

        while (true) {
            if (proxyInfo.inputHandlers.size !== 0) {
                break;
            }

            proxyInfo = proxyInfo.parentInfo;

            if (!proxyInfo) {
                return;
            }
        }

        for (const handler of proxyInfo.inputHandlers.values()) {
            handler.descendantChanged();
        }
    }

    private canProxy(object: any) {
        if (this.proxyData.has(object)) {
            return false;
        }

        const type = typeof object;
        return type === 'function' || (type === 'object' && !!object);
    }

    private removeProxy(object: object) {
        const proxyInfo = this.proxyData.get(object);

        if (!proxyInfo || !this.proxyData.delete(object)) {
            return;
        }

        // Recursively remove any proxies that were below this one in the hierarchy,
        // because this manager stores data for ALL proxies.
        for (const key in object) {
            const val = (object as any)[key];
            this.removeProxy(val);
        }
    }

    // TODO: this seems a bit ... excessive if it's looping every proxy.
    // Could we have a separate map per key, or anything?
    public removeKey(key: TKey) {
        for (const proxyInfo of this.proxyData.values()) {
            proxyInfo.inputHandlers.delete(key);
        }
    }
}
