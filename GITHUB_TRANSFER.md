# SalesOS repository transfer record

## Completed — 17 November 2026

The validated application was transferred from `/workspace/salesos` to https://github.com/brandon12001/salesos on branch `main`. The initial publication preserved the local commits and all 46 tracked source, test, configuration and documentation files. No application behaviour changed during this transfer.

The production build and every available engine/importer test passed immediately before publication. Commit `170a9ea` was confirmed as the remote main head after the first push. Subsequent documentation updates record successful transfer and deployment readiness.

Earlier publication attempts failed because the existing task's GitHub credentials were invalid. After GitHub was connected, write permissions became available and a normal HTTPS push succeeded. No force-push or history replacement was required.

## Continuing development

Use this repository as the source of truth. Existing cloud checkout: `/workspace/salesos`, origin `https://github.com/brandon12001/salesos.git`, branch `main`. A new repository-connected Codex task or GitHub Codespace can clone directly from GitHub; it no longer needs the original handoff ZIP or a cross-task file transfer.

Run `npm ci`, `npm test`, and `npm run build` in the cloud environment before publishing changes. Do not install software on the work laptop. Keep secrets and user prospect backups outside Git.

## Recovery

The complete source archive and Git bundle remain under `/workspace/output`. They are optional recovery copies, not the primary repository. The initial source commit is `689a21a`. A bundle can be cloned into a separate cloud directory without losing committed history. Prefer GitHub for future transfers and verify remote main after pushing.

## Continuous deployment

The repository includes `.github/workflows/validate.yml`, `package-lock.json`, Node 24.x configuration and `vercel.json`. GitHub validation runs on pushes and pull requests. Import the repository into Vercel once, using main as the production branch; future pushes deploy through that project. See CLOUD_DEPLOY.md for the exact settings and the distinction between hosting and cloud persistence.
