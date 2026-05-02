const fs = require('fs');
const path = 'src/components/csr/CsrFormScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldButton = /<button[^>]*fixed bottom-\[108px\][^>]*>[\s\S]*?<\/button>/;
const newButton = `      <MobileFab 
        onClick={onSave} 
        icon={Save} 
        ariaLabel={saving ? 'Saving CSR' : 'Save CSR'} 
      />`;

content = content.replace(oldButton, newButton);
fs.writeFileSync(path, content);
console.log('Fixed CSR save button');
