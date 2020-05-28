export { filterMirror } from './filterMirror';
export { multiFilter } from './multiFilter';
export {
    anyOtherFields,
    FieldMappings,
    FieldMappingFunction,
} from './FieldMappings';
import { PatchOperation } from './Patch';
export { PatchOperation } from './Patch';
import { applyPatch as applyPatchLib } from 'fast-json-patch';

export function applyPatch(object: object, patch: PatchOperation[]) {
    applyPatchLib(object, patch, false, true);
}
