const fs = require('fs');
const html = fs.readFileSync('docs/viewpagerefrence.html', 'utf8');

let body = html.match(/<body>([\s\S]*?)<\/body>/)[1];

body = body.replace(/class="([^"]+)"/g, (match, classes) => {
  const clsArray = classes.split(' ').map(c => c.trim()).filter(Boolean);
  if (clsArray.length === 1) return `className={styles['${clsArray[0]}']}`;
  return `className="${clsArray.join(' ')}".split(' ').map(c => styles[c] || c).join(' ')`;
});

// Remove inline styles to make it valid TSX easily (we can restore them later if needed)
body = body.replace(/style="([^"]+)"/g, '');

// Self closing tags
body = body.replace(/<(input|img|br|hr)([^>]*[^\/])>/g, '<$1$2 />');
// Self closing SVG tags
body = body.replace(/<(circle|line|rect|path|polyline|polygon)([^>]*[^\/])>/g, '<$1$2 />');

// Remove onclick
body = body.replace(/onclick="([^"]+)"/g, '');
// Remove id
body = body.replace(/id="([^"]+)"/g, '');

// Fix <!-- -->
body = body.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Wrap in a component
const output = `
import React from 'react';
import styles from './InvoicePresentation.module.css';

export function InvoiceStaticMarkup() {
  return (
    <>
      ${body}
    </>
  );
}
`;

fs.writeFileSync('src/components/document-view/invoice/InvoiceStaticMarkup.tsx', output, 'utf8');
console.log('Done!');
