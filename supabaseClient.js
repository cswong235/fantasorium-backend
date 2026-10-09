const { createClient } = require('@supabase/supabase-js');

// Todo: Replace with deployed URL
const API_BASE = "http://localhost:3000"

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

module.exports = { supabase, API_BASE };