This is the bot which controls the workflow of Definitely Typed PRs.

## Meta

* __State:__ Production
* __Dashboard:__ [Azure](https://ms.portal.azure.com/#@72f988bf-86f1-41af-91ab-2d7cd011db47/resource/subscriptions/57bfeeed-c34a-4ffd-a06b-ccff27ac91b8/resourceGroups/dtmergebot/providers/Microsoft.Web/sites/DTMergeBot) — [Logs](https://ms.portal.azure.com/#blade/WebsitesExtension/FunctionsIFrameBlade/id/%2Fsubscriptions%2F57bfeeed-c34a-4ffd-a06b-ccff27ac91b8%2FresourceGroups%2Fdtmergebot%2Fproviders%2FMicrosoft.Web%2Fsites%2FDTMergeBot) — [GH Actions](https://github.com/DefinitelyTyped/dt-mergebot/actions) — [GH Webhook](https://github.com/DefinitelyTyped/DefinitelyTyped/settings/hooks/193097250)

It is both a series of command line scripts which you can use to test different states, and an Azure Function App which handles incoming webhooks from the DefinitelyTyped repo.

This repo is deployed to Azure on every push to master.
To ensure we can handle timeouts on older PRs, there is a [GitHub Action](https://github.com/DefinitelyTyped/dt-mergebot/actions) which runs the bot every 6 hours against [all open PRs](./src/run.ts), and has a bunch of useful flags for running manually too.

# Setup

```sh
# Clone it
git clone https://github.com/DefinitelyTyped/dt-mergebot.git
cd dt-mergebot

# Deps
npm install

# Validate it works
npm test
```

# How the app works

There are three main stages once the app has a PR number:

* Query the GitHub GraphQL API for PR metadata ([`pr-info`](src/pr-info.ts))
* Create a PR actions metadata object ([`compute-pr-actions`](src/compute-pr-actions.ts))
* Do work based on the resulting actions ([`execute-pr-actions`](src/execute-pr-actions.ts))

# How the bot works

There is an Azure function in `PR-Trigger` which receives webhooks; its job is to find the PR number then it runs the above steps.

# Running Locally

You _probably_ don't need to do this. Use test to validate any change inside the src dir against integration tests.

However, you need to have a GitHub API access key in either: `DT_BOT_AUTH_TOKEN`, `BOT_AUTH_TOKEN` or `AUTH_TOKEN`.
Ask Ryan for the bot's auth token (TypeScript team members: Look in the team OneNote).
Don't run the bot under your own auth token as this will generate a bunch of spam from duplicate comments.

```sh
# Windows
set BOT_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# *nix
export BOT_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

# Development

```sh
# Build
npm run build

# Run the CLI to see what would happen to an existing PR
npm run single-info -- [PR_NUM]
# or
npm run single-info-debug -- [PR_NUM]
```

### If you update any queries

Run this to update the generate types:

```sh
# Code-gen the schema
npm run graphql-schema
```

### If you change project columns or labels

Run this to update the cached values:

```sh
# Regenerate src/_tests/cachedQueries.json
npm run update-test-data
```

# Tests

```sh
# Run tests, TypeScript is transpiled at runtime
npm test
```

Most of the tests run against a fixtured PR, these are high level integration tests which store the PR info and then re-run the latter two phases of the app.

To create fixtures of a current PR:

```sh
# To create a fixture for PR 43161
npm run create-fixture -- 43161
```

Then you can work against these fixtures offline with:

```sh
# Watch mode for all tests
npm test -- --watch
# Just run fixtures for one PR
npm test -- --testNamePattern 44299
```

Run a test with the debugger:

```sh
node --inspect --inspect-brk ./node_modules/.bin/jest -i --runInBand --testNamePattern 44299
```

Then use "Attach to Process ID" to connect to that test runner

If your changes require re-creating all fixtures:

```sh
npm run update-all-fixtures
```

Be careful with this, because PRs may now be in a different state e.g. it's now merged and it used to be a specific
weird state.
