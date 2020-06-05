export const anyOtherFields = Symbol('*');

export const extraFields = Symbol('+');

export type FieldMappingFunction<TSource, TMirror> = (
    dest: TMirror,
    source: TSource,
    field: keyof TSource
) => void;

// For all other fields, only allow boolean or nested mirroring.
type AnyOtherMapping<TSource, TMirror> =
    | boolean
    | FieldMappings<TSource[keyof TSource], TMirror[keyof TMirror]>;

export type ExtraFields<TSource, TMirror> = {
    [P in keyof TMirror]?: ExtraField<TSource, TMirror[P]>;
};

export interface ExtraField<TSource, TValue> {
    getValue: (source: TSource) => TValue;
    getTriggers?: (source: TSource) => any[];
}

export type FieldMapping<TSource, TMirror> =
    | AnyOtherMapping<TSource, TMirror>
    | keyof TMirror
    | FieldMappingFunction<TSource, TMirror>;

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
    } & {
        [anyOtherFields]?: AnyOtherMapping<TSource, TMirror>;
        [extraFields]?: ExtraFields<TSource, TMirror>;
    };
