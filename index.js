import WebSocket from 'ws';
import axios from 'axios';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
const profileRegex = config.profileRegex;
const wsEvent = new WebSocket(config.wsServer);

wsEvent.on('open', () => {
  console.log(`已连接到 WebSocket : ${config.wsServer}`);
});
wsEvent.on('error', (e) => {
  console.log(e)
});

wsEvent.on('message', (_d) => {
  const data = JSON.parse(_d);
  switch (data.post_type) {
    case 'message':
      // console.log(data.message)
      const profileMatch = data.message.match(profileRegex);
      if (profileMatch) {
        const command = profileMatch[1];
        const message = doCommand(command);
        console.log(message);
        sendMsg(message, data);
      }
      break;
    default:
      break;
  }
});

let scheduleData3;
let scheduleData2;
let scheduleData2Coop;
let scheduleData2CoopNew;
let translationsData;
let translationsData2;
let hourLast = new Date().getHours();
getTranlations3();
getTranlations2();
getSchedules();

// 检测小时数更新
function checkHourUpdate(hourLast) {
  const now = new Date();
  const hour = now.getHours();
  if (hourLast !== hour) {
    getSchedules();
  }
  return hour;
}

// 每分钟检测一次
setInterval(() => {
  hourLast = checkHourUpdate(hourLast);
}, 60000);


function doCommand(command) {
  // do something
  switch (command) {
    case '图':
      return getMapDataFromSchedules3(scheduleData3);
    case '3图':
      return getMapDataFromSchedules3(scheduleData3);
    case '工':
      return getCoopMapDataSchedules3(scheduleData3);
    case '3工':
      return getCoopMapDataSchedules3(scheduleData3);
    case 'data':
      return getMapDataFromSchedules3(scheduleData3);
    case `2图`:
      return getMapDataFromSchedules2(scheduleData2);
    case `2工`:
      return getCoopMapDataSchedules2(scheduleData2Coop);
    case `2工全`:
      return getCoopMapDataSchedules2New(scheduleData2CoopNew);
    default:
      break;
  }
  // return `接收到查询指令：${command}`
}

function sendMsg(message, data) {
  if (data.message_type == 'private' && data.group_id == null) {
    // 发送私聊消息，无群组id
    console.log('发送私聊消息')
    sendMessage(message, data.message_type, data.sender.user_id, data)
  } else if (data.message_type == 'group') {
    // 发送群组消息，有群组id
    console.log("发送群组消息，有群组id")
    sendMessage(message, data.message_type, data.group_id, data)
  } else {
    // 其他情况
    console.log(`由${sender_id}发送的${data.message_type}消息，暂不处理`)
  }
}

async function sendMessage(message, message_type, item, data) {
  console.log(`发送消息：${message}`)
  console.log(`消息类型：${message_type}`)
  console.log(`消息对象：${item}`)
  if (message_type == 'private') {
    // 如果message为数组
    if (message instanceof Array) {
      wsEvent.send(JSON.stringify({
        action: 'send_private_forward_msg',
        params: {
          user_id: item,
          messages: JSON.stringify(messageToForward(message,data)),
        }
      }))
    } else {
      wsEvent.send(JSON.stringify({
        action: 'send_private_msg',
        params: {
          user_id: item,
          message,
          auto_escape: true
        }
      }))
    }

  } else {
    if (message instanceof Array) {
      wsEvent.send(JSON.stringify({
        action: 'send_group_forward_msg',
        params: {
          group_id: item,
          messages: JSON.stringify(messageToForward(message,data)),
        }
      }))
    } else {
      wsEvent.send(JSON.stringify({
        action: 'send_group_msg',
        params: {
          group_id: item,
          message,
          auto_escape: true
        }
      }))
    }
  }
}

function messageToForward(messages,data) {
  let result = [];
  messages.forEach((message) => {
    let node = {
      type : "node",
      data : {
        name : data?.sender?.nickname,
        uin : data?.sender?.user_id,
        content : message
      }
    }
    result.push(node);
  })
  return result;
}

function getSchedules() {
  getSchedule3();
  getSchedule2();
  getSchedule2Coop();
  getSchedule2CoopNew();
}

async function getSchedule3() {
  const loadMsg3 = `正在获取三代数据……`;
  const successMsg3 = `3代数据已获取`;
  const url3 = `https://splatoon3.ink/data/schedules.json`;
  scheduleData3 = await getSchedule(url3,loadMsg3,successMsg3);
}

async function getSchedule2() {
  const loadMsg2 = `正在获取二代对战数据……`;
  const successMsg2 = `2代对战数据已获取`;
  const url2 = `https://splatoon2.ink/data/schedules.json`;
  scheduleData2 = await getSchedule(url2,loadMsg2,successMsg2);
}

