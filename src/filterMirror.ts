import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { filterMirrorInternal } from './filterMirrorInternal';
import { PatchOperation } from './PatchOperation';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>,
    patchCallback?: (operation: PatchOperation) => void
) {
    const proxyManager = new ProxyManager<string>();

    return filterMirrorInternal<TSource, TMirror, string>(
        source,
        mappings,
        '',
        proxyManager,
        patchCallback
    );
}
