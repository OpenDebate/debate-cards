import { Caselist } from 'app/constants/caselist/api';
import { TypedEvent } from 'app/lib';

export const onUpdateReady = new TypedEvent<Caselist>();

export default async (caselist: Caselist) => {};
