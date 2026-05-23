# 荒野亂鬥抽籤系統同步版

## 本機啟動

```bash
cd /Users/jason/lottery
node server.js
```

啟動後，工作人員用瀏覽器開：

```text
http://localhost:8787
```

## 同 Wi-Fi 多人同步

主控電腦啟動 `node server.js` 後，查主控電腦的區網 IP，例如 `192.168.1.20`。

其他工作人員在同一個 Wi-Fi 下開：

```text
http://192.168.1.20:8787
```

只要頁面右上方顯示「同步中」，抽籤、禁圖、選隊、BO3 勝場都會即時同步。

## 真正公開上網

這個版本已經是可部署的 Node 伺服器。要讓不同地點的人也能連線，可以部署到 Render、Railway、Fly.io、VPS 或學校/公司主機。

啟動指令：

```bash
node server.js
```

伺服器會使用平台提供的 `PORT`，沒有提供時預設使用 `8787`。

## 注意

- 直接開 `file:///Users/jason/lottery/index.html` 仍然可以單機使用，但不會同步。
- 同步狀態會暫存在 `state.json`，伺服器重開後會保留最近一次結果。
- 多位工作人員同時操作同一格時，最後送出的更新會覆蓋前一次更新。
