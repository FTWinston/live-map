import { filterMirror } from './filterMirror';
import { anyOtherFields, extraFields } from './FieldMappings';
import { PatchOperation } from './PatchOperation';
import { multiFilter } from './multiFilter';

interface FlatSource {
    prop1: string;
    prop2: boolean;
    prop3: number;
    prop4?: string;
    array?: string[];
}

interface FlatMirror {
    prop1: string;
    prop2: boolean;
    length?: number;
    array?: string[];
}

interface ParentSource {
    child1: FlatSource;
    child2: FlatSource;
    prop: string;
}

interface ParentMirror {
    child1: FlatMirror;
    child2: FlatMirror;
    prop: string;
}

interface FlatData {
    visibleToAll: string;
    visibleToSelf?: string;
}

test('simple filterMirror patch generation', () => {
    const source: Record<string, boolean> = {
        prop1: true,
        prop2: true,
        prop3: false,
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<
        Record<string, boolean>,
        Record<string, boolean>
    >(
        source,
        {
            prop1: false,
            [anyOtherFields]: true,
        },
        (patch) => patches.push(patch)
    );

    proxy.prop1 = false;
    proxy.prop2 = false;
    proxy.prop4 = true;
    delete proxy.prop3;

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/prop2',
            value: false,
        },
        {
            op: 'add',
            path: '/prop4',
            value: true,
        },
        {
            op: 'remove',
            path: '/prop3',
        },
    ]);
});

test('simple bracket notation filterMirror patch generation', () => {
    const source: Record<string, boolean> = {
        prop1: true,
        prop2: true,
        prop3: false,
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<
        Record<string, boolean>,
        Record<string, boolean>
    >(
        source,
        {
            prop1: true,
            prop3: true,
            [anyOtherFields]: true,
        },
        (patch) => patches.push(patch)
    );

    proxy['prop1'] = false;
    proxy['prop2'] = false;
    delete proxy['prop3'];

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/prop1',
            value: false,
        },
        {
            op: 'replace',
            path: '/prop2',
            value: false,
        },
        {
            op: 'remove',
            path: '/prop3',
        },
    ]);
});

test('nested filterMirror patch generation', () => {
    const source: ParentSource = {
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
            prop4: 'omg',
        },
        prop: 'root',
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<ParentSource, ParentMirror>(
        source,
        {
            child1: {
                prop1: true,
                prop2: true,
            },
            child2: {
                prop4: 'prop1',
            },
            prop: true,
        },
        (patch) => patches.push(patch)
    );

    proxy.child1.prop2 = true;
    proxy.child2.prop4 = 'hello';
    proxy.prop = '';

    proxy.child1 = {
        prop1: 'yo',
        prop2: true,
        prop3: 36,
        prop4: 'bye',
    };

    proxy.child1.prop2 = false;

    delete proxy.child1.prop1;

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/child1/prop2',
            value: true,
        },
        {
            op: 'replace',
            path: '/child2/prop1',
            value: 'hello',
        },
        {
            op: 'replace',
            path: '/prop',
            value: '',
        },
        {
            op: 'replace',
            path: '/child1',
            value: {
                prop1: 'yo',
                prop2: true,
            },
        },
        {
            op: 'replace',
            path: '/child1/prop2',
            value: false,
        },
        {
            op: 'remove',
            path: '/child1/prop1',
        },
    ]);
});

test('nested bracket notation patch generation', () => {
    const source: ParentSource = {
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
            prop4: 'omg',
        },
        prop: 'root',
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<ParentSource, ParentMirror>(
        source,
        {
            child1: {
                prop1: true,
                prop2: true,
            },
            child2: {
                prop4: 'prop1',
            },
            prop: true,
        },
        (patch) => patches.push(patch)
    );

    proxy['child1'].prop2 = true;
    proxy['child2'].prop4 = 'hello';
    delete proxy['child1'].prop1;

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/child1/prop2',
            value: true,
        },
        {
            op: 'replace',
            path: '/child2/prop1',
            value: 'hello',
        },
        {
            op: 'remove',
            path: '/child1/prop1',
        },
    ]);
});

interface Field {
    field: string;
}

interface Grandparent {
    content: Record<string, Field>;
    root?: string;
}

