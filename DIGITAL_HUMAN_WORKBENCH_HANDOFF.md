# 数字人工作台对接说明

这份文档面向实训系统研发同学，说明当前 Twick 二开版数字人工作台已经如何实现、你们需要如何接入、以及联调时需要注意什么。

对应实现代码主要在：

- `packages/examples/src/pages/digital-human-workbench.tsx`
- `packages/examples/src/workbench/protocol.ts`
- `packages/studio/src/helpers/workbench.ts`
- `packages/studio/src/context/digital-human-context.tsx`

## 1. 当前工作台入口

工作台页面路由：

```txt
/workbench/digital-human
```

如果你们要在实训系统里通过 `iframe` 接入，`DIGITAL_HUMAN_WORKBENCH_URL` 建议指向：

```txt
https://<你的工作台域名>/workbench/digital-human?userToken=<当前学生的userToken>
```

说明：

- 工作台当前通过 URL query 里的 `userToken` 获取 Aether 文件上传权限。
- 支持的 query key 有：
  - `userToken`
  - `user_token`
  - `ut`
- 如果没有 `userToken`，工作台仍能打开，但无法完成成片和草稿上传，也无法成功保存版本。

## 2. 我们现在是怎么实现的

### 2.1 嵌入模式与独立模式

同一个工作台页面同时支持两种模式：

- `embed` 模式
  - 有 `document.referrer`
  - 会自动解析父页面 origin
  - 会启用 `postMessage` 协议
- `standalone` 模式
  - 没有父页面 origin
  - 不启用协议桥接
  - 可以作为独立工作台本地调试

### 2.2 协议实现范围

当前已实现以下消息：

- 父页面 -> 工作台
  - `digitalHumanWorkbench.init`
- 工作台 -> 父页面
  - `digitalHumanWorkbench.ready`
  - `digitalHumanWorkbench.save`
  - `digitalHumanWorkbench.error`
  - `digitalHumanWorkbench.close`

工作台行为：

1. 页面加载后主动发送一次 `ready`
2. 只接受来自 `document.referrer` 对应 origin 的 `init`
3. `studio` 模式：
   - 不依赖历史草稿
   - 会从空白项目启动
4. `iterate` 模式：
   - 强依赖 `existingConfig.projectDraftUrl`
   - 会直接拉取该草稿 JSON 并恢复项目
   - 缺失或加载失败时会发送 `error`

### 2.3 保存版本的真实语义

当前“保存版本”按钮不是简单存一个配置，而是做了两件事：

1. 导出当前 Twick 项目成片，上传后得到稳定 `videoUrl`
2. 将当前 `ProjectJSON` 序列化为 `.json` 草稿文件上传，得到稳定 `projectDraftUrl`

然后工作台向父页面发送：

- `resultId`
- `phase`
- `videoUrl`
- `projectDraftUrl`
- 可选 `avatarId`
- 可选 `backgroundId`
- 可选 `scriptSnapshot`
- `returnedAt`

当前规则：

- `phase`
  - `studio` -> `initial`
  - `iterate` -> `iteration`
- `resultId`
  - 当前每次手动保存都会生成一个新的版本 ID
  - 没有做“覆盖同一版本”的交互

### 2.4 草稿恢复能力

当前恢复链路已经打通：

- 首版保存后，工作台会回传 `projectDraftUrl`
- 下次打开 `iterate` 时，只要父页面把这个 URL 原样传回来，工作台就会恢复到对应项目
- 工作台内部会把数字人相关状态写入 `project.metadata.custom.workbench`，用于恢复：
  - `stepId`
  - `baselineResultId`
  - `sourceProjectDraftUrl`
  - `avatarId`
  - `backgroundId`
  - `selectedFigureType`
  - `selectedVoiceId`
  - `speechLanguage`
  - `quality`
  - `speed`
  - `showSubtitles`
  - `backgroundColor`
  - `scriptSnapshot`

### 2.5 数字人和背景行为

#### 数字人

当前实现已经按业务要求调整为：

- 数字人生成完成后，只加入视频素材库
- 不会自动插入时间轴
- 学生需要自己决定是否加入时间轴，以及放在哪个位置

#### 背景

V1 背景没有做独立背景库，而是复用现有素材面板：

- 图片素材支持“设为背景”
- 视频素材支持“设为背景”

点击“设为背景”时，才会显式修改时间轴背景层。

## 3. 你们需要怎么跟我们对接

### 3.1 iframe URL

你们需要在实训系统里把 `DIGITAL_HUMAN_WORKBENCH_URL` 指到：

```txt
<workbench-base-url>/workbench/digital-human?userToken=<userToken>
```

当前这个 `userToken` 是必须的，因为工作台保存版本时要直接调用 Aether 第三方文件上传接口。

### 3.2 消息时序

请严格按这个顺序联调：

1. 父页面渲染 iframe
2. 等待工作台发送 `digitalHumanWorkbench.ready`
3. 收到 `ready` 后，再发送 `digitalHumanWorkbench.init`
4. 学生在工作台点击“保存版本”
5. 收到 `digitalHumanWorkbench.save`
6. 父页面把当前版本写入自己的版本时间线

### 3.3 `init` 必须满足的要求

首版：

- `stepId = "studio"`
- 不需要 `existingConfig.projectDraftUrl`

迭代：

- `stepId = "iterate"`
- 必须带：
  - `existingConfig.resultId`
  - `existingConfig.videoUrl`
  - `existingConfig.projectDraftUrl`
