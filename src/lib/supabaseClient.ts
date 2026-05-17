import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yhsrrbciopfrdqwevgmj.supabase.co";
const supabaseKey = "sb_publishable_Pi2zmfpo6jsHgSlwinSoJw_hc8T0KD4";

export const supabase = createClient(supabaseUrl, supabaseKey);