async function getSchedule2Coop() {
  const loadMsg2Coop = `正在获取二代打工数据……`;
  const successMsg2Coop = `2代打工数据已获取`;
  const url2Coop = `https://splatoon2.ink/data/coop-schedules.json`;
  scheduleData2Coop = await getSchedule(url2Coop,loadMsg2Coop,successMsg2Coop);
}

async function getSchedule2CoopNew() {
  const loadMsg2Coop = `正在获取二代全量打工数据……`;
  const successMsg2Coop = `2代全量打工数据已获取`;
  const url2Coop = `https://files.oatmealdome.me/bcat/coop.json`;
  scheduleData2CoopNew = await getSchedule(url2Coop,loadMsg2Coop,successMsg2Coop);
}

async function getSchedule(url,loadMsg,successMsg) {
  try {
    console.log(`${loadMsg}`);
    const { data } = await axios.get(url, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ''
      }
    });
    console.log(data);
    console.log(`${successMsg}`);
    return data;
  } catch (error) {
    console.log(`获取数据失败：${error}`);
    getSchedule(url,loadMsg,successMsg);
  }
}

async function getTranlations3() {
  // 读取同目录下translation.json
  const data = fs.readFileSync('./translation3.json');
  translationsData = JSON.parse(data);
  // console.log("3代翻译数据已获取，可以执行其他操作");
  return translationsData;
}

async function getTranlations2() {
  // 读取同目录下translation.json
  const data = fs.readFileSync('./translation2.json');
  translationsData2 = JSON.parse(data);
  // console.log("2代翻译数据已获取，可以执行其他操作");
  return translationsData2;
}

function getMapDataFromSchedules3(scheduleData3) {
  let result = '';
  console.log(scheduleData3);
  if (!scheduleData3) {
    return '数据未读取，请稍后再试';
  }
  let num = 2;
  if (!scheduleData3?.data?.currentFest) {
    for (let offset = 0; offset < num; offset++) {
      // result += `涂地对战：\n`;
      result += get3RegularMatches(scheduleData3, offset);
      // result += `真格对战：\n`;
      result += get3BankaraMatches(scheduleData3, offset);
      if (offset < num - 1) {
        result += `\n--------------\n`;
      }
    }
  } else {
    // 祭典时间！
    result += festPerfix(scheduleData3);
    result += `--------------\n`;
    for (let offset = 0; offset < num; offset++) {
      // 祭典对战
      result += get3FestMatches(scheduleData3, offset);
    }
  }
  return result;
}

function get3RegularMatches(scheduleData3,offset) {
  let result = '';
  scheduleData3?.data?.regularSchedules?.nodes?.filter((node, index) => index == offset).forEach((node) => {
    // 将字符串时间node?.startTime转换为本地时间字符串
    const startTime = new Date(node?.startTime).toLocaleString();
    result += `${startTime.toLocaleString()}：\n`;
    result += getDetailData3('一般对战', node?.regularMatchSetting);
    result += `\n`;
  }, this);
  return result;
}

function get3BankaraMatches(scheduleData3,offset) {
  let result = '';
  scheduleData3?.data?.bankaraSchedules?.nodes?.filter((node, index) => index == offset).forEach((node) => {
    // 将字符串时间node?.startTime转换为本地时间字符串
    const startTime = new Date(node?.startTime).toLocaleString();
    // result += `${startTime.toLocaleString()}：\n`;
    if (node?.bankaraMatchSettings) {
      node?.bankaraMatchSettings.forEach((setting, bankaraIndex, bankaraArray) => {
        result += getDetailData3('蛮颓挑战', setting);
        if (bankaraIndex < bankaraArray.length - 1) {
          result += `\n`
        }
      }, this);
    }
  }, this);
  return result;
}

function festPerfix(scheduleData3) {
  let result = '';
  const currentFest = scheduleData3?.data?.currentFest;
  result += `正在进行祭典：${currentFest?.title}\n`;
  result += `${new Date(currentFest?.startTime).toLocaleString()} - ${new Date(currentFest?.endTime).toLocaleString()}\n`;
  // 阶段：currentFest?.state 对应的翻译：
  // FIRST_HALF: '前半段',
  // SECOND_HALF: '后半段',
  result += `当前阶段：${currentFest?.state == 'FIRST_HALF' ? '前半段' :
    currentFest?.state == 'SECOND_HALF' ? '后半段' : currentFest?.state}\n`;
  const triColorStage = currentFest?.tricolorStage;
  // if (currentFest?.state == 'SECOND_HALF') {
  //   result += `三色夺宝地图：${translationsData?.stages?.[triColorStage?.id]?.name ?? triColorStage?.name}\n`;
  // }
  return result;
}

