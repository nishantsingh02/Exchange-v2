# Exchange-v2

## 1. Project Overview
Exchange-v2 is a high-performance, locally-hosted cryptocurrency exchange application architecture. It features an in-memory order matching engine, an Express.js API, real-time WebSocket market data streaming, and a TimescaleDB (PostgreSQL) integrated database for real-time charting (klines). The system provides a foundation for order placement, high-throughput matching, trade logging, and live order book updates.

**Core Problem Solved:** Provides a scalable and decoupled architecture for building an exchange where an HTTP API, an asynchronous order matching engine, and real-time streaming services communicate seamlessly with minimal latency using Redis.

## 2. How It Works (End-to-End Flow)
1. **Order Placement:** A user submits a buy or sell order via the `frontend` which hits the `api` service (`/api/v1/order`).
2. **API to Engine Communication:** The `api` service validates the request and pushes a `CREATE_ORDER` message to a Redis queue (`messages`). It also dynamically subscribes to a unique Redis channel to wait for the engine's response.
3. **Matching Engine Execution:** The `engine` service continuously polls the `messages` queue. It processes the order against its in-memory orderbook (`Engine.ts`). It performs balance checks, locks funds, matches bids/asks, and executes trades.
4. **State Persistence & Notifications:** Upon execution, the `engine`:
   - Publishes WebSocket events via Redis Pub/Sub (`depth@<market>`, `trade@<market>`).
   - Pushes `ORDER_UPDATE` and `TRADE_ADDED` messages to the `db_processor` Redis queue.
   - Publishes the final order response back to the `api`'s unique channel, unblocking the HTTP request and returning the status to the user.
5. **Real-time WebSockets:** The `ws` service listens to the Redis Pub/Sub channels and broadcasts the depth and trade updates to connected client browsers.
6. **Database Logging & Candlesticks:** The `db` worker continuously pulls from `db_processor`. When it receives a `TRADE_ADDED` message, it inserts the trade data into a TimescaleDB hypertable (`tata_prices`). TimescaleDB's materialized views automatically aggregate these trades into 1m, 1h, and 1w candlestick (kline) data.
7. **Frontend Visualization:** The Next.js frontend fetches order data, open orders, and klines from the API, and connects to the WebSocket server to render a live, updating orderbook and lightweight charts.

## 3. Module Breakdown

* **`api/` (REST API Server)**
  * **Role:** The entry point for all HTTP requests from clients.
  * **Responsibilities:** Exposes routes for orders, depth, trades, and klines. Manages HTTP-to-Redis communication bridging (RPC style) via `RedisManager.ts`.
  * **Interaction:** Reads/writes to Redis. Queries the PostgreSQL database directly for historical kline data.
* **`engine/` (Core Matching Engine)**
  * **Role:** The heart of the exchange.
  * **Responsibilities:** Maintains an in-memory limit orderbook. Handles order matching, fund locking, and balance updates. Snapshots state to `snapshot.json` every 3 seconds for recovery.
  * **Interaction:** Consumes from Redis `messages` queue. Produces to Redis `db_processor` queue and Redis Pub/Sub channels.
* **`ws/` (WebSocket Server)**
  * **Role:** Real-time data streamer.
  * **Responsibilities:** Manages WebSocket connections with clients. Subscribes to Redis Pub/Sub to forward market depth and trade events to users.
  * **Interaction:** Subscribes to Redis and streams to Frontend clients.
* **`db/` (Database Worker & Setup)**
  * **Role:** Background persister.
  * **Responsibilities:** Consumes executed trades from Redis and inserts them into TimescaleDB. Contains `seed-db.ts` to initialize hypertables and materialized views for kline aggregations.
  * **Interaction:** Consumes from Redis `db_processor` queue. Writes to PostgreSQL.
* **`mm/` (Market Maker)**
  * **Role:** Liquidity provider bot.
  * **Responsibilities:** Periodically fetches open orders and places random bids and asks around a specific price to simulate an active market.
  * **Interaction:** Sends HTTP requests to the `api` service.
* **`frontend/` (User Interface)**
  * **Role:** The client-facing Next.js web application.
  * **Responsibilities:** Renders the trading interface, charts (Lightweight Charts), and order book.
  * **Interaction:** Calls `api` for REST data and connects to `ws` for real-time streams.
* **`exchange-proxy/` (Proxy Server)**
  * **Role:** Network utility.
  * **Responsibilities:** A simple Express proxy server bridging requests to external APIs (e.g., Backpack Exchange), likely used to bypass CORS issues or fetch reference market data.
* **`docker/` (Infrastructure)**
  * **Role:** Local environment orchestrator.
  * **Responsibilities:** Runs TimescaleDB (Postgres) and Redis instances required for the local stack.

## 4. Full File Structure

