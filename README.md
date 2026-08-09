[![CI](https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/actions/workflows/test.yml/badge.svg)](https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/actions/workflows/test.yml)
[![CodeQL](https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/actions/workflows/codeql.yml/badge.svg)](https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/actions/workflows/codeql.yml)
[![Dependabot](https://img.shields.io/badge/dependencies-Dependabot-025E8C?logo=dependabot)](https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/network/updates)
[![Release](https://img.shields.io/github/v/release/paulte/tampermonkey-amazonhidesponsoredlistings)](https://github.com/paulte/tampermonkey-amazonhidesponsoredlistings/releases)

# Purpose

Tampermonkey script to remove sponsored listings from amazon searches

# Development and testing

Testing is present in a number of places

- pre-commit will check formatting, linting, and spelling before allowing a commit to be made
- CI will run the same precommit tests on any commit via github actions
- It is expected that a `npm run test` is run before any commit. This validates the userscript against a live amazon search page to ensure that the sponsored listings are still being removed. This test will fail if amazon changes their page structure and the userscript needs to be updated.
- Note, direct testing against amazon is not part of the CI test suite because it is not reliable. It appears that amazon has anti-automation measures that will block any tests triggered in github actions.

In the background, github actions will perform the following:

- codeql will perform automated security analysis of the javascript code
- dependabot will monitor project dependencies and github actions for available updates

# Release process

Run one of the following depending on whether you want to bump he major, minor or patch version

```bash
./create-release.sh  ( --major | --minor | --patch )
```

By default, `./create-release.sh --patch` should be used

This process will perform a few tasks:

- Validate local git is up-to-date, on main and clean
- Run `pre-commit` and `npm run test` to ensure that the code is in a good state
- Create a new `fix-search.js` with updated version and release date
- Create a new git tag
- Create a new release for the tag
- Push the tag to github
- Release webhooks in github will notify greasyfork.org to update the userscript there as well. Note, the published artefact must be in the root of the repository for greasyfork to find it. This is why the `hide-sponsored-listings.user.js` is in the root of the repo and not in a `dist` folder.
