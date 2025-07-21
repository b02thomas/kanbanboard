# Kanbanboard Startup Guide

## 📋 **Erfolgreich abgeschlossene Schritte:**

### ✅ **1. Frontend neu gestartet**
- Frontend läuft auf Port 3000
- Neue Backend-URL (https://task.smb-ai-solution.com) geladen
- Kompilierung erfolgreich

### ✅ **2. Login-Test erfolgreich**
Alle Admin-Accounts funktionieren:
- **benedikt.thomas** / `smb2025_beni!` ✅
- **moritz.lange** / `smb2025_moritz!` ✅  
- **simon.lange** / `smb2025_simon!` ✅

### ✅ **3. Systemd-Services erstellt**
- Backend-Service: `/etc/systemd/system/kanbanboard-backend.service`
- Frontend-Service: `/etc/systemd/system/kanbanboard-frontend.service`
- Services aktiviert für automatischen Start

## 🔧 **Manuelle Verwaltung:**

### Services starten:
```bash
sudo systemctl start kanbanboard-backend.service
sudo systemctl start kanbanboard-frontend.service
```

### Services stoppen:
```bash
sudo systemctl stop kanbanboard-backend.service
sudo systemctl stop kanbanboard-frontend.service
```

### Service-Status prüfen:
```bash
sudo systemctl status kanbanboard-backend.service
sudo systemctl status kanbanboard-frontend.service
```

### Services neu laden:
```bash
sudo systemctl daemon-reload
sudo systemctl restart kanbanboard-backend.service
sudo systemctl restart kanbanboard-frontend.service
```

## 🌐 **Zugriff:**
- **Website:** https://task.smb-ai-solution.com
- **Backend-API:** https://task.smb-ai-solution.com/api
- **API-Docs:** https://task.smb-ai-solution.com/docs

## 📊 **Status:**
- **Backend:** ✅ Läuft manuell auf Port 3001
- **Frontend:** ✅ Läuft manuell auf Port 3000  
- **Database:** ✅ MongoDB in Docker Container
- **SSL:** ✅ HTTPS-Zertifikat aktiv
- **Admin-Accounts:** ✅ Alle 3 Accounts funktionieren
- **Systemd:** ✅ Services bereit für automatischen Start

## 🎯 **Nächste Schritte:**
1. Bei Bedarf Services mit `sudo systemctl start` starten
2. Bei Neustart startet alles automatisch
3. Login mit Admin-Accounts testen
4. System ist produktionsbereit!