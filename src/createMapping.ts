import { ProxyManager } from './ProxyManager';
import { InputHandler } from './InputHandler';
import { PatchOperation } from './PatchOperation';
import { BaseInput, BaseOutput, MappingFunction } from './MappingFunction';

export function createMapping<
    TInput extends BaseInput,
    TOutput extends BaseOutput,
    TKey
>(
    input: TInput,
    mapping: MappingFunction<TInput, TOutput>,
    key: TKey,
    proxyManager: ProxyManager<TKey>,
    patchCallback?: (operation: PatchOperation) => void,
    allocateOutput?: (output: TOutput) => TOutput,
    afterChange?: () => void
) {
    const inputHandler = new InputHandler<TInput, TOutput, TKey>(
        input,
        () => mapping,
        proxyManager,
        afterChange
    );

    const proxy = proxyManager.getProxy(key, inputHandler);

    const outputHandler = inputHandler.createOutput(
        key,
        patchCallback,
        allocateOutput
    );

    return {
        proxy,
        output: outputHandler.output,
    };
}
