const { spawn } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--enable-logging',
  '--v=1',
  'http://localhost:5174/'
];

console.log('Starting Chrome...');
const chrome = spawn(chromePath, args);

let output = '';

chrome.stdout.on('data', (data) => {
  output += data.toString();
});

chrome.stderr.on('data', (data) => {
  output += data.toString();
});

setTimeout(() => {
  console.log('Killing Chrome...');
  chrome.kill();
  fs.writeFileSync('chrome_node_output.txt', output);
  console.log('Done!');
  process.exit(0);
}, 5000);