- `projectDraftUrl` 必须是工作台上一次回传的稳定草稿地址

如果你们在 `iterate` 里不传 `projectDraftUrl`，工作台会报错并阻止继续。

### 3.4 `save` 字段的使用建议

你们收到 `digitalHumanWorkbench.save` 后，请至少持久化：

- `resultId`
- `phase`
- `videoUrl`
- `projectDraftUrl`
- `returnedAt`

建议同时持久化：

- `avatarId`
- `backgroundId`
- `scriptSnapshot`

原因：

- `videoUrl` 用于版本预览和最终终稿提交
- `projectDraftUrl` 用于下一轮继续恢复编辑
- `avatarId/backgroundId` 便于摘要展示和版本回显
- `scriptSnapshot` 便于训练复盘

## 4. 当前协议细节

### 4.1 父页面 -> 工作台

消息类型：

```ts
digitalHumanWorkbench.init
```

当前工作台接受的结构与最新协议文档一致：

- `trainingKey`
- `sessionId`
- `attemptId`
- `stepId`
- `taskType`
- `productContext`
- `scriptContext`
- `existingConfig`

特别说明：

- `productContext.resources` 已经在协议里保留
- 当前工作台还没有把 `resources` 做成特殊专用 UI，它仍然主要通过现有素材面板工作

### 4.2 工作台 -> 父页面

#### `ready`

工作台加载完成就会发：

```ts
{ type: "digitalHumanWorkbench.ready" }
```

#### `save`

当前回传格式：

```ts
{
  type: "digitalHumanWorkbench.save",
  payload: {
    resultId: string;
    phase: "initial" | "iteration";
    videoUrl: string;
    projectDraftUrl: string;
    avatarId?: string;
    backgroundId?: string;
    scriptSnapshot?: string;
    returnedAt?: string;
  }
}
```

说明：

- `videoUrl` 和 `projectDraftUrl` 已经是上传后的稳定地址
- 当前没有强制回传 `thumbnailUrl`
- 当前没有强制回传 `roughCutChecklist`

#### `error`

当出现以下场景时，工作台会发 `error`：

- `iterate` 缺少草稿 URL
- 草稿下载失败
- 视频导出失败
- 成片上传失败
- 草稿上传失败

格式：

```ts
{
  type: "digitalHumanWorkbench.error",
  payload: {
    message: string;
  }
}
```

#### `close`

点击工作台顶部“关闭工作台”会发送：

```ts
{ type: "digitalHumanWorkbench.close" }
```

当前没有父页面 -> 工作台的 `close` 或 `save` 指令，保存和关闭由工作台页面内部按钮触发。

## 5. 依赖你们配合确认的环境项

### 5.1 文件上传

我们当前保存版本依赖 Aether 第三方文件接口，要求：

- `POST /api/third-party/file/upload`
- 支持上传：
  - `video/mp4`
  - `application/json`
- 返回长期稳定 URL

也就是说，除了视频成片，你们侧需要确认 JSON 草稿上传也是被允许的。

### 5.2 蝉镜代理

工作台数字人能力当前依赖：

- `/api/third-party/chanjing/open/v1/list_common_dp`
- `/api/third-party/chanjing/open/v1/list_common_audio`
- `/api/third-party/chanjing/open/v1/create_video`
- `/api/third-party/chanjing/open/v1/video`

如果不是同域代理，请在工作台部署环境里配置：

```txt
VITE_CHANJING_PROXY_BASE_URL=https://<你的网关>/api/third-party/chanjing
```

## 6. 当前已知边界

这版工作台已经满足主链路联调，但有几个边界你们需要知道：

- 数字人生成结果不会自动进时间轴，只会进素材库
- 背景能力 V1 走现有图片/视频素材面板，不是独立背景库
- `thumbnailUrl` 暂未回传
- `roughCutChecklist` 暂未回传
- 当前每次“保存版本”都会生成一个新的 `resultId`
- 当前没有父页面主动触发“保存版本”的协议，只支持工作台内部按钮保存

## 7. 建议你们的联调检查清单

请按下面顺序检查：

1. iframe 能正常打开 `/workbench/digital-human`
2. 工作台能成功发出 `ready`
3. 父页面在收到 `ready` 后再发送 `init`
4. `studio` 场景能成功保存并拿到：
   - `videoUrl`
   - `projectDraftUrl`
5. 把这两个字段写进你们的版本时间线
6. `iterate` 场景把上一个版本的 `projectDraftUrl` 传回去
7. 工作台能成功恢复草稿继续编辑
8. 第二次保存后能产生新的版本节点
9. 错误场景能收到 `digitalHumanWorkbench.error`
10. 点击“关闭工作台”能收到 `digitalHumanWorkbench.close`

## 8. 如果你们要给我们的最小保证

为了让这套链路稳定工作，你们只需要保证以下几点：

1. `DIGITAL_HUMAN_WORKBENCH_URL` 指向 `/workbench/digital-human`
2. URL 带上当前学生的 `userToken`
3. `ready` 之后再发 `init`
4. `iterate` 时务必传 `existingConfig.projectDraftUrl`
5. 收到 `save` 后务必持久化 `projectDraftUrl`
6. 后续继续编辑时，把这个 `projectDraftUrl` 原样传回来

做到这 6 点，工作台的“多轮版本迭代 + 草稿恢复”链路就能跑通。
