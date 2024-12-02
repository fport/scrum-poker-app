# Production ortamında CORS ayarlarını güvenlik için düzenlemeyi unutmayın:

```bash 
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
```

# Environment variables'ları Heroku'da ayarlamak için:

```bash
heroku config:set CLIENT_URL=https://your-client-domain.com
```

Eğer hata alırsanız build loglarını kontrol edin:

```bash
heroku logs --tail --app your-app-name
git push heroku main
```

# Postman'de test için socket.io endpoint:

```bash
ws://localhost:8080/socket.io/?EIO=4&transport=websocket
```

Örnek bir socket.io request body:

```json
// createRoom eventi için:
{
    "event": "createRoom",
    "data": {
        "roomId": "test-room-1",
        "userName": "Test User",
        "teamName": "Test Team",
        "isScrumMaster": true
    }
}

// joinRoom eventi için:
{
    "event": "joinRoom",
    "data": {
        "roomId": "test-room-1",
        "userName": "Test User 2",
        "isScrumMaster": false
    }
}

// vote eventi için:
{
    "event": "vote",
    "data": {
        "roomId": "test-room-1",
        "vote": "5"
    }
}

// toggleVotes eventi için:
{
    "event": "toggleVotes",
    "data": {
        "roomId": "test-room-1"
    }
}

// startNewTask eventi için:
{
    "event": "startNewTask",
    "data": {
        "roomId": "test-room-1",
        "taskName": "Yeni görev"
    }
}

```


# Tüm testleri çalıştır
npm test

# Sadece domain testlerini çalıştır
npm run test:domain

# Sadece repository testlerini çalıştır
npm run test:repository