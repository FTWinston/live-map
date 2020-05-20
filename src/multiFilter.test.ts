import { multiFilter } from './multiFilter';

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
