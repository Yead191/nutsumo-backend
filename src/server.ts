import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { errorLogger, logger } from "./shared/logger";
import colors from 'colors';
import { socketHelper } from "./helpers/socketHelper";
import { Server } from "socket.io";
import { seedSuperAdmin } from "./DB/seedAdmin";
import { setupCluster } from "./config/cluster/node.cluster";
import cluster from 'cluster';
import { loadConsumer } from "./tools/kafka/kafka-consumers";
// import { setupSecurity } from "./app/modules/cluster/setup.security";

//uncaught exception
// process.on('uncaughtException', error => {
//     errorLogger.error('uncaughtException Detected', error);
//     process.exit(1);
// });


if (cluster.isPrimary) {
    process.on('uncaughtException', error => {
        errorLogger.error('Master uncaughtException Detected', error);
        process.exit(1);
    });

    process.on('unhandledRejection', error => {
        errorLogger.error('Master unhandledRejection Detected', error);
        process.exit(1);
    });
}

// Main function - only runs in worker processes
export async function main() {
    try {
        // Connect to database
        await mongoose.connect(config.database_url as string);
        logger.info(colors.green('🚀 Database connected successfully'));

        // Seed super admin
        await seedSuperAdmin();
      // loadConsumer() // if you  yse kafka

        // Start HTTP server
        const port = typeof config.port === 'number' ? config.port : Number(config.port);
        const server = app.listen(port, config.ip_address as string, () => {
            logger.info(colors.bold.italic.bgGreen(`♻️ Worker ${process.pid} listening on ${config.ip_address}:${config.port}`));
        });

        // Setup Socket.IO
        const io = new Server(server, {
            pingTimeout: 60000,
            cors: {
                origin: '*'
            }
        });

        socketHelper.socket(io);

        // Store in global for graceful shutdown
        global.httpServer = server;
        global.socketServer = io;

        // Notify master that worker is ready
        if (cluster.worker) {
            process.send?.('ready');
        }

        return server;

    } catch (error) {
        errorLogger.error(colors.red('🤢 Failed to start worker:'), error);
        throw error;
    }
}

// Bootstrap function - runs on startup
async function bootstrap() {
    try {
        // setupSecurity();
        if (config.node_env === 'production') {
            setupCluster();
        } else {


            logger.info("dev mode");


            await main();
        }
    } catch (error) {
        errorLogger.error(colors.red('🤢 Failed to bootstrap application:'), error);
        process.exit(1);
    }
}

// Start the application
bootstrap();