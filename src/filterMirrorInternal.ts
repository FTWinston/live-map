import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { Mapping } from './Mapping';

export function filterMirrorInternal<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>,
    proxyManager: ProxyManager
) {
    const mapping = new Mapping<TSource, TMirror, string>(
        source,
        () => mappings,
        proxyManager
    );

    const mirror = mapping.createMirror('');

    const proxy = proxyManager.getProxy(
        source,
        (param, val) => mapping.setField(param, val),
        (param) => mapping.deleteField(param)
    );

    return {
        proxy,
        mirror,
    };
}
