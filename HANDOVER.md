# 《匕首世界》站点与角色库开发交接文档 (Codex 接手指南)

> **更新时间**：2026-11-19 22:40  
> **交接方**：Antigravity Agent  
> **接收方**：Codex Agent / 主持人基德  
> **代码仓库**：`https://github.com/jeffdyuyi/daggerworld-site.git` (`main` 分支)  
> **当前最新 Commit**：`baff772` (`feat: 升级独立主持人资源工坊页面(Layer 3)，支持自定领域与全队装备卡牌即时发放`)

---

## 1. 核心架构与页面层级 (Three-Tier Layer System)

站点目前采用无构建依赖、轻量现代的 ESM 原生架构，运行于静态托管环境（GitHub Pages），并具备 0ms 本地秒开自愈与云端同步双轨机制。整个应用划分为清晰的三层视图：

```mermaid
flowchart TD
    subgraph L1 ["第一层：角色库大厅 (Layer 1: #vault)"]
        L1_A["化身卡片画廊展示"]
        L1_B["快速创角表单<br>(名字/性别[男/女/无]/种族/职业)"]
    end

    subgraph L2 ["第二层：化身工作台 (Layer 2: #sheet)"]
        L2_A["属性点与特性微调"]
        L2_B["生命/压力/护甲/希望点步进器"]
        L2_C["随身背包 (Kenney 图标)"]
        L2_D["随身卡与秘藏卡 (上限 5 张)"]
    end

    subgraph L3 ["第三层：主持人独立工坊 (Layer 3: #workshop)"]
        L3_A["战役储备军械库 (检索与分类过滤)"]
        L3_B["装备/战利品/消耗品创制与编辑回显"]
        L3_C["领域法术卡创制与编辑回显"]
        L3_D["自定义领域注册 (名称/色彩/风味理念)"]
        L3_E["全队受赐化身选择器与一键发放"]
        L3_F["PbDH 规范卡包导入/导出"]
    end

    L1 <-->|"点击化身卡 / ‹ 角色库大厅"| L2
    L2 <-->|"🛠️ 资源工坊 / ‹ 返回角色卡"| L3
    L1 <-->|"🛠️ 资源工坊 / ‹ 角色库大厅"| L3
```

### 层级控制器实现 (`editor/app.js`):
* `switchLayer(layer, targetIndex)`:
  * `'vault'`：展示 `#layer-vault`，隐藏其它层，URL 写入 `#vault`。
  * `'sheet'`：展示 `#layer-sheet`，隐藏其它层，URL 写入 `#sheet`，触发 `renderAll()`。
  * `'workshop'`：展示 `#layer-workshop`，隐藏其它层，URL 写入 `#workshop`，触发 `initWorkshopLayer()`。
* 状态栏左上角返回按钮 `#btn-back-vault` 具备上下文感知：
  * 在 Layer 2 显示 `‹ 角色库大厅`；
  * 在 Layer 3 显示 `‹ 返回角色卡`（若无角色则回大厅）。
* 支持浏览器前进/后退（`hashchange` 路由监听）。

---

## 2. 核心数据模型与存储规范

### 2.1 角色数据 (`daggerworld.characters.v1`)
```json
{
  "id": "char_1732000000000",
  "avatar_name": "格温",
  "gender": "女", // 男 / 女 / 无
  "sheet": {
    "ancestryId": "人类",
    "communityId": "街头巷尾",
    "classId": "战士",
    "subclassId": "剑刃大师",
    "level": 1,
    "inventoryItems": [
      {
        "name": "精制治疗药水",
        "desc": "**【消耗品 · 药剂】** 恢复 1d8 生命",
        "qty": 2,
        "icon": "🧪",
        "type": "消耗品",
        "subcat": "药剂",
        "tier": 1
      }
    ],
    "equippedDomainCards": [], // 随身装备 (最多5张)
    "customDomainCards": []    // 领域秘藏 (包含战役发放的原创卡)
  }
}
```

### 2.2 战役原创资源与自定领域 (`daggerworld.campaign_resources.v1`)
```json
{
  "name": "深水城2026战役扩展包",
  "version": "1.0.0",
  "author": "主持人基德",
  "description": "深水城战役原创装备、战利品、领域法术卡与自定领域",
  "items": [],
  "domainCards": [],
  "customDomains": [
    {
      "id": "cd_1732000000000",
      "name": "虚空",
      "color": "#8b5cf6",
      "desc": "支配深渊与重力法则，擅长操纵空间与腐化敌人"
    }
  ]
}
```

### 2.3 自定义领域引擎
* **色彩映射表**：`let domainColors = { ... }` 包含官方 11 领域（利刃、骸骨、典籍、优雅、午夜、贤者、辉耀、勇气、奥术、恐怖、秘密）。
* **动态解析器**：`getDomainColor(domainName)` 优先查官方表，未命中则查 `campaignResources.customDomains`，确保卡牌、标签药丸与过滤器背景色 100% 动态对应。
* **卡包导出兼容**：`exportPbDHPack()` 会将自定义领域名称注入 `customFieldDefinitions.domains`，并携带完整的 `customDomains` 元数据；`importPbDHPack()` 支持双向无缝还原。

