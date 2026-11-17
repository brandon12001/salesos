import type {CoreType} from '../types';
export const core:CoreType=window.SalesCore;
if(!core)throw new Error('SalesOS core did not load. Please check /public/legacy/core.js');
