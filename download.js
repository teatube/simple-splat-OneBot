import axios from 'axios';
import fs from 'fs';

downloadImages();

function downloadImages(){
  // 读取 images/weaponWebpUrl.json
  const objects = JSON.parse(fs.readFileSync('./images/weaponWebpUrl.json', 'utf8'));
  // 对于weapons中的每个属性
  const weapons = Object.entries(objects);
  weapons.forEach(([key, obj]) => {
    const imageUrl = `https://splatoon2.ink/assets/splatnet` + obj?.image;
    const name = key
    try {
      // 下载并保存到 images 文件夹
    downloadImage(imageUrl, name);
    } catch (e) {
      
    }
  }, this);
}

function downloadImage(url,name) {
  const path = name? `${name}.png` : url.split('/').pop();
  const writer = fs.createWriteStream(`./images/weapons2/${path}`);
  axios({
    url,
    method: 'GET',
    responseType: 'stream'
  }).then(response => {
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }).catch(err => {
    console.log(err);
  })
}