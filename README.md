# Simple Backend Tamplate

This is a template project for backend development using Typescript, Node.js, Express, Mongoose, Bcrypt, JWT, NodeMailer, Multer, ESLint, and Prettier. The aim is to reduce setup time for new backend projects.

## Features

- **Authentication API:** Complete authentication system using JWT for secure token-based authentication and bcrypt for password hashing.
- **File Upload:** Implemented using Multer with efficient file handling and short-term storage.
- **Data Validation:** Robust data validation using Zod and Mongoose schemas.
- **Code Quality:** Ensured code readability and quality with ESLint and Prettier.
- **Email Service:** Sending emails through NodeMailer.
- **File Handling:** Efficient file deletion using `fs.unlink`.
- **Environment Configuration:** Easy configuration using a `.env` file.
- **Logging:** Logging with Winston and file rotation using DailyRotateFile.
- **API Request Logging:** Logging API requests using Morgan.

## Tech Stack

- Typescript
- Node.js
- Express
- Mongoose
- Bcrypt
- JWT
- NodeMailer
- Multer
- ESLint
- Prettier
- Winston
- Daily-winston-rotate-file
- Morgen
- Socket

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm or yarn

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/your-repository.git
   cd your-repository
   ```

2. **Install dependencies:**

   Using npm:

   ```bash
   npm install
   ```

   Using yarn:

   ```bash
   yarn install
   ```

3. **For using the Docker services:**

   First of all configure the docker-compose.app.yaml then run this code:

   ```bash
   npm run docker-infra
   ```
4. **If you want to use the Contraise server:**

   For the automatic load balancer, start running this command:

   ```bash
   npm run init-load
   ```
5. **Then start the server using command:**

   ```bash
   npm run docker-app
   ```

6. **Create a `.env` file:**

   In the root directory of the project, create a `.env` file and add the following variables. Adjust the values according to your setup.

   ```env
   # Basic
   NODE_ENV=production
   DATABASE_URL=mongodb://mongo:27017/demo_db
   BACKUP_DATABASE_URL=mongodb://mongo:27017/demo_db
   IP_ADDRESS=0.0.0.0
   PORT=5000

   # Redis
   REDIS_HOST=redis
   REDIS_PORT=6379

   # Kafka
   KAFKA_URL=kafka:9092

   # Elasticsearch
   ELASTICSEARCH_URL=http://elasticsearch:9200

   # Bcrypt
   BCRYPT_SALT_ROUNDS=10

   # JWT
   JWT_SECRET=demo_jwt_secret_key
   JWT_EXPIRE_IN=30d

   # Email (Demo only)
   EMAIL_FROM=demo@example.com
   EMAIL_USER=demo@example.com
   EMAIL_PASS=demo-email-password
   EMAIL_PORT=587
   EMAIL_HOST=smtp.gmail.com

   # Super Admin (Demo)
   SUPER_ADMIN_EMAIL=admin@example.com
   SUPER_ADMIN_PASSWORD=Admin@123

   # Stripe (Demo)
   STRIPE_API_SECRET=sk_test_demo123456789
   WEBHOOK_SECRET=whsec_demo123456789


   ```

7. **Run the project:**

   Using npm:

   ```bash
   npm run dev
   ```

   Using yarn:

   ```bash
   yarn run dev
   ```

### Running the Tests

Explain how to run the automated tests for this system.

```bash
npm test
```
