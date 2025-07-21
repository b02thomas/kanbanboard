# Admin Setup Instructions

## 🔧 Änderungen vorgenommen

### 1. Standard-Admin-Account entfernt
- Der Default-Admin-Account (`admin/admin123`) wurde vollständig aus dem System entfernt
- Keine hardcoded Admin-Zugänge mehr vorhanden

### 2. Sichere Admin-Erstellung implementiert
- Neuer API-Endpoint: `POST /api/auth/admin/create-admin`
- Benötigt Super-Admin-Key für Authentifizierung
- Erstellt Admin-Accounts mit `role: "admin"`

### 3. Drei Team-Admin-Accounts vorbereitet

## 🚀 Admin-Accounts erstellen

### Server starten
```bash
cd /home/benedikt.thomas/projekte/kanbanboard/backend
uvicorn server:app --reload
```

### Admin-Accounts erstellen
```bash
python3 create_admin_users.py
```

### Erstellte Admin-Accounts:
1. **Benedikt Thomas**
   - Username: `benedikt.thomas`
   - Email: `benedikt.thomas@smb-ai-solution.com`
   - Password: `smb2025_beni!`

2. **Team Lead**
   - Username: `moritz.lange`
   - Email: `moritz.lange@smb-ai-solution.com`
   - Password: `smb2025_moritz!`

3. **Project Admin**
   - Username: `simon.lange`
   - Email: `simon.lange@smb-ai-solution.com`
   - Password: `smb2025_simon!`

## 🔐 Sicherheitsmaßnahmen

### Super-Admin-Key
- Umgebungsvariable: `SUPER_ADMIN_KEY`
- Default: `smb-super-admin-key-2025`
- Sollte in Production geändert werden

### API-Aufruf manuell
```bash
curl -X POST http://localhost:8000/api/auth/admin/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new.admin",
    "email": "new.admin@smb.startup",
    "full_name": "New Admin",
    "password": "SecurePassword123!",
    "avatar": "👨‍💼",
    "super_admin_key": "smb-super-admin-key-2025"
  }'
```

## ⚠️ Wichtige Hinweise
1. **Passwörter ändern**: Alle Admin-Accounts sollten nach dem ersten Login ihre Passwörter ändern
2. **Super-Admin-Key**: Sollte als Umgebungsvariable gesetzt werden
3. **Sichere Passwörter**: Verwenden Sie starke Passwörter in Production
4. **Endpoint-Sicherheit**: Der Admin-Erstellungs-Endpoint ist nur mit Super-Admin-Key zugänglich

## 🛠️ Nächste Schritte

1. Server starten
2. `create_admin_users.py` ausführen
3. Admins über Login-Seite anmelden
4. Super-Admin-Key als Umgebungsvariable setzen
5. Passwörter ändern (wenn Passwort-Reset implementiert ist)

---

## **Fehlerursache**

**1. nginx leitet alle Anfragen an das Backend weiter**

- Deine aktuelle nginx-Konfiguration für task.smb-ai-solution.com leitet location / mit proxy_pass http://localhost:3001; an das Backend weiter.
- Das bedeutet: **Jede Anfrage an die Domain wird an das Backend (API) geschickt** – auch die, die eigentlich das Frontend (React-App) ausliefern sollen.
- Deshalb siehst du im Browser nur die Backend-API-Antwort (JSON), aber nie das React-Frontend.

---

## **Wie muss es richtig sein?**

**Empfohlene Lösung:**

1. **Frontend als Production-Build bauen**
   - Im Frontend-Ordner:
     ```bash
     cd ~/projekte/kanbanboard/frontend
     npm run build
     ```
   - Dadurch entsteht ein build/ Ordner mit statischen Dateien.

2. **nginx so konfigurieren, dass statische Dateien ausgeliefert werden**
   - Passe die nginx-Konfiguration an, z.B.:
     ```nginx
     server {
         listen 80;
         server_name task.smb-ai-solution.com;

         root /home/benedikt.thomas/projekte/kanbanboard/frontend/build;
         index index.html;

         location / {
             try_files $uri /index.html;
         }

         location /api/ {
             proxy_pass http://localhost:3001/api/;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
             proxy_set_header X-Forwarded-Proto $scheme;
         }
     }
     ```
   - Damit werden alle normalen Seitenanfragen vom Frontend ausgeliefert, und nur /api/ geht ans Backend.

3. **nginx neu laden**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## **Zusammengefasst:**

- **Fehler:** nginx leitet alles an das Backend weiter, das Frontend wird nie ausgeliefert.
- **Lösung:** Production-Build des Frontends erstellen und nginx so konfigurieren, dass statische Dateien ausgeliefert werden. Nur API-Routen an das Backend weiterleiten.

---

**Wenn du möchtest, kann ich dir die genaue nginx-Konfiguration für deinen Pfad und deine Ports schreiben – sag einfach Bescheid!**