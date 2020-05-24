import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { Mapping } from './Mapping';
import { filterMirrorInternal } from './filterMirrorInternal';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>
) {
    const proxyManager = new ProxyManager();

    return filterMirrorInternal<TSource, TMirror>(
        source,
        mappings,
        proxyManager
    );
}