test('patch of named filterMirror child record', () => {
    const source: Record<string, Field> = {
        a: {
            field: 'hi',
        },
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<
        Record<string, Field>,
        Record<string, Field>
    >(
        source,
        {
            a: {
                field: true,
            },
        },
        (patch) => patches.push(patch)
    );

    proxy.a.field = 'bye';

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/a/field',
            value: 'bye',
        },
    ]);
});

test('patch of named filterMirror grandchild record', () => {
    const source: Grandparent = {
        content: {
            a: {
                field: 'hi',
            },
        },
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<Grandparent, Grandparent>(
        source,
        {
            content: {
                a: {
                    field: true,
                },
            },
        },
        (patch) => patches.push(patch)
    );

    proxy.content.a.field = 'bye';

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/content/a/field',
            value: 'bye',
        },
    ]);
});

test('patch of new named filterMirror child record', () => {
    const source: Record<string, Field> = {
        a: {
            field: 'hi',
        },
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<
        Record<string, Field>,
        Record<string, Field>
    >(
        source,
        {
            a: {
                field: true,
            },
            b: {
                field: true,
            },
        },
        (patch) => patches.push(patch)
    );

    proxy.b = {
        field: 'hi',
    };

    proxy.b.field = 'bye';

    expect(patches).toEqual([
        {
            op: 'add',
            path: '/b',
            value: {
                field: 'hi',
            },
        },
        {
            op: 'replace',
            path: '/b/field',
            value: 'bye',
        },
    ]);
});

test('patch of new named filterMirror grandchild record', () => {
    const source: Grandparent = {
        content: {
            a: {
                field: 'hi',
            },
        },
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<Grandparent, Grandparent>(
        source,
        {
            content: {
                a: {
                    field: true,
                },
                b: {
                    field: true,
                },
            },
        },
        (patch) => patches.push(patch)
    );

    proxy.content.b = {
        field: 'hi',
    };

    proxy.content.b.field = 'bye';

    expect(patches).toEqual([
        {
            op: 'add',
            path: '/content/b',
            value: {
                field: 'hi',
            },
        },
        {
            op: 'replace',
            path: '/content/b/field',
            value: 'bye',
        },
    ]);
});

test('multiFilter patch generation', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
        b: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, FlatData>,
        Record<string, FlatData>,
        string
    >(source, (key) => ({
        [key]: {
            [anyOtherFields]: true,
        },
        [anyOtherFields]: {
            visibleToAll: true,
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));
    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.a.visibleToAll = 'updated public info';
    proxy.b.visibleToAll = 'more updated info';
    proxy.b.visibleToSelf = 'updated private info';

    expect(patches1).toEqual([
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/b/visibleToAll',
            value: 'more updated info',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/b/visibleToAll',
            value: 'more updated info',
        },
        {
            op: 'replace',
            path: '/b/visibleToSelf',
            value: 'updated private info',
        },
    ]);
});

interface AB {
    a?: FlatData;
    b?: FlatData;
}

test('patch of simple new multiFilter root fields', () => {
    const source: Record<string, string> = {
        a: 'blah',
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, string>,
        Record<string, string>,
        string
    >(source, (key) => ({
        a: true,
        b: true,
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.b = 'blah';

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.a = 'yadda';

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/b',
            value: 'blah',
        },
        {
            op: 'replace',
            path: '/a',
            value: 'yadda',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/a',
            value: 'yadda',
        },
    ]);
});

test('patch of complex new multiFilter root fields', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
    };

    const { proxy, createMirror } = multiFilter<AB, AB, string>(
        source,
        (key) => ({
            a: true,
            b: true,
        })
    );

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/b',
            value: {
                visibleToAll: 'public info',
                visibleToSelf: 'private info',
            },
        },
    ]);

    expect(patches2).toEqual([]);
});

test('patch of sub-mapped new multiFilter root fields', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
    };

    const { proxy, createMirror } = multiFilter<AB, AB, string>(
        source,
        (key) => ({
            a: {
                visibleToAll: true,
            },
            b: {
                visibleToAll: true,
            },
        })
    );

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/b',
            value: {
                visibleToAll: 'public info',
            },
        },
    ]);

    expect(patches2).toEqual([]);
});

