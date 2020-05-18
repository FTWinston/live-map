type FieldMappingFunction<TSource, TMirror> = (
    dest: TMirror,
    value: any,
    source: TSource
) => void;

export type FieldMappings<TSource, TMirror> = {
    // Allow boolean, string remapping, nested mirroring and mapping functions for keys present in both types.
    [P in Extract<keyof TSource, keyof TMirror>]?:
        | boolean
        | keyof TMirror
        | FieldMappings<TSource[P], TMirror[P]>
        | FieldMappingFunction<TSource, TMirror>;
} &
    {
        // Allow only string remapping and mapping functions for keys present only in source type.
        [P in Exclude<keyof TSource, keyof TMirror>]?:
            | keyof TMirror
            | FieldMappingFunction<TSource, TMirror>;
    };
