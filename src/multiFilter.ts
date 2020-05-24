import { FieldMappings } from './FieldMappings';
import { MappingHandler } from './MappingHandler';
import { ProxyManager } from './ProxyManager';

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

    const createMirror = (key: TKey) => mapping.createMirror(key);
    const removeMirror = (key: TKey) => mapping.removeMirror(key);
    const substituteMirror = (key: TKey, mirror: TMirror) =>
        mapping.substituteMirror(key, mirror);

    const proxy = proxyManager.getProxy(undefined, source, mapping);

    return {
        proxy,
        createMirror,
        removeMirror,
        substituteMirror,
    };
}
