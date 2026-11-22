const fs = require('fs');

const newsContent = fs.readFileSync('news-archive.js', 'utf8');
const arrayMatch = newsContent.match(/const news = (\[[\s\S]*\]);/);
const news = new Function(`return ${arrayMatch[1]}`)();

console.log('Total news to review:', news.length);

news.forEach((item, index) => {
  const [cat, date, title, ...paragraphs] = item;

  // 1. 纠错 2030-03-05 领域协同新闻中的胡编技能
  if (title.includes('九大领域协同与动态战局交织')) {
    item[2] = "战术前瞻｜九大领域卡牌协同与动态战局演进";
    item[3] = "在即将开启的《匕首世界》重启测试中，战斗设计组不仅升级了底层的无网格判定系统，更在实战交锋中进一步强化了九大领域卡牌之间的战术协同深度。";
    item[4] = "## 真实领域联动：当午夜、利刃与辉耀交织";
    item[5] = "战术配合绝非单纯的数值堆叠，而是手牌与时机的精准协同。例如：当擅长潜行的游荡者打出【午夜领域】的核心控制卡**【暗影束缚】**（施加束缚并限制位移），前排战士紧接着切入施展【利刃领域】的**【旋风猛袭】**，即可对失衡聚拢的敌群造成毁灭性的范围连击；而当神使在危急时刻打出【辉耀领域】的**【曳光信标】**驱散隐蔽并赋予队伍优势时，兼修【贤者领域】的德鲁伊则可瞬发**【怨毒缠绕】**进一步压制敌方首领。";
    item[6] = "## 动态战局演进与命运之骰博弈";
    item[7] = "告别固定木桩式的机械技能循环，地牢中的突发环境阻碍与敌军增援将随着“恐惧骰”点数动态触发。每一次攻防转换都需要小队合理规划“希望点”周转，灵活运用手牌中的特权与反应卡，让每一次判定都成为一场充满戏剧张力的战术博弈。";
    console.log(`[#${index+1}] 纠错完成：战术前瞻九大领域卡牌`);
  }

  // 2. 纠错所有历史新闻中的超前地名穿越（深水城、剑湾等）
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    let p = paragraphs[pIdx];
    // 替换深水城 -> 晨曦要塞 / 王都 / 幽域家园
    p = p.replace(/在深水城酒馆自由合奏的夜晚/g, '在王都酒馆自由合奏的夜晚');
    p = p.replace(/深水城港口区“欢笑水手”酒馆/g, '王都港口区“欢笑水手”酒馆');
    p = p.replace(/深水城婚礼纪事/g, '幽域小屋婚礼纪事');
    p = p.replace(/当年深水城外下大雨的那天/g, '当年王都要塞外下大雨的那天');
    p = p.replace(/艾尔托雷尔的夜色中/g, '要塞的夜色中');
    p = p.replace(/深水城港口小酒馆/g, '王都港口小酒馆');
    
    // 替换剑湾 -> 大陆 / 守望之海 / 守望平原
    p = p.replace(/剑湾与幽域/g, '大陆与幽域');
    p = p.replace(/见证了剑湾的兴衰/g, '见证了大陆的变迁');
    p = p.replace(/剑湾平原与低语森林/g, '守望平原与低语森林');
    p = p.replace(/补齐了剑湾种族拼图/g, '补齐了大陆种族拼图');
    p = p.replace(/对剑湾沿岸三处小型定居点/g, '对守望之海沿岸三处小型定居点');
    p = p.replace(/流转于剑湾的古老兵刃/g, '流传于大陆的古老兵刃');
    p = p.replace(/在剑湾书写独一无二的人物传记/g, '在大陆书写独一无二的人物传记');
    p = p.replace(/剑湾名邸/g, '荣耀家园');
    p = p.replace(/在剑湾的安身立命之所/g, '在大陆的安身立命之所');
    p = p.replace(/剑湾前线/g, '守望要塞前线');
    p = p.replace(/推至剑湾前线/g, '推至守望前线');

    paragraphs[pIdx] = p;
  }

  // 标题中的地名纠错
  if (item[2].includes('深水城')) {
    item[2] = item[2].replace(/深水城酒馆/g, '王都酒馆').replace(/深水城婚礼/g, '幽域小屋婚礼');
  }
  if (item[2].includes('剑湾')) {
    item[2] = item[2].replace(/在剑湾书写/g, '在大陆书写');
  }

  item.splice(3, item.length - 3, ...paragraphs);
});

const outContent = `const news = ${JSON.stringify(news, null, 2)};\n`;
fs.writeFileSync('news-archive.js', outContent, 'utf8');
console.log('news-archive.js completely corrected from hallucinations!');

