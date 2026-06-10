# Product Requirements Document (PRD)

## 1. Overview

**Product:** HTSL Engine

**Purpose:** Provide a structured content engine that transforms HTSL into HTML and structured objects, enabling easier authoring of complex documents, embedded objects, and interactive content.

**Target users:** content authors, documentation writers, scientific authors, UI designers, developers building document-driven apps.

## 2. Product Vision

HTSL aims to become:

- a document structuring language
- a system of embedded objects inside text
- a foundation for an interactive scientific editor

The engine should make structured content authoring more readable than raw HTML while enabling powerful logical object semantics.

## 3. Goals

- Simplify creation of structured content with a compact syntax.
- Generate valid HTML and maintain an AST for logical manipulation.
- Support nested structures, classes, ids, and attributes.
- Provide safe rendering with HTML escaping and optional raw HTML.
- Enable extensibility via plugins for objects, math, and rendering.

## 4. Scope

### In scope

- HTSL syntax parsing and validation
- Lexer + parser + AST generation
- HTML renderer with secure escaping
- Self-closing tags, comments, nested elements
- Object support through plugin registration
- Math support with inline/block LaTeX
- Browser and Node.js support, ESM distribution
- CLI and web playground tooling

### Out of scope for initial release

- full PDF export
- complete MathJax rendering support by default
- advanced UI editors beyond the web playground
- non-HTML renderers such as Markdown or PDF in v0.1

## 5. User Needs

- Author structured documents without verbose HTML.
- Render text safely in untrusted contexts.
- Extend the engine with logical objects like math vectors.
- Use the engine in both browser and Node.js environments.
- Debug syntax issues with precise, localized error messages.

## 6. Features

### 6.1 Core syntax support

- `{tag:content}` structure
- class syntax: `tag.class1.class2`
- id syntax: `tag#id`
- attributes: `[attr=value, attr2=value2]`
- nested elements
- self-closing tags: `{br/}`
- comments: `{!-- comment --}`
- escaped special characters: `\{`, `\}`, `\:`

### 6.2 Parsing and AST

- Tokenization by lexer
- Recursive descent parser
- AST nodes with source locations
- Clear parser errors with line/column reporting

### 6.3 Rendering

- HTML generation from AST
- Default HTML escaping for text content
- Optional raw HTML insertion
- Whitelist support for safe rendering in untrusted mode

### 6.4 Object and math support

- Plugin API for object types
- Example object `math.vector`
- Inline and block LaTeX support
- KaTeX recommended for default math rendering

### 6.5 Tooling

- CLI: `htsl build file.htsl -o file.html`
- Playground: live editing with HTML/AST preview
- Formatter: `htsl fmt` for indentation normalization

## 7. Success Metrics

- Parser passes all unit tests and regression tests.
- Rendering is secure by default; no text injection occurs in HTML output.
- Document parse performance meets target: < 50 ms for 100 KB on standard hardware.
- Plugin API is stable and documented.
- Engines can run in both browser and Node.js.

## 8. Roadmap

| Version | Feature |
|---|---|
| 0.1 | Lexer + parser: `{tag:content}`, text nodes, localized errors |
| 0.2 | Classes and identifiers (`.class`, `#id`) |
| 0.3 | Attributes `[attr=val]`, escaping `\{` `\}` `\:` |
| 0.4 | Full nesting, self-closing tags, comments |
| 0.5 | Secure HTML renderer (escaping XSS), plugin API |
| 0.6 | Math objects (vector, matrix), KaTeX rendering |
| 0.7 | CLI + web playground |
| 1.0 | Complete stable engine, documentation, test suite |

## 9. Constraints

- Zero dependencies for the core engine.
- Modular design: lexer, parser, renderer separated.
- Must support configurable nesting depth (default 256).
- Must work in browser and Node.js from one ESM codebase.

## 10. Acceptance Criteria

- All core HTSL syntax forms are supported and documented.
- Parser error messages include line and column information.
- Renderer escapes text content by default.
- Plugin API allows registration of custom object types.
- CLI can build HTSL files to HTML.
- Live playground demonstrates rendering and AST output.
