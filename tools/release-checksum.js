'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..'),version=require('../package.json').version;
const name=`HiveDesktop-Setup-${version}-x64.exe`,file=path.join(root,'dist',name);
const sha=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(path.join(root,'dist','SHA256SUMS.txt'),`${sha}  ${name}\n`);
console.log(JSON.stringify({name,bytes:fs.statSync(file).size,sha256:sha}));
