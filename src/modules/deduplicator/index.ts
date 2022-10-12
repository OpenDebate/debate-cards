import { CONCURRENT_DEDUPLICATION } from 'app/constants';
import { onAddEvidence } from 'app/actions/addEvidence';
import dedupeFile from 'app/actions/dedupeFile';
import { ActionQueue } from 'app/lib';

export default {
  name: 'deduplication',
  queue: new ActionQueue('dedup', dedupeFile, CONCURRENT_DEDUPLICATION, onAddEvidence),
};
