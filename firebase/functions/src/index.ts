import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

admin.initializeApp();

export { createPair } from './createPair';
export { joinPair } from './joinPair';
export { addRestaurant } from './addRestaurant';
export { castVote } from './castVote';
export { getPairSummary } from './getPairSummary';
export { decideForUs } from './decideForUs';

// Suppress unused import warnings
void functions.config;
