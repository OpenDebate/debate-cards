import { Client } from '@elastic/elasticsearch';

export const elastic = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  // Bulk requests carry whole cards (about 20KB each); the 30s default is too tight under load
  requestTimeout: 120_000,
  auth: {
    username: 'elastic',
    password: process.env.ELASTIC_PASSWORD,
  },
});
