import { FieldMappings } from './FieldMappings';
import { MappingHandler } from './MappingHandler';
import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';

export function multiFilter<TSource extends {}, TMirror extends {}, TKey>(
    source: TSource,
    getMappings: (key: TKey) => FieldMappings<TSource, TMirror>
) {
    const proxyManager = new ProxyManager<TKey>();

    const mapping = new MappingHandler<TSource, TMirror, TKey>(
        source,
        getMappings,
        proxyManager
    );

    const createMirror = (
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void
    ) => mapping.createMirror(key, patchCallback);
    const removeMirror = (key: TKey) => mapping.removeMirror(key);

    const proxy = proxyManager.getProxy(undefined, source, mapping);

    return {
        proxy,
        createMirror,
        removeMirror,
    };
}
