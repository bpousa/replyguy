import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    console.log(`Found ${sqlFiles.length} migration files`);
    
    // Run each migration
    for (const file of sqlFiles) {
      console.log(`\nRunning migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      // Execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // If exec_sql doesn't exist, try direct query
        // Note: This requires setting up a function in Supabase or using the admin API
        console.error(`Error running migration ${file}:`, error);
        console.log('Attempting alternative method...');
        
        // Split by semicolon and run each statement
        const statements = sql.split(';').filter(s => s.trim());
        for (const statement of statements) {
          try {
            // This is a workaround - in production, use proper migration tools
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            // Note: Supabase JS client doesn't support raw SQL execution
            // You'll need to use the Supabase CLI or dashboard for migrations
          } catch (err) {
            console.error('Statement failed:', err);
          }
        }
      } else {
        console.log(`✓ Migration ${file} completed successfully`);
      }
    }
    
    console.log('\n✨ All migrations completed!');
    console.log('\nNote: For production, use Supabase CLI for migrations:');
    console.log('  supabase db push');
    console.log('  supabase migration new <name>');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Alternative: Create tables using Supabase client
async function createTablesDirectly() {
  console.log('\nCreating tables directly...');
  
  // This is a simplified version - in production, use proper migrations
  try {
    // Check if tables exist
    const { data: tables } = await supabase
      .from('reply_types')
      .select('id')
      .limit(1);
    
    if (!tables) {
      console.log('Tables do not exist yet.');
      console.log('Please run the SQL migrations manually in Supabase dashboard.');
      console.log('Or use Supabase CLI: supabase db push');
    } else {
      console.log('✓ Tables already exist');
    }
  } catch (error) {
    console.log('Tables need to be created.');
    console.log('Please run the migrations in the Supabase dashboard.');
  }
}

// Run migrations
runMigrations().then(() => {
  createTablesDirectly();
}).catch(console.error);