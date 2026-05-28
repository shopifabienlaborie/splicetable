# Splicetable — Open Source Approval Checklist

Based on Shopify's internal guidelines from #open-source Slack channel and Vault documentation.

## ✅ Completed

1. **Code Cleanup**
   - ✅ Removed all Shopify-specific references (AGENTS.md deleted)
   - ✅ Updated README.md (removed Quick deployment section)
   - ✅ Verified no API keys, secrets, or credentials in code
   - ✅ No internal Shopify APIs or tooling used in source

2. **Documentation**
   - ✅ LICENSE file added (MIT License)
   - ✅ CONTRIBUTING.md added
   - ✅ README.md with clear purpose and setup instructions

3. **Code Quality**
   - ✅ Static web app — no build step, clean architecture
   - ✅ Design system components with documentation
   - ✅ Working examples included

## 🔴 Still Required

### Before Publishing

1. **Clean Git History**
   - `AGENTS.md` exists in all 9 commits from project inception
   - **Action Required:** Create fresh git repo to remove history
   ```bash
   rm -rf .git
   git init
   git add .
   git commit -m "Initial commit — Splicetable image grid splitter"
   ```

2. **Post in #open-source Slack**
   - Share your intent to open source Splicetable
   - Get feedback from the community
   - Ask if transfer to github.com/shopify is desired or if personal account is fine

3. **Decide on GitHub Organization**
   - Option A: Transfer to `github.com/shopify` (requires #open-source approval)
   - Option B: Publish under personal GitHub account (no approval needed, but still good to notify #open-source)

### Optional but Recommended

- [ ] Add CODE_OF_CONDUCT.md (can use GitHub's default)
- [ ] Add GitHub Issue templates
- [ ] Add Pull Request template
- [ ] Set up GitHub Actions for basic CI (e.g., link checking)

## 📋 Summary of Changes Made

**Removed:**
- `AGENTS.md` — Contained Shopify Quick deployment documentation
- README.md deployment section referencing Quick

**Added:**
- `LICENSE` — MIT License (standard for Shopify open source)
- `CONTRIBUTING.md` — Contributor guidelines
- Generic deployment instructions in README.md

**Verified Clean:**
- No Shopify APIs (`quick.db`, `quick.ai`, `quick.socket`, etc.)
- No API keys or secrets
- No internal URLs or tooling references

## 🔗 References

- Vault: https://vault.shopify.io/docs/craft/2200-Engineering/development_handbook/overview/approach/open_source
- Slack: #open-source (C2G36UR8B)
- Shopify GitHub: https://shopify.github.io/

## Next Steps

1. **You will handle:** Fresh git repo creation (removes AGENTS.md from history)
2. **Recommended:** Post in #open-source about your project
3. **Decision needed:** Shopify org vs. personal GitHub account
