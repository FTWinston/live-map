import { ProxyManager } from './ProxyManager';
import { FieldMappings } from './FieldMappings';
import { SourceHandler } from './SourceHandler';
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
    assignBeforePopulating?: boolean,
    afterChange?: () => void
) {
    const sourceHandler = new SourceHandler<TSource, TMirror, TKey>(
        source,
        () => mappings,
        proxyManager,
        afterChange
    );

    const proxy = proxyManager.getProxy(key, sourceHandler);

    const mirror = sourceHandler.createMirror(
        key,
        patchCallback,
        assignMirror,
        assignBeforePopulating
    );

    return {
        proxy,
        mirror: mirror!,
    };
}
