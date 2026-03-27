-- Set default role for new users after USER enum value exists.
ALTER TABLE "User"
ALTER COLUMN "role" SET DEFAULT 'USER';
