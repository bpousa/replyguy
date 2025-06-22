-- Create reply_types table
CREATE TABLE IF NOT EXISTS public.reply_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    pattern TEXT NOT NULL,
    style_rules TEXT,
    examples TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    complexity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create reply_type_mappings table
CREATE TABLE IF NOT EXISTS public.reply_type_mappings (
    id SERIAL PRIMARY KEY,
    response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('agree', 'disagree', 'neutral', 'other')),
    tone VARCHAR(30) NOT NULL,
    reply_type_id VARCHAR(50) NOT NULL REFERENCES reply_types(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.70 CHECK (success_rate >= 0 AND success_rate <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(response_type, tone, reply_type_id)
);

-- Create usage_analytics table
CREATE TABLE IF NOT EXISTS public.usage_analytics (
    id SERIAL PRIMARY KEY,
    reply_type_id VARCHAR(50) REFERENCES reply_types(id) ON DELETE CASCADE,
    original_tweet TEXT NOT NULL,
    generated_reply TEXT NOT NULL,
    response_type VARCHAR(20) NOT NULL,
    tone VARCHAR(30) NOT NULL,
    cost DECIMAL(10,6) NOT NULL,
    processing_time INTEGER NOT NULL,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    has_perplexity_data BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create daily_cost_tracking table
CREATE TABLE IF NOT EXISTS public.daily_cost_tracking (
    date DATE PRIMARY KEY,
    total_requests INTEGER DEFAULT 0,
    total_cost DECIMAL(10,4) DEFAULT 0,
    classification_cost DECIMAL(10,4) DEFAULT 0,
    reasoning_cost DECIMAL(10,4) DEFAULT 0,
    generation_cost DECIMAL(10,4) DEFAULT 0,
    perplexity_cost DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX idx_reply_types_category ON reply_types(category);
CREATE INDEX idx_reply_types_tags ON reply_types USING GIN(tags);
CREATE INDEX idx_mappings_lookup ON reply_type_mappings(response_type, tone);
CREATE INDEX idx_mappings_priority ON reply_type_mappings(priority DESC, success_rate DESC);
CREATE INDEX idx_analytics_created ON usage_analytics(created_at DESC);
CREATE INDEX idx_analytics_reply_type ON usage_analytics(reply_type_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_reply_types_updated_at BEFORE UPDATE ON reply_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_cost_tracking_updated_at BEFORE UPDATE ON daily_cost_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE reply_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reply_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cost_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth strategy)
-- For now, allowing public read access to reply types
CREATE POLICY "Reply types are viewable by everyone" ON reply_types
    FOR SELECT USING (true);

CREATE POLICY "Reply type mappings are viewable by everyone" ON reply_type_mappings
    FOR SELECT USING (true);

-- Function to track usage
CREATE OR REPLACE FUNCTION track_usage(
    p_reply_type_id VARCHAR(50),
    p_success BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
    UPDATE reply_type_mappings
    SET 
        usage_count = usage_count + 1,
        success_rate = (success_rate * usage_count + (CASE WHEN p_success THEN 1 ELSE 0 END)) / (usage_count + 1)
    WHERE reply_type_id = p_reply_type_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily costs
CREATE OR REPLACE FUNCTION update_daily_costs(
    p_classification_cost DECIMAL,
    p_reasoning_cost DECIMAL,
    p_generation_cost DECIMAL,
    p_perplexity_cost DECIMAL DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_total_cost DECIMAL;
BEGIN
    v_total_cost := p_classification_cost + p_reasoning_cost + p_generation_cost + p_perplexity_cost;
    
    INSERT INTO daily_cost_tracking (
        date,
        total_requests,
        total_cost,
        classification_cost,
        reasoning_cost,
        generation_cost,
        perplexity_cost
    ) VALUES (
        v_today,
        1,
        v_total_cost,
        p_classification_cost,
        p_reasoning_cost,
        p_generation_cost,
        p_perplexity_cost
    )
    ON CONFLICT (date) DO UPDATE SET
        total_requests = daily_cost_tracking.total_requests + 1,
        total_cost = daily_cost_tracking.total_cost + v_total_cost,
        classification_cost = daily_cost_tracking.classification_cost + p_classification_cost,
        reasoning_cost = daily_cost_tracking.reasoning_cost + p_reasoning_cost,
        generation_cost = daily_cost_tracking.generation_cost + p_generation_cost,
        perplexity_cost = daily_cost_tracking.perplexity_cost + p_perplexity_cost,
        updated_at = TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql;