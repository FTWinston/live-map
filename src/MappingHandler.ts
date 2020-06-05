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
import { ProxyManager } from './ProxyManager';
import { PatchOperation } from './PatchOperation';

type FieldOperation<TSource, TMirror> = (
    source: TSource,
    field: keyof TSource,
    dest: TMirror
) => void;

interface MirrorData<TSource, TMirror> {
    mirror: TMirror;
    setOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>;
    deleteOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>;
    anyOtherSet?: FieldOperation<TSource, TMirror>;
    anyOtherDelete?: FieldOperation<TSource, TMirror>;
    triggerSnapshots?: Record<keyof TMirror, any[]>;
    afterChange?: () => void;
}

export interface OperationHandler<TSource> {
    setField(field: keyof TSource, val: TSource[keyof TSource]): void;
    deleteField(field: keyof TSource): void;
}

export class MappingHandler<TSource, TMirror, TKey>
    implements OperationHandler<TSource> {
    private readonly mirrorData = new Map<TKey, MirrorData<TSource, TMirror>>();

    constructor(
        private readonly source: TSource,
        private readonly getMappings: (
            key: TKey
        ) => FieldMappings<TSource, TMirror>,
        private readonly proxyManager: ProxyManager<TKey>,
        private readonly afterChange?: () => void
    ) {}

    public createMirror(
        key: TKey,
        patchCallback?: (operation: PatchOperation) => void,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating?: boolean
    ) {
        const setOperations = new Map<
            keyof TSource,
            FieldOperation<TSource, TMirror>
        >();

        const deleteOperations = new Map<
            keyof TSource,
            FieldOperation<TSource, TMirror>
        >();

        const mappings = this.getMappings(key);

        for (const field in mappings) {
            const filterValue =
                mappings[field as keyof FieldMappings<TSource, TMirror>];
            const sourceKey = field as keyof TSource;

            const [setOperation, deleteOperation] = this.parseFieldMapping(
                key,
                filterValue as any // "Type instantiation is excessively deep and possibly infinite"
            );

            setOperations.set(sourceKey, setOperation);

            if (deleteOperation !== undefined) {
                deleteOperations.set(sourceKey, deleteOperation);
            }
        }

        const anyOtherFields = mappings[anyOtherFieldsSymbol];

        let anyOtherSet: FieldOperation<TSource, TMirror> | undefined;
        let anyOtherDelete: FieldOperation<TSource, TMirror> | undefined;

        if (anyOtherFields !== undefined && anyOtherFields !== false) {
            [anyOtherSet, anyOtherDelete] = this.parseFieldMapping(
                key,
                anyOtherFields
            );
        }

        const extraFields = mappings[extraFieldsSymbol];

        const triggerSnapshots: Record<keyof TMirror, any[]> = {} as Record<
            keyof TMirror,
            any[]
        >;

        let mirror = this.createNewMirror(
            setOperations,
            anyOtherSet,
            patchCallback,
            extraFields,
            triggerSnapshots,
            assignMirror,
            assignBeforePopulating
        );

        const mirrorData: MirrorData<TSource, TMirror> = {
            mirror,
            setOperations,
            deleteOperations,
            anyOtherSet,
            anyOtherDelete,
            triggerSnapshots,
        };

        if (extraFields) {

            mirrorData.afterChange = () => {
                for (const destField in extraFields) {
                    const extraField = extraFields[destField];
                    this.tryAssignExtraField(mirrorData, destField, extraField);
                }

                // Bubble up to any parent mappings.
                if (this.afterChange) {
                    this.afterChange();
                }
            };
        } else if (this.afterChange) {
            // Bubble up to any parent mappings, even if we don't have extraFields here.
            mirrorData.afterChange = this.afterChange;
        }

        this.mirrorData.set(key, mirrorData);

        return mirror;
    }

    private initialAssignment = false;

    private createNewMirror(
        setOperations: Map<keyof TSource, FieldOperation<TSource, TMirror>>,
        anyOtherSet: FieldOperation<TSource, TMirror>,
        patchCallback?: (patch: PatchOperation) => void,
        extraFields?: ExtraFields<TSource, TMirror>,
        triggerSnapshots?: Record<keyof TMirror, any[]>,
        assignMirror?: (mirror: TMirror) => TMirror,
        assignBeforePopulating?: boolean
    ) {
        let mirror = Array.isArray(this.source)
            ? (([] as unknown) as TMirror)
            : (({} as unknown) as TMirror);

        let patcher: JSONPatcherProxy<TMirror> | undefined;

        if (patchCallback) {
            patcher = new JSONPatcherProxy<TMirror>(mirror, false);

            mirror = (patcher.observe(false, (patch: PatchOperation) =>
                patchCallback(this.tidyPatch(patch))
            ) as unknown) as TMirror;

            patcher.pause();
        }

        if (assignMirror && assignBeforePopulating) {
            mirror = assignMirror(mirror);
        }

        this.initialAssignment = true;

        for (const field in this.source) {
            this.runOperation(field, mirror, setOperations, anyOtherSet);
        }

        if (extraFields) {
            for (const destField in extraFields) {
                const extraField = extraFields[destField];
                const triggers = extraField.getTriggers
                    ? extraField.getTriggers(this.source)
                    : undefined;

                this.assignExtraField(
                    mirror,
                    triggerSnapshots,
                    destField,
                    extraField,
                    triggers
                );
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

    private arraysMatch(arr1: any[], arr2: any[]) {
        if (arr1.length !== arr2.length) {
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
        mirrorData: MirrorData<TSource, TMirror>,
        destField: Extract<keyof TMirror, string>,
        extraField: ExtraField<TSource, TMirror[keyof TMirror]>
    ) {
        const newTriggers = extraField.getTriggers(this.source);
        const oldTriggers = mirrorData.triggerSnapshots[destField];

        if (!this.arraysMatch(newTriggers, oldTriggers)) {
            return;
        }

        this.assignExtraField(
            mirrorData.mirror,
            mirrorData.triggerSnapshots,
            destField,
            extraField,
            newTriggers
        );
    }

    private assignExtraField(
        mirror: TMirror,
        triggerSnapshots: Record<keyof TMirror, any[]>,
        destField: keyof TMirror,
        extraField: ExtraField<TSource, TMirror[keyof TMirror]>,
        triggers: any[]
    ) {
        const value = extraField.getValue(this.source);
        mirror[destField] = value as any;
        triggerSnapshots[destField] = triggers;
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
                    this.proxyManager,
                    undefined,
                    substituteMirror,
                    this.initialAssignment,
                    // This seems too complex. Can we simplify?
                    () => {
                        for (const [, mirrorData] of this.mirrorData) {
                            if (mirrorData.afterChange) {
                                mirrorData.afterChange();
                            }
                        }
                    }
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

    public removeMirror(key: TKey) {
        this.mirrorData.delete(key);
        this.proxyManager.removeKey(key);
    }

    public setField(field: keyof TSource, val: TSource[keyof TSource]) {
        for (const [
            ,
            { mirror, setOperations, anyOtherSet, afterChange },
        ] of this.mirrorData) {
            this.runOperation(
                field,
                mirror,
                setOperations,
                anyOtherSet,
                afterChange
            );
        }
    }

    public deleteField(field: keyof TSource) {
        for (const [
            ,
            { mirror, deleteOperations, anyOtherDelete, afterChange },
        ] of this.mirrorData) {
            this.runOperation(
                field,
                mirror,
                deleteOperations,
                anyOtherDelete,
                afterChange
            );
        }
    }

    private runOperation(
        field: keyof TSource,
        mirror: TMirror,
        operations: Map<keyof TSource, FieldOperation<TSource, TMirror>>,
        fallback?: FieldOperation<TSource, TMirror>,
        runAfter?: () => void
    ) {
        const operation = operations.get(field);
        if (operation) {
            operation(this.source, field, mirror);
        } else if (fallback) {
            fallback(this.source, field, mirror);
        } else {
            return;
        }

        if (runAfter) {
            runAfter();
        }
    }
}
