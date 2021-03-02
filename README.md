# live-map
The Javascript `map` function transforms an input to an output. Once.

That's probably how you want it to work, 99% of the time.

For the other 1%, this library exposes two functions; `liveMap` and `multiMap`.

The `liveMap` function transforms an input to an output, and keeps it up-to-date with any subsequent changes to the input, thanks to the magic of proxies.

The `multiMap` function runs multiple transforms at once, on the same input.

Both functions take an optional callback that allows them to generate patches based on changes to the output.

## Basic example

For a very simple `liveMap` example, imagine a computer game character as an input:

```javascript
const input = {
  position: { x: 5, y: 5 }
  health: 50,
  weapon: {
    name: 'pistol',
    ammo: 6,
  }
};

// Create a proxy of the input, an output, and specify the mapping that should be used to generate the output.
const { proxy, output } = liveMap(
    input,
    (input) => ({
        position: input.position,
        weapon: {
          name: input.weapon.name,
        }
    })
);

// Now use proxy in place of input, and changes will apply directly to output.
proxy.position = { x: 9, y: 1 };
proxy.health = 20;
proxy.weapon.ammo--;

proxy.weapon = {
  name: 'rifle',
  ammo: 30,
};

expect(output).toEqual({
  position: { x: 9, y: 1},
  weapon: {
    name: 'rifle'
  }
});
```

The output will be recalculated every time the input updates.

## But isn't this just re-running the mapping?

Yes. But for large data and complicated mappings, you wouldn't want to recalculate everything for every change.

That's where nested mappings come in.

## Nested example
TODO