CREATE TABLE IF NOT EXISTS urls (
  short_url SERIAL PRIMARY KEY,
  full_url Text NOT NULL,
  hits Integer DEFAULT 0,
  title Text
);
