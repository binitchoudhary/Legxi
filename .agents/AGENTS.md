# Shopify Deployment Rules

🚨 CRITICAL PRODUCTION RULES (MANDATORY)

These rules are NON-NEGOTIABLE.
Never violate any of them.

========================================================
1. ALWAYS SYNC WITH LIVE BEFORE ANY CHANGE
========================================================
Before writing, editing or deploying ANY code you MUST first synchronize with the latest live Shopify theme.
Mandatory workflow:
1. Pull the latest version of the target theme.
2. Verify the local copy is identical to the live theme.
3. Only after synchronization begin development.
Never assume your local files are current.

========================================================
2. NEVER WORK ON STALE FILES
========================================================
Do NOT edit files from:
• previous sessions
• cached workspace
• old clones
• old branches
• local backups
Always work from the latest live theme.

========================================================
3. DEPLOY ONLY THE MODIFIED FILES
========================================================
Never push the entire theme.
Never upload every asset.
Never deploy the whole repository.
Deploy ONLY the files that were intentionally modified for the requested task.
Example:
Correct
theme/sections/cart-drawer.liquid
theme/assets/cart-drawer.js
theme/assets/cart-drawer.css
Incorrect
Push entire theme
Upload all assets
Upload all sections
Replace theme

========================================================
4. VERIFY REMOTE CHANGES FIRST
========================================================
Before deployment compare:
Live Theme
↓
Local Changes
If any file was modified remotely after your last sync:
STOP.
Pull the latest version.
Merge correctly.
Then continue.
Never overwrite newer live work.

========================================================
5. NEVER RECREATE EXISTING CODE
========================================================
If the feature already exists in the live theme:
Read it.
Understand it.
Extend it.
Reuse it.
Do NOT rewrite existing working implementations.

========================================================
6. MINIMAL CHANGE POLICY
========================================================
Only touch the code required.
Never reformat unrelated files.
Never rename functions unnecessarily.
Never move code for no reason.
Never rewrite stable logic.

========================================================
7. PROTECT PRODUCTION
========================================================
Never modify:
Working checkout
Working discounts
Working cart
Working collections
Working product templates
unless explicitly requested.

========================================================
8. VERIFY BEFORE PUSH
========================================================
Before deployment verify:
✓ No JavaScript errors
✓ No Liquid errors
✓ No duplicate CSS
✓ No duplicate event listeners
✓ No broken images
✓ No console warnings
✓ Existing features still work

========================================================
9. DEPLOYMENT REPORT
========================================================
Before every push provide:
Files Modified
Reason
Expected Impact
Risk Level
Deployment Scope
Example:
Modified Files
theme/sections/cart-drawer.liquid
theme/assets/cart.js
Reason
ROYAL10 recommendation improvements
Risk
Low
Deployment
Only these two files

========================================================
10. ABSOLUTE PROHIBITIONS
========================================================
Never:
❌ Push entire theme
❌ Overwrite live changes
❌ Deploy stale files
❌ Replace working code
❌ Rebuild unrelated components
❌ Deploy files that were not modified

========================================================
11. IF THERE IS ANY DOUBT
========================================================
STOP.
Synchronize again.
Compare again.
Only then deploy.

========================================================
12. PRODUCTION SAFETY IS HIGHER PRIORITY THAN SPEED
========================================================
It is better to deploy one safe file than overwrite the production theme.
Always protect existing live work.

========================================================
13. LIVE THEME DRIFT PROTECTION (MANDATORY)
========================================================
Before EVERY deployment:
Pull the latest live theme again.
Compare file hashes (or content) for every file you intend to modify.
If the live version differs from your local copy:
STOP.
Do NOT deploy.
Pull the latest version.
Merge your changes into the newest live version.
Re-test.
Only then deploy.
Never overwrite changes made by another developer or by Shopify Admin.
This rule is mandatory for every deployment.
If you cannot confirm that your local copy matches the current live Shopify theme, you MUST NOT push any code.
Instead, stop the deployment and synchronize with the latest live theme first.
Never assume.
Always verify.
This rule has higher priority than completing the task.

========================================================
14. ZERO DEBUG POLICY (MANDATORY)
========================================================
Production deployments must NEVER contain any debugging code.
Before pushing ANY change to the live Shopify theme, remove all temporary debugging code.
This includes:
- console.log(...)
- console.error(...)
- console.warn(...)

========================================================
15. PRODUCTION CLEANUP CHECKLIST (MANDATORY)
========================================================
Before EVERY live deployment, verify:
✓ No debug logs remain.
✓ No console output remains.

========================================================
16. MANDATORY FINAL VERIFICATION
========================================================
Remove every temporary debug statement before deployment.

========================================================
17. NO LIVE DEBUGGING
========================================================
The live Shopify store is NEVER a debugging environment.
Debugging must happen on the development theme only.

========================================================
18. INTENTIONAL NOINDEX EXCLUSIONS & FUTURE SEO GOVERNANCE
========================================================
The following page categories are intentionally excluded from Google's index and should not be modified unless business requirements change:
• Corporate enquiry pages
• Registration forms
• Authentication flows
• Thank-you pages
• Utility pages
• Unlisted products

Any future recommendation to remove NOINDEX from these pages must undergo business review before implementation.

Future SEO audits must evaluate business intent before classifying any NOINDEX page as a technical defect.

========================================================
DECISION MATRIX
========================================================

NOINDEX alone MUST NEVER be treated as an SEO defect.

Before recommending any change, every audit must verify:

1. Is the page public?
2. Is the page intended to rank in Google?
3. Is the page included in the organic acquisition strategy?
4. Is there any business reason for exclusion?
5. Is the page part of a customer journey, authentication flow, utility flow, or conversion funnel?

Only if ALL answers support indexability may the page be classified as a Technical SEO Defect.

Otherwise classify it as one of:

- Expected Business Noindex
- Private Utility Page
- Conversion Funnel
- Authentication Flow
- Corporate Registration
- Unlisted Product
- Business Decision Required

No agent may recommend removing NOINDEX without documenting:
- Technical evidence
- Business justification
- Risk assessment
