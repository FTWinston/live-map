import { JSONPatcherProxy } from 'jsonpatcherproxy';
import { deepClone } from 'fast-json-patch';
import deepEqual from 'fast-deep-equal';
import {
    MappingFunction,
    BaseInput,
    BaseOutput,
    valuesOf,
    MappingReturnValue,
} from './MappingFunction';
import { createMapping } from './createMapping';
import { PatchOperation } from './PatchOperation';
import { InputHandler } from './InputHandler';

export class OutputHandler<
    TInput extends BaseInput,
    TOutput extends BaseOutput,
    TKey
> {
    private _output: TOutput | undefined;

    public get output() {
        return this._output;
    }

    private readonly mappedKeys = new Set<string>();
    private readonly nestedMappedKeys = new Set<string>();

    public readonly beforeChange?: () => void;

    private readonly triggerSnapshots: Record<
        keyof TOutput,
        any[]
    > = {} as Record<keyof TOutput, any[]>;

    constructor(
        private readonly mappingKey: TKey,
        private readonly inputHandler: InputHandler<TInput, TOutput, TKey>,
        private readonly mapping: /*NonRoot*/ MappingFunction<TInput, TOutput>,
        private readonly patchCallback?: (operation: PatchOperation) => void,
        private readonly allocateOutput?: (output?: TOutput) => TOutput
    ) {
        this._output = this.runMapping(this.inputHandler.input);

        /*
        // Determine anyOtherSet and anyOtherDelete.
        const anyOtherFields = mapping[anyFieldSymbol];

        if (anyOtherFields !== undefined && anyOtherFields !== false) {
            [this.anyOtherSet, this.anyOtherDelete] = this.parseFieldMapping(
                key,
                anyOtherFields
            );
        }

        this._output = this.createOutput(assignBeforePopulating);
        this.previouslyMapped = true;
        */
    }

    public inputUpdated() {
        this._output = this.runMapping(this.inputHandler.input, this._output);
    }

    private runMapping(input: TInput, existingOutput?: TOutput) {
        const returnValue = this.mapping(input);

        if (returnValue === undefined) {
            if (existingOutput !== undefined) {
                this.removeExistingOutput(existingOutput);
            }

            return undefined;
        } else if (existingOutput === undefined) {
            return this.addNewOutput(input, returnValue);
        } else {
            return this.updateExistingOutput(existingOutput, returnValue);
        }
    }

    private removeExistingOutput(output: TOutput) {
        for (const key of this.nestedMappedKeys) {
            this.removeNestedMapping(key);
        }

        this.mappedKeys.clear();
        this.nestedMappedKeys.clear();
        this.allocateOutput?.();
    }

    private addNewOutput(
        input: TInput,
        returnValue: MappingReturnValue<TInput, TOutput>
    ): TOutput {
        let patcher: JSONPatcherProxy<TOutput> | undefined;

        let output: TOutput = {} as any;

        if (this.patchCallback) {
            patcher = new JSONPatcherProxy(output, false);

            output = patcher.observe(false, (patch: PatchOperation) =>
                this.patchCallback!(this.tidyPatch(patch))
            ) as any;

            patcher.pause();
        }

        for (const [key, outputVal] of Object.entries(returnValue)) {
            this.mappedKeys.add(key);

            if (typeof outputVal === 'function') {
                this.nestedMappedKeys.add(key);

                const inputVal: valuesOf<TInput> = (input as any)[key];

                const allocateOutput = (nestedOutput: any) => {
                    if (nestedOutput === undefined) {
                        delete (output as any)[key];
                    }
                    else {
                        (output as any)[key] = nestedOutput;
                        return (output as any)[key];
                    }
                };

                createMapping<valuesOf<TInput>, valuesOf<TOutput>, TKey>(
                    inputVal,
                    outputVal as MappingFunction<
                        valuesOf<TInput>,
                        valuesOf<TOutput>
                    >,
                    this.mappingKey,
                    this.inputHandler.proxyManager,
                    undefined,
                    allocateOutput,
                    this.beforeChange
                );
            } else if (outputVal !== undefined) {
                (output as any)[key] = outputVal;
            }
        }

        patcher?.resume();

        if (this.allocateOutput) {
            output = this.allocateOutput(output);
        }

        return output;
    }

    private updateExistingOutput(
        output: TOutput,
        returnValue: MappingReturnValue<TInput, TOutput>
    ) {
        const notFoundKeys = new Set<string>(this.mappedKeys);

        // If an object on returnValue is new or has changed.
        for (const [key, value] of Object.entries(returnValue)) {
            const wasNestedBefore = this.nestedMappedKeys.has(key);
            const isNestedNow = typeof value === 'function';

            if (value === undefined) {
                continue;
            }

            const didHave = notFoundKeys.delete(key);

            if (!didHave) {
                // TODO: this is a new field added.
                this.mappedKeys.add(key);
            }

            if (isNestedNow) {
                if (!wasNestedBefore) {
                    this.nestedMappedKeys.add(key);

                    // TODO: account for newly added nested mapping.
                }

                // Skip nested mappings when updating this mapping's output.
                continue;
            } else if (wasNestedBefore) {
                this.nestedMappedKeys.delete(key);
                this.removeNestedMapping(key);
            }

            if (!deepEqual(value, output[key as keyof TOutput])) {
                // To minimise patch churn, only allocate if the value has changed.
                output[key as keyof TOutput] = value as any;
            }
        }

        // If a key on output isn't present on returnValue, remove it.
        for (const key of notFoundKeys) {
            delete output[key as keyof TOutput];

            this.mappedKeys.delete(key);

            if (this.nestedMappedKeys.delete(key)) {
                this.removeNestedMapping(key);
            }
        }

        return output;
    }

    private removeNestedMapping(key: string) {
        // TODO: implement removeNestedMapping
    }

    private arraysMatch(arr1: any[], arr2: any[] | undefined) {
        if (!arr2 || arr1.length !== arr2.length) {
            return false;
        }

        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }

        return true;
    }

    private tidyPatch(operation: PatchOperation) {
        switch (operation.op) {
            case 'add':
            case 'replace':
                operation.value = deepClone(operation.value);
                break;
        }

        return operation;
    }
}