function get3FestMatches(scheduleData3,offset) {
  let result = '';
  scheduleData3?.data?.festSchedules?.nodes?.filter((node, index) => index == offset).forEach((node) => {
    // 将字符串时间node?.startTime转换为本地时间字符串
    const startTime = new Date(node?.startTime).toLocaleString();
    result += `${startTime.toLocaleString()}：\n`;
    result += getDetailData3('祭典对战', node?.festMatchSetting);
  }, this);

  if (scheduleData3?.data?.currentFest?.state == 'SECOND_HALF') {
    result += `\n`;
    const triModeCN = '三色夺宝 🚀 占地对战';
    result += `=> 【${triModeCN}】 \n`;
    // 地图
    result += `${translationsData?.stages?.[triColorStage?.id]?.name ?? triColorStage?.name}`;
  }

  if (offset < num - 1) {
    result += `\n--------------\n`;
  }
  return result;
}

function getDetailData3(modeName,setting) {
  let result = '';
  const mode = setting?.mode;
  const modeCN =  mode == 'CHALLENGE' ? '蛮颓挑战' :
                  mode == 'OPEN' ? '蛮颓开放' :
                  mode ?? modeName;
  const ruleId = setting?.vsRule?.id
  const ruleName = translationsData?.rules?.[ruleId]?.name ?? setting?.vsRule?.name;
  result += `=> 【${modeCN} ${ruleName}】 \n`;
  setting?.vsStages?.forEach((stage, stageIndex, stageArray) => {
    // 寻找stage.id对应的翻译
    const stageName = translationsData?.stages?.[stage?.id]?.name ?? stage?.name;
    result += `${stageName}`;
    if (stageIndex < stageArray.length - 1) {
      result += ' / ';
    }
  }, this);

  return result;
}

function getCoopMapDataSchedules3(scheduleData3) {
  let result = '';
  console.log(scheduleData3);
  if (!scheduleData3) {
    return '数据未读取，请稍后再试';
  }
  scheduleData3?.data?.coopGroupingSchedule?.regularSchedules?.nodes?.forEach((node, coopIndex, coopArray) => {
    const startTime = new Date(node?.startTime).toLocaleString();
    result += `${startTime.toLocaleString()}：\n`;
    const coopStage = node?.setting?.coopStage;
    const stageId = coopStage?.id;
    const stageName = translationsData?.stages?.[stageId]?.name ?? coopStage?.name;
    result += `=> ${stageName}\n`;
    const weapons = node?.setting?.weapons;
    weapons?.forEach((weapon, index) => {
      const weaponId = weapon?.__splatoon3ink_id;
      const weaponName = translationsData?.weapons?.[weaponId]?.name ?? weapon?.name;
      result += `${weaponName}`;
      if (index < weapons.length - 1) {
        result += ' / '
      }
    }, this);
    if (coopIndex < coopArray.length - 1) {
      result += `\n----------\n`;
    }
  }, this);
  return result;

}

function getMapDataFromSchedules2(scheduleData2) {
  let result = '';
  console.log(scheduleData2);
  if (!scheduleData2) {
    return '数据未读取，请稍后再试';
  }

  const num = 2;

  result += `Splatoon 2 日程\n--------------\n`
  // 获取scheduleData2.league并解析
  const leagueMatches = scheduleData2?.league;
  const regularMatches = scheduleData2?.regular;
  const gachiMatches = scheduleData2?.gachi
  for (let offset = 0; offset < num; offset++) {
    const startTime = new Date(regularMatches[offset]?.start_time * 1000)?.toLocaleString();
    console.log(startTime);
    result += `${startTime?.toLocaleString()}：\n`;
    result += getDetailData2(regularMatches,offset);
    result += `\n`;
    result += getDetailData2(gachiMatches,offset);
    result += `\n`;
    result += getDetailData2(leagueMatches,offset);
    if (offset < num - 1) {
      result += `\n--------------\n`;
    }
  }
  
  return result;
}

function getDetailData2(data,offset) {
  let result = '';
  // 根据偏移输出【比赛类型·具体规则】
  const node = data?.filter((node, index) => index == offset)[0];
  const modeCN = translationsData2?.game_modes?.[node?.game_mode?.key]?.name ?? node?.rule.name;
  const ruleCN = translationsData2?.rules?.[node?.rule?.key]?.name ?? node?.game_mode.name;
  result += `=> 【${modeCN} ${ruleCN}】 \n`;
  // stageA
  const stageAName = node?.stage_a?.name;
  const stageATsName = translationsData2?.stages?.[node.stage_a.id]?.name;
  // result += `${stageATsName} / ${stageAName}`
  // result += `\n`;
  // stageB
  const stageBName = node?.stage_b?.name;
  const stageBTsName = translationsData2?.stages?.[node.stage_b.id]?.name;
  // result += `${stageBTsName} / ${stageBName}`
  result += `${stageATsName} / ${stageBTsName}`;
  return result;
}

