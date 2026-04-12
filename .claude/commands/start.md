Bootstrap the project for the hackathon theme: $ARGUMENTS

Steps:
1. Read CLAUDE.md and docs/prizes.md
2. Design the best, most usable app for this theme — usability and quality are the primary goal
3. For each component/feature in the design, check docs/prizes.md "Feature → Prize Tool" table:
   - If a prize tool is the natural best fit for that feature, use it
   - If no prize tool fits well, use whatever is fastest/best
4. Check if theme has a genuine frontline worker angle → flag for Reach Capital if so
5. Fill in docs/architecture.md — list which prize tools are used and why they fit
6. Fill in docs/api-contract.md with all endpoints for the core user flow
7. Fill in docs/data-models.md with shared types
8. Run /sync to update the snapshot
9. Output:
   - What the app does and why it's useful (2 sentences)
   - Architecture overview
   - Prize tools being used and which feature each serves
   - What Frontend and Backend agents should start with first
