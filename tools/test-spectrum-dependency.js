'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
for(const file of ['tools/spectrum-service.js','tools/test-spectrum.js','tools/package-smoke.js','tools/build-spectrum.ps1','electron-builder.yml']){
 assert(!read(file).includes('NAudio-1.10'),file+' still references old dependency');assert(read(file).includes('NAudio-2.2.1'),file+' missing new dependency');
}
const build=read('tools/prepare-release.ps1');assert(build.includes('SHA256'));assert(build.includes("InnerText -ne 'MIT'"));assert(build.includes('794645DB'));assert(build.includes('C8396B8D'));
const license=read('licenses/NAudio-2.2.1.txt');assert(license.includes('Permission is hereby granted'));assert(!license.includes('Microsoft Public License'));
const config=read('electron-builder.yml');for(const f of ['NAudio.Core.dll','NAudio.Wasapi.dll','LICENSE.txt'])assert(config.includes(f));assert(config.includes('  - LICENSE'));
console.log('PASS MIT dependency paths, fixed package hashes, license checks and packaged notices');
