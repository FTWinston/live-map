import { filterMirror } from './filterMirror';
import { anyOtherFields, shouldMap } from './FieldMappings';

interface Child {
    value: string;
}

interface Parent {
    a?: Child;
    b?: Child;
    c?: Child;
    d?: Child;
}

test('conditionally maps properties when values are added', () => {
    const source: Parent = {
        a: {
            value: 'hello',
        },
        b: {
            value: 'goodbye',
        },
    };

    const { proxy, mirror } = filterMirror<Parent, Parent>(source, {
        a: {
            value: true,
            [shouldMap]: (child) => child.value.indexOf('l') !== -1,
        },
        b: {
            value: true,
            [shouldMap]: (child) => child.value.indexOf('l') !== -1,
        },
    });

    expect(mirror).toEqual({
        a: {
            value: 'hello',
        },
    });
});

test('conditionally maps properties when values are modified', () => {
    const source: Parent = {
        a: {
            value: 'hello',
        },
        b: {
            value: 'goodbye',
        },
        c: {
            value: 'yo',
        },
        d: {
            value: 'later',
        },
    };

    const { proxy, mirror } = filterMirror<Parent, Parent>(source, {
        a: {
            value: true,
            [shouldMap]: (child) => {
                return child.value.indexOf('l') !== -1;
            },
        },
        b: {
            value: true,
            [shouldMap]: (child) => child.value.indexOf('l') !== -1,
        },
        c: {
            value: true,
            [shouldMap]: (child) => child.value.indexOf('l') !== -1,
        },
        d: {
            value: true,
            [shouldMap]: (child) => child.value.indexOf('l') !== -1,
        },
    });

    proxy.a.value = 'hey';
    proxy.b.value = 'farewell';
    proxy.c.value = 'howdy';
    proxy.d.value = 'long time no see';

    expect(mirror).toEqual({
        b: {
            value: 'farewell',
        },
        d: {
            value: 'long time no see',
        },
    });
});

// TODO: same as the above test, but test patches

test('conditionally maps array entries', () => {
    const source: Child[] = [
        {
            value: 'hello',
        },
        {
            value: 'goodbye',
        },
        {
            value: 'farewell',
        },
        {
            value: 'salut',
        },
        {
            value: 'howdy',
        },
    ];

    const { proxy, mirror } = filterMirror<Child[], Child[]>(source, {
        [anyOtherFields]: {
            value: true,
            [shouldMap]: (child: Child) => child.value.indexOf('l') !== -1,
        },
    });

    expect(mirror).toEqual([
        {
            value: 'hello',
        },
        undefined,
        {
            value: 'farewell',
        },
        {
            value: 'salut',
        },
    ]);

    expect(mirror.length).toEqual(4);

    proxy[2].value = 'cya';

    expect(mirror).toEqual([
        {
            value: 'hello',
        },
        undefined,
        undefined,
        {
            value: 'salut',
        },
    ]);

    expect(mirror.length).toEqual(4);

    proxy[2].value = 'hola';

    expect(mirror).toEqual([
        {
            value: 'hello',
        },
        undefined,
        {
            value: 'hola',
        },
        {
            value: 'salut',
        },
    ]);

    expect(mirror.length).toEqual(4);

    proxy.push({ value: 'hello again' });

    expect(mirror).toEqual([
        {
            value: 'hello',
        },
        undefined,
        {
            value: 'hola',
        },
        {
            value: 'salut',
        },
        undefined,
        {
            value: 'hello again',
        },
    ]);

    expect(mirror.length).toEqual(6);

    delete proxy[3];

    expect(mirror).toEqual([
        {
            value: 'hello',
        },
        undefined,
        {
            value: 'hola',
        },
        undefined,
        undefined,
        {
            value: 'hello again',
        },
    ]);

    expect(mirror.length).toEqual(6);
});