test('patch of named new multiFilter child records', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
    };

    const { proxy, createMirror } = multiFilter<AB, AB, string>(
        source,
        (key) => ({
            a: {
                [anyOtherFields]: true,
            },
            b: {
                visibleToAll: true,
            },
        })
    );

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.a!.visibleToAll = 'updated public info';
    proxy.b!.visibleToAll = 'more updated info';
    proxy.b!.visibleToSelf = 'updated private info';

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/b',
            value: {
                visibleToAll: 'public info',
            },
        },
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/b/visibleToAll',
            value: 'more updated info',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/b/visibleToAll',
            value: 'more updated info',
        },
    ]);
});

test('patch of "any other" new multiFilter child records', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, FlatData>,
        Record<string, FlatData>,
        string
    >(source, (key) => ({
        [key]: {
            [anyOtherFields]: true,
        },
        [anyOtherFields]: {
            visibleToAll: true,
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.a.visibleToAll = 'updated public info';
    proxy.b.visibleToAll = 'more updated info';
    proxy.b.visibleToSelf = 'updated private info';

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/b',
            value: {
                visibleToAll: 'public info',
            },
        },
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/b/visibleToAll',
            value: 'more updated info',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/b/visibleToAll',
            value: 'more updated info',
        },
        {
            op: 'replace',
            path: '/b/visibleToSelf',
            value: 'updated private info',
        },
    ]);
});

interface Grandparent1 {
    content: Record<string, string>;
}

test('patch of simple new multiFilter child fields', () => {
    const source: Grandparent1 = {
        content: {
            a: 'blah',
        },
    };

    const { proxy, createMirror } = multiFilter<
        Grandparent1,
        Grandparent1,
        string
    >(source, (key) => ({
        content: {
            a: true,
            b: true,
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.content.b = 'blah';

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.content.a = 'yadda';

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/content/b',
            value: 'blah',
        },
        {
            op: 'replace',
            path: '/content/a',
            value: 'yadda',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/content/a',
            value: 'yadda',
        },
    ]);
});

interface Grandparent2 {
    content: Record<string, FlatData>;
}

test('patch of complex new multiFilter child fields', () => {
    const source: Grandparent2 = {
        content: {
            a: {
                visibleToAll: 'public info',
                visibleToSelf: 'private info',
            },
        },
    };

    const { proxy, createMirror } = multiFilter<
        Grandparent2,
        Grandparent2,
        string
    >(source, (key) => ({
        content: {
            a: true,
            b: true,
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.content.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/content/b',
            value: {
                visibleToAll: 'public info',
                visibleToSelf: 'private info',
            },
        },
    ]);

    expect(patches2).toEqual([]);
});

test('patch of sub-mapped new multiFilter child fields', () => {
    const source: Grandparent2 = {
        content: {
            a: {
                visibleToAll: 'public info',
                visibleToSelf: 'private info',
            },
        },
    };

    const { proxy, createMirror } = multiFilter<
        Grandparent2,
        Grandparent2,
        string
    >(source, (key) => ({
        content: {
            a: {
                visibleToAll: true,
            },
            b: {
                visibleToAll: true,
            },
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.content.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/content/b',
            value: {
                visibleToAll: 'public info',
            },
        },
    ]);

    expect(patches2).toEqual([]);
});

test('patch of named multiFilter child record', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'hi',
        },
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, FlatData>,
        Record<string, FlatData>,
        string
    >(source, (key) => ({
        a: {
            visibleToAll: true,
        },
    }));

    const patches: PatchOperation[] = [];

    const mirror = createMirror('a', (patch) => patches.push(patch));

    proxy.a.visibleToAll = 'bye';

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/a/visibleToAll',
            value: 'bye',
        },
    ]);
});

test('patch of named multiFilter grandchild record', () => {
    const source: Grandparent2 = {
        content: {
            a: {
                visibleToAll: 'hi',
            },
        },
    };

    const { proxy, createMirror } = multiFilter<
        Grandparent2,
        Grandparent2,
        string
    >(source, (key) => ({
        content: {
            a: {
                visibleToAll: true,
            },
        },
    }));

    const patches: PatchOperation[] = [];

    const mirror = createMirror('a', (patch) => patches.push(patch));

    proxy.content.a.visibleToAll = 'bye';

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/content/a/visibleToAll',
            value: 'bye',
        },
    ]);
});

