import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {State} from '../types';
import {core} from './core';
export const cloudUrl=import.meta.env.VITE_SUPABASE_URL as string|undefined;
export const cloudKey=(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY) as string|undefined;
export const cloud:SupabaseClient|null=cloudUrl&&cloudKey?createClient(cloudUrl,cloudKey):null;
export async function cloudUser(){const {data,error}=await cloud!.auth.getUser();if(error)throw error;return data.user}
export async function pushSnapshot(state:State){if(!cloud)throw new Error('Configure Supabase environment variables first.');const user=await cloudUser();if(!user)throw new Error('Sign in before saving a cloud backup.');const {error}=await cloud.from('salesos_snapshots').upsert({user_id:user.id,payload:state,updated_at:new Date().toISOString()});if(error)throw error}
export async function pullSnapshot():Promise<State>{if(!cloud)throw new Error('Configure Supabase environment variables first.');const user=await cloudUser();if(!user)throw new Error('Sign in before restoring a cloud backup.');const {data,error}=await cloud.from('salesos_snapshots').select('payload').eq('user_id',user.id).maybeSingle();if(error)throw error;if(!data?.payload)throw new Error('No cloud backup found.');const normalized=core.normalize(data.payload);if(!normalized)throw new Error('Cloud backup has an unsupported format.');return normalized as State}
