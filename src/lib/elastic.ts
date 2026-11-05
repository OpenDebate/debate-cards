import { Client } from '@elastic/elasticsearch';

export const elastic = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  auth: {
    username: 'elastic',
    password: process.env.ELASTIC_PASSWORD,
  },
});
