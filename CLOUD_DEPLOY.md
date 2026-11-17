# Cloud-only GitHub and Vercel deployment

The source was built and tested in the Codex cloud environment on 17 November 2026. No installation is needed on your laptop.

1. The permanent repository is https://github.com/brandon12001/salesos. Publish the validated commit there using the authenticated cloud task. Confirm repository visibility is private in GitHub settings. Source includes package-lock.json, .github/workflows/validate.yml and vercel.json; dependencies, build output, secrets and prospect backups are excluded.
2. In Vercel, Add New Project → import that repository. Select Vite, repository root, Node 24.x, install `npm ci`, build `npm run build`, output `dist`. These are also declared in the source. Deploy and retain this project for future updates.
3. No environment variables are required for browser-local mode. Optional Supabase uses only the public URL and anon key from .env.example. Never enter a service-role key.
4. Check deployment logs, then open the deployed URL and test fictional data. Export a JSON backup from your existing SalesOS origin before moving records; browser storage belongs to each origin.
5. Subsequent commits trigger GitHub validation and Vercel deployments. Require successful validation before merging changes. Retain the previous Vercel deployment for rollback.

Hosting is not cloud data storage. This app saves to browser localStorage. Supabase support is manual authenticated upload/restore only; live sync and conflict handling have not been implemented or verified. A private repository also does not make the deployed website private; configure Vercel access protection if needed.

The local Git remote now targets https://github.com/brandon12001/salesos.git. Publishing is pending working GitHub write credentials in this cloud task. Vercel has not been connected. A successful cloud build is not a verified Vercel deployment. After import, set the production branch to main and confirm the Validate SalesOS GitHub check succeeds. Vercel builds and GitHub Actions run independently; configure required checks and a protected production branch if you want validation to gate merges.
