import { Queue } from 'typescript-collections';
import { DefaultApi, DefaultApiApiKeys } from 'app/constants/caselist/api';
import { REQUEST_WAIT } from 'app/constants';

export const caselist = new DefaultApi('https://api.opencaselist.com/v1');
caselist.setApiKey(DefaultApiApiKeys.cookie, process.env.CASELIST_TOKEN);

// Every REQUEST_WAIT milliseconds, allow a request through
const requestQueue = new Queue<{ resolve: () => void }>();
setInterval(() => requestQueue.dequeue()?.resolve(), REQUEST_WAIT);
caselist.addInterceptor(() => new Promise((resolve) => requestQueue.enqueue({ resolve })));
