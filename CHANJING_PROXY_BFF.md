# 蝉镜后端代理接口文档

## 目标

为 Twick Studio 的“数字人”能力提供一个同源后端代理。

前端不再做这两件事：

- 不再直接请求 `https://www.chanjing.cc/api`
- 不再自己获取、保存、传递蝉镜 `access_token`

后端负责：

- 持有蝉镜 `app_id` / `secret_key`
- 向蝉镜换取 `access_token`
- 缓存 `access_token`
- 代理转发 Twick 前端发起的蝉镜开放平台请求

这样做的好处：

- 避免浏览器 CORS 问题
- 避免在前端暴露蝉镜凭证
- 便于后端统一做日志、限流、鉴权和异常兜底

---

## 前端当前约定

前端现在默认请求同源前缀：

```txt
/api/third-party/chanjing
```

也就是说，前端会请求下面这些地址：

- `GET /api/third-party/chanjing/open/v1/list_common_dp?page=1&size=24`
- `GET /api/third-party/chanjing/open/v1/list_common_audio?page=1&size=100`
- `POST /api/third-party/chanjing/open/v1/create_video`
- `GET /api/third-party/chanjing/open/v1/video?id=xxxx`

前端不会再请求独立的 token 接口作为业务前提。

如果你们的后端不是同域部署，也可以让前端把 `VITE_CHANJING_PROXY_BASE_URL` 指到你们的网关地址，例如：

```env
VITE_CHANJING_PROXY_BASE_URL=https://your-domain.com/api/third-party/chanjing
```

---

## 后端配置项

建议提供以下环境变量：

- `CHANJING_APP_ID`
- `CHANJING_SECRET_KEY`
- `CHANJING_BASE_URL`，可选，默认 `https://www.chanjing.cc/api`

---

## 总体转发规则

### 1. 获取 token

后端内部调用蝉镜上游：

- `POST https://www.chanjing.cc/api/open/v1/access_token`

请求头：

```http
Content-Type: application/json
```

请求体：

```json
{
  "app_id": "你的 app_id",
  "secret_key": "你的 secret_key"
}
```

成功返回示例：

```json
{
  "trace_id": "ba7afb4bf51b4713fd9bc0f9e065fd20",
  "code": 0,
  "msg": "success",
  "data": {
    "access_token": "xxxxx",
    "expire_in": 1774857047
  }
}
```

### 2. token 缓存

建议后端缓存以下内容：

- `accessToken`
- `expireAt`

刷新规则建议：

- 当前时间 `< expireAt - 60秒` 时，直接复用缓存 token
- 当前时间 `>= expireAt - 60秒` 时，重新请求蝉镜 token

### 3. 代理业务请求

后端收到前端请求后：

1. 先获取可用 token
2. 将请求转发到蝉镜上游同路径接口
3. 自动追加请求头：

```http
access_token: xxxxx
```

4. 将蝉镜响应返回给前端

建议原则：

- 路径透传
- 查询参数透传
- `POST` body 透传
- 响应 body 尽量透传

---

## 需要实现的前端可访问接口

## 1. 获取公共数字人列表

- 路径：`GET /api/third-party/chanjing/open/v1/list_common_dp`
- 上游：`GET https://www.chanjing.cc/api/open/v1/list_common_dp`

查询参数：

- `page`，可选，默认 `1`
- `size`，可选，默认 `24`
- `source`，可选
- `tag_ids`，可选，多个值用英文逗号拼接

示例：

```http
GET /api/third-party/chanjing/open/v1/list_common_dp?page=1&size=24
```

转发时后端自动加：

```http
access_token: xxxxx
```

返回：

- 建议直接透传蝉镜原始响应

---

## 2. 获取公共音色列表

- 路径：`GET /api/third-party/chanjing/open/v1/list_common_audio`
- 上游：`GET https://www.chanjing.cc/api/open/v1/list_common_audio`

查询参数：

- `page`，前端当前固定传 `1`
- `size`，前端当前固定传 `100`

示例：

```http
GET /api/third-party/chanjing/open/v1/list_common_audio?page=1&size=100
```

返回：

- 建议直接透传蝉镜原始响应

---

## 3. 创建数字人视频任务

- 路径：`POST /api/third-party/chanjing/open/v1/create_video`
- 上游：`POST https://www.chanjing.cc/api/open/v1/create_video`

请求头：

```http
Content-Type: application/json
```