function getCoopMapDataSchedules2(scheduleData2Coop) {
  let result = '';
  console.log(scheduleData2Coop);

  if (!scheduleData2Coop) {
    return '数据未读取，请稍后再试';
  }

  result += `Splatoon 2 工时表\n--------------\n`
  scheduleData2Coop?.details?.forEach((node, coopIndex, coopArray) => {
    const startTime = timeFormat(`mm/dd hh:ii`,node?.start_time * 1000)
    const endTime = timeFormat(`mm/dd hh:ii`,node?.end_time * 1000)
    result += `${startTime} ~ ${endTime}：\n`;
    const stageName = translationsData2?.coop_stages?.[node?.stage?.image]?.name ?? node?.stage?.name;
    result += `=> ${stageName}\n`;
    const weapons = node?.weapons;
    weapons?.forEach((weapon, index) => {
      const weaponId = weapon?.id;
      const weaponName = translationsData2?.weapons?.[weaponId]?.name ?? weapon?.name;
      result += `${weaponName}`;
      if (index < weapons.length - 1) {
        result += ' / '
      }
    }, this);
    result += `\n----------\n`;
  }, this);

  scheduleData2Coop?.schedules.filter((node,index) => index >= 2).forEach((schedule,index,array) =>{
    const startTime = timeFormat(`mm/dd hh:ii`,schedule?.start_time * 1000)
    const endTime = timeFormat(`mm/dd hh:ii`,schedule?.end_time * 1000)
    result += `${startTime} ~ ${endTime}`;

    if (index < array.length - 1) {
      result += `\n`;
    }
  });

  return result;
}

function getCoopMapDataSchedules2New(schedulesData2CoopNew) {
  let result = '';
  console.log(schedulesData2CoopNew);

  if (!scheduleData2CoopNew) {
    return '数据未读取，请稍后再试';
  }

  result += `Splatoon 2 工时表\n--------------\n`

  const num = 5;

  scheduleData2CoopNew?.Phases?.filter((phase,index,array) =>new Date(phase.EndDateTime) > new Date())
    .filter((phase,index) => index < num).forEach((phase,index,array) => {
      // phase?.StartDateTime 为 UTC 时间，加8小时为北京时间
      const startTime = timeFormat(`mm/dd hh:ii`,new Date(phase?.StartDateTime).getTime() + 8 * 60 * 60 * 1000);
      const endTime = timeFormat(`mm/dd hh:ii`,new Date(phase?.EndDateTime).getTime() + 8 * 60 * 60 * 1000);
      result += `${startTime} ~ ${endTime}：\n`;
      const stageName = translationsData2?.coop_stages?.[phase?.StageID]?.name ?? phase?.StageID;
      result += `=> ${stageName}\n`;
      const weapons = phase?.WeaponSets;
      let randomFlag = 0;
      weapons?.forEach((weapon, index) => {
        const weaponId = weapon;
        if (weaponId < 0) {
          randomFlag = weaponId;
        }
        const weaponName = translationsData2?.weapons?.[weaponId]?.name ?? weaponId;
        result += `${weaponName}`;
        if (index < weapons.length - 1) {
          result += ' / '
        }
      });
      if (randomFlag == -2) {
        result += '\n >>> 全部熊武器限定随机 <<<';
      } else if (randomFlag == -1) {
        const rareWeapon = translationsData2?.weapons?.[phase?.RareWeaponID]?.name ?? phase?.RareWeaponID;
        result += `\n >> 随机稀有武器：${rareWeapon} <<`;
      }
      if (index < array.length - 1) {
        result += `\n----------\n`;
      }
    });
  return result;
}

/*
 * JS 时间格式化
 * type 时间格式（yyyy-mm-dd hh:ii:ss / mm-dd / hh:ii / yyyy-mm）可自定义
 * date 毫秒时间戳（1554954127000）
 * 使用：timeFormat('yyyy-mm-dd hh:ii:ss',1554954127000)
 * 说明：紧支持毫秒级时间戳，传统秒级 Unix 时间戳需要乘以 1000 转换为毫秒
 */
function timeFormat(type,date){
	var date = new Date(date);
	var o = {   
		"m+" : date.getMonth()+1,	//月份   
		"d+" : date.getDate(),		//日   
		"h+" : date.getHours(),		//小时   
		"i+" : date.getMinutes(),	//分   
		"s+" : date.getSeconds(),	//秒   
	};   
	if(/(y+)/.test(type)){
		type=type.replace(RegExp.$1,(date.getFullYear()+"").substr(4-RegExp.$1.length)); 
	};    
	for(var k in o){
		if(new RegExp("("+ k +")").test(type)){
			type=type.replace(RegExp.$1,(RegExp.$1.length==1)?(o[k]):(("00"+ o[k]).substr((""+o[k]).length))); 
		}; 
	}
	return type; 
}

