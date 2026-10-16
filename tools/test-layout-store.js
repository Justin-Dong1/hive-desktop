const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),Store=require('./layout-store');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hive-layout-test-')),file=path.join(dir,'layout.json');
let store=Store(file);store.write({'hive-grid-placements:1':'{"a":{"page":0,"key":"2:1"}}','hive-note-draft:x':'private'},true);
assert(!store.read()['hive-note-draft:x']);store.write({'hive-grid-placements:1':'{"a":{"page":0,"key":"3:1"}}'});
store=Store(file);assert(store.read()['hive-grid-placements:1'].includes('3:1'));
store.write({'hive-grid-placements:1':'old','hive-grid-settings:2':'{"cell":120}'},true);assert(store.read()['hive-grid-placements:1'].includes('3:1'));
assert(store.read()['hive-grid-settings:2']);assert(fs.existsSync(file+'.bak'));
fs.writeFileSync(file,'invalid');store=Store(file);assert(store.read()['hive-grid-placements:1'].includes('3:1'));
console.log('PASS durable reload, legacy seed cannot overwrite newer layout, per-screen keys, backup recovery, draft exclusion');
