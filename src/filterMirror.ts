import { FieldMappings } from './FieldMappings';
import { createProxy } from './createProxy';
import { Mapping } from './Mapping';

export function filterMirror<TSource extends {}, TMirror extends {}>(
    source: TSource,
    mappings: FieldMappings<TSource, TMirror>
): [TSource, TMirror] {
    const mapping = new Mapping<TSource, TMirror>(mappings);

    const { mirror, setField, deleteField } = mapping.createMirror(source);
    
    const proxy = createProxy(source, setField, deleteField);

    return [proxy, mirror];
}