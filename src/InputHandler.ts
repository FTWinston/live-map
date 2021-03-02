import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';
import { OutputHandler } from './OutputHandler';
import { BaseInput, BaseOutput, MappingFunction } from './MappingFunction';

export interface IInputHandler<TInput extends BaseInput> {
    readonly input: TInput;
    update(): void;
    descendantChanged(): void;
}

export class InputHandler<
    TInput extends BaseInput,
    TOutput extends BaseOutput,
    TKey
> implements IInputHandler<TInput> {
    private readonly outputHandlers = new Map<
        TKey,
        OutputHandler<TInput, TOutput, TKey>
    >();

    constructor(
        public readonly input: TInput,
        private readonly getMapping: (
            key: TKey
        ) => MappingFunction<TInput, TOutput>,
        public readonly proxyManager: ProxyManager<TKey>,
        private readonly afterChange?: () => void
    ) {}

    public createOutput(
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void,
        allocateOutput?: (output: TOutput) => TOutput
    ) {
        const outputHandler = new OutputHandler<TInput, TOutput, TKey>(
            key,
            this,
            this.getMapping(key),
            patchCallback,
            allocateOutput
        );

        this.outputHandlers.set(key, outputHandler);

        return outputHandler;
    }

    public removeOutput(key: TKey) {
        this.outputHandlers.delete(key);
        this.proxyManager.removeKey(key);
    }

    public update() {
        for (const outputHandler of this.outputHandlers.values()) {
            outputHandler.beforeChange?.();
            outputHandler.inputUpdated();
        }

        this.afterChange?.();
    }

    public descendantChanged() {
        for (const outputHandler of this.outputHandlers.values()) {
            outputHandler.beforeChange?.();
        }

        this.afterChange?.();
    }
}
