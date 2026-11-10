# 模块参考与迁移边界

通用代码取自当前开发版本，保留原有 API；公开版只将名单、反馈联系信息和目录注册脱敏。没有复制具体 Boss 引擎、数据、素材和强耦合平台会话/渲染器。独立的会话与绘制原语可复用。

| 模块 | 已有能力 / 接入注意 |
| --- | --- |
| shared/roster.js | createRoster(team, selfRevives, {size})，5/10 人、稳定格位；中性显示名，id 唯一 |
| shared/party-frame.js | mountParty(container, party)，返回状态刷新函数，配合 boss-ui.css |
| shared/touch-controls.js | bindTouchControls；浮动摇杆、多指、输入清理，具体回调参数见源码 |
| shared/fullscreen.js | 全屏能力和移动浏览器辅助；按用户操作触发 |
| shared/assets.js | AssetLoader、图片解码重试、fetchAudio；成功资源缓存 |
| shared/loading.js + loading.css | 资源进度、入场等待、失败重试，需 button/bgm/victoryImage |
| shared/bgm.js | BossBgm，单/双曲、媒体时钟、音量、淡入淡出；素材自行授权配置 |
| shared/home-music.js | HomeMusic，播放列表及浏览器音频适配；目录来自中性 catalog |
| shared/pause-menu.js + pause-menu.css | 暂停 DOM 外壳；宿主绑定 resume/reset/showLog 等 ID 与状态迁移 |
| shared/attack-effects.js | 玩家短弹道表现 |
| shared/telegraphs.js | 圈与长条预警绘制；判定仍由引擎提供 |
| shared/canvas-image.js、target-marker.js | 通用图片裁切与目标标记 |
| miniprogram/lib/audio.js、home-music.js | 微信原生音频适配，调用方注入本地分包资源路径 |
| miniprogram/lib/touch.js | TouchInput，宿主提供 active、input、clear() |
| miniprogram/lib/catalog.js | 虚构 template 条目；无音频文件，真实项目自行登记 |

模块调用签名与生命周期以源码为准。根目录 demo.js 提供最小阵容接线；tests 中的音频、资源和触控 stub 展示边界行为。

当前未提取成通用引擎的能力：Boss 机制调度、AI、阶段判胜、微信 Canvas 战斗渲染。血量节点、救援排程、会话时钟及结果呈现已提供下列独立原语。templates/boss 中的是待实现契约，不是可直接上线的规则引擎。原平台脚本依赖具体 Boss 列表与资源，未以“通用脚本”名义复制。

## 2026-11-09 新增通用原语

| 模块 | 接入契约 |
| --- | --- |
| battle-session.js | createBattleClock、bindBattleVisibility：固定步长、暂停/控制丢失清输入、后台生命周期；解绑函数需在销毁时执行 |
| timeline-navigation.js | adjacentEvent 按轮次定位；onceAt 防重入；createPracticeController 调用宿主跳转/重试策略 |
| battle-presentation.js | 血量、提示、结果和日志纯视图；判胜状态来自调用方 |
| battle-dom.js | 日志、章节、提示 DOM 与 createResultFlow；重开调用 reset 使旧动画失效 |
| action-dispatch.js | createActions：语义别名、最新可用状态、拒绝原因；引擎仍负责最终校验 |
| combat-actions.js | 卸势/闪避激活与卸势表现；不包含专属机制 |
| life.js | heal 有界且不复活；updateRescue 由回调提供资格、扣费与恢复，显式选择排程顺序 |
| health-node.js | applyHealthNode 先验证全部血条再写入；force/preserve、scale/minimum/round/allowZero 明确配置 |
| geometry.js | distance、segmentDistance、pickTarget；坐标单位一致，严格半径、稳定同距、可选首个匹配 |
| actor-render.js | drawPartyPortrait、drawActorHealth；头像输入采用三格图集格式（源 x=6/119/238，y=8，110×112），不附素材；调用方控制世界尺寸和抬升 |
| party-frame.js | 支持按队分列，状态/层数仍由调用方提供 |

[可运行虚构接线示例](../examples/common-session.js) 只演示动作、节点与救援，不是完整游戏。通用边界、扩展与验证见 [本轮总结](common-features-summary.md)。

## 网页手机共用布局

页面在自己的样式后加载 `shared/mobile-battle.css`；使用 `.raid`、`.boss-panel`、`.toolbar`、`.notice` 这些共用区域。`portraitArena({width,height,noticeTop,diameterUnits})` 返回 x/y/scale，调用方映射到自己的视图字段。竖屏可开始/继续，转屏清输入；专属多动作网格加 `extended-actions` 避免被基础三键覆盖。需按实际浏览器可用高度验证，而非整块物理屏幕高度。
