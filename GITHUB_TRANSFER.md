# Publish the validated SalesOS source without losing changes

This task retains the validated application at `/workspace/salesos`. It is now a Git repository on branch `main`, with origin `https://github.com/brandon12001/salesos.git`. Product source and behaviour have not changed during repository preparation.

## Current blocker

The GitHub CLI reported an invalid GH_TOKEN (HTTP 401). HTTPS push failed because no usable GitHub username/credential was available. No source has been published by this task. Do not paste tokens into chat or commit credentials.

## Preferred recovery: keep this cloud workspace

Reconnect GitHub for this Codex environment, grant access to brandon12001/salesos, then resume this same task. Connecting a repository elsewhere does not by itself refresh an existing task's credentials. Once access works, the cloud agent should fetch origin, inspect any new branches, rerun npm test and npm run build, then push main normally. Never force-push over existing history.

Pending command (cloud environment only):

```sh
git -C /workspace/salesos push -u origin main
```

## If a new repository-connected cloud task is required

Preserve this workspace until transfer is verified. The previous uploaded handoff ZIP does not include all validation fixes. Transfer the current source archive or complete Git bundle, including dotfiles, through the cloud environment's available file export/upload interface. Do not assume a new task can see another task's /workspace.

Recovery artifacts are `/workspace/output/SalesOS_Validated_Source.zip` and `/workspace/output/SalesOS_Validated.bundle`. The bundle includes the complete committed source and history. The ZIP contains source, tests, config and docs with package.json at root; it excludes node_modules, dist and secrets. This session has no working downloadable-attachment output, so these paths are retained cloud files, not download links.

In a GitHub Codespace or a new cloud workspace, upload the bundle and clone it into a separate directory:

```sh
git clone /path/to/SalesOS_Validated.bundle salesos-recovered
cd salesos-recovered
git remote set-url origin https://github.com/brandon12001/salesos.git
git fetch origin
npm ci
npm test
npm run build
git push -u origin main
```

If GitHub has acquired commits, compare them first and integrate without discarding either tree. Verify remote main matches the intended local commit and GitHub lists all source/test/config/doc files. No software needs to be installed on the work laptop.

## Vercel

After successful GitHub publication, import brandon12001/salesos into a single Vercel project, production branch main, Node 24.x, install npm ci, build npm run build, output dist. Root vercel.json and GitHub validation workflow are included. No Supabase variables are required for localStorage mode. See CLOUD_DEPLOY.md for persistence and access limitations.
