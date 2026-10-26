import cors from 'cors';
import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
import rateLimit from 'express-rate-limit';
import ApiError from './errors/ApiError';
import session from 'express-session';
import requestIp from 'request-ip';
import { handleChunkUpload } from './helpers/handleChunkUpload';
import { fileStreamHandler } from './helpers/fileStreamingHelper';
import { handleStripeWebhook } from './webhooks/handleStripeWebhook';
const app = express();
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
); /// stripe webhook
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    if (!req.clientIp) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Unable to determine client IP!',
      );
    }
    return req.clientIp;
  },
  handler: (req, res, next, options) => {
    throw new ApiError(
      options?.statusCode,
      `Rate limit exceeded. Try again in ${options.windowMs / 60000} minutes.`,
    );
  },
});

app.use(
  session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Secure should be true in production with HTTPS
  }),
);
app.use(requestIp.mw());
app.use(limiter);
//morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

//body parser
app.use(
  cors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://10.10.26.173:3000',
      'http://10.10.26.173:5173',
      'https://admin.ifundayiti.org',
      'https://ifundayiti.org',
      'https://www.ifundayiti.org',
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use('/files/:folder/:file', fileStreamHandler);
app.use(express.static('public'));
// app.use(express.static('uploads'));
//router
app.post('/api/v1/upload/chunk', handleChunkUpload);
app.use('/api/v1', router);

//live response
app.get('/', (req: Request, res: Response) => {
  const date = new Date(Date.now());
  const io = global.socketServer!;
  io.emit('message', 'Hello from the server!');
  res.send(
    `<h1 style="text-align:center; color:#173616; font-family:Verdana;">Beep-beep! The server is alive and kicking.</h1>
    <p style="text-align:center; color:#173616; font-family:Verdana;">${date}</p>
    `,
  );
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
        method: req.method,
      },
    ],
  });
});

export default app;
