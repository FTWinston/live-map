import { filterMirror } from './filterMirror';

interface Mirror {
    prop1: string;
    prop3: boolean;
}

interface FlatSource extends Mirror {
    prop2: number;
}

test('copies flat object', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: 35,
        prop3: false,
    };

    const [proxy, mirror] = filterMirror<FlatSource, Mirror>(source, {
        prop1: true,
        prop3: true,
    });

    expect(proxy).toHaveProperty('prop1');
    expect(proxy.prop1).toEqual(source.prop1);
    expect(proxy).toHaveProperty('prop2');
    expect(proxy.prop2).toEqual(source.prop2);
    expect(proxy).toHaveProperty('prop3');
    expect(proxy.prop3).toEqual(source.prop3);

    expect(mirror).toHaveProperty('prop1');
    expect(mirror.prop1).toEqual(source.prop1);
    expect(mirror).not.toHaveProperty('prop2');
    expect(mirror).toHaveProperty('prop3');
    expect(mirror.prop3).toEqual(source.prop3);
});

test('mirrors relevant property changes', () => {
    const source: FlatSource = {
        prop1: 'hello',
        prop2: 35,
        prop3: false,
    };

    const [proxy, mirror] = filterMirror<FlatSource, Mirror>(source, {
        prop1: true,
        prop3: true,
    });

    proxy.prop1 = 'bye';
    proxy.prop2 = 27;

    expect(proxy).toHaveProperty('prop1');
    expect(proxy.prop1).toEqual(source.prop1);
    expect(proxy.prop1).toEqual('bye');
    expect(proxy).toHaveProperty('prop2');
    expect(proxy.prop2).toEqual(source.prop2);
    expect(proxy).toHaveProperty('prop3');
    expect(proxy.prop3).toEqual(source.prop3);

    expect(mirror).toHaveProperty('prop1');
    expect(mirror.prop1).toEqual(source.prop1);
    expect(mirror).not.toHaveProperty('prop2');
    expect(mirror).toHaveProperty('prop3');
    expect(mirror.prop3).toEqual(source.prop3);
});