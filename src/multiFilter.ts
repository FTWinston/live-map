import { FieldMappings } from './FieldMappings';
import { SourceHandler } from './SourceHandler';
import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';

export function multiFilter<TSource extends {}, TMirror extends {}, TKey>(
    source: TSource,
    getMappings: (key: TKey) => FieldMappings<TSource, TMirror>
) {
    const proxyManager = new ProxyManager<TKey>();

    const sourceHandler = new SourceHandler<TSource, TMirror, TKey>(
        source,
        getMappings,
        proxyManager
    );

    const createMirror = (
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void
    ) => sourceHandler.createMirror(key, patchCallback)!;

    const removeMirror = (key: TKey) => sourceHandler.removeMirror(key);

    const proxy = proxyManager.getProxy(undefined, sourceHandler);

    return {
        proxy,
        createMirror,
        removeMirror,
    };
}
