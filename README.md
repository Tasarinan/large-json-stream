# large-json-stream
This provides stream-based utilities for encoding and parsing JSON, both to and from files, and in memory using Node.

The `JSON.stringify()` and `JSON.parse()` methods built into Node are completely inadequate when dealing with large JSON blocks. It blocks your whole application at best, and crashes Node at worst. This library provides utility functions to do the same things, but with streams.
