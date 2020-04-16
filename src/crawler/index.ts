import { Crawler, EventTypes } from './crawler';

const client = new Crawler(process.argv[2]);
client.on(EventTypes.ERROR, result => {
    process.send(result);
});

client.on(EventTypes.LOAD, result => {
    process.send(result);
});

client.run().catch(console.error);