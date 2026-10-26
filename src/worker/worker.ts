import cron from 'node-cron'

const worker = () => {
    cron.schedule('* * * * *', () => {
        console.log('running a task every minute');
    });
}