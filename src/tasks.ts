import caselist from 'app/modules/caselist';
import 'app/modules/parser';
import 'app/modules/deduplicator';

(async () => {
  await caselist.openevQueue.load();
  await caselist.caselistQueue.load();
})();
