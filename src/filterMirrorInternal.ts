import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { MappingHandler } from './MappingHandler';

export function filterMirrorInternal<
    TSource extends {},
    TMirror extends {},
    TKey
>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>,
    key: TKey,
    proxyManager: ProxyManager<TKey>
) {
    const mapping = new MappingHandler<TSource, TMirror, TKey>(
        source,
        () => mappings,
        proxyManager
    );

    const mirror = mapping.createMirror(key);

    const proxy = proxyManager.getProxy(key, source, mapping);

    return {
        proxy,
        mirror,
    };
}
