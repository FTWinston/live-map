import util from 'util';

function isObject(value: any): value is object {
    return value !== null && typeof value === 'object';
}

export function ensureValidOutput(output: {}, proxied: boolean) {
    expect(typeof output).not.toBe('function');

    if (isObject(output)) {
        expect(util.types.isProxy(output)).toEqual(proxied);
    }

    for (const value of Object.values(output)) {
        if (isObject(value)) {
            ensureValidOutput(value, proxied);
        }
    }
}

export function ensureValidInput(output: {}, proxied: boolean) {
    if (isObject(output)) {
        expect(util.types.isProxy(output)).toEqual(proxied);
    }

    for (const value of Object.values(output)) {
        if (isObject(value)) {
            ensureValidInput(value, proxied);
        }
    }
}
