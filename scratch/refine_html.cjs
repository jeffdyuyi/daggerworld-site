const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. 替换浮夸修辞
html = html.replace('从剑湾启航：跨越位面的史诗浩卷', '从剑湾启航：托瑞尔世界观概览');
html = html.replace(
  '在这片被称作<strong>「被遗忘的国度」</strong>的瑰丽世界中，上古魔法的洪流贯穿物质界与星界，数百个璀璨城邦沿着剑湾星罗棋布，正神与邪神的神圣选民在暗潮中角逐命运。',
  '在这片被称作<strong>「被遗忘的国度」</strong>的世界中，魔法网络贯穿物质界与外层位面，众多城邦沿着剑湾星罗棋布，各方势力与信仰在历史长河中交织更迭。'
);
html = html.replace(
  '托瑞尔的文明与战火中心。数十个强盛王国、数百座自治城邦与无垠荒野散布其间。西临剑湾商道，东接月之海群山，南达古老绿洲，是英雄与史诗诞生的温床。',
  '托瑞尔的文明与贸易核心。诸多王国、自治城邦与未开拓荒野散布其间。西临剑湾商道，东接月之海群山，南抵古老内陆，是诸多经典传奇的起源地。'
);
html = html.replace('纪年历法与史诗编年', '纪年历法与历史大事记');
html = html.replace('每一座城邦都拥有一部波澜壮阔的独立史诗，等待冒险者用脚步丈量。', '各城邦均拥有独立的政治结构与历史沿革，构成了丰富的探索舞台。');

// 2. 优化迷雾遮罩文案
html = html.replace(
  `次世代资料片《遗忘国度》全景档案正被上古秘法迷雾笼罩。<br>\n        该先行探索档案仅面向已激活《匕首世界》重启测试资格的冒险者开放。请输入内测激活码破除迷雾：`,
  `资料片《遗忘国度》先行档案处于未解密状态。<br>\n        当前内容面向已激活测试资格的冒险者开放。请输入激活码解除迷雾：`
);

// 3. 优化版本号
html = html.replace(/news-archive\.js\?v=[a-zA-Z0-9_-]+/g, 'news-archive.js?v=20261122e');

// 4. 优化 isDaggerworldActivated 判断中的有效 token 校验
html = html.replace(
  `if (session && (session.user || session.access_token || session.player_name || session.account)) {`,
  `if (session && session.access_token && session.access_token !== 'gm-offline-access-token') {`
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html successfully updated and refined!');