---

## 3. 重要代码规范与铁律（接手必读）

1. **现有 SRD 规则数据基底只读不可篡改**：
   * `editor/data/database.json` 为官方与本团基础规则数据，绝不可随意覆盖破坏。
2. **严禁代理端启动浏览器验证**：
   * 切勿调用浏览器子代理或外部 curl 探针，主持人基德会在外部真机/线上环境核验。
3. **中文用语杜绝浮夸**：
   * 界面文字严格保持凝练、干练的西幻跑团风格（如“工坊”、“角色库”、“背包”），杜绝冗长堆砌修饰词。
4. **编辑模式原位覆盖（防重复）**：
   * 点击条目 `[ ✏️ 编辑 ]` 时必须带入 `editingId`，保存时覆盖原条目，不可自增重复条目。

---

## 4. 后续建议推进方向 (TODO for Codex)

- [x] **纸娃娃**：
  * 装备页合成 Kenney 的像素角色分层贴图，随穿脱更新，支持肤色、头发、胡须与 256×256 PNG 指示物导出。
  * 背包可搜索并收录原资源库中的战利品与消耗品。贴图分类单独维护在 `editor/paperdoll.js`，图片和许可见 `editor/assets/paperdoll/`。
- [ ] **主持人权限与玩家端视图分立**：
  * 玩家选择名字/性别/种族/职业后不可随意更改，仅主持人拥有限权快速调整（模拟 GM 后台及玩家使用改名/变性道具等场景）。
  * 评估国内低成本/无服务器访问体验，进一步优化静态化或极简边缘存储。
- [ ] **战利品与消耗品规则联动**：
  * 增加物品在使用时（点击背包物品使用按钮）的快捷骰子检定或状态点自动扣减/恢复联动。
- [x] **上一次双元骰检定**：
  * 角色属性区只显示上一次检定。记录按账号和化身保存在当前浏览器，旧列表在读取时只保留首条。
  * 已按《匕首之心》修正计分：两颗骰相加再加修正。普通结果提供希望或恐惧倾向，由主持人和难度判定成败；行动检定的关键成功清除 1 点压力。工具记录结果，状态由玩家按实际检定更新。
  * 页面视觉留真人验收。

## 2026-11-20 新闻与遗忘国度

- 新闻正文维护在 `news-archive.js`，首页负责筛选与分页。原有数字链接保留。Pages 工作流已将新增脚本加入发布清单。
- 参考暴雪的报道形式。首发参考[新手入门](https://worldofwarcraft.blizzard.com/en-us/news/24266319)，幽域参考[地底探索更新说明](https://worldofwarcraft.blizzard.com/en-us/news/24130678)和[住房专题](https://worldofwarcraft.blizzard.com/en-us/news/24244464)，战旗参考[争霸艾泽拉斯版本公告](https://worldofwarcraft.blizzard.com/en-us/news/21959894)，苍穹参考[军团再临职业预览](https://worldofwarcraft.blizzard.com/en-us/news/19941175)，运营措辞参考[第三方软件政策公告](https://worldofwarcraft.blizzard.com/en-us/news/23558957)。
- 新增媒体名、奖项名称、运营事件与玩家来稿均为伪官网创作。五个版本的发行事实以《重返匕首世界》PDF 文件页 4 为准，月光王子的纪念地见文件页 8。原件第 6 页的部分种族异写沿用站点既有译名。
- 国度地理手册及作品索引参见 [D&D Beyond 遗忘国度导览](https://www.dndbeyond.com/resources/2037-the-forgotten-realms)。本批在本地主页落盘。

## 2026-11-20 角色规则与云端存档

- 数值入口为 editor/stats.js。基础与升级、已装备物品和容量内的背包奇物先合计，再读取 sheet.adjustments 的有符号补正。旧版三个补正字段作为兼容回退。属性检定与武器伤害使用同一份最终值。
- 原库武器、护甲、战利品通过工坊图鉴发放。装备穿戴以持有实例为准，已穿戴的物品不占背包格。旧档的未核实散件保留在原位，显示待核提示。构建脚本的参数为 PbDH 核心包 resources 的实际目录。
- 角色本地缓存按账号分开。旧缓存仅自动认领有相同 owner_id 的记录。无归属的旧草稿留在原键 daggerworld.vault.v1，不向登录账号显示。
- 玩家笔记使用 sheet.journal。主持人私记使用单独的 character_gm_notes 表并由行级权限保护。旧 notes 内容已复制保留，客户端已无权读取旧列。工坊发放使用角色版本校验，云端确认后才提示成功。
- 纸娃娃使用 Universal LPC 正面切片，物品栏使用 Kenney 图标。editor/resource-art.js 用资源 ID 对应外观，具体造型缺失时保留空图层。