```text
Exchange-v2/
├── api/                        - Express REST API
│   ├── src/
│   │   ├── routes/             - API endpoints (order.ts, depth.ts, kline.ts, etc.)
│   │   ├── types/              - TypeScript interfaces
│   │   ├── index.ts            - Express server setup
│   │   └── RedisManager.ts     - Redis pub/sub and queue manager
│   ├── package.json
│   └── tsconfig.json
├── db/                         - Database worker & seed scripts
│   ├── src/
│   │   ├── cron.ts             - Scheduled database tasks
│   │   ├── index.ts            - Redis to Postgres worker loop
│   │   ├── seed-db.ts          - TimescaleDB hypertable/views setup
│   │   └── types.ts            - Worker types
│   ├── package.json
│   └── tsconfig.json
├── docker/                     - Infrastructure configs
│   ├── docker-compose.yml      - Redis and TimescaleDB services
│   └── tsconfig.json
├── engine/                     - Core matching engine
│   ├── src/
│   │   ├── trade/              - Orderbook and Engine logic (Engine.ts, Orderbook.ts)
│   │   ├── tests/              - Engine tests
│   │   ├── types/              - Internal types
│   │   ├── index.ts            - Engine entry point and queue polling
│   │   └── RedisManager.ts     - Redis integration for Engine
│   ├── package.json
│   └── tsconfig.json
├── exchange-proxy/             - Simple HTTP Proxy
│   ├── index.js                - Express proxy middleware
│   └── package.json
├── frontend/                   - Next.js Web Application
│   ├── app/                    - Next.js App Router (pages, layout, components)
│   ├── public/                 - Static assets
│   ├── next.config.mjs         - Next.js configuration
│   ├── package.json
│   ├── tailwind.config.ts      - Tailwind styling config
│   └── tsconfig.json
├── mm/                         - Market Maker Bot
│   ├── src/
│   │   └── index.ts            - Market maker loop and logic
│   ├── package.json
│   └── tsconfig.json
└── ws/                         - WebSocket Server
    ├── src/
    │   ├── SubscriptionManager.ts - Manages WS room subscriptions
    │   ├── User.ts             - WS User session wrapper
    │   ├── UserManager.ts      - Global WS user state
    │   └── index.ts            - WebSocket server initialization
    ├── package.json
    └── tsconfig.json
```

## 5. Local Setup & Running the Project

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- Yarn or npm

### Step 1: Clone & Setup Infrastructure
1. Clone the repository.
2. Start the database and Redis instances:
   ```bash
   cd docker
   docker-compose up -d
   ```

### Step 2: Initialize Database
The PostgreSQL database (TimescaleDB) needs its schema initialized.
1. Navigate to the `db` directory:
   ```bash
   cd ../db
   npm install
   ```
2. Run the seed script:
   ```bash
   npx ts-node src/seed-db.ts
   ```

### Step 3: Install Dependencies
Run `npm install` inside each of the following directories:
- `api`
- `engine`
- `ws`
- `db`
- `mm`
- `frontend`

### Step 4: Environment Variables
Currently, the project uses hardcoded credentials in the codebase (e.g., `db/src/index.ts`, `api/src/routes/kline.ts`). If you extract them, you would need:
- `POSTGRES_USER` (Default: `your_user`)
- `POSTGRES_PASSWORD` (Default: `your_password`)
- `POSTGRES_DB` (Default: `my_database`)
- `REDIS_URL` (Default: `redis://localhost:6379`)
- `WITH_SNAPSHOT` (Optional, Engine var to load `snapshot.json`)

### Step 5: Run the Services
You must start each service in its own terminal window. For each directory (`api`, `engine`, `ws`, `db`, `mm`), run:
```bash
npm run dev # or ts-node src/index.ts depending on local setup scripts
```

Start the frontend:
```bash
cd frontend
npm run dev
```
The web app will be available at `http://localhost:3000` (ensure API and proxy ports don't conflict, as `api` and `frontend` might both default to 3000 based on standard configs. Check `api/src/index.ts` and `frontend/package.json`).

## 6. Tech Stack

- **Frontend:** Next.js (App Router), React, TailwindCSS, Lightweight Charts (for interactive financial charts).
- **Backend API:** Node.js, Express.js, TypeScript.
- **Matching Engine:** Custom in-memory implementation in TypeScript.
- **WebSocket Server:** `ws` package in Node.js.
- **Message Broker & Cache:** Redis (Used for queueing messages between API/Engine and Pub/Sub for WebSockets).
- **Database:** PostgreSQL with TimescaleDB extension. *Why TimescaleDB?* It natively supports hypertables and continuous aggregates, making it extremely fast to generate `1m`, `1h`, and `1w` klines (candlesticks) from millions of raw trade rows without manual cron summarization logic.
- **Containerization:** Docker & Docker Compose for local infra.

## 7. Key Design Decisions

1. **In-Memory Matching Engine:** To achieve extremely low latency, the matching engine keeps the orderbook entirely in memory. It uses a 3-second interval to flush its state to a local `snapshot.json` file for crash recovery, avoiding database I/O on the hot path.
2. **Decoupled Architecture via Redis:** The `api` does not call the `engine` directly. It pushes a message to a Redis list (`messages`) and blocks by subscribing to a unique callback channel. This ensures the engine processes trades sequentially on a single thread (avoiding race conditions) while APIs can scale horizontally.
3. **TimescaleDB Continuous Aggregates:** Instead of calculating kline (Open, High, Low, Close) data dynamically on every API request or using a custom aggregator script, the database natively handles time-bucketing via Materialized Views (`klines_1m`, etc.).
4. **Separate DB Worker:** Database writes are notoriously slow compared to in-memory operations. Trade persistence is offloaded to a background `db` worker via the `db_processor` Redis queue. This ensures that DB latency never affects order execution speed.
