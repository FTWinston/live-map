import { ProxyManager } from './ProxyManager';
import { createMapping } from './createMapping';
import { PatchOperation } from './PatchOperation';
import { BaseInput, BaseOutput, MappingFunction } from './MappingFunction';

export function liveMap<TInput extends BaseInput, TOutput extends BaseOutput>(
    input: TInput,
    mapping: MappingFunction<TInput, TOutput>,
    patchCallback?: (operation: PatchOperation) => void
): {
    proxy: TInput;
    output: TOutput;
} {
    const proxyManager = new ProxyManager<string>();

    const {
        proxy,
        output,
    } = createMapping<TInput, TOutput, string>(
        input,
        mapping,
        '',
        proxyManager,
        patchCallback
    );

    return {
        proxy,
        output: output!,
    };
}
