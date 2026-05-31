# 🐇 Distributed Task Queue

A production-ready **Distributed Task Queue** system inspired by Celery + RabbitMQ, built with:

- **Backend:** Node.js + Express.js
- **Frontend:** React.js
- **Message Broker:** RabbitMQ
- **Database:** MongoDB

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React.js Frontend  (Dashboard, Tasks, Workers, Submit)  │
│  Port: 3000                                               │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API
┌──────────────────────▼───────────────────────────────────┐
│  Express.js Backend  (API Server)                         │
│  Port: 5000                                               │
│  Routes: /api/tasks  /api/workers  /api/health            │
└────────────┬────────────────────────┬────────────────────┘
             │ Publish                │ Persist
┌────────────▼───────────┐  ┌────────▼───────────────────┐
│  RabbitMQ              │  │  MongoDB                    │
│  Port: 5672 / 15672    │  │  Port: 27017                │
│  Queues:               │  │  Collections:               │
│  - task_queue_high     │  │  - tasks                    │
│  - task_queue_medium   │  │  - workers                  │
│  - task_queue_low      │  └────────────────────────────┘
│  - dead_letter_queue   │
└────────────┬───────────┘
             │ Consume
┌────────────▼───────────────────────────────────────────┐
│  Worker Nodes (can run multiple instances)              │
│  - Pull tasks from priority queues                      │
│  - Process with type-specific handlers                  │
│  - Exponential backoff retry                            │
│  - Send heartbeats to API every 10s                     │
│  - Dead Letter Queue for exhausted retries              │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the project
git clone <your-repo>
cd distributed-task-queue

# Start all services (MongoDB + RabbitMQ + Backend + 3 Workers + Frontend)
docker-compose up --build

# Scale workers
docker-compose up --scale worker=5
```

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+, MongoDB, RabbitMQ running locally.

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run dev          # Start API server on :5000

# 2. Start worker(s) — open new terminal(s)
npm run worker       # Start one worker
# Open more terminals and run `npm run worker` for more workers

# 3. Frontend
cd ../frontend
npm install
npm start            # Start React app on :3000
```

---

## 📋 Features

### Task Management
- ✅ Submit tasks with **6 types**: EMAIL, IMAGE_PROCESSING, DATA_EXPORT, REPORT_GENERATION, NOTIFICATION, CUSTOM
- ✅ **3 Priority levels**: HIGH, MEDIUM, LOW → separate RabbitMQ queues
- ✅ Track status: PENDING → QUEUED → PROCESSING → COMPLETED / FAILED / DEAD
- ✅ **Retry failed tasks** with exponential backoff (2^n seconds)
- ✅ **Dead Letter Queue** for tasks exceeding max retries
- ✅ Cancel pending/queued tasks
- ✅ Filter, search, and paginate tasks
- ✅ JSON payload editor with validation

### Worker System
- ✅ Multiple concurrent workers (run `npm run worker` in N terminals)
- ✅ **Heartbeat monitoring** — workers report status every 10s
- ✅ Auto-detect offline workers (no heartbeat > 30s)
- ✅ Task duration tracking
- ✅ Per-worker stats (processed / failed counts)

### Dashboard
- ✅ Real-time stats (auto-refresh every 10s)
- ✅ Charts: Tasks by Status, Priority, Type
- ✅ Recent tasks feed

### Infrastructure
- ✅ Docker Compose for one-command startup
- ✅ Scalable worker replicas
- ✅ RabbitMQ Management UI: http://localhost:15672 (guest/guest)
- ✅ Persistent queues and MongoDB storage

---

## 🌐 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/tasks/stats` | Dashboard statistics |
| `GET` | `/api/tasks` | List tasks (filter, paginate) |
| `POST` | `/api/tasks` | Create & enqueue task |
| `GET` | `/api/tasks/:id` | Get single task |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `POST` | `/api/tasks/:id/retry` | Retry failed task |
| `POST` | `/api/tasks/:id/cancel` | Cancel task |
| `GET` | `/api/workers` | List workers |
| `POST` | `/api/workers/heartbeat` | Worker heartbeat |
| `DELETE` | `/api/workers/:workerId` | Remove worker |

---

## 📁 Project Structure

```
distributed-task-queue/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # MongoDB connection
│   │   │   └── rabbitmq.js     # RabbitMQ setup & publish
│   │   ├── controllers/
│   │   │   ├── taskController.js
│   │   │   └── workerController.js
│   │   ├── models/
│   │   │   ├── Task.js
│   │   │   └── Worker.js
│   │   ├── routes/
│   │   │   ├── taskRoutes.js
│   │   │   └── workerRoutes.js
│   │   ├── workers/
│   │   │   └── taskWorker.js   # Consumer process
│   │   └── server.js
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Badges.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Tasks.jsx
│   │   │   ├── Workers.jsx
│   │   │   └── SubmitTask.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🔧 Environment Variables

```env
# Backend (.env)
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskqueue
RABBITMQ_URL=amqp://localhost
QUEUE_NAME=task_queue
DEAD_LETTER_QUEUE=dead_letter_queue
MAX_RETRIES=3
CLIENT_URL=http://localhost:3000

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📊 Monitoring

- **Frontend Dashboard**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **API Health**: http://localhost:5000/api/health
