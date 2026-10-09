# Boss 目录模板

复制本目录到自定义目录，同时复制制作单和时间轴 Markdown。此目录没有任何具体机制，空时间轴和引擎占位会主动报错，不会伪装成可玩的 Boss。

| 文件 | 用途 |
| --- | --- |
| config.js | 名称、人数、单位、前导与待定参数 |
| timeline.js | 每轮唯一 ID、阶段、时间、血量、证据、练习前置及清理；含基本校验 |
| engine.js | 接入占位；需要自行实现机制与生命周期 |
| render.js | 只消费状态，不能复制判定规则 |
| hints.js | PC/触控语义动作参考 |

建议接口（目标契约，尚未提供通用实现）：`getViewModel()`、`handleAction(action)`、`preparePractice(eventId)`，每个机制 `enter/update/resolve/exit(reason)`。会话层处理暂停、清输入和导航；机制层处理规则、AI、前置、判胜/失败。不要从旧 Boss 复制规则后改名。

页面接线参考仓库根目录 index.html 与 demo.js。它只演示五人/十人阵容切换，不是完整游戏壳。需要按 [UI 规范](../../docs/ui/README.md) 新建完整入口、HUD、暂停、日志与结果，再将目录加入 scripts/build-pages.js 的允许清单。

虚构事件格式见 [时间轴模板](../../docs/templates/boss-timeline.md)。完成规则后补成功/失败/边界与连续链测试，记录实际输入验收。
