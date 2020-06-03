import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { MappingHandler } from './MappingHandler';
import { PatchOperation } from './PatchOperation';

export function filterMirrorInternal<
    TSource extends {},
    TMirror extends {},
    TKey
>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>,
    key: TKey,
    proxyManager: ProxyManager<TKey>,
    patchCallback?: (operation: PatchOperation) => void,
    assignMirror?: (mirror: TMirror) => TMirror,
    assignBeforePopulating?: boolean
) {
    const mapping = new MappingHandler<TSource, TMirror, TKey>(
        source,
        () => mappings,
        proxyManager
    );

    const mirror = mapping.createMirror(
        key,
        patchCallback,
        assignMirror,
        assignBeforePopulating
    );

    const proxy = proxyManager.getProxy(key, source, mapping);

    return {
        proxy,
        mirror,
        mapping,
    };
}