test('patch of named new multiFilter grandchild records', () => {
    const source: Grandparent2 = {
        content: {
            a: {
                visibleToAll: 'public info',
                visibleToSelf: 'private info',
            },
        },
    };

    const { proxy, createMirror } = multiFilter<
        Grandparent2,
        Grandparent2,
        string
    >(source, (key) => ({
        content: {
            a: {
                [anyOtherFields]: true,
            },
            b: {
                visibleToAll: true,
            },
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.content.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.content.a.visibleToAll = 'updated public info';
    proxy.content.b.visibleToAll = 'more updated info';
    proxy.content.b.visibleToSelf = 'updated private info';

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/content/b',
            value: {
                visibleToAll: 'public info',
            },
        },
        {
            op: 'replace',
            path: '/content/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/content/b/visibleToAll',
            value: 'more updated info',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/content/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/content/b/visibleToAll',
            value: 'more updated info',
        },
    ]);
});

test('patch of "any other" new multiFilter grandchild records', () => {
    const source: Grandparent2 = {
        content: {
            a: {
                visibleToAll: 'public info',
                visibleToSelf: 'private info',
            },
        },
    };

    const { proxy, createMirror } = multiFilter<
        Grandparent2,
        Grandparent2,
        string
    >(source, (key) => ({
        content: {
            [key]: {
                [anyOtherFields]: true,
            },
            [anyOtherFields]: {
                visibleToAll: true,
            },
        },
    }));

    const patches1: PatchOperation[] = [];
    const patches2: PatchOperation[] = [];

    const mirror1 = createMirror('a', (patch) => patches1.push(patch));

    proxy.content.b = {
        visibleToAll: 'public info',
        visibleToSelf: 'private info',
    };

    const mirror2 = createMirror('b', (patch) => patches2.push(patch));

    proxy.content.a.visibleToAll = 'updated public info';
    proxy.content.b.visibleToAll = 'more updated info';
    proxy.content.b.visibleToSelf = 'updated private info';

    expect(patches1).toEqual([
        {
            op: 'add',
            path: '/content/b',
            value: {
                visibleToAll: 'public info',
            },
        },
        {
            op: 'replace',
            path: '/content/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/content/b/visibleToAll',
            value: 'more updated info',
        },
    ]);

    expect(patches2).toEqual([
        {
            op: 'replace',
            path: '/content/a/visibleToAll',
            value: 'updated public info',
        },
        {
            op: 'replace',
            path: '/content/b/visibleToAll',
            value: 'more updated info',
        },
        {
            op: 'replace',
            path: '/content/b/visibleToSelf',
            value: 'updated private info',
        },
    ]);
});

test('extraFields patch generation', () => {
    const source: ParentSource = {
        child1: {
            prop1: 'hello',
            prop2: false,
            prop3: 35,
        },
        child2: {
            prop1: 'wow',
            prop2: true,
            prop3: 1,
        },
        prop: 'root',
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<ParentSource, ParentMirror>(
        source,
        {
            child1: {
                prop1: true,
                prop2: true,
            },
            [extraFields]: {
                prop: {
                    getValue: (source) => source.child2.prop1,
                    getTriggers: (source) => [source.child2.prop1],
                },
            },
        },
        (patch) => patches.push(patch)
    );

    proxy.child1.prop2 = true;
    proxy.child2.prop1 = 'hello';
    proxy.prop = '';

    expect(mirror).toEqual({
        child1: {
            prop1: 'hello',
            prop2: true,
        },
        prop: 'hello',
    });

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/child1/prop2',
            value: true,
        },
        {
            op: 'replace',
            path: '/prop',
            value: 'hello',
        },
    ]);
});

test('nested extraFields patch generation', () => {
    const source: Grandparent = {
        content: {
            child1: {
                field: 'hello',
            },
            child2: {
                field: 'goodbye',
            },
        },
    };

    const patches: PatchOperation[] = [];

    const { proxy, mirror } = filterMirror<Grandparent, Grandparent>(
        source,
        {
            content: {
                child1: {
                    field: true,
                },
            },
            [extraFields]: {
                root: {
                    getValue: (source) => source.content['child2'].field,
                    getTriggers: (source) => [source.content['child2'].field],
                },
            },
        },
        (patch) => patches.push(patch)
    );

    proxy.content.child1.field = 'hey';
    proxy.content.child2.field = 'bye';

    expect(mirror).toEqual({
        content: {
            child1: {
                field: 'hey',
            },
        },
        root: 'bye',
    });

    expect(patches).toEqual([
        {
            op: 'replace',
            path: '/content/child1/field',
            value: 'hey',
        },
        {
            op: 'replace',
            path: '/root',
            value: 'bye',
        },
    ]);
});
