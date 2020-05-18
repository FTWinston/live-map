import { FieldMappings } from './FieldMappings';
import { Mapping } from './Mapping';
import { createProxy } from './createProxy';

export function multiFilter<TSource extends {}, TMirror extends {}, TKey>(
    source: TSource,
    getMappings: (key: TKey) => FieldMappings<TSource, TMirror>
) {
    const mapping = new Mapping<TSource, TMirror, TKey>(source, getMappings);

    const createMirror = (key: TKey) => mapping.createMirror(key);
    const deleteMirror = (key: TKey) => mapping.deleteMirror(key);
    const substituteMirror = (key: TKey, mirror: TMirror) =>
        mapping.substituteMirror(key, mirror);

    const proxy = createProxy(
        source,
        (param, val) => mapping.setField(param, val),
        (param) => mapping.deleteField(param)
    );

    return [proxy, createMirror, deleteMirror, substituteMirror];
}
