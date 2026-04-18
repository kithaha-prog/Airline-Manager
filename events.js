// events.js
const GAME_EVENTS = [
    {
        id: "oil_crisis",
        title: "国际原油减产",
        desc: "由于中东产油国宣布大幅减产，航空燃油价格瞬间暴涨！请密切关注您的燃油成本，建议考虑采购更节油的新一代客机。",
        type: "negative",
        weight: 10, // 出现的权重比例
        condition: (state) => state.market.fuelPrice < 1.8, // 只有在油价较低时才会触发
        effect: (state) => {
            state.market.fuelPrice *= 1.4; // 燃油单价暴涨40%
        }
    },
    {
        id: "gov_subsidy",
        title: "航空业复苏补贴",
        desc: "政府为鼓励航空业发展，下发了一笔专项经营补贴！已将 $2,000,000 汇入您的公司账户。",
        type: "positive",
        weight: 5,
        condition: (state) => state.money < 10000000, // 只有资产小于 1000 万时才会拿到救济
        effect: (state) => {
            state.money += 2000000;
            // 如果想让漂浮动画显示，可以取消下面的注释
            // showMoneyFloat(2000000); 
        }
    },
    {
        id: "viral_marketing",
        title: "短视频平台爆红",
        desc: "机组人员在机舱内的一段趣味热舞视频在网上疯传！品牌形象大放异彩，旅客满意度瞬间拉满，连带着现金流也迎来一波猛涨！",
        type: "positive",
        weight: 6,
        condition: (state) => state.fleet.length >= 15, // 稍具规模后才会触发
        effect: (state) => {
            if (typeof state.stats.satisfaction === 'undefined') state.stats.satisfaction = 100;
            state.stats.satisfaction = 100; // 满意度直接回满
            state.money += 1500000;
        }
    },
    {
        id: "bird_strike_season",
        title: "候鸟迁徙季",
        desc: "近期正值候鸟大规模迁徙，多架飞机在起降时遭遇轻微鸟击。为了保障飞行安全，机队的整体机身损耗值有所上升，请注意安排大修。",
        type: "negative",
        weight: 1,
        condition: (state) => state.fleet.length > 0,
        effect: (state) => {
            // 随机给机队中一半的飞机增加 150 小时 (150*3600*1000 ms) 的疲劳值
            state.fleet.forEach(p => {
                if (Math.random() > 0.5) {
                    p.totalFlightMs += 540000000; 
                }
            });
        }
    },
    {
        id: "atc_strike",
        title: "区域空管联合罢工",
        desc: "由于劳资纠纷，某关键枢纽的空管人员突发罢工。正在天上执飞的航班被迫备降或空中盘旋，产生了高额的额外杂项开销！",
        type: "negative",
        weight: 6,
        condition: (state) => state.activeFlights.length > 8, // 只有天上飞机多的时候触发才心痛
        effect: (state) => {
            // 按天上飞机的数量扣钱，天上的飞机越多损失越惨重
            let penalty = state.activeFlights.length * 150000;
            state.money = Math.max(0, state.money - penalty);
            state.dailyFinance.opCost += penalty; // 记入财务报表，让财报大屏有直观反馈
        }
    },
    {
        id: "world_cup_rush",
        title: "全球顶级体育盛事",
        desc: "四年一度的国际顶级赛事拉开帷幕！球迷疯狂包机出行，为您带来了极丰厚的额外利润，但这波高频起降也一次性消耗了您仓库里大量的航油。",
        type: "positive",
        weight: 5,
        condition: (state) => state.fleet.length >= 5 && state.fuel >= 100000,
        effect: (state) => {
            // 收益与机队规模挂钩，规模越大赚越多
            let bonus = state.fleet.length * 250000;
            state.money += bonus;
            state.dailyFinance.revenue += bonus; // 记入额外收入
            // 扣除 8 万升燃油作为包机代价
            state.fuel = Math.max(0, state.fuel - 80000);
        }
    },
    {
        id: "hub_expansion_grant",
        title: "枢纽机场扩建激励",
        desc: "为了吸引航司入驻，国际机场联盟颁布了基建激励政策。您获得了专项基建补贴，同时航油和碳排的存储上限也得到了免费的物理扩容！",
        type: "positive",
        weight: 4,
        condition: (state) => state.ownedHubs.length > 0,
        effect: (state) => {
            state.money += 2000000;
            state.fuelMax += 500000;  // 免费扩容油库
            state.co2Max += 2000000;   // 免费扩容碳库
        }
    },
    {
        id: "maintenance_breakthrough",
        title: "航发维保技术突破",
        desc: "您的工程团队优化了发动机清洗与检测流程！所有空闲待命的客机都得到了一次免费的深度保养，机体健康度大幅恢复。",
        type: "positive",
        weight: 5,
        condition: (state) => state.fleet.some(p => p.status === 'idle'),
        effect: (state) => {
            // 给所有在地面趴窝的飞机减少 300 小时 (300*3600*1000 ms) 的疲劳值
            state.fleet.forEach(p => {
                if (p.status === 'idle') {
                    p.totalFlightMs = Math.max(0, p.totalFlightMs - 1080000000);
                }
            });
        }
    },
    {
        id: "carbon_tax_drop",
        title: "碳排放政策放宽",
        desc: "全球环保峰会达成新协议，放宽了航空业的碳排放限制。国际碳交易市场价格出现大幅跳水！",
        type: "positive",
        weight: 8,
        condition: (state) => true, // 没有任何条件，随时可能触发
        effect: (state) => {
            state.market.co2Price *= 0.6; // 碳价暴跌40%
        }
    },
    {
        id: "tourism_boom",
        title: "国际旅游博览会大捷",
        desc: "您的航司在日内瓦国际旅游展上大放异彩!",
        type: "positive",
        weight: 6,
        condition: (state) => state.routes && state.routes.length > 0,
        effect: (state) => {
            let bonus = state.routes.length * 300000;
            state.money += bonus;
            if (typeof state.stats.satisfaction !== 'undefined') {
                state.stats.satisfaction = 100;
            }
        }
    },
];