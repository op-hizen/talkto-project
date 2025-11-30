ALTER TABLE "ChatMessage"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE INDEX IF NOT EXISTS "ChatMessage_searchVector_gin"
ON "ChatMessage"
USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION chatmessage_searchvector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('french', coalesce(NEW.content,'')), 'A');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chatmessage_searchvector_trigger ON "ChatMessage";

CREATE TRIGGER chatmessage_searchvector_trigger
BEFORE INSERT OR UPDATE OF content
ON "ChatMessage"
FOR EACH ROW EXECUTE FUNCTION chatmessage_searchvector_update();

UPDATE "ChatMessage"
SET "searchVector" = setweight(to_tsvector('french', coalesce(content,'')), 'A')
WHERE "searchVector" IS NULL;
-- This is an empty migration.