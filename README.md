# 📋 Task Manager REST API

A production-ready CRUD REST API for managing tasks, built with **Node.js**, **Express**, **SQLite**, and **JWT authentication**.

## Features

- 🔐 **User Authentication** — Register, login, and JWT-protected routes
- ✅ **Full CRUD** — Create, read, update (PUT + PATCH), and delete tasks
- 🔍 **Filtering & Search** — Filter by status, priority, or free-text search
- 📄 **Pagination** — Configurable page size with metadata
- 🛡️ **Input Validation** — All write endpoints validated with clear error messages
- 🔒 **User Isolation** — Users can only access their own tasks
- 🏥 **Health Check** — `GET /api/health` for monitoring

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the `.env` file and update the `JWT_SECRET`:

```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

### 3. Run the server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:3000`.

---

## Project Structure

```
src/
├── controllers/
│   ├── authController.js   # Registration, login, profile logic
│   └── taskController.js   # CRUD operations for tasks
├── database/
│   └── db.js               # SQLite setup and schema
├── middleware/
│   ├── auth.js             # JWT verification middleware
│   └── validate.js         # express-validator error handler
├── routes/
│   ├── authRoutes.js       # /api/auth/* routes
│   └── taskRoutes.js       # /api/tasks/* routes
└── server.js               # Express app entry point
```

---

## Data Models

### User

| Field        | Type    | Notes                  |
|-------------|---------|------------------------|
| `id`        | Integer | Auto-increment PK      |
| `username`  | String  | Unique, 3-30 chars     |
| `email`     | String  | Unique, valid email    |
| `password`  | String  | bcrypt hashed (12 rounds) |
| `created_at`| String  | ISO 8601 timestamp     |

### Task

| Field         | Type    | Notes                                       |
|--------------|---------|---------------------------------------------|
| `id`         | Integer | Auto-increment PK                           |
| `user_id`    | Integer | FK → users.id                               |
| `title`      | String  | Required, max 200 chars                     |
| `description`| String  | Optional, max 2000 chars                    |
| `status`     | String  | `pending` \| `in_progress` \| `completed`   |
| `priority`   | String  | `low` \| `medium` \| `high`                 |
| `due_date`   | String  | Optional, ISO 8601 date                     |
| `created_at` | String  | Auto-set on creation                        |
| `updated_at` | String  | Auto-set on creation/update                 |

---

## API Endpoints

All endpoints return JSON. Protected routes require the header:

```
Authorization: Bearer <token>
```

### Health Check

#### `GET /api/health`

```json
// Response: 200 OK
{ "status": "ok", "timestamp": "2026-10-08T17:00:00.000Z" }
```

---

### Authentication

#### `POST /api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response: `201 Created`**
```json
{
  "message": "User registered successfully.",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2026-10-08 17:00:00"
  }
}
```

**Error: `400 Bad Request`** (validation or duplicate)
```json
{
  "error": "Validation failed.",
  "details": [
    { "field": "email", "message": "A valid email is required." }
  ]
}
```

---

#### `POST /api/auth/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response: `200 OK`**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Error: `401 Unauthorized`**
```json
{ "error": "Invalid email or password." }
```

---

#### `GET /api/auth/me` 🔒

Get the authenticated user's profile.

