import { multiFilter } from './multiFilter';
import { anyOtherFields } from './FieldMappings';

interface FlatData {
    visibleToAll: string;
    visibleToSelf?: string;
}

test('basic setup', () => {
    const source: Record<string, string> = {
        a: '1',
        b: '2',
        c: '3',
        availableToAll: 'hello',
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, string>,
        Record<string, string>,
        string
    >(source, (key) => ({
        availableToAll: true,
        [key]: true,
    }));

    const mirror1 = createMirror('a');
    const mirror2 = createMirror('b');
    const mirror3 = createMirror('c');

    expect(proxy).toHaveProperty('a');
    expect(proxy.a).toEqual(source.a);
    expect(proxy).toHaveProperty('b');
    expect(proxy.b).toEqual(source.b);
    expect(proxy).toHaveProperty('c');
    expect(proxy.c).toEqual(source.c);
    expect(proxy).toHaveProperty('availableToAll');
    expect(proxy.availableToAll).toEqual(source.availableToAll);

    expect(mirror1).toHaveProperty('a');
    expect(mirror1.a).toEqual(source.a);
    expect(mirror1).not.toHaveProperty('b');
    expect(mirror1).not.toHaveProperty('c');
    expect(mirror1.availableToAll).toEqual(source.availableToAll);
    expect(mirror1).toHaveProperty('availableToAll');
    expect(mirror1.availableToAll).toEqual(source.availableToAll);

    expect(mirror2).not.toHaveProperty('a');
    expect(mirror2).toHaveProperty('b');
    expect(mirror2.b).toEqual(source.b);
    expect(mirror2).not.toHaveProperty('c');
    expect(mirror2).toHaveProperty('availableToAll');
    expect(mirror2.availableToAll).toEqual(source.availableToAll);

    expect(mirror3).not.toHaveProperty('a');
    expect(mirror3).not.toHaveProperty('b');
    expect(mirror3).toHaveProperty('c');
    expect(mirror3.c).toEqual(source.c);
    expect(mirror3).toHaveProperty('availableToAll');
    expect(mirror3.availableToAll).toEqual(source.availableToAll);
});

test('basic property changes', () => {
    const source: Record<string, string> = {
        a: '1',
        b: '2',
        c: '3',
        availableToAll: 'hello',
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, string>,
        Record<string, string>,
        string
    >(source, (key) => ({
        availableToAll: true,
        [key]: true,
    }));

    const mirror1 = createMirror('a');
    const mirror2 = createMirror('b');
    const mirror3 = createMirror('c');

    proxy.a = 'hi';
    proxy.b = 'di';
    proxy.c = 'hey';
    proxy.availableToAll = 'hola';

    expect(proxy).toHaveProperty('a');
    expect(proxy.a).toEqual(source.a);
    expect(proxy).toHaveProperty('b');
    expect(proxy.b).toEqual(source.b);
    expect(proxy).toHaveProperty('c');
    expect(proxy.c).toEqual(source.c);
    expect(proxy).toHaveProperty('availableToAll');
    expect(proxy.availableToAll).toEqual(source.availableToAll);

    expect(mirror1).toHaveProperty('a');
    expect(mirror1.a).toEqual(source.a);
    expect(mirror1).not.toHaveProperty('b');
    expect(mirror1).not.toHaveProperty('c');
    expect(mirror1).toHaveProperty('availableToAll');
    expect(mirror1.availableToAll).toEqual(source.availableToAll);

    expect(mirror2).not.toHaveProperty('a');
    expect(mirror2).toHaveProperty('b');
    expect(mirror2.b).toEqual(source.b);
    expect(mirror2).not.toHaveProperty('c');
    expect(mirror2).toHaveProperty('availableToAll');
    expect(mirror2.availableToAll).toEqual(source.availableToAll);

    expect(mirror3).not.toHaveProperty('a');
    expect(mirror3).not.toHaveProperty('b');
    expect(mirror3).toHaveProperty('c');
    expect(mirror3.c).toEqual(source.c);
    expect(mirror3).toHaveProperty('availableToAll');
    expect(mirror3.availableToAll).toEqual(source.availableToAll);
});

test('delayed creation', () => {
    const source: Record<string, string> = {
        a: '1',
        b: '2',
        c: '3',
        availableToAll: 'hello',
    };

    const { proxy, createMirror } = multiFilter<
        Record<string, string>,
        Record<string, string>,
        string
    >(source, (key) => ({
        availableToAll: true,
        [key]: true,
    }));

    const mirror1 = createMirror('a');
    const mirror2 = createMirror('b');

    proxy.a = 'hi';
    proxy.b = 'di';
    proxy.c = 'hey';
    proxy.availableToAll = 'hola';

    const mirror3 = createMirror('c');

    expect(proxy).toHaveProperty('a');
    expect(proxy.a).toEqual(source.a);
    expect(proxy).toHaveProperty('b');
    expect(proxy.b).toEqual(source.b);
    expect(proxy).toHaveProperty('c');
    expect(proxy.c).toEqual(source.c);
    expect(proxy).toHaveProperty('availableToAll');
    expect(proxy.availableToAll).toEqual(source.availableToAll);

    expect(mirror1).toHaveProperty('a');
    expect(mirror1.a).toEqual(source.a);
    expect(mirror1).not.toHaveProperty('b');
    expect(mirror1).not.toHaveProperty('c');
    expect(mirror1).toHaveProperty('availableToAll');
    expect(mirror1.availableToAll).toEqual(source.availableToAll);

    expect(mirror2).not.toHaveProperty('a');
    expect(mirror2).toHaveProperty('b');
    expect(mirror2.b).toEqual(source.b);
    expect(mirror2).not.toHaveProperty('c');
    expect(mirror2).toHaveProperty('availableToAll');
    expect(mirror2.availableToAll).toEqual(source.availableToAll);

    expect(mirror3).not.toHaveProperty('a');
    expect(mirror3).not.toHaveProperty('b');
    expect(mirror3).toHaveProperty('c');
    expect(mirror3.c).toEqual(source.c);
    expect(mirror3).toHaveProperty('availableToAll');
    expect(mirror3.availableToAll).toEqual(source.availableToAll);
});


test('advanced setup', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
        b: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        }
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

    const mirror1 = createMirror('a');
    const mirror2 = createMirror('b');

    expect(proxy).toHaveProperty('a');
    expect(proxy.a).toHaveProperty('visibleToAll');
    expect(proxy.a.visibleToAll).toEqual(source.a.visibleToAll);
    expect(proxy.a).toHaveProperty('visibleToSelf');
    expect(proxy.a.visibleToSelf).toEqual(source.a.visibleToSelf);
    expect(proxy).toHaveProperty('b');
    expect(proxy.b).toHaveProperty('visibleToAll');
    expect(proxy.b.visibleToAll).toEqual(source.b.visibleToAll);
    expect(proxy.b).toHaveProperty('visibleToSelf');
    expect(proxy.b.visibleToSelf).toEqual(source.b.visibleToSelf);

    expect(mirror1).toHaveProperty('a');
    expect(mirror1.a).toHaveProperty('visibleToAll');
    expect(mirror1.a.visibleToAll).toEqual(source.a.visibleToAll);
    expect(mirror1.a).toHaveProperty('visibleToSelf');
    expect(mirror1.a.visibleToSelf).toEqual(source.a.visibleToSelf);
    expect(mirror1.b).toHaveProperty('visibleToAll');
    expect(mirror1.b.visibleToAll).toEqual(source.b.visibleToAll);
    expect(mirror1.b).not.toHaveProperty('visibleToSelf');

    expect(mirror2).toHaveProperty('a');
    expect(mirror2.a).toHaveProperty('visibleToAll');
    expect(mirror2.a.visibleToAll).toEqual(source.a.visibleToAll);
    expect(mirror2.a).not.toHaveProperty('visibleToSelf');
    expect(mirror2.b).toHaveProperty('visibleToAll');
    expect(mirror2.b.visibleToAll).toEqual(source.b.visibleToAll);
    expect(mirror2.b).toHaveProperty('visibleToSelf');
    expect(mirror2.b.visibleToSelf).toEqual(source.b.visibleToSelf);

    expect(mirror1).toEqual({
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
        b: {
            visibleToAll: 'public info',
        }
    });

    expect(mirror2).toEqual({
        a: {
            visibleToAll: 'public info',
        },
        b: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        }
    });
});

