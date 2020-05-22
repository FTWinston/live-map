# filter-mirror
A proxy utility for creating live partial copies of objects.

This library exposes two functions, filterMirror and multiFilter.

Below is a basic example of flterMirror. More detailed documentation to follow in due course, but for now, see the tests for additional examples.

```javascript
const source = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  biography: 'blah blah blah',
  address: {
    line1: '3 Some street',
    city: 'Sometown',
    country: 'GB',
  },
  cases: {
    abc001: {
      client: 'A Anderson',
      status: 'Active',
      details: 'Long and boring',
    },
    def002: {
      client: 'B Bridges',
      status: 'Active',
      details: 'Excruciating',
    }
  }
}

const { proxy, mirror } = filterMirror(source, {
  name: true,
  email: true,
  address: {
    country: true,
  },
  cases: {
    [anyOtherFields]: {
      client: true,
      status: true,
    }
  }
});

// Now use proxy in place of source, and changes will apply directly to mirror.
proxy.email = 'john.doe2@example.com';
proxy.cases.def002.status = 'Closed';

proxy.cases.ghi003 = {
  client: 'C Chase',
  status: 'Pending',
  details: 'To be determined',
};

expect(mirror).toEqual({
  name: 'John Doe',
  email: 'john.doe@example.com',
  address: {
    country: 'GB',
  },
  cases: {
    abc001: {
      client: 'A Anderson',
      status: 'Active',
    },
    def002: {
      client: 'B Bridges',
      status: 'Closed',
    },
    def002: {
      client: 'C Chase',
      status: 'Pending',
    }
  }
})
```
