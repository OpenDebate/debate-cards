import caselist from 'app/modules/caselist';
import parser from 'app/modules/parser';
import 'app/modules/deduplicator';

(async () => {
  caselist.openevQueue.load();
  caselist.caselistQueue.load();
  parser.queue.load();
})();
