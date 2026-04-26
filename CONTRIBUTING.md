# Contributing to openShield

Thank you for your interest in contributing to openShield!

## How to Contribute

1. **Fork the repository** and create a feature branch.
2. **Make your changes** following the coding standards below.
3. **Run tests** to ensure nothing is broken.
4. **Submit a pull request** with a clear description of the changes.

## Development Setup

1. Clone the repository.
2. Load the extension unpacked in `chrome://extensions` (Developer mode → Load unpacked).
3. Run unit tests: `node --test tests/unit/**/*.test.js`
4. Run the build: `node tools/build.js`

## Coding Standards

- **ES2022** syntax
- **ES modules** (`import`/`export`)
- **No runtime dependencies**
- **`async/await`** preferred over Promise chains
- **JSDoc** on exported functions
- camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants
- Event listeners named `handle<Event>`
- No inline scripts or styles in HTML

## Commit Convention

Use conventional commits:

```
feat(farbling): add AudioContext noise injection
fix(popup): correct badge count display for large numbers
docs(spec): update TASK-007 acceptance criteria
chore(build): update EasyList conversion script
test(farbling): add toString native code test
```

## Reporting Issues

When reporting bugs, please include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Code of Conduct

Be respectful and constructive. Harassment or abusive behavior will not be tolerated.
