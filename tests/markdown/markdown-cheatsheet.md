# Markdown syntax coverage

This fixture is derived from the syntax categories in the Markdown Here cheatsheet and is used only to exercise terminal output.

## Headings

# H1
## H2
### H3
#### H4
##### H5
###### H6

Alt-H1
======

Alt-H2
------

## Emphasis

*asterisk italic*

_underscore italic_

**asterisk bold**

__underscore bold__

**combined _emphasis_**

~~strikethrough~~

## Lists

1. First ordered item
2. Another item
   * Nested unordered item
1. Ordered values do not need to be sequential
   1. Nested ordered item
4. Final ordered item

   Indented paragraph inside a list item.

   Line with two trailing spaces.  
   Next line remains in the same list item.

* Asterisk item
- Hyphen item
+ Plus item

## Links

[Inline link](https://example.com)

[Inline link with title](https://example.com "Example title")

[Reference-style link][reference]

[Relative repository link](../README.md)

[Numeric reference][1]

[Collapsed reference][]

https://example.com

<https://example.com>

[reference]: https://www.mozilla.org
[1]: https://example.org
[collapsed reference]: https://www.reddit.com

## Images

![Inline image alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Inline image title")

![Reference image alt text][logo]

[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Reference image title"

## Inline code

Inline `code` has backticks around it.

## Fenced code

```javascript
const message = "JavaScript syntax highlighting";
console.log(message);
```

```typescript
type User = {
  id: number;
  name: string;
};

const user: User = { id: 1, name: "Moya" };
console.log(user);
```

```python
message = "Python syntax highlighting"
print(message)
```

```go
package main

import "fmt"

func main() {
    fmt.Println("Go syntax highlighting")
}
```

```sh
printf '%s\n' "Shell syntax highlighting"
```

```
No language is indicated here.
<b>This remains literal code content.</b>
```

## Indented code

    const indented = true;
    console.log(indented);

## Tables

| Tables | Are | Cool |
| --- | :---: | ---: |
| left | centered | $1600 |
| value | another | $12 |

Markdown | Less | Pretty
--- | --- | ---
*Still* | `renders` | **nicely**
1 | 2 | 3

## Blockquotes

> Blockquotes are useful.
> This is part of the same quote.

Quote break.

> A long blockquote can contain *italic*, **bold**, `code`, and [links](https://example.com).

## Inline HTML

<dl>
  <dt>Definition list</dt>
  <dd>Raw HTML content.</dd>

  <dt>Markdown in HTML</dt>
  <dd>Use HTML <em>tags</em> when needed.</dd>
</dl>

## Horizontal rules

Hyphens:

---

Asterisks:

***

Underscores:

___

## Line breaks

This paragraph is separated from the previous content by a blank line.

This line has one newline before the next line.
This is still adjacent Markdown text.

This line ends with two spaces.  
This line follows a Markdown hard break.

## Linked image

[![Video thumbnail](http://img.youtube.com/vi/YOUTUBE_VIDEO_ID_HERE/0.jpg)](http://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID_HERE)

## Escaping

\*literal asterisks\*

\# literal hash

\[literal brackets\]

## Unicode

✓ → ← ↑ ↓ • — … λ π 日本語
