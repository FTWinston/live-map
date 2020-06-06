import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { filterMirrorInternal } from './filterMirrorInternal';
import { PatchOperation } from './PatchOperation';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>,
    patchCallback?: (operation: PatchOperation) => void
): {
    proxy: TSource;
    mirror: TMirror;
} {
    const proxyManager = new ProxyManager<string>();

    const filterData = filterMirrorInternal<TSource, TMirror, string>(
        source,
        mappings,
        '',
        proxyManager,
        patchCallback
    );

    return {
        proxy: filterData.proxy,
        mirror: filterData.mirror,
    };
}
