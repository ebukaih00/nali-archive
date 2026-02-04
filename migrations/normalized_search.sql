
-- 1. Add search_name column
ALTER TABLE names ADD COLUMN IF NOT EXISTS search_name TEXT;

-- 2. Create the normalization function
CREATE OR REPLACE FUNCTION public.normalize_name(val text) RETURNS text AS $$
DECLARE
    result text;
BEGIN
    -- Start with lowercase
    result := lower(val);
    
    -- Map common pre-composed accented characters (Yoruba/Igbo/Hausa)
    -- This handles the most common characters found in the database
    result := translate(result, 
        'áàāǎâăåäãąạéèēěêëẽęẹíìīǐîïĩįịóòōǒôöõǫọúùūǔûüũųụśṣńǹṇ', 
        'aaaaaaaaaaeeeeeeeeeiiiiiiiiioooooooooouuuuuuuuuussnnn'
    );
    
    -- Strip any remaining combining diacritical marks (Unicode range 0300-036F)
    -- This handles characters like u + \u0301
    result := regexp_replace(result, '[\u0300-\u036f]', '', 'g');
    
    -- Remove other special punctuation that might interfere with search
    result := regexp_replace(result, '[^a-z0-9]', '', 'g');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Update existing records (Batch processing)
UPDATE names SET search_name = normalize_name(name) WHERE search_name IS NULL;

-- 4. Create trigger to keep search_name in sync
CREATE OR REPLACE FUNCTION public.sync_search_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_name := normalize_name(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_search_name ON names;
CREATE TRIGGER trg_sync_search_name
BEFORE INSERT OR UPDATE OF name ON names
FOR EACH ROW
EXECUTE FUNCTION public.sync_search_name();

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_names_search_name ON names(search_name);
