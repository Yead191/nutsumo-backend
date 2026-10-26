import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  project_name: process.env.PROJECT_NAME,
  ip_address: process.env.IP_ADDRESS,
  database_url: process.env.DATABASE_URL,
  backup_database_url: process.env.BACKUP_DATABASE_URL,
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
  backend_url: process.env.BACKEND_URL || `http://${process.env.IP_ADDRESS || 'localhost'}:${process.env.PORT || 5000}`,
  node_env: process.env.NODE_ENV,


  port: process.env.PORT,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    jwt_expire_in: process.env.JWT_EXPIRE_IN,
  },
  email: {
    from: process.env.EMAIL_FROM,
    user: process.env.EMAIL_USER,
    port: process.env.EMAIL_PORT,
    host: process.env.EMAIL_HOST,
    pass: process.env.EMAIL_PASS,

    // Order specific
    order_from: process.env.ORDER_EMAIL_FROM || process.env.EMAIL_FROM,
    order_user: process.env.ORDER_EMAIL_USER || process.env.EMAIL_USER,
    order_port: process.env.ORDER_EMAIL_PORT || process.env.EMAIL_PORT,
    order_host: process.env.ORDER_EMAIL_HOST || process.env.EMAIL_HOST,
    order_pass: process.env.ORDER_EMAIL_PASS || process.env.EMAIL_PASS,
  },
  super_admin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
  },
  stripe: {
    secret_key: process.env.STRIPE_API_SECRET,
    webhook_secret: process.env.WEBHOOK_SECRET,
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  kafka: {
    url: process.env.KAFKA_URL,
  },
  elasticSearch: {
    url: process.env.ELASTICSEARCH_URL,
  },
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID,
  },
  support: {
    order: process.env.ORDER_SUPPORT_EMAIL,
    admin: process.env.ADMIN_SUPPORT,
  },
};
