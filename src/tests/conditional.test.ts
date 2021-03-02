import { liveMap } from '../liveMap';
import { anyField } from '../MappingFunction';
import { PatchOperation } from '../PatchOperation';
import { ensureValidInput, ensureValidOutput } from './helpers';

interface ParentInput {
    child1: ChildInput;
    child2: ChildInput;
    prop: string;
}

interface ParentOutput {
    child1: ChildOutput;
    child2: ChildOutput;
    prop: string;
}

interface ChildInput {
    value: string;
    shouldMap: boolean;
}

interface ChildOutput {
    value: string;
}

describe('conditional mapping', () => {
    const input: ParentInput = {
        prop: 'hello',
        child1: {
            shouldMap: true,
            value: 'hi',
        },
        child2: {
            shouldMap: false,
            value: 'bye',
        },
    };

    const patches: PatchOperation[] = [];

    const { proxy, output } = liveMap<ParentInput, ParentOutput>(
        input,
        (input) => ({
            prop: input.prop,
            child1: (child) =>
                child.shouldMap
                    ? {
                          value: child.value,
                      }
                    : undefined,
            child2: (child) =>
                child.shouldMap
                    ? {
                          value: child.value,
                      }
                    : undefined,
        }),
        (op) => patches.push(op)
    );

    describe('before', () => {
        test('proxy is set up correctly', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop');
            expect(proxy.prop).toEqual(input.prop);
            expect(proxy).toHaveProperty('child1');
            expect(proxy.child1).toHaveProperty('value');
            expect(proxy.child1).toHaveProperty('shouldMap');
            expect(proxy.child1.value).toEqual(input.child1.value);
            expect(proxy.child1.shouldMap).toEqual(input.child1.shouldMap);
            expect(proxy.child2).toHaveProperty('value');
            expect(proxy.child2).toHaveProperty('shouldMap');
            expect(proxy.child2.value).toEqual(input.child2.value);
            expect(proxy.child2.shouldMap).toEqual(input.child2.shouldMap);

            ensureValidInput(proxy, true);
        });

        test('output is set up correctly', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop');
            expect(output.prop).toEqual(input.prop);
            expect(output).toHaveProperty('child1');
            expect(output.child1).toHaveProperty('value');
            expect(output.child1).not.toHaveProperty('shouldMap');
            expect(output.child1.value).toEqual(input.child1.value);
            expect(output).not.toHaveProperty('child2');
            ensureValidOutput(output, true);
        });
    });

    describe('after #1', () => {
        beforeAll(() => {
            proxy.child1.value = 'howdy';
            proxy.child2.shouldMap = true;
        });

        test('proxy shows changes', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop');
            expect(proxy.prop).toEqual('hello');
            expect(proxy).toHaveProperty('child1');
            expect(proxy.child1).toHaveProperty('value');
            expect(proxy.child1).toHaveProperty('shouldMap');
            expect(proxy.child1.value).toEqual('howdy');
            expect(proxy.child1.shouldMap).toEqual(true);
            expect(proxy.child2).toHaveProperty('value');
            expect(proxy.child2).toHaveProperty('shouldMap');
            expect(proxy.child2.value).toEqual('bye');
            expect(proxy.child2.shouldMap).toEqual(true);

            ensureValidInput(proxy, true);
        });

        test('input shows changes', () => {
            expect(input).toBeDefined();
            expect(input).toHaveProperty('prop');
            expect(input.prop).toEqual(proxy.prop);
            expect(input).toHaveProperty('child1');
            expect(input.child1).toHaveProperty('value');
            expect(input.child1).toHaveProperty('shouldMap');
            expect(input.child1.value).toEqual(proxy.child1.value);
            expect(input.child1.shouldMap).toEqual(proxy.child1.shouldMap);
            expect(input.child2).toHaveProperty('value');
            expect(input.child2).toHaveProperty('shouldMap');
            expect(input.child2.value).toEqual(proxy.child2.value);
            expect(input.child2.shouldMap).toEqual(proxy.child2.shouldMap);

            ensureValidInput(input, false);
        });

        test('output shows changes', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop');
            expect(output.prop).toEqual(proxy.prop);
            expect(output).toHaveProperty('child1');
            expect(output.child1).toHaveProperty('value');
            expect(output.child1).not.toHaveProperty('shouldMap');
            expect(output.child1.value).toEqual(proxy.child1.value);
            expect(output.child2).toHaveProperty('value');
            expect(output.child2).not.toHaveProperty('shouldMap');
            expect(output.child2.value).toEqual(proxy.child2.value);

            ensureValidOutput(output, true);
        });

        test('patches show changes', () => {
            expect(patches).toEqual([
                {
                    op: 'replace',
                    path: '/child1/value',
                    value: 'howdy',
                },
                {
                    op: 'add',
                    path: '/child2',
                    value: {
                        value: 'bye',
                    },
                },
            ]);
        });
    });

    describe('after #2', () => {
        beforeAll(() => {
            console.log('ABOUT TO DO IT');
            patches.splice(0, patches.length);
            proxy.child1.shouldMap = false;
            console.log('JUST DID IT');
        });

        test('proxy shows changes', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop');
            expect(proxy.prop).toEqual('hello');
            expect(proxy).toHaveProperty('child1');
            expect(proxy.child1).toHaveProperty('value');
            expect(proxy.child1).toHaveProperty('shouldMap');
            expect(proxy.child1.value).toEqual('howdy');
            expect(proxy.child1.shouldMap).toEqual(false);
            expect(proxy.child2).toHaveProperty('value');
            expect(proxy.child2).toHaveProperty('shouldMap');
            expect(proxy.child2.value).toEqual('bye');
            expect(proxy.child2.shouldMap).toEqual(true);

            ensureValidInput(proxy, true);
        });

        test('input shows changes', () => {
            expect(input).toBeDefined();
            expect(input).toHaveProperty('prop');
            expect(input.prop).toEqual(proxy.prop);
            expect(input).toHaveProperty('child1');
            expect(input.child1).toHaveProperty('value');
            expect(input.child1).toHaveProperty('shouldMap');
            expect(input.child1.value).toEqual(proxy.child1.value);
            expect(input.child1.shouldMap).toEqual(proxy.child1.shouldMap);
            expect(input.child2).toHaveProperty('value');
            expect(input.child2).toHaveProperty('shouldMap');
            expect(input.child2.value).toEqual(proxy.child2.value);
            expect(input.child2.shouldMap).toEqual(proxy.child2.shouldMap);

            ensureValidInput(input, false);
        });

        test('output shows changes', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop');
            expect(output.prop).toEqual(proxy.prop);
            expect(output).not.toHaveProperty('child1');
            expect(output.child2).toHaveProperty('value');
            expect(output.child2).not.toHaveProperty('shouldMap');
            expect(output.child2.value).toEqual(proxy.child2.value);

            ensureValidOutput(output, true);
        });

        test('patches show changes', () => {
            expect(patches).toEqual([
                {
                    op: 'remove',
                    path: '/child1',
                },
            ]);
        });
    });

    describe('after #3', () => {
        beforeAll(() => {
            patches.splice(0, patches.length);
            proxy.child1.value = 'hello again';
            proxy.child1.shouldMap = true;
        });

        test('proxy shows changes', () => {
            expect(proxy).toBeDefined();
            expect(proxy).toHaveProperty('prop');
            expect(proxy.prop).toEqual('hello');
            expect(proxy).toHaveProperty('child1');
            expect(proxy.child1).toHaveProperty('value');
            expect(proxy.child1).toHaveProperty('shouldMap');
            expect(proxy.child1.value).toEqual('hello again');
            expect(proxy.child1.shouldMap).toEqual(true);
            expect(proxy.child2).toHaveProperty('value');
            expect(proxy.child2).toHaveProperty('shouldMap');
            expect(proxy.child2.value).toEqual('bye');
            expect(proxy.child2.shouldMap).toEqual(true);

            ensureValidInput(proxy, true);
        });

        test('input shows changes', () => {
            expect(input).toBeDefined();
            expect(input).toHaveProperty('prop');
            expect(input.prop).toEqual(proxy.prop);
            expect(input).toHaveProperty('child1');
            expect(input.child1).toHaveProperty('value');
            expect(input.child1).toHaveProperty('shouldMap');
            expect(input.child1.value).toEqual(proxy.child1.value);
            expect(input.child1.shouldMap).toEqual(proxy.child1.shouldMap);
            expect(input.child2).toHaveProperty('value');
            expect(input.child2).toHaveProperty('shouldMap');
            expect(input.child2.value).toEqual(proxy.child2.value);
            expect(input.child2.shouldMap).toEqual(proxy.child2.shouldMap);

            ensureValidInput(input, false);
        });

        test('output shows changes', () => {
            expect(output).toBeDefined();
            expect(output).toHaveProperty('prop');
            expect(output.prop).toEqual(proxy.prop);
            expect(output).toHaveProperty('child1');
            expect(output.child1).toHaveProperty('value');
            expect(output.child1).not.toHaveProperty('shouldMap');
            expect(output.child1.value).toEqual(proxy.child1.value);
            expect(output.child2).toHaveProperty('value');
            expect(output.child2).not.toHaveProperty('shouldMap');
            expect(output.child2.value).toEqual(proxy.child2.value);

            ensureValidOutput(output, true);
        });

        test('patches show changes', () => {
            expect(patches).toEqual([
                {
                    op: 'add',
                    path: '/child1',
                    value: {
                        value: 'hello again',
                    },
                },
            ]);
        });
    });
});
