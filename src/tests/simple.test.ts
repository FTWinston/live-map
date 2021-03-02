import { liveMap } from '../liveMap';
import { anyField } from '../MappingFunction';
import { PatchOperation } from '../PatchOperation';
import { ensureValidInput, ensureValidOutput } from './helpers';

interface FlatInput {
    prop1: string;
    prop2: boolean;
    prop3: number;
    prop4?: string;
    prop5?: string;
    array?: string[];
}

interface FlatOutput {
    prop1: string;
    prop2: boolean;
    length?: number;
    array?: string[];
}

describe('simple mapping', () => {
    const input: FlatInput = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
    };

    const patches: PatchOperation[] = [];

    const { proxy, output } = liveMap<FlatInput, FlatOutput>(
        input,
        (input) => ({
            prop1: input.prop1,
            prop2: input.prop2,
        }),
        (op) => patches.push(op)
    );

    describe('before', () => {
        test('proxy is set up correctly', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop1');
            expect(proxy.prop1).toEqual(input.prop1);
            expect(proxy).toHaveProperty('prop2');
            expect(proxy.prop2).toEqual(input.prop2);
            expect(proxy).toHaveProperty('prop3');
            expect(proxy.prop3).toEqual(input.prop3);

            ensureValidInput(proxy, true);
        });

        test('output is set up correctly', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop1');
            expect(output.prop1).toEqual(input.prop1);
            expect(output).toHaveProperty('prop2');
            expect(output.prop2).toEqual(input.prop2);
            expect(output).not.toHaveProperty('prop3');

            ensureValidOutput(output, true);
        });
    });

    describe('after', () => {
        beforeAll(() => {
            proxy.prop1 = 'bye';
            proxy.prop3 = 27;
        });

        test('proxy shows changes', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop1');
            expect(proxy.prop1).toEqual('bye');
            expect(proxy).toHaveProperty('prop2');
            expect(proxy).toHaveProperty('prop3');
            expect(proxy.prop3).toEqual(27);

            ensureValidInput(proxy, true);
        });

        test('input shows changes', () => {
            expect(input).toBeDefined();
            expect(input).toHaveProperty('prop1');
            expect(input.prop1).toEqual(proxy.prop1);
            expect(input).toHaveProperty('prop2');
            expect(input.prop2).toEqual(proxy.prop2);
            expect(input).toHaveProperty('prop3');
            expect(input.prop3).toEqual(proxy.prop3);

            ensureValidInput(input, false);
        });

        test('output shows changes', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop1');
            expect(output.prop1).toEqual(input.prop1);
            expect(output).toHaveProperty('prop2');
            expect(output.prop2).toEqual(input.prop2);
            expect(output).not.toHaveProperty('prop3');

            ensureValidOutput(output, true);
        });

        test('patches show changes', () => {
            expect(patches).toEqual([
                {
                    op: 'replace',
                    path: '/prop1',
                    value: 'bye',
                },
            ]);
        });
    });
});

// TODO: mapped objects, not just values

// TODO: adding/removing fields, mapped objects, and nested mappings
