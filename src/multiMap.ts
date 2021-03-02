import { InputHandler } from './InputHandler';
import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';
import { BaseInput, BaseOutput, MappingFunction } from './MappingFunction';

export function multiMap<
    TInput extends BaseInput,
    TOutput extends BaseOutput,
    TKey
>(input: TInput, getMapping: (key: TKey) => MappingFunction<TInput, TOutput>) {
    const proxyManager = new ProxyManager<TKey>();

    const inputHandler = new InputHandler<TInput, TOutput, TKey>(
        input,
        getMapping,
        proxyManager
    );

    const createOutput = (
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void
    ) => inputHandler.createOutput(key, patchCallback) as Readonly<TOutput>;

    const removeOutput = (key: TKey) => inputHandler.removeOutput(key);

    const proxy = proxyManager.getProxy(undefined, inputHandler);

    return {
        proxy,
        createOutput,
        removeOutput,
    };
}
