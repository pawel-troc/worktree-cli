# Contributing to worktree-cli

Thank you for your interest in contributing to worktree-cli! This document provides guidelines and instructions for contributing.

## Branch Naming Convention

All branches must be prefixed with one of the following:

- **`feature/`** - For new features or enhancements
  - Example: `feature/add-search-functionality`
  - Example: `feature/improve-ui-navigation`

- **`bugfix/`** - For bug fixes
  - Example: `bugfix/fix-worktree-deletion`
  - Example: `bugfix/resolve-path-issue`

## Versioning

We follow [Semantic Versioning](https://semver.org/) (SemVer). Each change must include a version bump in `package.json`.

Given a version number **MAJOR.MINOR.PATCH**, increment the:

| Version | When to bump |
|---------|--------------|
| **MAJOR** | When you make incompatible API changes |
| **MINOR** | When you add functionality in a backward compatible manner |
| **PATCH** | When you make backward compatible bug fixes |

### Examples

- Breaking change to CLI commands or options → bump **MAJOR** (e.g., `1.0.0` → `2.0.0`)
- Adding a new feature without breaking existing functionality → bump **MINOR** (e.g., `1.0.0` → `1.1.0`)
- Fixing a bug without changing the API → bump **PATCH** (e.g., `1.0.0` → `1.0.1`)

## Pull Request Process

1. Create a branch following the naming convention above
2. Make your changes
3. Update the version in `package.json` according to SemVer
4. Submit a pull request with a clear description of your changes

## Questions?

If you have any questions, feel free to open an issue for discussion.
