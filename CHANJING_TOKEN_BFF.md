# 蝉镜 Token BFF 接口文档

> 注意：这份文档描述的是“仅提供 token 接口”的旧方案。  
> 当前前端已经切到“同源后端代理”方案，完整后端接口说明请优先查看 `CHANJING_PROXY_BFF.md`。

## 目标

为前端提供一个后端代理接口，用于获取蝉镜 `access_token`。  
前端不再持有蝉镜 `app_id` / `secret_key`。

## 接口用途

- 前端先调用你们 Java 后端的 BFF
- Java 后端再调用蝉镜开放平台
- 后端返回 `access_token` 给前端
- 前端拿这个 token 去调用蝉镜开放接口：
  - 获取公共数字人列表
  - 获取公共声音列表
  - 创建视频合成任务
  - 获取视频详情

## 上游蝉镜接口

- 地址：`https://www.chanjing.cc/api/open/v1/access_token`
- 方法：`POST`
- `Content-Type`：`application/json`

请求体：

```json
{
  "app_id": "你的蝉镜app_id",
  "secret_key": "你的蝉镜secret_key"
}
```

蝉镜成功响应示例：

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

说明：

- `expire_in` 看起来是 Unix 时间戳
- 建议服务端缓存 token，并在过期前 60 秒刷新

## Java BFF 要提供的接口

- 路径建议：`/api/third-party/chanjing/access-token`
- 方法：`GET`

## 返回格式建议

推荐直接返回：

```json
{
  "accessToken": "xxxxx"
}
```

也可以返回：

```json
{
  "data": {
    "accessToken": "xxxxx"
  }
}
```

前端目前可兼容这些字段之一：

- `accessToken`
- `access_token`
- `token`
- `data.accessToken`
- `data.access_token`
- `data.token`

## 错误返回建议

```json
{
  "msg": "failed to get chanjing access token"
}
```

## HTTP 状态码建议

- 成功：`200`
- 参数/配置错误：`400` / `500`
- 蝉镜上游失败：`502` 或 `500`

## Java 后端配置项

- `CHANJING_APP_ID`
- `CHANJING_SECRET_KEY`

## 缓存建议

- 用内存缓存即可先落地
- 保存：
  - `accessToken`
  - `expireAt`
- 每次请求先判断是否可复用
- 若 `当前时间 >= expireAt - 60秒`，重新请求蝉镜

## 时序

1. 前端请求 Java BFF：`GET /api/third-party/chanjing/access-token`
2. Java BFF 判断本地缓存是否可用
3. 若不可用，调用蝉镜 `POST /api/open/v1/access_token`
4. Java BFF 返回 token 给前端
5. 前端后续调用蝉镜接口时，在 header 中带：

```http
access_token: xxxxx
```

## 前端当前约定

前端会配置：

```env
VITE_CHANJING_TOKEN_API_URL=/api/third-party/chanjing/access-token
```

所以你们这个接口最好支持同源访问。

## 验收标准

- 前端代码中不再出现蝉镜 `app_id` / `secret_key`
- Java BFF 能成功返回有效 token
- 前端拿到 token 后能正常调蝉镜接口
- 实测可完成：
  - 获取数字人列表
  - 创建视频合成任务
  - 轮询视频详情

## 可选增强

- 打日志记录上游请求失败原因
- 对蝉镜异常响应做透传或映射
- 给接口加服务级限流
- 支持多租户时按租户配置不同蝉镜凭证
