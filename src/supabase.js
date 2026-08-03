import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lbznvhdfabxabuppmdah.supabase.co';
const supabaseAnonKey = 'sb_publishable_XdxkxptS8J5OBCzwq97YJw_D75BWh_J';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
