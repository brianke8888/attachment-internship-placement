# Attachment & Internship Placement System

A complete attachment & internship placement platform built with **plain HTML, CSS, JavaScript** (frontend), **Node.js + Express** (backend), and **MySQL** (database).

Three roles:
- **Student** — build a profile, upload a CV, browse and apply to internships
- **Company** — manage company profile, post internships, review applicants, update application status
- **Admin** — oversee users, internships, and applications platform-wide

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend  | Node.js, Express.js |
| Database | MySQL |
| Auth     | JWT (JSON Web Tokens) stored in localStorage |
| File upload | Multer (CVs stored on disk) |
| Security | bcryptjs (password hashing) |

## Quick Start (TL;DR)

```bash
# 1. Create the database
mysql -u root -p < backend/schema.sql

# 2. Configure credentials
cd backend && cp .env.example .env
#   → edit .env: set DB_PASSWORD and JWT_SECRET

# 3. Install + seed demo data
npm install
npm run seed

# 4. Start the backend (terminal 1)
npm run dev          # → http://localhost:5000

# 5. Serve the frontend (terminal 2)
cd ../frontend
python -m http.server 5500   # → http://127.0.0.1:5500
```

Then open <http://127.0.0.1:5500> and log in with `student@uni.edu` / `student123`.

## Prerequisites

1. **Node.js** v18 or newer — <https://nodejs.org>
2. **MySQL** v8 or newer — <https://dev.mysql.com/downloads/>
3. A terminal / command prompt

## Setup Instructions

### 1. Create the MySQL database

Log into MySQL:

```bash
mysql -u root -p
```

Then run:

```sql
SOURCE /absolute/path/to/attachment-internship-placement/backend/schema.sql;
```

(Or open `backend/schema.sql` in MySQL Workbench and execute it.)

This creates the `attachment_internship` database and all tables (no data yet).

### 2. Configure backend environment

```bash
cd attachment-internship-placement/backend
cp .env.example .env
```

Edit `.env` and set your MySQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=attachment_internship
JWT_SECRET=change_this_to_a_long_random_string
```

### 3. Install backend dependencies

```bash
cd attachment-internship-placement/backend
npm install
```

### 4. Insert demo data (creates the demo accounts)

```bash
npm run seed
```

You should see:

```
✓ Seed complete!
Demo accounts:
  Admin:    admin@aip.edu   / admin123
  Company:  hr@techcorp.com / company123
  Student:  student@uni.edu / student123
Inserted: 4 users, 4 internships, 1 application
```

> Skip this step if you want to start with an empty database and register your own users through the UI.

### 5. Start the backend server

```bash
npm run dev
```

You should see:

```
Server running on port 5000
Connected to MySQL database
```

### 6. Serve the frontend

The frontend is plain HTML/CSS/JS. You can serve it with any static server. Easiest options:

**Option A — VS Code Live Server (recommended)**
1. Install the "Live Server" extension in VS Code.
2. Right-click `frontend/index.html` → "Open with Live Server".
3. It opens at `http://127.0.0.1:5500`.

**Option B — Python**
```bash
cd attachment-internship-placement/frontend
python -m http.server 5500
```

**Option C — Node `serve`**
```bash
npx serve attachment-internship-placement/frontend -l 5500
```

Then open <http://127.0.0.1:5500> in your browser.

> The frontend talks to the backend at `http://localhost:5000/api` (configured in `frontend/js/api.js`). Both must be running.

## Demo Accounts

| Role    | Email                  | Password      |
|---------|------------------------|---------------|
| Admin   | `admin@aip.edu`        | `admin123`    |
| Company | `hr@techcorp.com`      | `company123`  |
| Company | `careers@finnovate.io` | `company123`  |
| Student | `student@uni.edu`      | `student123`  |

## Project Structure

```
attachment-internship-placement/
├── README.md
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── student.js
│   │   ├── company.js
│   │   ├── internships.js
│   │   ├── applications.js
│   │   └── admin.js
│   └── uploads/           ← CV files stored here
└── frontend/
    ├── index.html          ← login / register
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── api.js          ← fetch wrapper + auth header
    │   ├── auth.js         ← login/register/logout
    │   ├── student.js
    │   ├── company.js
    │   ├── admin.js
    │   └── internships.js
    └── pages/
        ├── student-dashboard.html
        ├── student-profile.html
        ├── browse-internships.html
        ├── my-applications.html
        ├── company-dashboard.html
        ├── company-profile.html
        ├── my-internships.html
        ├── company-applicants.html
        └── admin-dashboard.html
```

## API Endpoints

### Auth
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| POST   | `/api/auth/register`  | Register a new user   |
| POST   | `/api/auth/login`     | Login                 |
| GET    | `/api/auth/me`        | Get current user      |

### Student
| Method | Endpoint                    | Description                |
|--------|-----------------------------|----------------------------|
| GET    | `/api/student/profile`      | Get own profile + apps     |
| POST   | `/api/student/profile`      | Create/update profile (multipart, CV upload) |

### Company
| Method | Endpoint                              | Description                          |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/company/profile`                | Get company profile + internships    |
| POST   | `/api/company/profile`                | Create/update company profile        |
| GET    | `/api/company/applications`           | List applications to my internships  |

### Internships
| Method | Endpoint                    | Description                  |
|--------|-----------------------------|------------------------------|
| GET    | `/api/internships`          | List (open, with filters)    |
| GET    | `/api/internships/:id`      | Get one                      |
| POST   | `/api/internships`          | Create (company only)        |
| PUT    | `/api/internships/:id`      | Update (owner company)       |
| DELETE | `/api/internships/:id`      | Delete (owner company)       |

### Applications
| Method | Endpoint                          | Description                |
|--------|-----------------------------------|----------------------------|
| POST   | `/api/applications`               | Apply (student)            |
| PATCH  | `/api/applications/:id/status`    | Update status (company)    |
| DELETE | `/api/applications/:id`           | Withdraw (student)         |

### Admin
| Method | Endpoint                          | Description            |
|--------|-----------------------------------|------------------------|
| GET    | `/api/admin/stats`                | Platform stats         |
| GET    | `/api/admin/users`                | All users              |
| GET    | `/api/admin/internships`          | All internships        |
| GET    | `/api/admin/applications`         | All applications       |

## Common Issues

**"ER_ACCESS_DENIED_ERROR"** — Your MySQL password in `.env` is wrong, or the user lacks privileges.

**CORS error in browser console** — Make sure the backend is running on port 5000. The backend has CORS enabled for all origins.

**"Cannot find module 'mysql2'"** — Run `npm install` inside the `backend/` folder.

**Uploads not working** — Make sure `backend/uploads/` exists and is writable (it's created automatically).

**401 Unauthorized** — Your JWT token expired or you're not logged in. Go back to `index.html` and log in again.

## Deployment (Railway)

### 1. Set up

1. Create an account at [Railway](https://railway.app).
2. Push your code to GitHub.

### 2. Deploy

1. In Railway, click **New Project** → **Deploy from GitHub**.
2. Select your repo.
3. Add a **MySQL** service from the service catalog.
4. Railway automatically links the MySQL env vars (`MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`) to your app.

### 3. Seed demo data

After the first deploy, open Railway's **Shell** tab and run:

```bash
node seed.js
```

### 4. Verify

- Visit `https://<your-app>.up.railway.app/api/health` — should return `{"ok":true}`
- Visit the root URL — should load the login page

## License

Free to use for educational purposes.
