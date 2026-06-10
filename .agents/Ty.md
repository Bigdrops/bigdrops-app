# 1. Nuke the old node folders and lockfiles
Remove-Item -Recurse -Force node_modules, package-lock.json

# 2. Tell Bun to install your packages at high speed
bun install
