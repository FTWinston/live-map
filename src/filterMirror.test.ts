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

test('sets up simple mapping', () => {
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

test('simple maps property changes', () => {
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

test('sets up nested mapping', () => {
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

    const [proxy, mirror] = filterMirror<ParentSource, ParentMirror>(source, {
        child1: {
            prop1: true,
            prop2: true,
        },
        child2: {
            prop4: 'prop1',
        },
        prop: true,
    });

    expect(proxy).toHaveProperty('prop');
    expect(proxy.prop).toEqual(source.prop);
    expect(proxy.prop).toEqual('root');
    
    expect(proxy).toHaveProperty('child1');
    expect(proxy.child1).toHaveProperty('prop1');
    expect(proxy.child1.prop1).toEqual(source.child1.prop1);
    expect(proxy.child1).toHaveProperty('prop2');
    expect(proxy.child1.prop2).toEqual(source.child1.prop2);
    expect(proxy.child1.prop2).toEqual(false);
    expect(proxy.child1).toHaveProperty('prop3');
    expect(proxy.child1.prop3).toEqual(source.child1.prop3);
    expect(proxy.child1).toHaveProperty('prop4');
    expect(proxy.child1.prop4).toEqual(source.child1.prop4);

    expect(proxy).toHaveProperty('child2');
    expect(proxy.child2).toHaveProperty('prop1');
    expect(proxy.child2.prop1).toEqual(source.child2.prop1);
    expect(proxy.child2).toHaveProperty('prop2');
    expect(proxy.child2.prop2).toEqual(source.child2.prop2);
    expect(proxy.child2).toHaveProperty('prop3');
    expect(proxy.child2.prop3).toEqual(source.child2.prop3);
    expect(proxy.child2).toHaveProperty('prop4');
    expect(proxy.child2.prop4).toEqual(source.child2.prop4);


    expect(mirror).toHaveProperty('prop');
    expect(mirror.prop).toEqual(source.prop);
    expect(mirror.prop).toEqual('root');
    
    expect(mirror).toHaveProperty('child1');
    expect(mirror.child1).toHaveProperty('prop1');
    expect(mirror.child1.prop1).toEqual(source.child1.prop1);
    expect(mirror.child1).toHaveProperty('prop2');
    expect(mirror.child1.prop2).toEqual(source.child1.prop2);
    expect(mirror.child1).not.toHaveProperty('prop3');
    expect(mirror.child1).not.toHaveProperty('prop4');

    expect(mirror).toHaveProperty('child2');
    expect(mirror.child2).toHaveProperty('prop1');
    expect(mirror.child2.prop1).toEqual(source.child2.prop4);
    expect(mirror.child2).not.toHaveProperty('prop2');
    expect(mirror.child2).not.toHaveProperty('prop3');
    expect(mirror.child2).not.toHaveProperty('prop4');
});

test('nested map propagates object replacement', () => {
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

    const [proxy, mirror] = filterMirror<ParentSource, ParentMirror>(source, {
        child1: {
            prop1: true,
            prop2: true,
        },
        child2: {
            prop4: 'prop1',
        },
        prop: true,
    });

    proxy.child1 = {
        prop1: 'heyyy',
        prop2: true,
        prop3: 25,
    };

    proxy.child1.prop1 = 'x';

    expect(proxy).toHaveProperty('prop');
    expect(proxy.prop).toEqual(source.prop);
    expect(proxy.prop).toEqual('root');
    
    expect(proxy).toHaveProperty('child1');
    expect(proxy.child1).toHaveProperty('prop1');
    expect(proxy.child1.prop1).toEqual(source.child1.prop1);
    expect(proxy.child1.prop1).toEqual('x');
    expect(proxy.child1).toHaveProperty('prop2');
    expect(proxy.child1.prop2).toEqual(source.child1.prop2);
    expect(proxy.child1.prop2).toEqual(true);
    expect(proxy.child1).toHaveProperty('prop3');
    expect(proxy.child1.prop3).toEqual(source.child1.prop3);
    expect(proxy.child1.prop3).toEqual(25);
    expect(proxy.child1).not.toHaveProperty('prop4');


    expect(mirror).toHaveProperty('prop');
    expect(mirror.prop).toEqual(source.prop);
    expect(mirror.prop).toEqual('root');
    
    expect(mirror).toHaveProperty('child1');
    expect(mirror.child1).toHaveProperty('prop1');
    expect(mirror.child1.prop1).toEqual(source.child1.prop1);
    expect(mirror.child1).toHaveProperty('prop2');
    expect(mirror.child1.prop2).toEqual(source.child1.prop2);
    expect(mirror.child1).not.toHaveProperty('prop3');
    expect(mirror.child1).not.toHaveProperty('prop4');

    expect(mirror).toHaveProperty('child2');
    expect(mirror.child2).toHaveProperty('prop1');
    expect(mirror.child2.prop1).toEqual(source.child2.prop4);
    expect(mirror.child2).not.toHaveProperty('prop2');
    expect(mirror.child2).not.toHaveProperty('prop3');
    expect(mirror.child2).not.toHaveProperty('prop4');
});

test('nested maps property changes', () => {
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

    const [proxy, mirror] = filterMirror<ParentSource, ParentMirror>(source, {
        child1: {
            prop1: true,
            prop2: true,
        },
        child2: {
            prop4: 'prop1',
        },
        prop: true,
    });

    proxy.child1.prop2 = true;
    proxy.child2.prop4 = 'hello';

    expect(proxy).toHaveProperty('prop');
    expect(proxy.prop).toEqual(source.prop);
    expect(proxy.prop).toEqual('root');
    
    expect(proxy).toHaveProperty('child1');
    expect(proxy.child1).toHaveProperty('prop1');
    expect(proxy.child1.prop1).toEqual(source.child1.prop1);
    expect(proxy.child1).toHaveProperty('prop2');
    expect(proxy.child1.prop2).toEqual(source.child1.prop2);
    expect(proxy.child1.prop2).toEqual(true);
    expect(proxy.child1).toHaveProperty('prop3');
    expect(proxy.child1.prop3).toEqual(source.child1.prop3);
    expect(proxy.child1.prop3).toEqual(35);
    expect(proxy.child1).toHaveProperty('prop4');
    expect(proxy.child1.prop4).toEqual('hi');

    expect(proxy).toHaveProperty('child2');
    expect(proxy.child2).toHaveProperty('prop1');
    expect(proxy.child2.prop1).toEqual(source.child2.prop1);
    expect(proxy.child2).toHaveProperty('prop2');
    expect(proxy.child2.prop2).toEqual(source.child2.prop2);
    expect(proxy.child2).toHaveProperty('prop3');
    expect(proxy.child2.prop3).toEqual(source.child2.prop3);
    expect(proxy.child2).toHaveProperty('prop4');
    expect(proxy.child2.prop4).toEqual(source.child2.prop4);


    expect(mirror).toHaveProperty('prop');
    expect(mirror.prop).toEqual(source.prop);
    expect(mirror.prop).toEqual('root');
    
    expect(mirror).toHaveProperty('child1');
    expect(mirror.child1).toHaveProperty('prop1');
    expect(mirror.child1.prop1).toEqual(source.child1.prop1);
    expect(mirror.child1).toHaveProperty('prop2');
    expect(mirror.child1.prop2).toEqual(source.child1.prop2);
    expect(mirror.child1).not.toHaveProperty('prop3');
    expect(mirror.child1).not.toHaveProperty('prop4');

    expect(mirror).toHaveProperty('child2');
    expect(mirror.child2).toHaveProperty('prop1');
    expect(mirror.child2.prop1).toEqual(source.child2.prop4);
    expect(mirror.child2).not.toHaveProperty('prop2');
    expect(mirror.child2).not.toHaveProperty('prop3');
    expect(mirror.child2).not.toHaveProperty('prop4');
});

test('maps property deletion', () => {
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

    const [proxy, mirror] = filterMirror<ParentSource, ParentMirror>(source, {
        child1: {
            prop1: true,
            prop2: true,
        },
        child2: {
            prop4: 'prop1',
        },
        prop: true,
    });

    delete proxy.child1;
    delete proxy.child2.prop4;
    
    expect(proxy).toHaveProperty('prop');
    expect(proxy.prop).toEqual(source.prop);
    expect(proxy.prop).toEqual('root');
    
    expect(proxy).not.toHaveProperty('child1');

    expect(proxy).toHaveProperty('child2');
    expect(proxy.child2).toHaveProperty('prop1');
    expect(proxy.child2.prop1).toEqual(source.child2.prop1);
    expect(proxy.child2).toHaveProperty('prop2');
    expect(proxy.child2.prop2).toEqual(source.child2.prop2);
    expect(proxy.child2).toHaveProperty('prop3');
    expect(proxy.child2.prop3).toEqual(source.child2.prop3);
    expect(proxy.child2).not.toHaveProperty('prop4');


    expect(mirror).toHaveProperty('prop');
    expect(mirror.prop).toEqual(source.prop);
    expect(mirror.prop).toEqual('root');
    
    expect(mirror).not.toHaveProperty('child1');

    expect(mirror).toHaveProperty('child2');
    expect(mirror.child2).not.toHaveProperty('prop1');
    expect(mirror.child2).not.toHaveProperty('prop2');
    expect(mirror.child2).not.toHaveProperty('prop3');
    expect(mirror.child2).not.toHaveProperty('prop4');
});


// TODO: test arrays (need special function?)

// TODO: multi-filtering (one source, proxies give many objects out ... and can add/remove more. So some sort of manager.)