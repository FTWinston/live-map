export const anyField = Symbol('*');

// keyof includes functions. That really doesn't suit us when it comes to arrays,
// as e.g. keyof string[] is complicated, and string[][keyof string[]] is horrific,
// when we would just want it to be string.
export type keysOf<T> = T extends any[] ? number : keyof T;
export type valuesOf<T> = T extends any[]
    ? T[number]
    : Exclude<T[keyof T], undefined>;

export type BaseInput = {};
export type BaseOutput = {};

type NotUndefined<T> = T extends undefined ? never : T;

type NotFunction<T> = NotUndefined<T> extends Function ? never : T;

type OptionalKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type MappingReturnValue<
    TInput extends BaseInput,
    TOutput extends BaseOutput
> = {
    // Required keys only in TOutput should have TOutput's corresponding value type.
    [P in Exclude<RequiredKeys<TOutput>, keyof TInput>]: NotFunction<
        TOutput[P]
    >;
} &
    {
        // Optional keys only in TOutput should have TOutput's corresponding value type.
        [P in Exclude<OptionalKeys<TOutput>, keyof TInput>]?: NotFunction<
            TOutput[P]
        >;
    } &
    {
        // Required keys in both TInput and TOutput could also have a nested mapping.
        [P in Extract<keyof TInput, RequiredKeys<TOutput>>]:
            | NotFunction<TOutput[P]>
            | NonRootMappingFunction<TInput[P], TOutput[P]>;
    } &
    {
        // Optional keys in both TInput and TOutput could also have a nested mapping.
        [P in Extract<keyof TInput, OptionalKeys<TOutput>>]?:
            | NotFunction<TOutput[P]>
            | NonRootMappingFunction<TInput[P], TOutput[P]>;
    };

export type MappingFunction<
    TInput extends BaseInput,
    TOutput extends BaseOutput
> = (input: TInput) => MappingReturnValue<TInput, TOutput>;

export type NonRootMappingFunction<
    TInput extends BaseInput,
    TOutput extends BaseOutput
> = (
    input: TInput
) =>
    | (MappingReturnValue<TInput, TOutput> & {
          [anyField]?: (
              input: valuesOf<TInput>
          ) => MappingReturnValue<valuesOf<TInput>, valuesOf<TOutput>>;
      })
    | undefined;