前端发给后端的 body 已经是蝉镜上游所需结构，后端可直接透传。

当前前端实际发送示例：

```json
{
  "person": {
    "id": "digital_human_id",
    "x": 0,
    "y": 0,
    "width": 720,
    "height": 1280,
    "figure_type": "whole_body"
  },
  "audio": {
    "tts": {
      "text": ["你好，欢迎使用 Twick"],
      "speed": 1,
      "audio_man": "voice_id"
    },
    "wav_url": "",
    "type": "tts",
    "volume": 100,
    "language": "cn"
  },
  "subtitle_config": {
    "show": true
  },
  "bg_color": "#EDEDED",
  "screen_width": 720,
  "screen_height": 1280,
  "model": 0,
  "resolution_rate": 0
}
```

字段说明：

- `person.id`：数字人 id
- `person.figure_type`：数字人形态，当前常见值有 `whole_body`、`circle_view`、`sit_body`
- `audio.tts.text`：文本数组，前端当前只传一段文本
- `audio.tts.speed`：语速
- `audio.tts.audio_man`：音色 id
- `audio.language`：`cn` 或 `en`
- `subtitle_config.show`：是否显示字幕
- `bg_color`：背景色
- `model`：`0` 表示 standard，`1` 表示 pro
- `resolution_rate`：当宽或高达到 2160 时传 `1`，否则传 `0`

返回：

- 建议直接透传蝉镜原始响应
- 前端当前预期 `data` 里是视频任务 id

---

## 4. 查询视频任务状态

- 路径：`GET /api/third-party/chanjing/open/v1/video`
- 上游：`GET https://www.chanjing.cc/api/open/v1/video`

查询参数：

- `id`：创建任务后返回的视频 id

示例：

```http
GET /api/third-party/chanjing/open/v1/video?id=video_xxx
```

返回：

- 建议直接透传蝉镜原始响应

前端当前会根据蝉镜返回中的以下字段做状态判断：

- `status`
- `progress`
- `msg`
- `video_url`
- `preview_url`
- `duration`

当前映射规则：

- `status === 30` 且有 `video_url` 时，认为任务成功
- `status >= 40` 时，认为任务失败
- 其他状态认为仍在处理中

---

## 可选调试接口

这个接口不是前端数字人业务的必需接口，但本地联调时可能有帮助。

### 获取当前服务端 token

- 路径：`GET /api/third-party/chanjing/access-token`

推荐返回：

```json
{
  "accessToken": "xxxxx"
}
```

注意：

- 生产环境不一定需要暴露这个接口
- 如果暴露，建议仅内部可访问，或加鉴权

---

## 错误处理建议

推荐约定：

- 自身配置缺失：返回 `500`
- 获取上游 token 失败：返回 `502`
- 转发上游业务接口失败：返回 `502` 或透传上游状态码
- 方法不支持：返回 `405`

推荐错误体：

```json
{
  "msg": "具体错误信息"
}
```

如果你们希望更容易排查问题，建议额外返回：

- `traceId`
- `upstreamStatus`
- `upstreamMsg`

---

## 安全建议

- 不要把 `CHANJING_APP_ID` / `CHANJING_SECRET_KEY` 下发到前端
- 不要要求前端保存 `access_token`
- 建议对代理接口增加服务级限流
- 建议记录上游失败日志，至少包含路径、查询参数、状态码、错误信息
- 如果系统是多租户，建议按租户维度选择蝉镜凭证和 token 缓存

---

## 验收标准

- 浏览器 Network 中不再出现 `https://www.chanjing.cc/api/...`
- 浏览器中不再出现 `access_token` 相关 CORS 预检失败
- 前端请求路径变为同源 `/api/third-party/chanjing/...`
- 后端能自动获取并缓存 token
- 能正常完成以下动作：
  - 拉取数字人列表
  - 拉取音色列表
  - 创建数字人视频任务
  - 轮询任务状态直到成功或失败

---

## 一句话总结

后端对前端暴露一组同源代理接口：

- `GET /api/third-party/chanjing/open/v1/list_common_dp`
- `GET /api/third-party/chanjing/open/v1/list_common_audio`
- `POST /api/third-party/chanjing/open/v1/create_video`
- `GET /api/third-party/chanjing/open/v1/video`

后端内部负责 token 获取、缓存、注入 `access_token` 请求头，然后把请求转发到蝉镜上游即可。
