import sys

path = 'docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form-v9.html'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the esc function line
for i, line in enumerate(lines):
    if line.startswith('const esc = s => String'):
        print(f'Found esc on line {i+1}: {repr(line)}')
        # The correct version is the same as v8/v2:
        correct = "const esc = s => String(s == null ? '' : s).replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#039;'}[m]));\n"
        lines[i] = correct
        print(f'Replaced with: {repr(correct)}')
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print('Written')
        break
