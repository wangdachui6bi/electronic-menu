# 我的菜单

本地电子菜单应用：记录菜品、上传图片、编写做菜步骤，数据保存在浏览器 IndexedDB，无需后端。

## 功能

- **菜品列表**：名称、分类、烹饪时间、简介、封面图
- **添加/编辑**：表单支持图片上传（转 Base64 存本地）、多步骤做菜步骤、收藏
- **详情**：点击卡片查看完整步骤与信息
- **收藏筛选**：顶部「收藏」按钮只显示已收藏菜品
- **删除**：删除前有确认提示

## 运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 打包 APK

项目已配置好 [Capacitor](https://capacitorjs.com/) 与 Android 平台，按下面任选一种方式即可生成 APK。

### 方式一：用 Android Studio（推荐）

1. 同步 Web 并打开 Android 工程：

   ```bash
   npm run cap:sync
   npm run cap:android
   ```

2. 在 Android Studio 中：**Build → Build Bundle(s) / APK(s) → Build APK(s)**。  
   生成的 APK 在：`android/app/build/outputs/apk/debug/app-debug.apk`。

### 方式二：命令行（需先安装 JDK 17）

1. 安装 [JDK 17](https://adoptium.net/) 或通过 Android Studio 自带的 JDK。
2. 在项目根目录执行：

   ```bash
   npm run apk
   ```

3. APK 输出路径：`menu-app/android/app/build/outputs/apk/debug/app-debug.apk`。

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run cap:sync` | 先执行 `npm run build`，再把 `dist/` 同步到 Android 工程 |
| `npm run cap:android` | 用 Android Studio 打开 `android/` 目录 |
| `npm run apk` | 同步并尝试用 Gradle 打 debug APK（需本机有 Java） |

## 技术栈

- React 18 + TypeScript
- Vite
- IndexedDB（通过 [idb](https://github.com/jakearchibald/idb)）
- 纯前端，无数据库服务器
