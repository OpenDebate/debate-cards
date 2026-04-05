import 'dotenv/config';
import 'reflect-metadata';

// Start all BullMQ workers by importing their modules
import 'app/modules/caselist/worker';
import 'app/modules/parser/worker';
import 'app/modules/deduplicator/worker';

console.log('Task workers started (BullMQ)');
