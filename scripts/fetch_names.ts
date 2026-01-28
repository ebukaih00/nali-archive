
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from("names")
        .select("name")
        .eq("status", "verified")
        .limit(50);

    if (error) {
        console.error("Error fetching names:", error);
    } else {
        console.log("Verified Names:");
        data.forEach((n) => console.log(n.name));
    }
}

main();
