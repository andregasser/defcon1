# Contributing to DEFCON 1

Thanks for helping improve DEFCON 1. Small fixes, clearer documentation, and
reproducible bug reports are useful contributions.

## Report a bug or propose a change

Search the [existing issues](https://github.com/andregasser/defcon1/issues) before
opening a new one. For a bug, include steps to reproduce, expected and actual
behavior, browser, operating system, and Node.js version. Say whether the board
was using the server or browser-only storage. Remove private task and project
content from screenshots and examples.

Discuss larger features and new dependencies in an issue before implementing
them. DEFCON 1 is intentionally local and login-free, with one JSON data file and
a server that has no runtime dependencies.

## Set up development

Use the latest Node.js 24 LTS release with npm, and Git. Follow the
[README quickstart](README.md#quickstart) to clone the repository, or fork it and
clone your fork if you do not have write access. Inside the checkout:

```bash
git switch -c docs/improve-help
npm ci
npm run dev
```

Choose a branch name that describes your change. Open <http://localhost:5173>;
the development command starts both Vite and the API server. Stop them together
with **Ctrl+C**. Point `DEFCON1_DATA_DIR` at a dedicated development directory
before starting the server if you already use DEFCON 1 for real tasks. Check any
setting inherited from your shell: separate checkouts can share that data path.

Read [AGENTS.md](AGENTS.md) before editing. In particular:

* Keep pure board logic in `src/lib/` and add regression tests for bug fixes.
* Add interface copy to both the German and English dictionaries.
* Handle new persisted fields in `normalizeData()` and test them.
* Preserve keyboard access and readable, wrapping task titles.
* Update the README when user-facing behavior changes.
* Keep `data/`, `dist/`, `node_modules/`, and local configuration out of commits.

## Check and submit

Run the same checks as CI before opening a pull request:

```bash
npm test
npm run build
npm run build:demo
git diff --check
```

Both builds include strict TypeScript checking. GitHub Actions also runs tests
and both builds on Ubuntu with Node.js 24. The demo output in `dist-demo/` stays
untracked, just like `dist/`.

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for
commit messages and PR titles, in English, with an imperative subject under
72 characters and no trailing period. For example:
`fix(board): keep empty lanes reachable` or `docs: clarify the quickstart`.

Push your branch and open a PR against `main`. Keep the diff focused. Explain
the problem, the resulting behavior, and the checks you ran with their results;
mention any checks you could not run. Check for an existing PR for your branch
before creating another. Leave merging to the maintainer.

## Licensing

Submit original code and documentation that can be distributed under the
project's [MIT License](LICENSE). Identify third-party material and its license
in your PR. The bundled alarm recordings have separate
[Pixabay licensing notes](public/sounds/README.md#license).
