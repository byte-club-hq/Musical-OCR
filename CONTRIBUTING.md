# Contributing to Sheet Music Scanner

Thank you for considering contributing.

This project is meant to be built in the open, with work tracked through issues and small pull requests.

## Join The Community

In anticipation of AI agents flooding the repository with pull requests, as well as the influx of vibe coded contributions in many open source projects, we have limited contributions to members of the project community.

If you wish to contribute to the repository, feel free to join the community [Discord server](https://discord.com/invite/cAtAdY2CCf) and personally ask a project lead to add you to the organization.

## Project Approach

- keep the README short and focused on the project overview
- keep detailed implementation steps in issues
- keep changes small and reviewable
- prefer clear progress over large, mixed PRs


## How To Contribute

1. Review the planned work in [ISSUE.md](ISSUE.md).
2. Find/Create a GitHub issue that you'll work on it.
4. Create a branch for that issue.
5. Follow its requirements, restrictions, and acceptance checks exactly.
6. Make the smallest change that completes the issue.
7. Test the change before opening a pull request.
8. Add new test cases that cover the changes made.
8. Link the issue and describe what changed and why in the pull request.

Do not edit `ISSUE.md` to claim work or open a competing implementation issue. The project lead owns the backlog and assignment decisions.

## What To Contribute

Good first contributions include:

- documentation improvements
- UI polish
- bug fixes
- issue reproduction
- tests
- small feature work

## Bug Reports

If you find a bug, open an issue and include:

- what you expected
- what actually happened
- the steps to reproduce it
- any relevant screenshots, logs, or sample files

## Feature Requests

If you want to suggest an idea, open an issue and include:

- the problem you are trying to solve
- why the idea matters
- the expected result
- any examples or references that help explain it

## Style Guide

- write readable code first
- keep functions small when practical
- avoid extra abstraction unless it is needed
- comment/document your code for better understanding
- prefer the existing project style when making changes

## Test Architecture

- Keep application code in `frontend/src/` and `backend/src/`.
- Keep automated tests in `frontend/tests/` and `backend/tests/`; do not colocate tests with production code.
- Name test files after the behavior or module they cover using `*.test.ts` or `*.test.tsx`.
- Add or update tests for every production-code behavior change.
- Put reusable test-only setup in `tests/setup.ts` and test fixtures in `tests/fixtures/` only when they are actually needed.
- Mirror the `src/` directory structure inside `tests/` once multiple modules would otherwise have ambiguous test names; do not create empty hierarchy in advance.

## Commit Messages

Use short, clear commit messages in the imperative mood.

Examples:

- `feat: add image upload`
- `fix: handle empty response`
- `docs: shorten project overview`

## Questions

If something is unclear, open an issue instead of guessing. That keeps the project easier to coordinate and review.
