import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { filterMirrorInternal } from './filterMirrorInternal';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>
) {
    const proxyManager = new ProxyManager<string>();

    return filterMirrorInternal<TSource, TMirror, string>(
        source,
        mappings,
        '',
        proxyManager
    );
}
