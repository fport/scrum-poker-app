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

