const fs = require('fs');
const pdfParse = require('pdf-parse');

async function parsePdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    console.log(`\n--- Report for ${filePath} ---`);
    console.log(`Page count: ${data.numpages}`);
    console.log(`Text length: ${data.text.length}`);
    console.log(`Text snippet: ${data.text.substring(0, 100).replace(/\n/g, ' ')}...`);
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err.message);
  }
}

parsePdf('./signalbands-test.pdf');
parsePdf('./minimal-test.pdf');
