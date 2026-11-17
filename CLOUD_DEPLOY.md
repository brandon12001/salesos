# Cloud-only GitHub and Vercel deployment

The source was built and tested in the Codex cloud environment on 17 November 2026. No installation is needed on your laptop.

1. The permanent repository is https://github.com/brandon12001/salesos. Publish the validated commit there using the authenticated cloud task. Confirm repository visibility is private in GitHub settings. Source includes package-lock.json, .github/workflows/validate.yml and vercel.json; dependencies, build output, secrets and prospect backups are excluded.
2. In Vercel, Add New Project → import that repository. Select Vite, repository root, Node 24.x, install `npm ci`, build `npm run build`, output `dist`. These are also declared in the source. Deploy and retain this project for future updates.
3. No environment variables are required for browser-local mode. Optional Supabase uses only the public URL and anon key from .env.example. Never enter a service-role key.
4. Check deployment logs, then open the deployed URL and test fictional data. Export a JSON backup from your existing SalesOS origin before moving records; browser storage belongs to each origin.
5. Subsequent commits trigger GitHub validation and Vercel deployments. Require successful validation before merging changes. Retain the previous Vercel deployment for rollback.

Hosting is not cloud data storage. This app saves to browser localStorage. Supabase support is manual authenticated upload/restore only; live sync and conflict handling have not been implemented or verified. A private repository also does not make the deployed website private; configure Vercel access protection if needed.

The validated source has been pushed to main at https://github.com/brandon12001/salesos. GitHub repository write access was verified on 17 November 2026. The repository is currently public; a private repository is recommended for personal development. Vercel project `salesos` is connected to this repository in the `up-next7` workspace. Its production branch is `main`, using Node 24.x and the root Vite configuration. Production URL: https://salesos-up-next7.vercel.app . Vercel sign-in protection remains enabled. The first production deployment of commit `5e6561c` reached READY on 17 November 2026. A successful cloud build is not a verified Vercel deployment. After import, set the production branch to main and confirm the Validate SalesOS GitHub check succeeds. Vercel builds and GitHub Actions run independently; configure required checks and a protected production branch if you want validation to gate merges.

## Verified deployment

Project ID: `prj_Pc5UqACsQJB0EqW3uc22OEHmbvbK`. Initial successful deployment: `dpl_GuUufxkBaopuMfFDoXwWrbZFhYui`. Vercel cloned the intended main commit, ran npm ci and the TypeScript/Vite production build successfully. GitHub validation passed before publication. Future pushes to main trigger Vercel builds. The two earlier failed ZIP-upload projects were left untouched.

The protected production page received a desktop smoke/functional pass using a user-approved temporary testing link, without disabling protection. See docs/LIVE_VERIFICATION.md for observed workflows, the skip/snooze counting regression fixed in production, and remaining acceptance limits. Sign in with your authorised Vercel account to open the site.
