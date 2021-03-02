import { liveMap } from '../liveMap';
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

interface ParentInput {
    child1: FlatInput;
    child2: FlatInput;
    prop: string;
}

interface ParentOutput {
    child1: FlatOutput;
    child2: FlatOutput;
    prop: string;
}

describe('basic nested mapping', () => {
    const input: ParentInput = {
        child1: {
            prop1: 'hello',
            prop2: false,
            prop3: 35,
            prop4: 'hi',
        },
        child2: {
            prop1: 'wow',
            prop2: true,
            prop3: 1,
            prop4: 'hey',
            prop5: 'howdy',
        },
        prop: 'root',
    };

    const patches: PatchOperation[] = [];

    const { proxy, output } = liveMap<ParentInput, ParentOutput>(
        input,
        (input) => ({
            child1: (child) => ({
                prop1: child.prop1,
                prop2: child.prop2,
            }),
            child2: (child) => ({
                prop1: child.prop1,
                prop2: false,
            }),
            prop: 'hello ' + input.prop,
        }),
        (op) => patches.push(op)
    );

    describe('before', () => {
        test('proxy is set up correctly', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop');
            expect(proxy.prop).toEqual(input.prop);
            expect(proxy.prop).toEqual('root');

            expect(proxy).toHaveProperty('child1');
            expect(proxy.child1).toHaveProperty('prop1');
            expect(proxy.child1.prop1).toEqual(input.child1.prop1);
            expect(proxy.child1).toHaveProperty('prop2');
            expect(proxy.child1.prop2).toEqual(input.child1.prop2);
            expect(proxy.child1.prop2).toEqual(false);
            expect(proxy.child1).toHaveProperty('prop3');
            expect(proxy.child1.prop3).toEqual(input.child1.prop3);
            expect(proxy.child1).toHaveProperty('prop4');
            expect(proxy.child1.prop4).toEqual(input.child1.prop4);
            expect(proxy.child1).not.toHaveProperty('prop5');

            expect(proxy).toHaveProperty('child2');
            expect(proxy.child2).toHaveProperty('prop1');
            expect(proxy.child2.prop1).toEqual(input.child2.prop1);
            expect(proxy.child2).toHaveProperty('prop2');
            expect(proxy.child2.prop2).toEqual(input.child2.prop2);
            expect(proxy.child2).toHaveProperty('prop3');
            expect(proxy.child2.prop3).toEqual(input.child2.prop3);
            expect(proxy.child2).toHaveProperty('prop4');
            expect(proxy.child2.prop4).toEqual(input.child2.prop4);
            expect(proxy.child2).toHaveProperty('prop5');
            expect(proxy.child2.prop5).toEqual(input.child2.prop5);

            ensureValidInput(proxy, true);
        });

        test('output is set up correctly', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop');
            expect(output.prop).toEqual('hello ' + input.prop);
            expect(output.prop).toEqual('hello root');

            expect(output).toHaveProperty('child1');
            expect(output.child1).toHaveProperty('prop1');
            expect(output.child1.prop1).toEqual(input.child1.prop1);
            expect(output.child1).toHaveProperty('prop2');
            expect(output.child1.prop2).toEqual(input.child1.prop2);
            expect(output.child1).not.toHaveProperty('prop3');
            expect(output.child1).not.toHaveProperty('prop4');

            expect(output).toHaveProperty('child2');
            expect(output.child2).toHaveProperty('prop1');
            expect(output.child2.prop1).toEqual(input.child2.prop1);
            expect(output.child2).toHaveProperty('prop2');
            expect(output.child2.prop2).toEqual(false);
            expect(output.child2).not.toHaveProperty('prop3');
            expect(output.child2).not.toHaveProperty('prop4');

            ensureValidOutput(output, true);
        });
    });

    describe('after', () => {
        beforeAll(() => {
            proxy.child1.prop1 = 'x';
            delete proxy.child2.prop4;
        });

        test('proxy shows changes', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop');
            expect(proxy.prop).toEqual(input.prop);
            expect(proxy.prop).toEqual('root');

            expect(proxy).toHaveProperty('child1');
            expect(proxy.child1).toHaveProperty('prop1');
            expect(proxy.child1.prop1).toEqual(input.child1.prop1);
            expect(proxy.child1.prop1).toEqual('x');
            expect(proxy.child1).toHaveProperty('prop2');
            expect(proxy.child1.prop2).toEqual(input.child1.prop2);
            expect(proxy.child1.prop2).toEqual(false);
            expect(proxy.child1).toHaveProperty('prop3');
            expect(proxy.child1.prop3).toEqual(input.child1.prop3);
            expect(proxy.child1.prop3).toEqual(35);
            expect(proxy.child1).toHaveProperty('prop4');
            expect(proxy.child1.prop4).toEqual('hi');

            expect(proxy).toHaveProperty('child2');
            expect(proxy.child2).toHaveProperty('prop1');
            expect(proxy.child2.prop1).toEqual(input.child2.prop1);
            expect(proxy.child2).toHaveProperty('prop2');
            expect(proxy.child2.prop2).toEqual(input.child2.prop2);
            expect(proxy.child2).toHaveProperty('prop3');
            expect(proxy.child2.prop3).toEqual(input.child2.prop3);
            expect(proxy.child2).not.toHaveProperty('prop4');

            ensureValidInput(proxy, true);
        });

        test('input shows changes', () => {
            expect(input).toBeDefined();
            expect(input).toHaveProperty('prop');
            expect(input.prop).toEqual(input.prop);
            expect(input.prop).toEqual('root');

            expect(input).toHaveProperty('child1');
            expect(input.child1).toHaveProperty('prop1');
            expect(input.child1.prop1).toEqual(input.child1.prop1);
            expect(input.child1.prop1).toEqual('x');
            expect(input.child1).toHaveProperty('prop2');
            expect(input.child1.prop2).toEqual(input.child1.prop2);
            expect(input.child1.prop2).toEqual(false);
            expect(input.child1).toHaveProperty('prop3');
            expect(input.child1.prop3).toEqual(input.child1.prop3);
            expect(input.child1.prop3).toEqual(35);
            expect(input.child1).toHaveProperty('prop4');
            expect(input.child1.prop4).toEqual('hi');

            expect(input).toHaveProperty('child2');
            expect(input.child2).toHaveProperty('prop1');
            expect(input.child2.prop1).toEqual('wow');
            expect(input.child2).toHaveProperty('prop2');
            expect(input.child2.prop2).toEqual(true);
            expect(input.child2).toHaveProperty('prop3');
            expect(input.child2.prop3).toEqual(1);
            expect(input.child2).not.toHaveProperty('prop4');

            ensureValidInput(input, false);
        });

        test('output shows changes', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop');
            expect(output.prop).toEqual('hello ' + input.prop);
            expect(output.prop).toEqual('hello root');

            expect(output).toHaveProperty('child1');
            expect(output.child1).toHaveProperty('prop1');
            expect(output.child1.prop1).toEqual(input.child1.prop1);
            expect(output.child1).toHaveProperty('prop2');
            expect(output.child1.prop2).toEqual(input.child1.prop2);
            expect(output.child1).not.toHaveProperty('prop3');
            expect(output.child1).not.toHaveProperty('prop4');

            expect(output).toHaveProperty('child2');
            expect(output.child2).toHaveProperty('prop1');
            expect(output.child2.prop1).toEqual(input.child2.prop1);
            expect(output.child2).toHaveProperty('prop2');
            expect(output.child2.prop2).toEqual(false);
            expect(output.child2).not.toHaveProperty('prop3');
            expect(output.child2).not.toHaveProperty('prop4');

            ensureValidOutput(output, true);
        });

        test('patches show changes', () => {
            expect(patches).toEqual([
                {
                    op: 'replace',
                    path: '/child1/prop1',
                    value: 'x',
                },
            ]);
        });
    });
});

// TODO: adding/removing fields, mapped objects, and nested mappings
