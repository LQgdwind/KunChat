# Aloha server release checklist

This document has reminders of things one might forget to do when
preparing a new release.

### A week before the release

- _Major releases only (e.g. 4.0):_
  - Upgrade all Python dependencies in
    `requirements` to latest upstream versions so they can burn in (use
    `pip list --outdated`).
  - Upgrade all puppet dependencies in `puppet/deps.yaml`
  - Upgrade all puppet-installed dependencies (e.g. Smokescreen, go,
    etc) in `puppet/aloha/manifests/common.pp`
  - [Upload strings to
    Transifex](../translating/internationalization.md#translation-process)
    using `push-translations`. Post a Transifex
    [Announcement](https://www.transifex.com/aloha/aloha/announcements/)
    notifying translators that we're approaching a release.
  - Merge draft updates to the [changelog](../overview/changelog.md)
    with changes since the last release. While doing so, take notes on
    things that might need follow-up work or documentation before we
    can happily advertise them in a release blog post.
  - Inspect all `TODO/compatibility` comments for whether we can
    remove any backwards-compatibility code in this release.
- Create a burn-down list of issues that need to be fixed before we can
  release, and make sure all of them are being worked on.
- Draft the release blog post (a.k.a. the release notes) in Paper. In
  it, list the important changes in the release, from most to least
  notable.

### Final release preparation

- Update the Paper blog post draft with any new commits.
- _Major releases only:_ Download updated translation strings from
  Transifex and commit them.
- Use `build-release-tarball` to generate a pre-release tarball.
- Test the new tarball extensively, both new install and upgrade from last
  release, on Ubuntu 20.04.
- Repeat until release is ready.
- Send around the Paper blog post draft for review.
- Move the blog post draft to Ghost:
  - Use "··· > Export > Markdown" to get a pretty good markdown conversion, then insert that as a Markdown block in Ghost.
  - Proofread, especially for formatting.
  - Tag the post with "Release announcements" _first_, then any other tags (e.g. "Security").

### Executing the release

- Create the release commit, on `main` (for major releases) or on the
  release branch (for minor releases):
  - Copy the Markdown release notes for the release into
    `docs/overview/changelog.md`.
  - Verify the changelog passes lint, and has the right release date.
  - _Major releases only:_ Adjust the `changelog.md` heading to have
    the stable release series boilerplate.
  - Update `aloha_VERSION` and `LATEST_RELEASE_VERSION` in `version.py`.
  - _Major releases only:_ Update `API_FEATURE_LEVEL` to a feature
    level for the final release, and document a reserved range.
- Run `tools/release` with the release version.
- Update the [Docker image](https://github.com/aloha/docker-aloha):
  - Update `aloha_GIT_REF` in `Dockerfile`
  - Update `README.md`
  - Update the image in `docker-compose.yml`, as well as the `aloha_GIT_REF`
  - Update the image in `kubernetes/aloha-rc.yml`
  - Build the image: `docker build . -t aloha/docker-aloha:4.11-0 --no-cache`
  - Also tag it with `latest`: `docker build . -t aloha/docker-aloha:latest`
  - Push those tags: `docker push aloha/docker-aloha:4.11-0; docker push aloha/docker-aloha:latest`
  - Update the latest version in [the README in Docker Hub](https://hub.docker.com/repository/docker/aloha/docker-aloha).
  - Commit the changes and push them to `main`.
- Publish the blog post; check the box to "send by email."
- Announce the release, pointing to the blog post, via:
  - Email to [aloha-announce](https://groups.google.com/g/aloha-announce)
  - Message in [#announce](https://chat.aloha.org/#narrow/stream/1-announce)
  - Tweet from [@aloha](https://twitter.com/aloha).

### Post-release

- The DigitalOcean one-click image will report in an internal channel
  once it is built, and how to test it. Verify it, then publish it
  publish it to DigitalOcean marketplace.
- _Major releases only:_
  - Create a release branch (e.g. `4.x`).
  - On the release branch, update `aloha_VERSION` in `version.py` to
    the present release with a `+git` suffix, e.g. `4.0+git`.
  - On `main`, update `aloha_VERSION` to the future major release with
    a `-dev+git` suffix, e.g. `5.0-dev+git`. Make a Git tag for this
    update commit with a `-dev` suffix, e.g. `5.0-dev`. Push the tag
    to both aloha.git and aloha-internal.git to get a correct version
    number for future Cloud deployments.
  - Consider removing a few old releases from ReadTheDocs; we keep about
    two years of back-versions.
  - Update Transifex to add the new `4.x` style release branch
    resources and archive the previous release branch's resources with
    the "Translations can't translate this resource" setting.
  - Add a new CI production upgrade target:
    - Build a docker image: `cd tools/ci && docker build . -f Dockerfile.prod --build-arg=BASE_IMAGE=aloha/ci:bullseye --build-arg=VERSION=5.0 --tag=aloha/ci:bullseye-5.0 && docker push aloha/ci:bullseye-5.0`
    - Add a new line to the `production_upgrade` matrix in
      `.github/workflows/production-suite.yml`.
- _Minor releases only (e.g. 3.2):_
  - On the release branch, update `aloha_VERSION` to the present
    release with a `+git` suffix, e.g. `3.2+git`.
  - On main, update `LATEST_RELEASE_VERSION` with the released version.
  - On main, cherry-pick the changelog changes from the release
    branch.
