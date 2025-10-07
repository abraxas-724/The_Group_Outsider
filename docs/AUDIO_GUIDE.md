# 音频系统使用指南

本项目已引入 `AudioManager` 统一管理 UI / 事件 / 探索 / 成就 / 小游戏等音效与未来 BGM。

## 目录结构
```
assets/
  audio/
    ui_click.mp3
    ui_confirm.mp3
    ui_cancel.mp3
    save.mp3
    load.mp3
    achievement.mp3
    explore_enter.mp3
    explore_exit.mp3
    hotspot.mp3
    minigame_start.mp3
    minigame_complete.mp3
    error.mp3
    bgm_main.mp3
    amb_loop.mp3
```
(实际文件需自行放入 `assets/audio/` 目录。)

## 核心文件
- `js/engine/AudioManager.js` 负责：
  - 懒加载与缓存 `HTMLAudioElement`
  - 主音量 / 环境音量 调节 (`setVolumes({ master, amb })`)
  - 播放短音效：`audio.play('ui_click')`
  - 播放循环（BGM / 环境）：`audio.playLoop('bgm_main')`
  - 停止：`audio.stop(key)` / `audio.stopAllLoops()`
  - 自动等待首次用户交互 (点击 / 按键) 解锁播放权限（浏览器自动播放策略）

## 默认映射 Key 一览
| Key | 文件 | 用途 |
|-----|------|------|
| ui_click | ui_click.mp3 | 一般按钮点击 |
| ui_hover | ui_hover.mp3 | 悬停（可选） |
| ui_confirm | ui_confirm.mp3 | 重要确认（Enter） |
| ui_cancel | ui_cancel.mp3 | 取消 / ESC |
| save | save.mp3 | 保存/快速保存 |
| load | load.mp3 | 读取/快速读取 |
| achievement | achievement.mp3 | 成就 / 通知提示 |
| explore_enter | explore_enter.mp3 | 进入探索模式 |
| explore_exit | explore_exit.mp3 | 退出探索模式 |
| hotspot | hotspot.mp3 | 点击热点交互 |
| minigame_start | minigame_start.mp3 | 小游戏开始 |
| minigame_complete | minigame_complete.mp3 | 小游戏完成 |
| error | error.mp3 | 错误反馈/禁止操作 |
| text_tick | text_tick.mp3 | 对话逐字打印时的轻微打字机音（节流） |
| dialogue_advance | dialogue_advance.mp3 | 推进到下一句/下一节点时的提示音 |
| bgm_main | bgm_main.mp3 | 主背景音乐（循环） |
| amb_loop | amb_loop.mp3 | 环境氛围（循环） |

## 在 HTML / DOM 中使用自定义音效
给任意元素添加 `data-sfx="hotspot"` 即可指定点击时播放的 key。
```
<button class="sl-btn" data-sfx="ui_confirm">开始游戏</button>
<div class="hotspot" data-sfx="hotspot"></div>
```
若想禁用某个元素的默认点击音效：
```
<button data-sfx="none">静音按钮</button>
```

### 悬停音效 (Hover)
已为主游戏、开始菜单、登录/注册页面统一绑定 `mouseover` 事件：

1. 默认：鼠标第一次移入匹配元素(`button, .sl-btn, .hotspot, [data-sfx]`) 会播放 `ui_hover`。
2. 自定义：可在元素上添加 `data-sfx-hover="xxx"` 指定其他音效 key。
3. 禁用：设置 `data-sfx-hover="none"`。

示例：
```
<button class="sl-btn" data-sfx="ui_confirm" data-sfx-hover="ui_hover">开始</button>
<button class="sl-btn" data-sfx-hover="none">无悬停声</button>
```
若需要不同按钮用不同悬停音，先把文件放入 `assets/audio/`，再在游戏初始化后：
```
app.audio.addMapping('hover_menu', 'hover_menu.mp3');
```
然后在 HTML：
```
<button data-sfx-hover="hover_menu">菜单项</button>
```

## 在脚本中播放
```
// 播放一次
app.audio.play('ui_click');
// 播放循环（如 BGM）
app.audio.playLoop('bgm_main');
// 停止某个循环
app.audio.stop('bgm_main');
// 设置音量（main.js 已在设置面板里自动调用）
app.audio.setVolumes({ master: 0.75, amb: 0.5 });
```

## 扩展新的音效 key
1. 将文件放到 `assets/audio/`，例如 `dialog_open.mp3`。
2. 初始化后动态添加：
```
app.audio.addMapping('dialog_open', 'dialog_open.mp3');
app.audio.play('dialog_open');
```
或直接修改 `AudioManager` 构造映射。

## 体积与性能建议
- UI SFX 时长尽量 < 250ms，采用 MP3 或 OGG（优先小文件）
- 对于频繁播放的音效，可提前调用一次 `audio.play('key', { allowBeforeUnlock:true })` 让浏览器缓存（或直接静音预加载）
- 若后续引入 Web Audio API 混音，可在 `_tryResumeContext` 内接入 AudioContext

## 常见问题
1. 点击没声？
   - 确认已经发生过一次用户交互（点击/按键）
   - 检查浏览器控制台是否有加载 404
   - 确认系统音量、标签页未被静音
2. 修改了音频文件但旧声音仍播放？
   - 浏览器可能缓存，可改文件名或加版本参数，如 `ui_click.mp3?v=2`
3. 想要不同页面不同 BGM？
   - 在页面初始化：`app.audio.playLoop('bgm_main');`，跳转前 `app.audio.stop('bgm_main');` 或直接切换新的 loop key。

4. 打字机音效为什么不是每个字都响？
   - 为避免高文本速度导致“机枪”噪声，`DialogueEngine` 中采用：
      - 至少每隔 2 个字符尝试一次
      - 且与上次发声间隔 >= 45ms 才真正播放
   - 可在 `DialogueEngine.js` 搜索 `MIN_TICK_GAP` / `CHAR_STEP` 调整。

5. 想禁用当前一句的打字机音效？
   - 目前未提供逐句开关，可在 `_typewriter` 内部加条件（例如检测角色或节点标签）后 `return` 拦截 `play('text_tick')` 调用。

## 后续可选增强
- 引入 Web Audio API 混响 / 滤波
- 实现音量淡入淡出 (fade)
- 多通道分类：BGM / SFX / VOICE 分开滑杆
- 语音旁白支持 (voice_xxx)

如需更多帮助，可继续提问。

## 打字机音效随机化（变体）
为减少重复感，`DialogueEngine` 在播放 `text_tick` 时会尝试调用 `audio.playVariant('text_tick', 4)`：

放置文件（任意存在的变体都会被加入候选池）：
```
text_tick_1.mp3
text_tick_2.mp3
text_tick_3.mp3
text_tick_4.mp3
```
无需显式 `addMapping`（如果文件名与 key 不同再映射）。若部分缺失，如只有 1/3/4，也会只在这些里随机。

最大变体数量通过第二个参数指定（当前硬编码为 4，可在 `DialogueEngine.js` 搜索 `playVariant('text_tick', 4` 修改）。当未检测到任何变体 key 时会回退到基础 `text_tick`。

要增加变体数量：
1. 添加更多文件：`text_tick_5.mp3` 等。
2. 在 `DialogueEngine.js` 的调用处把数字改为新的最大序号。

若想为其它音效使用随机：
```
app.audio.playVariant('ui_click', 3);
// 需要文件: ui_click_1.mp3, ui_click_2.mp3, ui_click_3.mp3
```
