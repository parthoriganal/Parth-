import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreAssetPaths} from '../server/assets.mjs';

test('uploaded asset metadata is portable and cannot escape the asset directory',()=>{
  const restored=restoreAssetPaths({
    'asset-123':{id:'asset-123',path:'/old/workspace/assets/asset-123.mp3',name:'voice',kind:'audio'},
    '../escape':{path:'/other/place/escape.mp3'},
    'no-extension':{path:'/old/path/not-a-media-file'},
  },'/new/workspace/assets');
  assert.equal(restored['asset-123'].path,'/new/workspace/assets/asset-123.mp3');
  assert.equal(restored['asset-123'].name,'voice');
  assert.deepEqual(Object.keys(restored),['asset-123']);
});
