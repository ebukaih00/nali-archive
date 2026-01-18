
-- Migration to rename language column to origin
ALTER TABLE names RENAME COLUMN language TO origin;
