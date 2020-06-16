export const anyOtherFields = Symbol('*');

export const extraFields = Symbol('+');

// keyof includes functions. That really doesn't suit us when it comes to arrays,
// as e.g. keyof string[] is complicated, and string[][keyof string[]] is horrific,
// when we would just want it to be string.
type keysOf<T> = T extends any[] ? number : keyof T;
type valuesOf<T> = T extends any[] ? T[number] : T[keyof T];

export type FieldMappingFunction<TSource, TMirror> = (
    dest: TMirror,
    source: TSource,
    field: keyof TSource
) => void;

// For all other fields, only allow boolean or nested mirroring.
type AnyOtherMapping<TSource, TMirror> =
    | boolean
    | FieldMappings<valuesOf<TSource>, valuesOf<TMirror>>;

export type ExtraFields<TSource, TMirror> = {
    [P in keyof TMirror]?: ExtraField<TSource, TMirror[P]>;
};

export interface ExtraField<TSource, TValue> {
    getValue: (source: TSource) => TValue;
    getTriggers?: (source: TSource) => any[];
}

export type FieldMappingValue<TSource, TMirror> =
    | boolean
    | keyof TMirror
    | FieldMappings<valuesOf<TSource>, valuesOf<TMirror>>
    | FieldMappingFunction<TSource, TMirror>;

export type FieldMappingsWithoutSymbols<TSource, TMirror> = {
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

export type FieldMappings<TSource, TMirror> = FieldMappingsWithoutSymbols<
    TSource,
    TMirror
> & {
    [anyOtherFields]?: AnyOtherMapping<TSource, TMirror>;
    [extraFields]?: ExtraFields<TSource, TMirror>;
};
