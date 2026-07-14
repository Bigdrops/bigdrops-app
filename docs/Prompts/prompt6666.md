following agents.md protocol and the subagents persona

### Role
You are a senior repository curator and documentation engineer.

### Goal
Prune the downloaded ReUI reference repository so it functions as a clean, local design reference library for future UI/UX work. This is **not** a functional dependency or subproject—it is a documentation/reference asset used to study component implementations and design patterns during the UI overhaul described in `docs/PRD/ui-ux-consolidation`.

### Context
The ReUI repository has been downloaded into:

`docs/TEMPLATES/React-temps/reui`

It is being retained solely as a local reference library. It will not be developed, contributed back to, or executed as an independent project. Remove repository metadata, development artifacts, and other unnecessary files while preserving everything useful for browsing components, layouts, styling patterns, and implementation examples.

### Scope

Inspect the contents of:

`docs/TEMPLATES/React-temps/reui`

Identify files and directories that exist only for repository management, contribution workflows, publishing, CI/CD, releases, automation, or community management.

Remove only items that provide no value for using the repository as a local design reference.

### Preserve

Keep anything that may be useful for understanding or referencing component implementations, including:

- Component source code
- Example implementations
- Layout examples
- Styling
- Assets used by components
- Documentation explaining component usage
- Design examples
- Utility code referenced by components
- Configuration files only if they help understand the project structure or component implementation

### Remove (where applicable)

Examples include, but are not limited to:

- `.git`
- GitHub-specific directories (`.github`)
- Git metadata
- Issue templates
- Pull request templates
- Contribution guides
- Funding files
- Release automation
- CI/CD workflows
- Git hooks
- Dependabot configuration
- CODEOWNERS
- Security policies
- Changelogs intended only for project maintenance
- Community governance files
- Publisher-specific metadata that serves no documentation purpose

Use judgment rather than deleting blindly.

### Constraints

- Do not modify component source code.
- Do not reorganize the component library.
- Do not rename files.
- Do not remove documentation that helps explain components.
- Preserve the folder structure unless a directory exists solely for repository management.
- Make the smallest set of changes necessary.

### Deliverables

1. Remove unnecessary repository-management files and directories.
2. Provide a concise report listing:
   - Removed files/directories
   - Why each was removed
   - Files intentionally preserved because they remain valuable as design references
3. If any file has uncertain value, preserve it and explain why.

### Validation

After cleanup:

- Run `git status` to verify only the intended cleanup changes were made.
- Do not run `bun run build`.
- Do not run application tests or type checking unless required by the cleanup.
- If uncertain whether a file is useful as a reference, preserve it rather than deleting it.