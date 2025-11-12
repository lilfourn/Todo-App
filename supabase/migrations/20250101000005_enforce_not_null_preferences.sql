-- ============================================================================
-- Enforce NOT NULL on user_preferences theme and font Migration
-- ============================================================================
-- Created: 2025-01-01
-- Purpose: Backfill NULL values and enforce NOT NULL constraints on theme and
--          font columns in user_preferences table.
--
-- Background:
-- - The original schema did not enforce NOT NULL on theme and font columns
-- - Documentation and application code assume these columns are always present
-- - This migration ensures data integrity by enforcing NOT NULL
--
-- Solution:
-- 1. Backfill any NULL values with defaults ('dark' for theme, 'system' for font)
-- 2. Add NOT NULL constraints to both columns
-- ============================================================================

-- ============================================================================
-- STEP 1: BACKFILL NULL VALUES
-- ============================================================================

-- Update any NULL theme values to default 'dark'
UPDATE user_preferences 
SET theme = 'dark' 
WHERE theme IS NULL;

-- Update any NULL font values to default 'system'
UPDATE user_preferences 
SET font = 'system' 
WHERE font IS NULL;

-- ============================================================================
-- STEP 2: ENFORCE NOT NULL CONSTRAINTS
-- ============================================================================

-- Add NOT NULL constraint to theme column
ALTER TABLE user_preferences 
ALTER COLUMN theme SET NOT NULL;

-- Add NOT NULL constraint to font column
ALTER TABLE user_preferences 
ALTER COLUMN font SET NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying this migration, verify:
-- 1. No NULL values exist:
--    SELECT COUNT(*) FROM user_preferences WHERE theme IS NULL OR font IS NULL;
--    (should return 0)
--
-- 2. NOT NULL constraints are enforced:
--    SELECT column_name, is_nullable 
--    FROM information_schema.columns 
--    WHERE table_name = 'user_preferences' 
--    AND column_name IN ('theme', 'font');
--    (should show is_nullable = 'NO' for both columns)
--
-- 3. Test NULL insertion fails:
--    INSERT INTO user_preferences (user_id, theme, font) 
--    VALUES (auth.uid(), NULL, 'system');
--    (should fail with: null value in column "theme" violates not-null constraint)
--
-- 4. Test default values work:
--    INSERT INTO user_preferences (user_id) VALUES (auth.uid());
--    SELECT theme, font FROM user_preferences WHERE user_id = auth.uid();
--    (should return theme = 'dark', font = 'system')
-- ============================================================================

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Verify no NULL values exist (see verification queries above)
-- 2. Verify NOT NULL constraints are enforced
-- 3. Test that default values are applied for new rows
-- ============================================================================
