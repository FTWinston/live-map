import { filterMirror } from './filterMirror';

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
}

test('copies flat object', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
    };

    const [proxy, mirror] = filterMirror<FlatSource, FlatMirror>(source, {
        prop1: true,
        prop2: true,
    });

    expect(proxy).toHaveProperty('prop1');
    expect(proxy.prop1).toEqual(source.prop1);
    expect(proxy).toHaveProperty('prop2');
    expect(proxy.prop2).toEqual(source.prop2);
    expect(proxy).toHaveProperty('prop3');
    expect(proxy.prop3).toEqual(source.prop3);

    expect(mirror).toHaveProperty('prop1');
    expect(mirror.prop1).toEqual(source.prop1);
    expect(mirror).toHaveProperty('prop2');
    expect(mirror.prop2).toEqual(source.prop2);
    expect(mirror).not.toHaveProperty('prop3');
});

test('mirrors relevant property changes', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
    };

    const [proxy, mirror] = filterMirror<FlatSource, FlatMirror>(source, {
        prop1: true,
        prop2: true,
    });

    proxy.prop1 = 'bye';
    proxy.prop3 = 27;

    expect(proxy).toHaveProperty('prop1');
    expect(proxy.prop1).toEqual(source.prop1);
    expect(proxy.prop1).toEqual('bye');
    expect(proxy).toHaveProperty('prop2');
    expect(proxy.prop2).toEqual(source.prop2);
    expect(proxy).toHaveProperty('prop3');
    expect(proxy.prop3).toEqual(source.prop3);
    expect(proxy).toHaveProperty('prop3');
    expect(proxy.prop3).toEqual(source.prop3);

    expect(mirror).toHaveProperty('prop1');
    expect(mirror.prop1).toEqual(source.prop1);
    expect(mirror).toHaveProperty('prop2');
    expect(mirror.prop2).toEqual(source.prop2);
    expect(mirror).not.toHaveProperty('prop3');
});

test('sets up string mapping', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
        prop4: 'hi',
    };

    const [proxy, mirror] = filterMirror<FlatSource, FlatMirror>(source, {
        prop4: 'prop1',
    });

    expect(proxy).toHaveProperty('prop1');
    expect(proxy.prop1).toEqual(source.prop1);
    expect(proxy.prop1).toEqual('hello');
    
    expect(mirror).toHaveProperty('prop1');
    expect(mirror.prop1).toEqual(proxy.prop4);
    expect(mirror.prop1).toEqual('hi');
});

test('string maps property changes', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
        prop4: 'hi',
    };

    const [proxy, mirror] = filterMirror<FlatSource, FlatMirror>(source, {
        prop4: 'prop1',
    });

    proxy.prop1 = 'howdy';
    proxy.prop4 = 'bye';

    expect(proxy).toHaveProperty('prop1');
    expect(proxy.prop1).toEqual(source.prop1);
    expect(proxy.prop1).toEqual('howdy');
    
    expect(mirror).toHaveProperty('prop1');
    expect(mirror.prop1).toEqual(proxy.prop4);
    expect(mirror.prop1).toEqual('bye');
});

test('sets up function mapping', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
        prop4: 'hi',
        array: ['blah', 'blabber'],
    };

    const [proxy, mirror] = filterMirror<FlatSource, FlatMirror>(source, {
        array: (dest, val) => dest.length = val.length,
    });

    expect(proxy).toHaveProperty('array');
    expect(proxy.array).toHaveLength(2);
    expect(proxy.array[0]).toEqual('blah');
    expect(proxy.array[1]).toEqual('blabber');
    
    expect(mirror).toHaveProperty('length');
    expect(mirror.length).toEqual(2);
});

test('function maps property changes', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: false,
        prop3: 35,
        prop4: 'hi',
        array: ['blah', 'blabber'],
    };

    const [proxy, mirror] = filterMirror<FlatSource, FlatMirror>(source, {
        array: (dest, val) => dest.length = val.length,
    });

    // TODO: what if we mutate the array, though? That needs something more complicated...
    proxy.array = ['hi', 'de', 'hey'];

    expect(proxy).toHaveProperty('array');
    expect(proxy.array).toHaveLength(3);
    expect(proxy.array[0]).toEqual('hi');
    expect(proxy.array[1]).toEqual('de');
    expect(proxy.array[2]).toEqual('hey');
    
    expect(mirror).toHaveProperty('length');
    expect(mirror.length).toEqual(3);
});