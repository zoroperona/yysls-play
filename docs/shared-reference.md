# 模块参考与迁移边界

通用代码取自当前开发版本，保留原有 API；公开版只将名单、反馈联系信息和目录注册脱敏。没有复制具体 Boss 引擎、数据、素材和强耦合会话/渲染器。

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

当前未提取成通用引擎的能力：Boss 调度、血量节点、团队救援、AI、会话/结果状态机、微信 Canvas 战斗渲染。templates/boss 中的是待实现契约，不是可直接上线的规则引擎。原平台脚本依赖具体 Boss 列表与资源，未以“通用脚本”名义复制。