test('advanced property changes', () => {
    const source: Record<string, FlatData> = {
        a: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        },
        b: {
            visibleToAll: 'public info',
            visibleToSelf: 'private info',
        }
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

    const mirror1 = createMirror('a');
    const mirror2 = createMirror('b');

    proxy.a.visibleToAll = 'updated public info';
    proxy.b.visibleToSelf = 'updated private info';

    expect(proxy).toHaveProperty('a');
    expect(proxy.a).toHaveProperty('visibleToAll');
    expect(proxy.a.visibleToAll).toEqual(source.a.visibleToAll);
    expect(proxy.a).toHaveProperty('visibleToSelf');
    expect(proxy.a.visibleToSelf).toEqual(source.a.visibleToSelf);
    expect(proxy).toHaveProperty('b');
    expect(proxy.b).toHaveProperty('visibleToAll');
    expect(proxy.b.visibleToAll).toEqual(source.b.visibleToAll);
    expect(proxy.b).toHaveProperty('visibleToSelf');
    expect(proxy.b.visibleToSelf).toEqual(source.b.visibleToSelf);

    expect(mirror1).toHaveProperty('a');
    expect(mirror1.a).toHaveProperty('visibleToAll');
    expect(mirror1.a.visibleToAll).toEqual(source.a.visibleToAll);
    expect(mirror1.a).toHaveProperty('visibleToSelf');
    expect(mirror1.a.visibleToSelf).toEqual(source.a.visibleToSelf);
    expect(mirror1.b).toHaveProperty('visibleToAll');
    expect(mirror1.b.visibleToAll).toEqual(source.b.visibleToAll);
    expect(mirror1.b).not.toHaveProperty('visibleToSelf');

    expect(mirror2).toHaveProperty('a');
    expect(mirror2.a).toHaveProperty('visibleToAll');
    expect(mirror2.a.visibleToAll).toEqual(source.a.visibleToAll);
    expect(mirror2.a).not.toHaveProperty('visibleToSelf');
    expect(mirror2.b).toHaveProperty('visibleToAll');
    expect(mirror2.b.visibleToAll).toEqual(source.b.visibleToAll);
    expect(mirror2.b).toHaveProperty('visibleToSelf');
    expect(mirror2.b.visibleToSelf).toEqual(source.b.visibleToSelf);

    expect(mirror1).toEqual({
        a: {
            visibleToAll: 'updated public info',
            visibleToSelf: 'private info',
        },
        b: {
            visibleToAll: 'public info',
        }
    });

    expect(mirror2).toEqual({
        a: {
            visibleToAll: 'updated public info',
        },
        b: {
            visibleToAll: 'public info',
            visibleToSelf: 'updated private info',
        }
    });
});