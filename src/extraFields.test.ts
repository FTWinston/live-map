import { filterMirror } from './filterMirror';
import { extraFields } from './FieldMappings';

interface ArrayHolder {
    array: string[];
}

interface Counter {
    length: number;
    array: number[];
}

test('maps array length changes', () => {
    const source: ArrayHolder = {
        array: ['hello', 'goodbye', 'howdy', 'hey', 'hi'],
    };

    const { proxy, mirror } = filterMirror<ArrayHolder, Counter>(source, {
        [extraFields]: {
            length: {
                getValue: (source) => source.array.length,
                getTriggers: (source) => source.array,
            },
        },
    });

    expect(proxy).toEqual({
        array: ['hello', 'goodbye', 'howdy', 'hey', 'hi'],
    });

    expect(mirror).toEqual({
        length: 5,
    });

    proxy.array.push('yo');

    expect(mirror).toEqual({
        length: 6,
    });

    proxy.array[3] = 'hullo';

    expect(mirror).toEqual({
        length: 6,
    });

    proxy.array.splice(3, 2, 'hidey hey');

    expect(mirror).toEqual({
        length: 5,
    });
});
