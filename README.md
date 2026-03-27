# 两个人的点菜台

给你和女朋友一起用的 H5 点菜应用。

它现在是独立部署的前端站点，`common-server` 只负责接口：
- 菜单增删改
- 点菜请求
- 评论
- 实时更新
- 飞书推送

## 本地开发

```bash
npm install
npm run dev
```

默认打开 `http://localhost:5173`。

如果后端不在本机 `3600`，请在本地准备 `.env.local` 或 `.env`：

```bash
VITE_MENU_API_BASE=http://your-api-host:3600
VITE_MENU_TOKEN=
VITE_APP_BASE=/
```

## Docker 部署

项目根目录已经加好了：
- [Dockerfile](/Users/niuniu/Desktop/personal-project/menu-app/Dockerfile)
- [docker-compose.yml](/Users/niuniu/Desktop/personal-project/menu-app/docker-compose.yml)

这是一个纯静态前端容器，默认用 `serve` 直接起在容器 `80` 端口上，适合你现在先通过 `IP:端口` 访问。

### 构建参数

- `VITE_MENU_API_BASE`
  点菜应用请求 `common-server` 的接口地址，比如 `https://api.xxx.com`
- `VITE_MENU_TOKEN`
  如果你启用了菜单访问口令，就填它
- `VITE_APP_BASE`
  前端部署路径，独立域名部署就用 `/`

## 自动发版

项目根目录已经加好了 [\.deploy.sh](/Users/niuniu/Desktop/personal-project/menu-app/.deploy.sh)。

### 1. 准备部署配置

先复制一份：

```bash
cp .env.example .env
```

然后填写这些值：

```bash
DEPLOY_HOST=your.server.com
DEPLOY_USER=root
DEPLOY_PORT=22
DEPLOY_PATH=/opt/menu-app

MENU_APP_PORT=8080
MENU_APP_CONTAINER_NAME=menu-app

VITE_MENU_API_BASE=https://api.your-domain.com
VITE_MENU_TOKEN=
VITE_APP_BASE=/
```

### 2. 执行发版

```bash
chmod +x .deploy.sh
./.deploy.sh
```

脚本会自动做这些事：
- 把 `menu-app` 代码同步到服务器
- 把项目 `.env` 同步到服务器
- 远程执行 `docker compose up -d --build`

发版完成后，直接访问：

```bash
http://你的服务器IP:MENU_APP_PORT
```

## 和 common-server 的关系

现在 `menu-app` 不再挂载到 `common-server` 的 `/menu` 路径下。

也就是说：
- `menu-app` 单独部署成一个网页站点
- `common-server` 只保留 `/api/menu` 这些接口

## 打包 APK

如果你还要保留移动端壳子，原来的 Capacitor 能力还在：

```bash
npm run cap:sync
npm run cap:android
```