**Response: `200 OK`**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "created_at": "2026-10-08 17:00:00"
  }
}
```

---

### Tasks (all routes 🔒 protected)

#### `GET /api/tasks`

List all tasks for the authenticated user with filtering and pagination.

**Query Parameters:**

| Param      | Type   | Default | Description                              |
|-----------|--------|---------|------------------------------------------|
| `status`  | String | —       | Filter: `pending`, `in_progress`, `completed` |
| `priority`| String | —       | Filter: `low`, `medium`, `high`          |
| `search`  | String | —       | Search in title and description          |
| `page`    | Number | `1`     | Page number                              |
| `limit`   | Number | `20`    | Items per page (max 100)                 |

**Example:** `GET /api/tasks?status=pending&priority=high&page=1&limit=10`

**Response: `200 OK`**
```json
{
  "tasks": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Finish project report",
      "description": "Complete the Q4 report by EOD",
      "status": "pending",
      "priority": "high",
      "due_date": "2026-10-15",
      "created_at": "2026-10-08 17:00:00",
      "updated_at": "2026-10-08 17:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### `GET /api/tasks/:id`

Get a single task by ID.

**Response: `200 OK`**
```json
{
  "task": {
    "id": 1,
    "user_id": 1,
    "title": "Finish project report",
    "description": "Complete the Q4 report by EOD",
    "status": "pending",
    "priority": "high",
    "due_date": "2026-10-15",
    "created_at": "2026-10-08 17:00:00",
    "updated_at": "2026-10-08 17:00:00"
  }
}
```

**Error: `404 Not Found`**
```json
{ "error": "Task not found." }
```

---

#### `POST /api/tasks`

Create a new task.

**Request Body:**
```json
{
  "title": "Finish project report",
  "description": "Complete the Q4 report by EOD",
  "status": "pending",
  "priority": "high",
  "due_date": "2026-10-15"
}
```

| Field         | Required | Default     | Validation                                    |
|--------------|----------|-------------|-----------------------------------------------|
| `title`      | ✅ Yes   | —           | Non-empty, max 200 chars                      |
| `description`| No       | `""`        | Max 2000 chars                                |
| `status`     | No       | `"pending"` | `pending` \| `in_progress` \| `completed`     |
| `priority`   | No       | `"medium"`  | `low` \| `medium` \| `high`                   |
| `due_date`   | No       | `null`      | Valid ISO 8601 date                           |

**Response: `201 Created`**
```json
{
  "message": "Task created successfully.",
  "task": { "id": 1, "title": "Finish project report", "..." : "..." }
}
```

---

#### `PUT /api/tasks/:id`

Fully update a task (all fields replaced).

**Request Body:** Same shape as POST (title required).

**Response: `200 OK`**
```json
{
  "message": "Task updated successfully.",
  "task": { "..." : "..." }
}
```

---

#### `PATCH /api/tasks/:id`

Partially update a task (only provided fields change).

**Request Body:** Any subset of task fields.
```json
{
  "status": "completed"
}
```

**Response: `200 OK`**
```json
{
  "message": "Task updated successfully.",
  "task": { "..." : "..." }
}
```

---

#### `DELETE /api/tasks/:id`

Delete a task.

**Response: `200 OK`**
```json
{ "message": "Task deleted successfully." }
```

---

## Error Responses

All errors follow a consistent format:

| Status | Meaning              | Example                                    |
|--------|---------------------|--------------------------------------------|
| `400`  | Bad Request         | Validation failed or malformed input       |
| `401`  | Unauthorized        | Missing/invalid token or wrong credentials |
| `404`  | Not Found           | Resource doesn't exist or wrong route      |
| `500`  | Internal Server Error | Unexpected server error                  |

**Validation error shape:**
```json
{
  "error": "Validation failed.",
  "details": [
    { "field": "title", "message": "Title is required." },
    { "field": "status", "message": "Status must be one of: pending, in_progress, completed." }
  ]
}
```

---

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","email":"john@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'

# Create a task (replace <TOKEN> with your JWT)
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"My first task","priority":"high"}'

# List tasks
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <TOKEN>"

# Update task status
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"status":"completed"}'

# Delete task
curl -X DELETE http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Tech Stack

| Layer          | Technology                   |
|----------------|------------------------------|
| Runtime        | Node.js                      |
| Framework      | Express 5                    |
| Database       | SQLite (via better-sqlite3)  |
| Auth           | JWT (jsonwebtoken + bcryptjs)|
| Validation     | express-validator            |

---

## License

ISC
