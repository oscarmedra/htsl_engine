# Business Requirements Document (BRD)

## 1. Business Context

HTSL is positioned as a next-generation structured document engine that reduces HTML complexity and enables embedded logical objects inside text. It targets content creation workflows in technical documentation, scientific publishing, and web UI composition.

## 2. Problem Statement

Authors currently face two main problems:

- HTML is too verbose and hard to write for structured content.
- Existing markup languages lack first-class support for logical objects and safe rendering by default.

HTSL addresses these issues by providing a concise syntax, structured AST output, and secure HTML rendering.

## 3. Business Objectives

- Improve author productivity by reducing document authoring complexity.
- Increase safety by default through escaped HTML output.
- Enable extensibility for future product capabilities like math, interactive components, and alternative renderers.
- Support broad usage by running in browsers and Node.js.

## 4. Stakeholders

- Product owner: defines HTSL vision and success criteria.
- Development team: implements parser, renderer, plugins, tooling.
- QA team: verifies syntax, rendering, and security.
- Designers/content authors: validate authoring experience.
- End users: developers and authors using HTSL in applications.

## 5. Key Business Requirements

### 5.1 Usability

- The language must be easy to read and write.
- Syntax must support nested structures, classes, ids, attributes, and comments.
- Error messages must be clear and source-localized.

### 5.2 Security

- HTML renderer must escape textual content by default.
- The engine must provide safe rendering modes with tag and attribute whitelisting.

### 5.3 Extensibility

- A plugin API must support custom object types.
- Object definitions should be separated from the core engine.
- Future support must be possible for math and interactive content.

### 5.4 Performance

- The engine must parse documents efficiently, with a target of < 50 ms for 100 KB input.
- It must handle configurable nesting depth safely.

### 5.5 Portability

- The engine must run in both browser and Node.js environments.
- Distribution should use a single ESM module.

## 6. Assumptions

- Core engine should remain dependency-free.
- KaTeX/MathJax can be optional external dependencies when math support is enabled.
- The initial release focuses on HTML output, with other renderers planned later.

## 7. Dependencies

- Development of a lexer and recursive descent parser.
- Implementation of a secure renderer with optional raw HTML mode.
- Creation of CLI and web playground tooling.
- Test suite including unit tests, regression golden files, and fuzzing.

## 8. Risks

- Parsing may become too complex if syntax grows without strong grammar rules.
- Security expectations can be breached if renderer escaping is incomplete.
- Browser and Node.js compatibility issues may arise from environment-specific APIs.

## 9. Success Criteria

- Product delivers a usable HTSL syntax and generates valid HTML.
- Business stakeholders can validate the engine against the roadmap.
- Users can extend the engine with object plugins.
- The core product ships with documentation and a test suite.

## 10. Priority Features

1. Core HTSL syntax parsing and AST generation.
2. Secure HTML renderer with default escaping.
3. Clear error handling with line/column diagnostics.
4. Plugin API for object types.
5. CLI build command and playground demo.

## 11. Future Opportunities

- Support for PDF, Markdown, and JSON outputs.
- Interactive editor with live transformation and object evaluation.
- Expanded math capabilities using KaTeX or MathJax.
