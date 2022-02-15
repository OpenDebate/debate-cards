import axios, { AxiosResponse } from 'axios';
import { Agent } from 'https';
import { Queue } from 'typescript-collections';

// Minimum wait between requests in ms
const minWait = 0;

// Only allow 1 request per domain
const requester = axios.create({
  httpsAgent: new Agent({ maxSockets: 1 }),
});

export const requestQueue = new Queue<request>();

export interface request {
  url: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  callback: (data: any) => void;
}

export interface requestError {
  message: string;
  retry: boolean;
}

const sendRequest = async (
  request: request,
): Promise<{ err: requestError | null; request: request; response: AxiosResponse | null }> => {
  try {
    const response = await requester.get(request.url, { params: { media: 'json' } });
    return { err: null, request, response };
  } catch (err) {
    const status = err.response?.status;
    if (!err.response) err = { message: `Could not connect to ${request.url}`, retry: true };
    else if (status === 401) err = { message: `Request to ${request.url} unauthorized`, retry: true };
    else if (status === 404) err = { retry: false };
    else if (status === 429) err = { message: `Request to ${request.url} rate limited`, retry: true };
    else if (status === 500) err = { message: `Server error on ${request.url}`, retry: false };
    else if (status === 503) err = { message: `${request.url} unavailable`, retry: true };
    else err = { message: `${request.url} ${err.toString()}`, retry: true };

    return { err, request: request, response: null };
  }
};

export const wikiRequest = (url: string): Promise<any> =>
  new Promise((resolve) => requestQueue.enqueue({ url, status: 'PENDING', callback: resolve }));

const drain = async () => {
  if (requestQueue.size()) {
    const r = requestQueue.dequeue();
    r.status = 'PROCESSING';
    sendRequest(r).then(({ err, request, response }) => {
      if (err) {
        request.status = err.retry ? 'ERROR' : 'PROCESSED';
        err.retry ? requestQueue.enqueue(request) : request.callback(null);
        return err.message ? console.error(err.message) : null;
      }
      request.status = 'PROCESSED';
      request.callback(response.data);
    });
  }
  setTimeout(drain, minWait);
};
drain();
