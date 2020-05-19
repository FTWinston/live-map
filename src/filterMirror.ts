import { createProxy } from './createProxy';
import { FieldMappings } from './FieldMappings';
import { Mapping } from './Mapping';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>
) {
    const mapping = new Mapping<TSource, TMirror, string>(
        source,
        () => mappings
    );

    const mirror = mapping.createMirror('');

    const proxy = createProxy(
        source,
        (param, val) => mapping.setField(param, val),
        (param) => mapping.deleteField(param)
    );

    return {
        proxy,
        mirror,
    };
}
