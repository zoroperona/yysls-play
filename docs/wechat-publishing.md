# 微信接入参考

当前仅提供通用音频和触控模块，不是可直接导入的微信工程；没有 appid、密钥、预览/上传脚本，也不声称通过微信构建或真机验收。

在 vx 分支建立小游戏工程，compileType 使用 game；源码放 minigame，产物 _minigame。复用相同 Boss 规则，通过会话与 Canvas 渲染适配，不能再复制独立机制。小游戏直接导入 _minigame，不把备用小程序产物当成游戏入口。

图片和 M4A 随包，音乐按项目分包；通过音频适配器的 source/resolveSource 注入本地路径，不依赖外部域名。预算：主包 2 MiB、每分包 4 MiB、总包 20 MiB。真实 AppID 由本地配置生成，密钥只从 WECHAT_PRIVATE_KEY_PATH 读取，不能输出内容或进入前端产物。

自行完成构建器后增加 check:minigame、check:weapp，并在共享修改时连同 npm test、build:pages 一并执行。模板未提供这些命令，不能把文档当成构建已实现。

构建删除并重建产物前关闭开发者工具项目。若同时出现 worker thread exit 和 game.js 未定义，先视为主包编译中断：退出工具→重建→直接打开 _minigame→编译；仍失败再清一次缓存重开。日志 task type:upload 则分开排查上传线程。
