import { JSONPatcherProxy } from 'jsonpatcherproxy';
import { deepClone } from 'fast-json-patch';
import {
    FieldMapping,
    FieldMappings,
    anyOtherFields as anyOtherFieldsSymbol,
    extraFields as extraFieldsSymbol,
    ExtraField,
    ExtraFields,
} from './FieldMappings';
import { filterMirrorInternal } from './filterMirrorInternal';
import { PatchOperation } from './PatchOperation';
import { SourceHandler } from './SourceHandler';

type FieldOperation<TSource, TMirror> = (
    source: TSource,
    field: keyof TSource,
    dest: TMirror
) => void;

export class MirrorHandler<TSource, TMirror, TKey> {
    public readonly mirror: TMirror;

    private readonly setOperations = new Map<
        keyof TSource,
        FieldOperation<TSource, TMirror>
    >();
    private readonly deleteOperations = new Map<
        keyof TSource,
        FieldOperation<TSource, TMirror>
    >();

    private readonly anyOtherSet?: FieldOperation<TSource, TMirror>;
    private readonly anyOtherDelete?: FieldOperation<TSource, TMirror>;

    private readonly afterChange?: () => void;

    private readonly triggerSnapshots: Record<
        keyof TMirror,
        any[]
    > = {} as Record<keyof TMirror, any[]>;

    constructor(
        private readonly key: TKey,
        private readonly sourceHandler: SourceHandler<TSource, TMirror, TKey>,
        mappings: FieldMappings<TSource, TMirror>,
        private readonly patchCallback?: (operation: PatchOperation) => void,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating: boolean = false
    ) {
        // Ensure that afterChange event is set up before parsing mappings.
        const extraFields = mappings[extraFieldsSymbol];

        if (extraFields) {
            this.afterChange = () => {
                for (const destField in extraFields) {
                    const extraField = extraFields[destField];
                    this.tryAssignExtraField(destField, extraField);
                }
            };
        }

        // Gather setOperations and deleteOperations.
        for (const field in mappings) {
            const filterValue =
                mappings[field as keyof FieldMappings<TSource, TMirror>];
            const sourceKey = field as keyof TSource;

            const [setOperation, deleteOperation] = this.parseFieldMapping(
                key,
                filterValue as any // "Type instantiation is excessively deep and possibly infinite"
            );

            this.setOperations.set(sourceKey, setOperation);

            if (deleteOperation !== undefined) {
                this.deleteOperations.set(sourceKey, deleteOperation);
            }
        }

        // Determine anyOtherSet and anyOtherDelete.
        const anyOtherFields = mappings[anyOtherFieldsSymbol];

        let anyOtherSet: FieldOperation<TSource, TMirror> | undefined;
        let anyOtherDelete: FieldOperation<TSource, TMirror> | undefined;

        if (anyOtherFields !== undefined && anyOtherFields !== false) {
            [this.anyOtherSet, this.anyOtherDelete] = this.parseFieldMapping(
                key,
                anyOtherFields
            );
        }

        this.mirror = this.createMirror(
            extraFields,
            assignMirror,
            assignBeforePopulating
        );
    }

    private initialAssignment = false;

