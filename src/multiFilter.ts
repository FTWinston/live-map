import { FieldMappings } from './FieldMappings';
import { Mapping } from './Mapping';
import { ProxyManager } from './ProxyManager';

export function multiFilter<TSource extends {}, TMirror extends {}, TKey>(
    source: TSource,
    getMappings: (key: TKey) => FieldMappings<TSource, TMirror>
) {
    const proxyManager = new ProxyManager();

    const mapping = new Mapping<TSource, TMirror, TKey>(
        source,
        getMappings,
        proxyManager
    );

    const createMirror = (key: TKey) => mapping.createMirror(key);
    const removeMirror = (key: TKey) => mapping.removeMirror(key);
    const substituteMirror = (key: TKey, mirror: TMirror) =>
        mapping.substituteMirror(key, mirror);

    const proxy = proxyManager.getProxy(
        source,
        (param, val) => mapping.setField(param, val),
        (param) => mapping.deleteField(param)
    );

    return {
        proxy,
        createMirror,
        removeMirror,
        substituteMirror,
    };
}
