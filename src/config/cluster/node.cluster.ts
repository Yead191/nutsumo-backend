import os from 'os';
import colors from 'colors';
import { errorLogger, logger } from '../../shared/logger';
import cluster from 'cluster';
import { setupProcessHandlers } from './cpu.core.process.handler';
import { main } from '../../server';


const CONFIG = {
    WORKER_RESTART_DELAY: 5000,
    MAX_RESTART_ATTEMPTS: 5,
    MAX_BACKOFF_DELAY: 60000,
    GRACEFUL_SHUTDOWN_TIMEOUT: 30000,
    WORKER_COUNT: os.cpus().length,
};

export function setupCluster(): void {
    if (cluster.isPrimary) {
        setupMasterProcess();
    } else {
        setupWorkerProcess();
    }
}

function setupMasterProcess(): void {
    const workerRestarts = new Map<number, number>();
    let shuttingDown = false;

    logger.info(colors.bgBlue.white(`\n${'='.repeat(60)}`));
    logger.info(colors.bgBlue.white(`  MASTER PROCESS ${process.pid} STARTING  `));
    logger.info(colors.bgBlue.white(`  Workers: ${CONFIG.WORKER_COUNT} | CPUs: ${os.cpus().length}  `));
    logger.info(colors.bgBlue.white(`${'='.repeat(60)}\n`));



    // Fork workers
    for (let i = 0; i < CONFIG.WORKER_COUNT; i++) {
        const worker = cluster.fork();
        logger.info(colors.cyan(`🔧 Forking worker ${i + 1}/${CONFIG.WORKER_COUNT} (PID: ${worker.process.pid})`));
    }

    // Listen for worker ready messages
    cluster.on('message', (worker, message) => {
        if (message === 'ready') {
            logger.info(colors.green(`✅ Worker ${worker.process.pid} is ready and accepting connections`));
        }
    });

    // Handle worker exits
    cluster.on('exit', (worker, code, signal) => {
        const pid = worker.process.pid || 0;
        const restarts = workerRestarts.get(pid) || 0;

        // Don't restart during shutdown
        if (shuttingDown) {
            logger.info(colors.blue(`Worker ${pid} exited during shutdown (not restarting)`));

            // Check if all workers are dead
            const remainingWorkers = Object.keys(cluster.workers || {}).length;
            if (remainingWorkers === 0) {
                logger.info(colors.green('All workers stopped. Master exiting.'));
                process.exit(0);
            }
            return;
        }

        // Log exit reason
        if (signal) {
            logger.warn(colors.yellow(`⚠️  Worker ${pid} killed by signal: ${signal}`));
        } else if (code !== 0) {
            errorLogger.error(colors.red(`❌ Worker ${pid} exited with error code: ${code}`));
        } else {
            logger.info(colors.blue(`Worker ${pid} exited successfully`));
        }

        // Attempt restart with exponential backoff
        if (restarts < CONFIG.MAX_RESTART_ATTEMPTS) {
            const delay = Math.min(
                CONFIG.WORKER_RESTART_DELAY * Math.pow(2, restarts),
                CONFIG.MAX_BACKOFF_DELAY
            );

            logger.info(colors.yellow(`🔄 Restarting worker in ${delay}ms (attempt ${restarts + 1}/${CONFIG.MAX_RESTART_ATTEMPTS})`));

            setTimeout(() => {
                const newWorker = cluster.fork();
                workerRestarts.set(newWorker.process.pid || 0, restarts + 1);
                logger.info(colors.cyan(`🔧 New worker ${newWorker.process.pid} forked to replace ${pid}`));
            }, delay);
        } else {
            errorLogger.error(colors.bgRed.white(`❌ Worker ${pid} FAILED after ${CONFIG.MAX_RESTART_ATTEMPTS} restart attempts`));

            // If too many workers have failed, exit master
            const aliveWorkers = Object.keys(cluster.workers || {}).length;
            if (aliveWorkers === 0) {
                errorLogger.error(colors.bgRed.white('❌ NO WORKERS ALIVE - SHUTTING DOWN MASTER'));
                process.exit(1);
            }
        }
    });

    // Graceful shutdown on signals
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, () => {
            if (shuttingDown) return;
            shuttingDown = true;

            logger.info(colors.bgYellow.black(`\n${'='.repeat(60)}`));
            logger.info(colors.bgYellow.black(`  MASTER ${process.pid} RECEIVED ${signal} - SHUTTING DOWN  `));
            logger.info(colors.bgYellow.black(`${'='.repeat(60)}\n`));

            // Send SIGTERM to all workers
            for (const id in cluster.workers) {
                const worker = cluster.workers[id];
                if (worker) {
                    logger.info(colors.yellow(`📤 Sending SIGTERM to worker ${worker.process.pid}`));
                    worker.process.kill('SIGTERM');
                }
            }

            // Force shutdown if workers don't exit gracefully
            setTimeout(() => {
                errorLogger.error(colors.bgRed.white('⚠️  FORCE SHUTDOWN - Workers did not exit in time'));
                process.exit(1);
            }, CONFIG.GRACEFUL_SHUTDOWN_TIMEOUT);
        });
    });

    // Handle uncaught errors in master
    process.on('uncaughtException', (error) => {
        errorLogger.error(colors.bgRed.white('❌ MASTER UNCAUGHT EXCEPTION:'), error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
        errorLogger.error(colors.bgRed.white('❌ MASTER UNHANDLED REJECTION:'), reason);
        process.exit(1);
    });
}

function setupWorkerProcess(): void {
    logger.info(colors.blue(`Worker ${process.pid} initializing...`));

    // Setup process handlers for this worker FIRST
    setupProcessHandlers();

    // Start the server
    main()
        .then(() => {
            logger.info(colors.green(`✅ Worker ${process.pid} started successfully`));
        })
        .catch((error: any) => {
            errorLogger.error(colors.red(`❌ Worker ${process.pid} failed to start:`), error);
            process.exit(1);
        });
}