    private createMirror(
        extraFields?: ExtraFields<TSource, TMirror>,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating?: boolean
    ) {
        let mirror = Array.isArray(this.sourceHandler.source)
            ? (([] as unknown) as TMirror)
            : (({} as unknown) as TMirror);

        let patcher: JSONPatcherProxy<TMirror> | undefined;

        if (this.patchCallback) {
            patcher = new JSONPatcherProxy<TMirror>(mirror, false);

            mirror = (patcher.observe(false, (patch: PatchOperation) =>
                this.patchCallback(this.tidyPatch(patch))
            ) as unknown) as TMirror;

            patcher.pause();
        }

        if (assignMirror && assignBeforePopulating) {
            mirror = assignMirror(mirror);
        }

        this.initialAssignment = true;

        for (const field in this.sourceHandler.source) {
            // Don't allow afterChange to run, because mirror hasn't yet been assigned.
            this.runOperation(
                field,
                mirror,
                this.setOperations,
                this.anyOtherSet
            );
        }

        if (extraFields) {
            for (const destField in extraFields) {
                const extraField = extraFields[destField];
                const triggers = extraField.getTriggers
                    ? extraField.getTriggers(this.sourceHandler.source).slice()
                    : undefined;

                this.assignExtraField(mirror, destField, extraField, triggers);
            }
        }

        this.initialAssignment = false;

        if (assignMirror && !assignBeforePopulating) {
            mirror = assignMirror(mirror);
        }

        if (patcher) {
            patcher.resume();
        }

        return mirror;
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

    private tryAssignExtraField(
        destField: Extract<keyof TMirror, string>,
        extraField: ExtraField<TSource, TMirror[keyof TMirror]>
    ) {
        const newTriggers = extraField
            .getTriggers(this.sourceHandler.source)
            .slice();
        const oldTriggers = this.triggerSnapshots[destField];

        if (this.arraysMatch(newTriggers, oldTriggers)) {
            return;
        }

        this.assignExtraField(this.mirror, destField, extraField, newTriggers);
    }

    private assignExtraField(
        mirror: TMirror,
        destField: keyof TMirror,
        extraField: ExtraField<TSource, TMirror[keyof TMirror]>,
        triggers: any[]
    ) {
        const value = extraField.getValue(this.sourceHandler.source);
        mirror[destField] = value as any;
        this.triggerSnapshots[destField] = triggers;
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

    private parseFieldMapping(
        mirrorKey: TKey,
        filterValue: FieldMapping<TSource, TMirror>
    ): [
        FieldOperation<TSource, TMirror>,
        FieldOperation<TSource, TMirror> | undefined
    ] {
        let setOperation: FieldOperation<TSource, TMirror>;
        let deleteOperation: FieldOperation<TSource, TMirror> | undefined;

        if (filterValue === false) {
            setOperation = deleteOperation = () => {};
        } else if (filterValue === true) {
            setOperation = (source, field, dest) => {
                const destField = (field as unknown) as keyof TMirror;
                dest[destField] = source[field] as any;
            };
            deleteOperation = (_source, field, dest) => {
                const destField = (field as unknown) as keyof TMirror;
                delete dest[destField];
            };
        } else if (typeof filterValue === 'object') {
            setOperation = (source, field, dest) => {
                const sourceValue = source[field];
                const destField = (field as unknown) as keyof TMirror;

                const substituteMirror = (mirror: TMirror[keyof TMirror]) => {
                    dest[destField] = mirror;
                    return dest[destField];
                };

                const { proxy: childProxy } = filterMirrorInternal<
                    TSource[keyof TSource],
                    TMirror[keyof TMirror],
                    TKey
                >(
                    sourceValue,
                    filterValue as FieldMappings<
                        TSource[keyof TSource],
                        TMirror[keyof TMirror]
                    >,
                    mirrorKey,
                    this.sourceHandler.proxyManager,
                    undefined,
                    substituteMirror,
                    this.initialAssignment,
                    this.afterChange
                );

                if (sourceValue !== childProxy) {
                    source[field] = childProxy;
                }
            };
            deleteOperation = (_source, key, dest) => {
                const destField = (key as unknown) as keyof TMirror;
                delete dest[destField];
            };
        } else if (
            typeof filterValue === 'string' ||
            typeof filterValue === 'number' ||
            typeof filterValue === 'symbol'
        ) {
            const destField = filterValue as keyof TMirror;
            setOperation = (source, field, dest) => {
                dest[destField] = source[field] as any;
            };
            deleteOperation = (_source, _field, dest) => {
                delete dest[destField];
            };
        } else if (typeof filterValue === 'function') {
            setOperation = (source, field, dest) =>
                filterValue(dest, source, field);
        } else {
            throw new Error(`Filter value has unexpected type: ${filterValue}`);
        }

        return [setOperation, deleteOperation];
    }

    public runSetOperation(field: keyof TSource, val: TSource[keyof TSource]) {
        this.runOperation(
            field,
            this.mirror,
            this.setOperations,
            this.anyOtherSet,
            this.afterChange
        );
    }

    public runDeleteOperation(field: keyof TSource) {
        this.runOperation(
            field,
            this.mirror,
            this.deleteOperations,
            this.anyOtherDelete,
            this.afterChange
        );
    }

    private runOperation(
        field: keyof TSource,
        mirror: TMirror,
        operations: Map<keyof TSource, FieldOperation<TSource, TMirror>>,
        fallback?: FieldOperation<TSource, TMirror>,
        afterChange?: () => void
    ) {
        const operation = operations.get(field);
        if (operation) {
            operation(this.sourceHandler.source, field, mirror);
        } else if (fallback) {
            fallback(this.sourceHandler.source, field, mirror);
        }

        if (afterChange) {
            afterChange();
        }
    }
}
